alter table public.health_data
  add column if not exists ca125 text,
  add column if not exists ca153 text,
  add column if not exists afp text;
