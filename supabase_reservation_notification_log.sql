-- 健診予約メール通知の送信監査ログ
-- Supabase SQL Editorで一度だけ実行してください。

create table if not exists public.health_reservation_notification_log (
  id uuid primary key default gen_random_uuid(),
  reservation_id text not null,
  event_type text not null check (event_type in ('INSERT', 'UPDATE')),
  reservation_updated_at timestamptz,
  status text not null check (status in ('sent', 'failed')),
  provider_message_id text,
  error_message text,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists health_reservation_notification_log_reservation_idx
  on public.health_reservation_notification_log (reservation_id, created_at desc);

create index if not exists health_reservation_notification_log_created_idx
  on public.health_reservation_notification_log (created_at desc);

alter table public.health_reservation_notification_log enable row level security;
alter table public.health_reservation_notification_log force row level security;

revoke all on table public.health_reservation_notification_log from anon, authenticated;
grant insert, select on table public.health_reservation_notification_log to service_role;

-- 管理者が送信状況を確認するときに使用します。
-- 職員が利用する健診システム画面からは表示しません。
select
  reservation_id,
  event_type,
  status,
  email_sent_at,
  error_message,
  created_at
from public.health_reservation_notification_log
order by created_at desc
limit 50;
