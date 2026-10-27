-- =============================================================================
-- RLS P1 (fiscal / financiero / PII): tablas de negocio solo para internos.
-- Fecha: 2026-10-01
-- Estado: PROPUESTA. NO APLICADA EN PRODUCCION. Requiere confirmacion explicita
--         de Leo, respaldo y la prueba de la seccion "Verificacion".
-- Rollback: sql/20261001e_rls_internal_only_p1_fiscal_pii_rollback.sql
--
-- Problema (auditado en produccion jcdnfjitvyfizcsjvwww el 2026-10-01):
--   sql/20260615_critical_rls_hardening.sql nunca se aplico en produccion (si en
--   sandbox pkqwlvqosooewbejbktx). 53 tablas fuera de quote_* conservan
--   beta_authenticated_{select,insert,update,delete} con true para
--   authenticated: un usuario portal cliente (role 'client') o contratista
--   (role 'contractor') lee, modifica y borra datos de TODOS los clientes.
--   Ademas, fuera del patron beta_*: project_contracts (ALL true; RFC, CURP,
--   INE, firmas), contractor_portal_users (ALL true: cualquier usuario puede
--   insertarse como usuario de un contratista), contractor_signed_agreements
--   (select "user_id = auth.uid() OR true"; CLABE, RFC, CURP, INE), suppliers
--   (ALL true) y project_members (select true).
--
-- Pre-requisito de despliegue (ORDEN IMPORTA):
--   1. Desplegar primero el codigo que mueve las lecturas del portal a service
--      role despues de validar acceso (lib/clientPortal.ts, lib/contractorPortal.ts,
--      app/portal/page.tsx, app/portal/projects/[id]/page.tsx,
--      app/portal/services/[id]/page.tsx, app/portal/services/[id]/contractorActions.ts).
--      Si se aplica esta migracion antes, el portal cliente y el de contratistas
--      quedan vacios (proyectos, saldos, servicios, ordenes) y el contratista no
--      puede actualizar su servicio.
--   2. Aplicar sql/20261001_quotes_rls_internal_only.sql (cotizaciones), si no
--      se ha aplicado. Es independiente de esta.
--   3. Aplicar esta migracion. Despues, la P2 (20261001f) y Vigia (20261001d).
--
-- Diseno (mismo patron que 20261001_quotes_rls_internal_only.sql):
--   - Se BORRAN TODAS las policies existentes de cada tabla listada (beta_*,
--     las de 20260615 en sandbox y cualquier otra) y se crean
--     <tabla>_internal_{select,insert,update,delete} con public.is_internal_user(),
--     solo para los comandos que hoy existen en produccion.
--   - project_invoices / project_invoice_items conservan los candados de estado
--     que ya tenian las policies beta (update solo issued/paid; delete solo
--     borrador sin facturama_id), ahora ademas exigiendo is_internal_user().
--   - Sin policies de fila para portal cliente/contratista en tablas de negocio:
--     una policy de fila expondria TODAS las columnas via PostgREST
--     (facturama_response, costos, notas internas, RFC del cliente al
--     contratista...). El portal lee con service role, filtrando por
--     client_id / proyectos asignados / contractor_id ya validados.
--   - Se conservan (o recrean identicas) las policies "self" que el portal SI
--     usa con la sesion: contractor_portal_users_select_self y lectura propia de
--     contractor_signed_agreements. client_portal_users y
--     client_portal_project_access no se tocan.
--   - contractor_signed_agreements: insert solo service role
--     (app/portal/contractor-agreement/actions.ts ya usa service role).
--   - No se usa la granularidad por rol de 20260615 (delete solo admin/direccion,
--     etc.): hoy en produccion todo interno puede todo; cambiarlo es Fase 2.
--   - Grants: REVOKE ALL a anon (no tiene policies; defensa en profundidad) y
--     REVOKE TRUNCATE/REFERENCES/TRIGGER a authenticated (TRUNCATE no pasa por RLS).
--   - Idempotente; omite tablas que no existan en el entorno.
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

