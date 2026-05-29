alter table public.health_reserv
  add column if not exists bp_measure_count integer default 1;

alter table public.health_reserv
  drop constraint if exists health_reserv_bp_measure_count_check;

alter table public.health_reserv
  add constraint health_reserv_bp_measure_count_check
  check (bp_measure_count is null or bp_measure_count in (1, 2));
