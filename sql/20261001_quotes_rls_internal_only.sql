-- =============================================================================
-- Endurecimiento RLS de cotizaciones: quotes + tablas quote_* solo internas.
-- Fecha: 2026-10-01
-- Estado: PROPUESTA. NO APLICADA EN PRODUCCION. Requiere confirmacion explicita
--         de Leo, respaldo y la prueba de la seccion "Verificacion".
-- Rollback: sql/20261001_quotes_rls_internal_only_rollback.sql
--
-- Problema (auditado en produccion jcdnfjitvyfizcsjvwww el 2026-10-01):
--   Nueve tablas de cotizaciones tienen policies beta_authenticated_* con
--   qual/with_check = true para el rol authenticated. Un usuario del portal
--   cliente (role = 'client') o contratista (role = 'contractor') puede leer,
--   modificar y borrar TODAS las cotizaciones (prueba read-only: un cliente
--   portal ve 187 quotes y 2,346 quote_items), incluidos costos, descuentos de
--   aliado y notas internas. Ademas quote_templates, quote_template_lines y
--   quote_voice_drafts tienen select = true para authenticated.
--   sql/20260615_critical_rls_hardening.sql nunca se aplico en produccion
--   (si en sandbox pkqwlvqosooewbejbktx).
--
-- Pre-requisito de despliegue (ORDEN IMPORTA):
--   1. Desplegar primero el cambio de app/portal/projects/[id]/page.tsx, que
--      lee la cotizacion aprobada con service role en vez de la sesion del
--      cliente. Si se aplica esta migracion antes, la tarjeta "Cotizacion
--      autorizada" del portal desaparece (no rompe la pagina, solo la oculta).
--   2. Aplicar esta migracion.
--
-- Diseno:
--   - SELECT/INSERT/UPDATE/DELETE: is_internal_user() (perfil activo con
--     is_internal = true). Mismo patron que quote_blind_item_details.
--   - Sin policies para portal cliente/contratista: el portal y los documentos
--     publicos por token leen cotizaciones con createSupabaseAdminClient()
--     despues de validar proyecto/token en servidor. Una policy de fila para el
--     portal (como *_select_internal_or_portal_approved de 20260615) expondria
--     TODAS las columnas de la cotizacion aprobada (costos, partner_*_discount_*)
--     via PostgREST; por eso no se crea y se eliminan si existen.
--   - No se usa la granularidad por rol de 20260615 (delete solo
--     admin/direccion): el editor de cotizaciones borra y recrea secciones y
--     partidas, asi que rompería la edicion para 'comercial'. Fase 2 opcional.
--   - Se revocan grants innecesarios a anon (no tenia policies; defensa en
--     profundidad) y TRUNCATE/REFERENCES/TRIGGER a authenticated (TRUNCATE no
--     pasa por RLS).
--   - quote_blind_item_details y quote_approvals no cambian de policies (ya
--     estan cerradas); solo se les quitan esos grants.
--   - Idempotente; omite tablas que no existan en el entorno.
-- =============================================================================

begin;

-- 1) Tablas con policies abiertas -> solo internos (CRUD).
do $$
declare
  t text;
  p text;
  tables text[] := array[
    'quotes',
    'quote_groups',
    'quote_sections',
    'quote_items',
    'quote_item_area_allocations',
    'quote_item_labor_activities',
    'quote_diagnostic_blocks',
    'quote_misc_items',
    'quote_terms_settings'
  ];
begin
  foreach t in array tables loop
    if to_regclass(format('public.%I', t)) is null then
      raise notice 'omitida (no existe): %', t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    foreach p in array array[
      'beta_authenticated_select',
      'beta_authenticated_insert',
      'beta_authenticated_update',
      'beta_authenticated_delete',
      -- policies de sql/20260615_critical_rls_hardening.sql (solo sandbox)
      t || '_select_internal_or_portal_approved',
      t || '_insert_commercial_engineering',
      t || '_update_commercial_engineering',
      t || '_delete_admin_direction',
      t || '_internal_select',
      t || '_internal_insert',
      t || '_internal_update',
      t || '_internal_delete'
    ] loop
      execute format('drop policy if exists %I on public.%I', p, t);
    end loop;

    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_internal_user())',
      t || '_internal_select', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_internal_user())',
      t || '_internal_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_internal_user()) with check (public.is_internal_user())',
      t || '_internal_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_internal_user())',
      t || '_internal_delete', t);
  end loop;
end $$;

-- 2) Tablas con select = true para authenticated -> select solo internos.
--    La escritura sigue sin policy (server actions con service role).
do $$
declare
  t text;
begin
  foreach t in array array['quote_templates', 'quote_template_lines', 'quote_voice_drafts'] loop
    if to_regclass(format('public.%I', t)) is null then
      raise notice 'omitida (no existe): %', t;
      continue;
    end if;

    execute format('drop policy if exists %I on public.%I', t || '_authenticated_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_internal_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_internal_user())',
      t || '_internal_select', t);
  end loop;
end $$;

-- 3) Grants: anon no usa estas tablas (rutas publicas usan service role) y
--    TRUNCATE/REFERENCES/TRIGGER no los usa la app.
do $$
declare
  t text;
begin
  foreach t in array array[
    'quotes',
    'quote_groups',
    'quote_sections',
    'quote_items',
    'quote_item_area_allocations',
    'quote_item_labor_activities',
    'quote_diagnostic_blocks',
    'quote_misc_items',
    'quote_terms_settings',
    'quote_templates',
    'quote_template_lines',
    'quote_voice_drafts',
    'quote_blind_item_details',
    'quote_approvals'
  ] loop
    if to_regclass(format('public.%I', t)) is null then
      continue;
    end if;
    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke truncate, references, trigger on table public.%I from authenticated', t);
  end loop;
end $$;

commit;

-- =============================================================================
-- Verificacion (solo lectura; correr despues de aplicar).
-- =============================================================================
-- a) Ninguna policy abierta en quote_*:
--    select tablename, policyname, cmd, qual, with_check
--    from pg_policies
--    where schemaname = 'public' and tablename like 'quote%'
--      and (qual = 'true' or with_check = 'true');
--    -- esperado: 0 filas
--
-- b) Simulacion como usuario portal cliente (esperado: todo en 0):
--    begin read only;
--    select set_config('request.jwt.claims', json_build_object(
--      'sub', (select id from profiles where role = 'client' and is_active limit 1),
--      'role', 'authenticated')::text, true);
--    set local role authenticated;
--    select (select count(*) from quotes) q, (select count(*) from quote_items) qi,
--           (select count(*) from quote_groups) qg, (select count(*) from quote_sections) qs;
--    rollback;
--
-- c) Misma simulacion con un usuario interno activo (admin/direccion/comercial):
--    los conteos deben ser iguales a los de service role.
--
-- d) Prueba manual en la app:
--    - Interno: listar, crear, editar (borra/recrea partidas), nueva version,
--      aprobar, borrar borrador, PDF Premium, imprimir, dashboards, compras
--      (recalcular), facturar desde cotizacion.
--    - Portal cliente: /portal/projects/[id] muestra "Cotizacion autorizada"
--      y /public/documents/[token]/quote abre.
--    - Contratista: /portal sin cambios (no usa cotizaciones).