-- 1) Fiscal y financiero.
select pg_temp.alfa_internal_only('clients', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('client_projects', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('projects', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('project_invoices', array['select','insert']);
select pg_temp.alfa_internal_only('project_invoice_items', array['select','insert','update']);
select pg_temp.alfa_internal_only('project_payments', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('project_payment_complements', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('project_payment_audit_log', array['select','insert']);
select pg_temp.alfa_internal_only('fiscal_document_email_logs', array['select','insert']);
select pg_temp.alfa_internal_only('invoice_email_logs', array['select','insert']);
select pg_temp.alfa_internal_only('company_settings', array['select','update']);
select pg_temp.alfa_internal_only('public_document_links', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('documents', array['select','insert','update','delete']);

-- 2) PII de clientes, prospectos, contratistas y proveedores.
select pg_temp.alfa_internal_only('leads', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('contractors', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('contractor_account_movements', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('project_contracts', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('suppliers', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('project_members', array['select']);
select pg_temp.alfa_internal_only('notification_events', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('notification_recipients', array['select','insert','update','delete']);

-- 3) Servicios, ordenes de trabajo, entregas y garantias (portal / contratista).
select pg_temp.alfa_internal_only('service_reports', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('service_report_photos', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('service_report_email_history', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('work_orders', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('work_order_activities', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('project_deliveries', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('project_warranties', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('project_delivery_email_history', array['select','insert','update','delete']);

-- 4) Usuarios portal de contratistas y acuerdos firmados.
select pg_temp.alfa_internal_only('contractor_portal_users', array['select','insert','update','delete']);
select pg_temp.alfa_internal_only('contractor_signed_agreements', array['select']);

-- 5) Candados especiales y policies "self".
do $$
begin
  if to_regclass('public.project_invoices') is not null then
    -- Mismos candados de estado que tenian las policies beta, solo internos.
    create policy project_invoices_internal_update on public.project_invoices
      for update to authenticated
      using (public.is_internal_user() and status = any (array['issued'::text, 'paid'::text]))
      with check (public.is_internal_user() and status = any (array['issued'::text, 'paid'::text]));
    create policy project_invoices_internal_delete on public.project_invoices
      for delete to authenticated
      using (public.is_internal_user() and status = 'draft'::text and facturama_id is null);
  end if;

  if to_regclass('public.project_invoice_items') is not null then
    create policy project_invoice_items_internal_delete on public.project_invoice_items
      for delete to authenticated
      using (
        public.is_internal_user()
        and exists (
          select 1 from public.project_invoices pi
          where pi.id = project_invoice_items.project_invoice_id
            and pi.status = 'draft'::text
            and pi.facturama_id is null
        )
      );
  end if;

  if to_regclass('public.contractor_portal_users') is not null then
    -- lib/contractorPortal.ts lee su propia fila con la sesion.
    create policy contractor_portal_users_select_self on public.contractor_portal_users
      for select to authenticated
      using (user_id = auth.uid());
  end if;

  if to_regclass('public.contractor_signed_agreements') is not null then
    -- getContractorSignedAgreement() lee el acuerdo propio con la sesion.
    create policy contractor_signed_agreements_select_self on public.contractor_signed_agreements
      for select to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

drop function pg_temp.alfa_internal_only(text, text[]);

commit;

-- =============================================================================
-- Verificacion (solo lectura; correr despues de aplicar).
-- =============================================================================
-- a) Ninguna policy abierta en las tablas de esta migracion (esperado: 0 filas):
--    select tablename, policyname, cmd, qual, with_check
--    from pg_policies
--    where schemaname = 'public'
--      and (qual = 'true' or with_check = 'true' or qual like '%OR true%')
--      and tablename not in ('quotable_systems');
--
-- b) Simulacion como usuario portal cliente (esperado: todo en 0):
--    begin read only;
--    select set_config('request.jwt.claims', json_build_object(
--      'sub', (select id from profiles where role = 'client' and is_active limit 1),
--      'role', 'authenticated')::text, true);
--    set local role authenticated;
--    select (select count(*) from clients) c, (select count(*) from client_projects) cp,
--           (select count(*) from project_invoices) pi, (select count(*) from project_payments) pp,
--           (select count(*) from service_reports) sr, (select count(*) from project_contracts) pc,
--           (select count(*) from contractor_signed_agreements) csa;
--    rollback;
--    Repetir con role = 'contractor': contractor_portal_users y
--    contractor_signed_agreements deben devolver SOLO sus filas propias.
--
-- c) Misma simulacion con un usuario interno activo: conteos iguales a service role.
--
-- d) Prueba manual en la app:
--    - Interno: clientes, proyectos, facturacion (crear/editar borrador, timbrar,
--      cancelar, complementos), pagos, servicios, ordenes de trabajo, entregas,
--      garantias, contratos, contratistas, proveedores, leads, notificaciones,
--      configuracion (company_settings), documentos publicos.
--    - Portal cliente: /portal (proyectos, saldos, servicios), /portal/projects/[id]
--      (facturas, pagos, entregas, garantias, cotizacion, planos) y
--      /portal/services/[id] (fotos, facturas), /public/documents/[token]/*.
--    - Contratista: /portal (servicios y ordenes), /portal/services/[id]
--      (actualizar estado, subir foto), /portal/contractor-agreement.
--    - Conocido: /api/invoices/[id]/{pdf,xml,cancellation-acuse} y
--      /api/payment-complements/[id]/{pdf,xml,cancellation-acuse} hacen una
--      lectura previa con la sesion; para un usuario portal devolveran 404.
--      El portal no las enlaza (usa /public/documents/[token]/*).
