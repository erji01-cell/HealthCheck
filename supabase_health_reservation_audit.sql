-- Run once in Supabase SQL Editor before deploying the updated application.
begin;

create table if not exists public.health_reservation_audit_logs (
  id bigint generated always as identity primary key,
  reservation_id text not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  occurred_at timestamptz not null default clock_timestamp(),
  actor_user_id uuid,
  actor_staff_id text,
  actor_staff_name text,
  source text not null,
  old_data jsonb,
  new_data jsonb,
  changed_fields text[] not null default '{}'
);
create index if not exists health_reservation_audit_reservation_idx
  on public.health_reservation_audit_logs (reservation_id, occurred_at desc);
alter table public.health_reservation_audit_logs enable row level security;
revoke all on public.health_reservation_audit_logs from public, anon, authenticated;
-- No client read policy: inspect sensitive history through SQL Editor initially.

create or replace function public.record_health_reservation_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  before_row jsonb;
  after_row jsonb;
  fields text[];
  staff_id text;
  staff_name text;
  operation_source text;
begin
  if TG_OP <> 'INSERT' then before_row := to_jsonb(OLD); end if;
  if TG_OP <> 'DELETE' then after_row := to_jsonb(NEW); end if;
  select coalesce(array_agg(key order by key), '{}') into fields
  from jsonb_object_keys(coalesce(before_row, '{}'::jsonb) || coalesce(after_row, '{}'::jsonb)) as keys(key)
  where (before_row -> key) is distinct from (after_row -> key);
  staff_id := nullif(current_setting('health_audit.staff_id', true), '');
  staff_name := nullif(current_setting('health_audit.staff_name', true), '');
  operation_source := coalesce(nullif(current_setting('health_audit.source', true), ''), 'direct_or_maintenance');
  if TG_OP = 'INSERT' then
    staff_id := after_row ->> 'staff_id';
    staff_name := after_row ->> 'staff_name';
  end if;
  insert into public.health_reservation_audit_logs
    (reservation_id, operation, actor_user_id, actor_staff_id, actor_staff_name, source, old_data, new_data, changed_fields)
  values (coalesce(after_row ->> 'id', before_row ->> 'id'), TG_OP, auth.uid(), staff_id, staff_name,
    operation_source, before_row, after_row, fields);
  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end;
$$;
revoke all on function public.record_health_reservation_audit() from public, anon, authenticated;
drop trigger if exists health_reservation_audit on public.health_reserv;
create trigger health_reservation_audit after insert or update or delete on public.health_reserv
  for each row execute function public.record_health_reservation_audit();

-- Invoker privileges preserve existing reservation and staff RLS policies.
create or replace function public.audit_health_reservation_change(
  p_id text, p_action text, p_staff_id text, p_record jsonb default '{}'
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  staff_name text;
  original public.health_reserv%rowtype;
  assignments text;
  affected integer;
begin
  if auth.uid() is null then raise exception 'ログインが必要です。'; end if;
  if p_action not in ('UPDATE', 'DELETE') or p_action is null then
    raise exception '操作種別が不正です。';
  end if;
  select s.name into staff_name from public.invent_staff s
    where s.id::text = p_staff_id and s.is_active is distinct from false;
  if staff_name is null then raise exception '有効な操作担当者を選択してください。'; end if;
  select * into original from public.health_reserv where id::text = p_id for update;
  if not found then raise exception '予約が存在しないか、操作権限がありません。'; end if;
  perform set_config('health_audit.staff_id', p_staff_id, true);
  perform set_config('health_audit.staff_name', staff_name, true);
  perform set_config('health_audit.source', 'reservation_form', true);
  if p_action = 'DELETE' then
    delete from public.health_reserv where id::text = p_id;
  else
    if p_record is null or jsonb_typeof(p_record) <> 'object' then
      raise exception '予約内容が不正です。';
    end if;
    -- Registration identity and original staff remain unchanged on edits.
    p_record := p_record - array['id', 'created_at', 'user_id', 'staff_id', 'staff_name'];
    p_record := p_record || jsonb_build_object('updated_at', clock_timestamp());
    if exists (
      select 1 from jsonb_object_keys(p_record) k
      where not exists (select 1 from pg_catalog.pg_attribute a
        where a.attrelid = 'public.health_reserv'::regclass and a.attname = k
          and a.attnum > 0 and not a.attisdropped and a.attgenerated = '')
    ) then raise exception '未対応の予約項目が含まれています。'; end if;
    select string_agg(format('%I = patch.%I', k, k), ', ') into assignments
      from jsonb_object_keys(p_record) k;
    execute format('update public.health_reserv r set %s from jsonb_populate_record(null::public.health_reserv, $1) patch where r.id::text = $2', assignments)
      using p_record, p_id;
  end if;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception '予約を変更できませんでした。'; end if;
  perform set_config('health_audit.staff_id', '', true);
  perform set_config('health_audit.staff_name', '', true);
  perform set_config('health_audit.source', '', true);
end;
$$;
revoke all on function public.audit_health_reservation_change(text, text, text, jsonb) from public, anon;
grant execute on function public.audit_health_reservation_change(text, text, text, jsonb) to authenticated;
commit;
