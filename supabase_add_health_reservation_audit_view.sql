-- 患者管理画面から予約監査ログを安全に閲覧するための読み取り専用RPCです。
-- Supabase SQL Editorで一度実行してください。

create or replace function public.get_health_reservation_audit_logs(
  p_query text default null,
  p_operation text default null,
  p_limit integer default 300
)
returns table (
  id bigint,
  reservation_id text,
  operation text,
  occurred_at timestamptz,
  actor_staff_id text,
  actor_staff_name text,
  source text,
  changed_fields text[],
  old_data jsonb,
  new_data jsonb
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  normalized_query text := lower(btrim(coalesce(p_query, '')));
  normalized_operation text := upper(btrim(coalesce(p_operation, '')));
begin
  if auth.uid() is null then
    raise exception 'ログインが必要です。';
  end if;
  if normalized_operation <> '' and normalized_operation not in ('INSERT', 'UPDATE', 'DELETE') then
    raise exception '操作種別が不正です。';
  end if;

  return query
  select
    logs.id,
    logs.reservation_id,
    logs.operation,
    logs.occurred_at,
    logs.actor_staff_id,
    logs.actor_staff_name,
    logs.source,
    logs.changed_fields,
    logs.old_data,
    logs.new_data
  from public.health_reservation_audit_logs logs
  where
    (normalized_operation = '' or logs.operation = normalized_operation)
    and (
      normalized_query = ''
      or position(normalized_query in lower(concat_ws(' ',
        logs.reservation_id,
        coalesce(logs.new_data, logs.old_data) ->> 'patient_id',
        coalesce(logs.new_data, logs.old_data) ->> 'patient_name',
        coalesce(logs.new_data, logs.old_data) ->> 'patient_name_kana',
        coalesce(logs.new_data, logs.old_data) ->> 'company_name'
      ))) > 0
    )
  order by logs.occurred_at desc, logs.id desc
  limit greatest(1, least(coalesce(p_limit, 300), 500));
end;
$$;

revoke all on function public.get_health_reservation_audit_logs(text, text, integer)
  from public, anon;
grant execute on function public.get_health_reservation_audit_logs(text, text, integer)
  to authenticated;

comment on function public.get_health_reservation_audit_logs(text, text, integer) is
  'Authenticated read-only access to reservation audit logs for the patient management screen.';
