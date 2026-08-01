-- health_reserv の新規登録・予約修正をEdge Functionへ非同期通知します。
-- 実行前に webhook_secret の値を、Supabase Edge Function Secretに設定した
-- RESERVATION_WEBHOOK_SECRETと同じ値へ置き換えてください。

create extension if not exists pg_net with schema extensions;

do $$
declare
  webhook_secret constant text := 'REPLACE_WITH_RESERVATION_WEBHOOK_SECRET';
  existing_secret_id uuid;
begin
  if webhook_secret = 'REPLACE_WITH_RESERVATION_WEBHOOK_SECRET' then
    raise exception 'RESERVATION_WEBHOOK_SECRETを設定してから実行してください。';
  end if;

  select id into existing_secret_id
  from vault.secrets
  where name = 'health_reservation_webhook_secret';

  if existing_secret_id is null then
    perform vault.create_secret(
      webhook_secret,
      'health_reservation_webhook_secret',
      'Health reservation email webhook authentication'
    );
  else
    perform vault.update_secret(
      existing_secret_id,
      webhook_secret,
      'health_reservation_webhook_secret',
      'Health reservation email webhook authentication'
    );
  end if;
end
$$;

create or replace function public.notify_health_reservation_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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
      'record', to_jsonb(NEW),
      'old_record', case
        when TG_OP = 'UPDATE' then to_jsonb(OLD)
        else 'null'::jsonb
      end
    ),
    timeout_milliseconds := 10000
  );
  return NEW;
end;
$$;

revoke all on function public.notify_health_reservation_email()
  from public, anon, authenticated;

drop trigger if exists health_reservation_email on public.health_reserv;

create trigger health_reservation_email
after insert or update on public.health_reserv
for each row
execute function public.notify_health_reservation_email();
