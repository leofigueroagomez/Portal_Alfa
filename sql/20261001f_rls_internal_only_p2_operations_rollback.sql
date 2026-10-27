-- =============================================================================
-- ROLLBACK de sql/20261001f_rls_internal_only_p2_operations.sql
-- Restaura EXACTAMENTE el estado auditado en produccion el 2026-10-01:
-- beta_authenticated_* con true, "Allow staff to manage quotable_systems" y
-- grants completos a anon y authenticated.
-- ADVERTENCIA: reabre la exposicion de costos/compras/catalogo a usuarios portal.
-- En sandbox deja el estado de produccion, no el de 20260615.
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

select pg_temp.alfa_restore_beta('project_delivery_evidences', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('project_delivery_pending_items', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('project_delivery_systems', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('project_material_deliveries', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('project_material_delivery_items', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('project_operational_items', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('project_operational_item_labor_activities', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('project_purchase_lines', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('project_purchase_events', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('project_photos', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('project_site_visits', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('project_site_visit_notes', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('project_site_visit_note_photos', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('project_translation_changes', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('project_updates', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('engineering_quotes', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('products', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('product_categories', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('product_tags', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('product_tag_assignments', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('labor_activity_catalog', array['select','insert','update','delete']);
select pg_temp.alfa_restore_beta('cfdi_use_catalog', array['select']);
select pg_temp.alfa_restore_beta('fiscal_regime_catalog', array['select']);
select pg_temp.alfa_restore_beta('sat_payment_form_catalog', array['select']);
select pg_temp.alfa_restore_beta('sat_product_service_catalog', array['select']);
select pg_temp.alfa_restore_beta('sat_unit_catalog', array['select']);
select pg_temp.alfa_restore_beta('tax_object_catalog', array['select']);

drop function pg_temp.alfa_restore_beta(text, text[]);

do $$
begin
  if to_regclass('public.quotable_systems') is not null then
    drop policy if exists quotable_systems_internal_manage on public.quotable_systems;
    drop policy if exists "Allow staff to manage quotable_systems" on public.quotable_systems;
    create policy "Allow staff to manage quotable_systems" on public.quotable_systems
      for all to authenticated using (true) with check (true);
    grant all on table public.quotable_systems to anon, authenticated;
  end if;
end $$;

commit;
