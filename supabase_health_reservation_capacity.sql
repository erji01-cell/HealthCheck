-- Supabase SQL Editorで実行。既存の受付停止日SQLを適用済みであること。
begin;

-- NULLは受付停止、正の整数は人数上限。行がない日は制限なし。
alter table public.health_reservation_closed_dates
  add column if not exists max_reservations integer
  check (max_reservations > 0);

create index if not exists health_reserv_capacity_date_idx on public.health_reserv (date);

-- 設定変更と予約追加を同じ日付ロックで直列化する。
create or replace function public.lock_health_reservation_closed_date()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  target_date date;
begin
  if TG_OP = 'UPDATE' and NEW.date is distinct from OLD.date then
    perform pg_advisory_xact_lock(hashtext('health_reservation_date:' || least(OLD.date, NEW.date)::text));
    perform pg_advisory_xact_lock(hashtext('health_reservation_date:' || greatest(OLD.date, NEW.date)::text));
  else
    if TG_OP = 'DELETE' then target_date := OLD.date; else target_date := NEW.date; end if;
    perform pg_advisory_xact_lock(hashtext('health_reservation_date:' || target_date::text));
  end if;
  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end;
$$;

drop trigger if exists lock_health_reservation_closed_date on public.health_reservation_closed_dates;
create trigger lock_health_reservation_closed_date
  before insert or update or delete on public.health_reservation_closed_dates
  for each row execute function public.lock_health_reservation_closed_date();

create or replace function public.reject_closed_health_reservation_date()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  capacity integer;
  reservation_count bigint;
begin
  -- 満員・受付停止でも、同じ日付の既存予約の編集は許可する。
  if TG_OP = 'UPDATE' and NEW.date is not distinct from OLD.date then return NEW; end if;
  if NEW.date is null then return NEW; end if;

  perform pg_advisory_xact_lock(hashtext('health_reservation_date:' || NEW.date::text));
  select d.max_reservations into capacity
    from public.health_reservation_closed_dates d where d.date = NEW.date;
  if not found then return NEW; end if;
  if capacity is null then
    raise exception 'HEALTH_RESERVATION_DATE_CLOSED' using errcode = 'P0001';
  end if;

  -- AFTERトリガーのため、今回の追加・日付変更を含む全団体の件数を確認する。
  select count(*) into reservation_count from public.health_reserv r where r.date = NEW.date;
  if reservation_count > capacity then
    raise exception 'HEALTH_RESERVATION_DATE_FULL' using errcode = 'P0001', detail = capacity::text;
  end if;
  return NEW;
end;
$$;

drop trigger if exists reject_closed_health_reservation_date on public.health_reserv;
create trigger reject_closed_health_reservation_date
  after insert or update of date on public.health_reserv
  for each row execute function public.reject_closed_health_reservation_date();

-- 個人情報を返さず、制限日の全団体合計人数だけを取得する。
create or replace function public.get_health_reservation_date_limits()
returns table(date date, max_reservations integer, reservation_count bigint)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'ログインが必要です。'; end if;
  return query
    select d.date, d.max_reservations,
      (select count(*) from public.health_reserv r where r.date = d.date)
    from public.health_reservation_closed_dates d order by d.date;
end;
$$;
revoke all on function public.get_health_reservation_date_limits() from public, anon;
grant execute on function public.get_health_reservation_date_limits() to authenticated;
revoke all on function public.lock_health_reservation_closed_date() from public, anon, authenticated;
revoke all on function public.reject_closed_health_reservation_date() from public, anon, authenticated;

commit;
