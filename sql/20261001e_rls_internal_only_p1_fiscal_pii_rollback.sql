-- =============================================================================
-- ROLLBACK de sql/20261001e_rls_internal_only_p1_fiscal_pii.sql
-- Restaura EXACTAMENTE el estado auditado en produccion el 2026-10-01:
--   - beta_authenticated_* con true (y los candados de estado de
--     project_invoices / project_invoice_items);
--   - las 4 policies extra de public_document_links (current_profile_role());
--   - las policies abiertas de project_contracts, suppliers, project_members,
--     contractor_portal_users y contractor_signed_agreements;
--   - grants completos a anon y authenticated.
-- ADVERTENCIA: este estado reabre la exposicion de datos fiscales y PII a
-- usuarios portal/contratista. Usar solo si el endurecimiento rompe un flujo
-- interno sin arreglo inmediato; documentar el motivo.
-- En sandbox (con policies de 20260615) deja el estado de produccion, no el de
-- 20260615.
-- El codigo del portal que lee con service role es compatible con ambos
-- estados y no necesita revertirse.
-- =============================================================================

begin;

create or replace function pg_temp.alfa_restore_beta(p_table text, p_cmds text[])
returns void
language plpgsql
as $fn$
declare
  pol record;
  c text;
begin
  if to_regclass(format('public.%I', p_table)) is null then
    return;
  end if;

  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = p_table
  loop
    execute format('drop policy %I on public.%I', pol.policyname, p_table);
  end loop;

  foreach c in array p_cmds loop
    if c = 'select' then
      execute format('create policy beta_authenticated_select on public.%I for select to authenticated using (true)', p_table);
    elsif c = 'insert' then
      execute format('create policy beta_authenticated_insert on public.%I for insert to authenticated with check (true)', p_table);
    elsif c = 'update' then
      execute format('create policy beta_authenticated_update on public.%I for update to authenticated using (true) with check (true)', p_table);
    elsif c = 'delete' then
      execute format('create policy beta_authenticated_delete on public.%I for delete to authenticated using (true)', p_table);
    elsif c <> 'none' then
      raise exception 'comando desconocido: %', c;
    end if;
  end loop;

  execute format('grant all on table public.%I to anon, authenticated', p_table);
end
$fn$;

select pg_temp.alfa_restore_beta('clients', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('client_projects', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('projects', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('project_invoices', array['select','insert']);
select pg_temp.alfa_restore_beta('project_invoice_items', array['select','insert','update']);
select pg_temp.alfa_restore_beta('project_payments', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('project_payment_complements', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('project_payment_audit_log', array['select','insert']);
select pg_temp.alfa_restore_beta('fiscal_document_email_logs', array['select','insert']);
select pg_temp.alfa_restore_beta('invoice_email_logs', array['select','insert']);
select pg_temp.alfa_restore_beta('company_settings', array['select','update']);
select pg_temp.alfa_restore_beta('public_document_links', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('documents', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('leads', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('contractors', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('contractor_account_movements', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('notification_events', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('notification_recipients', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('service_reports', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('service_report_photos', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('service_report_email_history', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('work_orders', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('work_order_activities', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('project_deliveries', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('project_warranties', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('project_delivery_email_history', array['select','insert','update','delete']);
-- Sin beta_* en produccion: solo se limpian y se restauran abajo.
select pg_temp.alfa_restore_beta('project_contracts', array['none']);
select pg_temp.alfa_restore_beta('suppliers', array['none']);
select pg_temp.alfa_restore_beta('project_members', array['none']);
select pg_temp.alfa_restore_beta('contractor_portal_users', array['none']);
select pg_temp.alfa_restore_beta('contractor_signed_agreements', array['none']);

do $$
begin
  if to_regclass('public.project_invoices') is not null then
    create policy beta_authenticated_update on public.project_invoices
      for update to authenticated
      using (status = any (array['issued'::text, 'paid'::text]))
      with check (status = any (array['issued'::text, 'paid'::text]));
    create policy beta_authenticated_delete on public.project_invoices
      for delete to authenticated
      using (status = 'draft'::text and facturama_id is null);
  end if;

  if to_regclass('public.project_invoice_items') is not null then
    create policy beta_authenticated_delete on public.project_invoice_items
      for delete to authenticated
      using (exists (
        select 1 from public.project_invoices pi
        where pi.id = project_invoice_items.project_invoice_id
          and pi.status = 'draft'::text
          and pi.facturama_id is null
      ));
  end if;

  if to_regclass('public.public_document_links') is not null then
    create policy public_document_links_select_internal_or_portal_access on public.public_document_links
      for select to authenticated
      using (
        public.current_profile_role() is not null
        or exists (
          select 1
          from public.client_portal_users cpu
          join public.client_portal_project_access cppa on cppa.client_portal_user_id = cpu.id
          where cpu.user_id = auth.uid()
            and cpu.is_active = true
            and cppa.is_active = true
            and cppa.client_project_id = public_document_links.client_project_id
        )
      );
    create policy public_document_links_insert_internal on public.public_document_links
      for insert to authenticated
      with check (public.current_profile_role() is not null);
    create policy public_document_links_update_internal on public.public_document_links
      for update to authenticated
      using (public.current_profile_role() is not null)
      with check (public.current_profile_role() is not null);
    create policy public_document_links_delete_internal on public.public_document_links
      for delete to authenticated
      using (public.current_profile_role() is not null);
  end if;

  if to_regclass('public.project_contracts') is not null then
    create policy "Authenticated staff can view and manage all contracts" on public.project_contracts
      for all to authenticated using (true) with check (true);
  end if;

  if to_regclass('public.suppliers') is not null then
    create policy "Allow staff to manage suppliers" on public.suppliers
      for all to authenticated using (true) with check (true);
  end if;

  if to_regclass('public.project_members') is not null then
    create policy "Authenticated staff can view project members" on public.project_members
      for select to authenticated using (true);
  end if;

  if to_regclass('public.contractor_portal_users') is not null then
    create policy contractor_portal_users_admin_all on public.contractor_portal_users
      for all to authenticated using (true) with check (true);
    create policy contractor_portal_users_select_self on public.contractor_portal_users
      for select to authenticated using (user_id = auth.uid());
  end if;

  if to_regclass('public.contractor_signed_agreements') is not null then
    create policy contractor_signed_agreements_insert on public.contractor_signed_agreements
      for insert to authenticated with check (true);
    create policy contractor_signed_agreements_select on public.contractor_signed_agreements
      for select to authenticated using ((user_id = auth.uid()) or true);
  end if;
end $$;

drop function pg_temp.alfa_restore_beta(text, text[]);

commit;
