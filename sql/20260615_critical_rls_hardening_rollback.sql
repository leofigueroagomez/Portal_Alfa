-- Rollback for 20260615_critical_rls_hardening.sql.
-- This rollback only removes policies created by the Sprint 4 / 4.1 migration.
-- It intentionally does not restore beta_authenticated_* open policies by
-- default. If production needs emergency recovery, use the commented section at
-- the bottom only as a short-lived manual break-glass step.

begin;

do $$
declare
  table_name text;
  policy_name text;
  critical_tables text[] := array[
    'profiles',
    'clients',
    'client_projects',
    'projects',
    'quotes',
    'quote_groups',
    'quote_sections',
    'quote_items',
    'project_invoices',
    'project_invoice_items',
    'project_payment_complements',
    'project_payments',
    'project_payment_audit_log',
    'public_document_links'
  ];
  sprint4_policies text[] := array[
    'profiles_select_self_or_internal_admin',
    'profiles_insert_self_bootstrap',
    'profiles_update_internal_admin',
    'profiles_delete_internal_admin',
    'clients_select_internal_or_portal_self',
    'clients_insert_commercial',
    'clients_update_commercial_finance',
    'clients_delete_admin_direction',
    'client_projects_select_internal_or_portal_access',
    'client_projects_insert_commercial',
    'client_projects_update_internal_authorized',
    'client_projects_delete_admin_direction',
    'projects_select_internal_or_portal_access',
    'projects_insert_internal_authorized',
    'projects_update_internal_authorized',
    'projects_delete_admin_direction',
    'quotes_select_internal_or_portal_approved',
    'quotes_insert_commercial_engineering',
    'quotes_update_commercial_engineering',
    'quotes_delete_admin_direction',
    'quote_groups_select_internal_or_portal_approved',
    'quote_groups_insert_commercial_engineering',
    'quote_groups_update_commercial_engineering',
    'quote_groups_delete_admin_direction',
    'quote_sections_select_internal_or_portal_approved',
    'quote_sections_insert_commercial_engineering',
    'quote_sections_update_commercial_engineering',
    'quote_sections_delete_admin_direction',
    'quote_items_select_internal_or_portal_approved',
    'quote_items_insert_commercial_engineering',
    'quote_items_update_commercial_engineering',
    'quote_items_delete_admin_direction',
    'project_invoices_select_finance_or_portal_project',
    'project_invoices_select_internal_or_portal_project',
    'project_invoices_insert_finance',
    'project_invoices_update_finance',
    'project_invoices_delete_finance_admin',
    'project_invoice_items_select_finance_or_portal_project',
    'project_invoice_items_select_internal_or_portal_project',
    'project_invoice_items_insert_finance',
    'project_invoice_items_update_finance',
    'project_invoice_items_delete_finance_admin',
    'project_payment_complements_select_finance_or_portal_project',
    'project_payment_complements_select_internal_or_portal_project',
    'project_payment_complements_insert_finance',
    'project_payment_complements_update_finance',
    'project_payment_complements_delete_finance_admin',
    'project_payments_select_finance_or_portal_project',
    'project_payments_select_internal_or_portal_project',
    'project_payments_insert_finance',
    'project_payments_update_finance',
    'project_payments_delete_finance_admin',
    'project_payment_audit_log_select_finance',
    'project_payment_audit_log_insert_finance',
    'public_document_links_select_internal_authorized',
    'public_document_links_insert_internal',
    'public_document_links_update_internal',
    'public_document_links_delete_internal'
  ];
begin
  foreach table_name in array critical_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      foreach policy_name in array sprint4_policies loop
        execute format('drop policy if exists %I on public.%I', policy_name, table_name);
      end loop;
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;

-- Emergency break-glass recovery only.
-- Uncomment and run manually only if staging/production needs temporary access
-- restoration while a safer patch is prepared. Remove these beta policies
-- immediately after recovery.
--
-- begin;
--
-- do $$
-- declare
--   table_name text;
--   critical_tables text[] := array[
--     'profiles',
--     'clients',
--     'client_projects',
--     'projects',
--     'quotes',
--     'quote_groups',
--     'quote_sections',
--     'quote_items',
--     'project_invoices',
--     'project_invoice_items',
--     'project_payment_complements',
--     'project_payments',
--     'project_payment_audit_log',
--     'public_document_links'
--   ];
-- begin
--   foreach table_name in array critical_tables loop
--     if to_regclass(format('public.%I', table_name)) is not null then
--       execute format(
--         'create policy beta_authenticated_select on public.%I for select to authenticated using (true)',
--         table_name
--       );
--       execute format(
--         'create policy beta_authenticated_insert on public.%I for insert to authenticated with check (true)',
--         table_name
--       );
--       execute format(
--         'create policy beta_authenticated_update on public.%I for update to authenticated using (true) with check (true)',
--         table_name
--       );
--       execute format(
--         'create policy beta_authenticated_delete on public.%I for delete to authenticated using (true)',
--         table_name
--       );
--     end if;
--   end loop;
-- end $$;
--
-- notify pgrst, 'reload schema';
--
-- commit;
