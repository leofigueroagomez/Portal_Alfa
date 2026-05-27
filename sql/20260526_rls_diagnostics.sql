-- ALFA OS RLS diagnostics. Read-only.
-- Run manually in Supabase SQL Editor.

select 'clients' as table_name, count(*) as row_count from public.clients
union all
select 'client_projects' as table_name, count(*) as row_count from public.client_projects
union all
select 'quotes' as table_name, count(*) as row_count from public.quotes;

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
  and tablename in ('clients', 'client_projects')
order by tablename, policyname;

select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('clients', 'client_projects', 'quotes')
order by tablename;

-- In SQL Editor this is usually null because the SQL Editor is not the app session.
-- In the app request, Supabase should receive a JWT whose role is authenticated.
select auth.uid() as sql_editor_auth_uid, auth.role() as sql_editor_auth_role;
