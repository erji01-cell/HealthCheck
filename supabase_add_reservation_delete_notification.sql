-- 健診予約の画面削除をメール通知へ追加します。
-- 既存の予約通知設定と予約監査ログ設定の実行後、Supabase SQL Editorで実行してください。

alter table public.health_reservation_notification_log
  drop constraint if exists health_reservation_notification_log_event_type_check;

alter table public.health_reservation_notification_log
  add constraint health_reservation_notification_log_event_type_check
  check (event_type in ('INSERT', 'UPDATE', 'DELETE'));

create or replace function public.notify_health_reservation_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_staff_id text;
  actor_staff_name text;
  operation_source text;
  reservation_record jsonb;
begin
  actor_staff_id := nullif(current_setting('health_audit.staff_id', true), '');
  actor_staff_name := nullif(current_setting('health_audit.staff_name', true), '');
  operation_source := coalesce(
    nullif(current_setting('health_audit.source', true), ''),
    'direct_or_maintenance'
  );

  if TG_OP = 'INSERT' then
    actor_staff_id := coalesce(actor_staff_id, NEW.staff_id::text);
    actor_staff_name := coalesce(actor_staff_name, NEW.staff_name);
    operation_source := 'reservation_form';
  end if;

  -- 自動削除・SQL直接削除・バックアップ復元では削除メールを送らない。
  if TG_OP = 'DELETE'
    and (operation_source <> 'reservation_form' or actor_staff_name is null) then
    return OLD;
  end if;

  reservation_record := case
    when TG_OP = 'DELETE' then to_jsonb(OLD)
    else to_jsonb(NEW)
  end;

  perform net.http_post(
    url := 'https://pexdtvfttgpabmukcqgf.supabase.co/functions/v1/send-reservation-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-health-reservation-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'health_reservation_webhook_secret'
      )
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', reservation_record,
      'old_record', case
        when TG_OP = 'UPDATE' then to_jsonb(OLD)
        else 'null'::jsonb
      end,
      'actor_staff_id', actor_staff_id,
      'actor_staff_name', actor_staff_name,
      'operation_source', operation_source,
      'occurred_at', clock_timestamp()
    ),
    timeout_milliseconds := 10000
  );

  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end;
$$;

revoke all on function public.notify_health_reservation_email()
  from public, anon, authenticated;

drop trigger if exists health_reservation_email on public.health_reserv;

create trigger health_reservation_email
after insert or update or delete on public.health_reserv
for each row
execute function public.notify_health_reservation_email();
