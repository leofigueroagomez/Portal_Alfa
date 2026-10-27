-- =============================================================================
-- RLS P2 (operacion, compras, productos y catalogos): solo internos.
-- Fecha: 2026-10-01
-- Estado: PROPUESTA. NO APLICADA EN PRODUCCION. Requiere confirmacion explicita
--         de Leo, respaldo y la prueba de la seccion "Verificacion".
-- Rollback: sql/20261001f_rls_internal_only_p2_operations_rollback.sql
--
-- Problema: igual que la P1 (sql/20261001e_rls_internal_only_p1_fiscal_pii.sql).
--   Estas tablas tienen beta_authenticated_* = true en produccion. Riesgo menor
--   que la P1 (sin datos fiscales ni PII directa), pero exponen costos de compra,
--   proveedores, cantidades, notas de visita, fotos de obra y el catalogo de
--   productos con costos, y permiten a un usuario portal modificarlos o borrarlos.
--   quotable_systems tiene ademas "Allow staff to manage quotable_systems"
--   (ALL true para authenticated): un usuario portal puede editar el catalogo
--   publico.
--
-- Lectores no internos (codigo, 2026-10-01): ninguno con sesion. Las rutas
-- publicas por token que leen project_delivery_evidences /
-- project_delivery_pending_items usan service role.
--
-- Diseno: mismo helper que la P1 (borra TODAS las policies de la tabla y crea
-- <tabla>_internal_* con is_internal_user() para los comandos que hoy existen).
-- Los 6 catalogos SAT/fiscales solo tienen select en produccion; quedan select
-- solo internos. quotable_systems conserva su lectura publica (catalogo
-- publico, sin PII) y solo cambia la policy de gestion.
-- Idempotente; omite tablas que no existan en el entorno.
-- =============================================================================

begin;

create or replace function pg_temp.alfa_internal_only(p_table text, p_cmds text[])
returns void
language plpgsql
as $fn$
declare
  pol record;
  c text;
begin
  if to_regclass(format('public.%I', p_table)) is null then
    raise notice 'omitida (no existe): %', p_table;
    return;
  end if;

  execute format('alter table public.%I enable row level security', p_table);

  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = p_table
  loop
    execute format('drop policy %I on public.%I', pol.policyname, p_table);
  end loop;

  foreach c in array p_cmds loop
    if c = 'select' then
      execute format(
        'create policy %I on public.%I for select to authenticated using (public.is_internal_user())',
        p_table || '_internal_select', p_table);
    elsif c = 'insert' then
      execute format(
        'create policy %I on public.%I for insert to authenticated with check (public.is_internal_user())',
        p_table || '_internal_insert', p_table);
    elsif c = 'update' then
      execute format(
        'create policy %I on public.%I for update to authenticated using (public.is_internal_user()) with check (public.is_internal_user())',
        p_table || '_internal_update', p_table);
    elsif c = 'delete' then
      execute format(
        'create policy %I on public.%I for delete to authenticated using (public.is_internal_user())',
        p_table || '_internal_delete', p_table);
    else
      raise exception 'comando desconocido: %', c;
    end if;
  end loop;

  execute format('revoke all on table public.%I from anon', p_table);
  execute format('revoke truncate, references, trigger on table public.%I from authenticated', p_table);
end
$fn$;

-- 1) Operacion de proyectos, compras y entregas.
select pg_temp.alfa_internal_only('project_delivery_evidences', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('project_delivery_pending_items', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('project_delivery_systems', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('project_material_deliveries', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('project_material_delivery_items', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('project_operational_items', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('project_operational_item_labor_activities', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('project_purchase_lines', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('project_purchase_events', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('project_photos', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('project_site_visits', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('project_site_visit_notes', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('project_site_visit_note_photos', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('project_translation_changes', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('project_updates', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('engineering_quotes', array['select','insert','update','delete']);

-- 2) Productos y catalogos internos editables.
select pg_temp.alfa_internal_only('products', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('product_categories', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('product_tags', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('product_tag_assignments', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('labor_activity_catalog', array['select','insert','update','delete']);

-- 3) Catalogos SAT / fiscales (solo lectura en produccion).
select pg_temp.alfa_internal_only('cfdi_use_catalog', array['select']);
select pg_temp.alfa_internal_only('fiscal_regime_catalog', array['select']);
select pg_temp.alfa_internal_only('sat_payment_form_catalog', array['select']);
select pg_temp.alfa_internal_only('sat_product_service_catalog', array['select']);
select pg_temp.alfa_internal_only('sat_unit_catalog', array['select']);
select pg_temp.alfa_internal_only('tax_object_catalog', array['select']);

drop function pg_temp.alfa_internal_only(text, text[]);

-- 4) quotable_systems: lectura publica se conserva; gestion solo internos.
do $$
begin
  if to_regclass('public.quotable_systems') is not null then
    drop policy if exists "Allow staff to manage quotable_systems" on public.quotable_systems;
    drop policy if exists quotable_systems_internal_manage on public.quotable_systems;
    create policy quotable_systems_internal_manage on public.quotable_systems
      for all to authenticated
      using (public.is_internal_user())
      with check (public.is_internal_user());
    revoke insert, update, delete, truncate, references, trigger on table public.quotable_systems from anon;
    revoke truncate, references, trigger on table public.quotable_systems from authenticated;
  end if;
end $$;

commit;

-- =============================================================================
-- Verificacion (solo lectura; correr despues de aplicar).
-- =============================================================================
-- a) Sin policies beta_* en todo public (esperado: 0 filas, si P1, P2 y
--    cotizaciones estan aplicadas):
--    select tablename, policyname from pg_policies
--    where schemaname = 'public' and policyname like 'beta_%';
-- b) Como usuario portal (JWT simulado): products, project_purchase_lines,
--    project_operational_items, project_site_visit_notes -> 0 filas;
--    quotable_systems -> sigue legible.
-- c) App (interno): compras (recalcular, editar lineas, eventos), entregas de
--    material, visitas de obra con fotos, entregas (evidencias, pendientes,
--    sistemas), productos/categorias/etiquetas, catalogo de mano de obra,
--    ingenieria, facturacion (catalogos SAT en el formulario), sistemas
--    cotizables. Publico: /public/documents/[token] de entrega.
