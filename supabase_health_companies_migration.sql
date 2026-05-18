create table if not exists public.health_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_key text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists health_companies_name_key_key
  on public.health_companies (name_key);

alter table public.health_reserv
  add column if not exists company_id uuid;

alter table public.health_data
  add column if not exists company_id uuid;

with source_names as (
  select
    trim(regexp_replace(replace(company_name, '　', ' '), '[[:space:]]+', ' ', 'g')) as name
  from public.health_reserv
  where nullif(trim(regexp_replace(replace(company_name, '　', ' '), '[[:space:]]+', ' ', 'g')), '') is not null
  union
  select
    trim(regexp_replace(replace(k_company_name, '　', ' '), '[[:space:]]+', ' ', 'g')) as name
  from public.health_data
  where nullif(trim(regexp_replace(replace(k_company_name, '　', ' '), '[[:space:]]+', ' ', 'g')), '') is not null
),
deduped as (
  select distinct on (lower(name)) name, lower(name) as name_key
  from source_names
  order by lower(name), name
)
insert into public.health_companies (name, name_key)
select name, name_key
from deduped
on conflict (name_key) do nothing;

update public.health_reserv r
set
  company_id = c.id,
  company_name = c.name
from public.health_companies c
where r.company_id is null
  and lower(trim(regexp_replace(replace(r.company_name, '　', ' '), '[[:space:]]+', ' ', 'g'))) = c.name_key;

update public.health_data d
set
  company_id = c.id,
  k_company_name = c.name
from public.health_companies c
where d.company_id is null
  and lower(trim(regexp_replace(replace(d.k_company_name, '　', ' '), '[[:space:]]+', ' ', 'g'))) = c.name_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'health_reserv_company_id_fkey'
  ) then
    alter table public.health_reserv
      add constraint health_reserv_company_id_fkey
      foreign key (company_id) references public.health_companies(id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'health_data_company_id_fkey'
  ) then
    alter table public.health_data
      add constraint health_data_company_id_fkey
      foreign key (company_id) references public.health_companies(id);
  end if;
end $$;

alter table public.health_companies enable row level security;

drop policy if exists "health_companies_select_authenticated" on public.health_companies;
create policy "health_companies_select_authenticated"
  on public.health_companies
  for select
  to authenticated
  using (true);

drop policy if exists "health_companies_insert_authenticated" on public.health_companies;
create policy "health_companies_insert_authenticated"
  on public.health_companies
  for insert
  to authenticated
  with check (true);

drop policy if exists "health_companies_update_authenticated" on public.health_companies;
create policy "health_companies_update_authenticated"
  on public.health_companies
  for update
  to authenticated
  using (true)
  with check (true);
