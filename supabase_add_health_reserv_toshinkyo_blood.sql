-- 健診目的「東振協」の採血（東振協基本ｾｯﾄ）フラグを追加
alter table public.health_reserv
  add column if not exists item_blood_toshinkyo_basic boolean not null default false;
