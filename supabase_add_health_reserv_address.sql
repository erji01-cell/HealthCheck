alter table public.health_reserv
  add column if not exists address text;

comment on column public.health_reserv.address is
  '予約時点の患者住所（特定健診受診者名簿の市町村推定に使用）';
