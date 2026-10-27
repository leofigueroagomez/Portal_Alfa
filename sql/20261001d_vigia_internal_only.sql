-- =============================================================================
-- El Vigia: vistas vigia_v_* y tablas vigia_* solo para internos / service role.
-- Fecha: 2026-10-01
-- Estado: PROPUESTA. NO APLICADA EN PRODUCCION. Requiere confirmacion explicita
--         de Leo y la prueba de la seccion "Verificacion".
-- Rollback: sql/20261001d_vigia_internal_only_rollback.sql
--
-- Problema (auditado en produccion jcdnfjitvyfizcsjvwww el 2026-10-01):
--   - Las 22 vistas vigia_v_* no tienen security_invoker y tienen GRANT SELECT
--     para authenticated. Corren con los permisos del owner (bypass de RLS), asi
--     que un usuario portal cliente/contratista lee costos, sobrecostos,
--     cotizaciones de alto valor, leads y anticipos faltantes.
--   - vigia_sensor_runs, vigia_findings, vigia_audit_log, vigia_action_backups y
--     vigia_investigations tienen una policy select = true para authenticated.
--
-- Lectores reales (codigo, 2026-10-01):
--   - Vistas: solo lib/vigia/sensors.ts, via service role (cron
--     app/api/vigia/cron/daily y runVigiaNowAction en app/(admin)/vigia/actions.ts).
--   - Tablas: lib/vigia/queries.ts, runner, executors e investigate usan
--     createSupabaseAdminClient(). Paginas internas: /vigia y /director-dashboard.
--
-- Diseno:
--   - Vistas: security_invoker = true (defensa en profundidad) y REVOKE ALL a
--     anon/authenticated. service_role conserva acceso.
--   - Tablas: la policy select pasa de true a is_internal_user(). Sin policies
--     de escritura (la escritura sigue siendo solo service role).
--   - Idempotente; omite objetos que no existan (el sandbox no tiene las vistas).
-- =============================================================================

begin;

-- 1) Vistas vigia_v_*.
do $$
declare
  v record;
begin
  for v in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'v'
      and c.relname like 'vigia\_v\_%'
  loop
    execute format('alter view public.%I set (security_invoker = true)', v.relname);
    execute format('revoke all on table public.%I from anon, authenticated', v.relname);
  end loop;
end $$;

-- 2) Tablas vigia_*: select solo internos.
do $$
declare
  t text;
begin
  foreach t in array array[
    'vigia_sensor_runs',
    'vigia_findings',
    'vigia_audit_log',
    'vigia_action_backups',
    'vigia_investigations'
  ] loop
    if to_regclass(format('public.%I', t)) is null then
      raise notice 'omitida (no existe): %', t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists vigia_authenticated_select on public.%I', t);
    execute format('drop policy if exists vigia_internal_select on public.%I', t);
    execute format(
      'create policy vigia_internal_select on public.%I for select to authenticated using (public.is_internal_user())',
      t);
    execute format('revoke all on table public.%I from anon', t);
    execute format('revoke insert, update, delete, truncate, references, trigger on table public.%I from authenticated', t);
  end loop;
end $$;

commit;

-- =============================================================================
-- Verificacion (solo lectura; correr despues de aplicar).
-- =============================================================================
-- a) Ninguna vista vigia_v_* con grant a anon/authenticated (esperado: 0 filas):
--    select table_name, grantee, privilege_type
--    from information_schema.role_table_grants
--    where table_schema = 'public' and table_name like 'vigia_v_%'
--      and grantee in ('anon', 'authenticated');
--
-- b) Como usuario portal (JWT simulado, ver SECURITY_RULES.md):
--    select count(*) from vigia_v_vta02_stale_high_value_quotes; -- 42501
--    select count(*) from vigia_findings;                         -- 0
--
-- c) App: correr "Correr ahora" en /vigia (runVigiaNowAction) y revisar que el
--    run quede en vigia_sensor_runs sin errores; abrir /vigia y
--    /director-dashboard como admin.
