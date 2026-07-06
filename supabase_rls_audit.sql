-- Supabase RLS/security audit helper
-- Run this in the Supabase SQL Editor to confirm the current access rules.
-- Expected policy direction for this app:
--   - RLS enabled on tables that contain patient or reservation data.
--   - anon/public should not be able to SELECT/INSERT/UPDATE/DELETE patient data.
--   - authenticated users may access only through explicit policies.

select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in ('health_reserv', 'health_data', 'patients', 'health_companies')
order by c.relname;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('health_reserv', 'health_data', 'patients', 'health_companies')
order by tablename, policyname;

select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('health_reserv', 'health_data', 'patients', 'health_companies')
  and grantee in ('anon', 'authenticated', 'public')
order by table_name, grantee, privilege_type;
