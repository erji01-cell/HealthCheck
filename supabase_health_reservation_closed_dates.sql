create table if not exists public.health_reservation_closed_dates (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

alter table public.health_reservation_closed_dates enable row level security;

drop policy if exists health_reservation_closed_dates_select on public.health_reservation_closed_dates;
create policy health_reservation_closed_dates_select
  on public.health_reservation_closed_dates for select to authenticated using (true);

drop policy if exists health_reservation_closed_dates_insert on public.health_reservation_closed_dates;
create policy health_reservation_closed_dates_insert
  on public.health_reservation_closed_dates for insert to authenticated with check (true);

drop policy if exists health_reservation_closed_dates_delete on public.health_reservation_closed_dates;
create policy health_reservation_closed_dates_delete
  on public.health_reservation_closed_dates for delete to authenticated using (true);

drop policy if exists health_reservation_closed_dates_update on public.health_reservation_closed_dates;
create policy health_reservation_closed_dates_update
  on public.health_reservation_closed_dates for update to authenticated using (true) with check (true);

grant select, insert, update, delete on public.health_reservation_closed_dates to authenticated;

-- Serialize closing a date with reservation inserts/date changes for that date.
create or replace function public.lock_health_reservation_closed_date()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtext('health_reservation_date:' || new.date::text));
  return new;
end;
$$;

drop trigger if exists lock_health_reservation_closed_date on public.health_reservation_closed_dates;
create trigger lock_health_reservation_closed_date
  before insert or update of date on public.health_reservation_closed_dates
  for each row execute function public.lock_health_reservation_closed_date();

create or replace function public.reject_closed_health_reservation_date()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'UPDATE' and new.date is not distinct from old.date then
    return new;
  end if;

  if new.date is not null then
    perform pg_advisory_xact_lock(hashtext('health_reservation_date:' || new.date::text));
    if exists (select 1 from public.health_reservation_closed_dates where date = new.date) then
      raise exception 'HEALTH_RESERVATION_DATE_CLOSED' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists reject_closed_health_reservation_date on public.health_reserv;
create trigger reject_closed_health_reservation_date
  after insert or update of date on public.health_reserv
  for each row execute function public.reject_closed_health_reservation_date();
