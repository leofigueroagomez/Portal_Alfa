-- =============================================================================
-- ROLLBACK de sql/20261001d_vigia_internal_only.sql
-- Restaura EXACTAMENTE el estado auditado en produccion el 2026-10-01:
--   - vistas vigia_v_* sin security_invoker y con SELECT para authenticated
--     (anon ya no tenia grants desde la auditoria 2026-09-01);
--   - tablas vigia_* con policy vigia_authenticated_select = true y grants
--     completos a anon/authenticated.
-- ADVERTENCIA: reabre la lectura de datos de negocio a usuarios portal.
-- =============================================================================

begin;

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
    execute format('alter view public.%I reset (security_invoker)', v.relname);
    execute format('grant select on table public.%I to authenticated', v.relname);
  end loop;
end $$;

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
      continue;
    end if;
    execute format('drop policy if exists vigia_internal_select on public.%I', t);
    execute format('drop policy if exists vigia_authenticated_select on public.%I', t);
    execute format(
      'create policy vigia_authenticated_select on public.%I for select to authenticated using (true)',
      t);
    execute format('grant all on table public.%I to anon, authenticated', t);
  end loop;
end $$;

commit;
