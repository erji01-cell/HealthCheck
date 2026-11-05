-- 予約の「日付未定の保留」に対応する
-- 予約日(date)が空の予約を保留中として扱い、保留前の予約日と保留開始日時を残す
alter table public.health_reserv
  alter column date drop not null;

alter table public.health_reserv
  add column if not exists pending_original_date date,
  add column if not exists pending_since timestamptz;
