alter table public.health_reserv
  add column if not exists item_blood_insurance_review boolean not null default false,
  add column if not exists item_cotinine boolean not null default false;
