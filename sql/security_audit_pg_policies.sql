-- Sprint 3 security audit: inspect real RLS policies in Supabase.
-- Run this manually in Supabase SQL editor or psql against the target environment.
-- This file is read-only and does not change schema or data.

-- 1) Policies on sensitive tables.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'project_payment_complements',
    'project_payment_audit_log',
    'notification_events',
    'invoice_email_logs',
    'fiscal_document_email_logs',
    'public_document_links',
    'client_portal_project_access',
    'profiles',
    'user_roles',
    'clients',
    'projects',
    'client_projects',
    'quotes',
    'invoices',
    'project_invoices'
  )
order by tablename, policyname, cmd;

-- 2) Global policies that are effectively open for all rows.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and (
    lower(coalesce(qual, '')) in ('true', '(true)')
    or lower(coalesce(with_check, '')) in ('true', '(true)')
  )
order by tablename, policyname, cmd;

-- 3) Policies open to authenticated users. Review these carefully when qual
-- or with_check is true, null, or not scoped to the current user's project/client.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and roles::text ilike '%authenticated%'
order by tablename, policyname, cmd;

-- 4) Policies open to anon users. Any rows here on sensitive tables should be
-- treated as high risk unless they are explicitly public marketing content.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and roles::text ilike '%anon%'
order by tablename, policyname, cmd;

-- 5) Sensitive tables with RLS disabled.
select
  n.nspname as schemaname,
  c.relname as tablename,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'project_payment_complements',
    'project_payment_audit_log',
    'notification_events',
    'invoice_email_logs',
    'fiscal_document_email_logs',
    'public_document_links',
    'client_portal_project_access',
    'profiles',
    'user_roles',
    'clients',
    'projects',
    'client_projects',
    'quotes',
    'invoices',
    'project_invoices'
  )
order by c.relname;
