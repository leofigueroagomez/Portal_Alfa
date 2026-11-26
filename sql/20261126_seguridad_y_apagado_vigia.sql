-- 2026-11-26: endurecimiento de seguridad + apagado del Vigia.
-- Solo permisos / RLS / opciones de vista. No modifica ni borra datos.
-- Rollback: sql/20261126_seguridad_y_apagado_vigia_rollback.sql
-- Motivo: reporte de advisors de Supabase y revision manual del 2026-11-26.

-- 1) Tablas de respaldo sin RLS (esquema backups). Ya no eran alcanzables por la
--    API (sin USAGE ni SELECT para anon/authenticated); se agrega la proteccion en capas.
alter table backups.project_payments_20261104 enable row level security;
alter table backups.project_payment_complements_20261104 enable row level security;

-- 2) Funciones SECURITY DEFINER ejecutables sin sesion.
--    Los folios son DEFAULT de columna: los usan authenticated y service_role al insertar.
revoke execute on function public.next_project_invoice_internal_folio() from public, anon;
grant execute on function public.next_project_invoice_internal_folio() to authenticated, service_role;

revoke execute on function public.next_project_profitability_report_number() from public, anon;
grant execute on function public.next_project_profitability_report_number() to authenticated, service_role;

-- La usa app/login/page.tsx con sesion (authenticated).
revoke execute on function public.ensure_current_user_profile() from public, anon;
grant execute on function public.ensure_current_user_profile() to authenticated, service_role;

-- Funcion de trigger: no debe ser invocable como RPC.
revoke execute on function public.handle_new_user_profile() from public, anon, authenticated;
grant execute on function public.handle_new_user_profile() to service_role;

-- (Se dejan como estan current_profile_role, has_internal_role e is_internal_user:
--  las usan las policies RLS y no exponen datos.)

-- 3) Vigia apagado: vistas de deteccion solo para service_role y con security_invoker.
do $$
declare v record;
begin
  for v in
    select c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v' and c.relname like 'vigia\_v\_%'
  loop
    execute format('alter view public.%I set (security_invoker = true)', v.relname);
    execute format('revoke all on public.%I from public, anon, authenticated', v.relname);
    execute format('grant select on public.%I to service_role', v.relname);
  end loop;
end $$;

-- 4) Tablas vigia_*: quitar la lectura abierta a cualquier usuario con sesion.
drop policy if exists vigia_authenticated_select on public.vigia_action_backups;
drop policy if exists vigia_authenticated_select on public.vigia_audit_log;
drop policy if exists vigia_authenticated_select on public.vigia_findings;
drop policy if exists vigia_authenticated_select on public.vigia_investigations;
drop policy if exists vigia_authenticated_select on public.vigia_sensor_runs;

revoke all on public.vigia_action_backups, public.vigia_audit_log, public.vigia_findings,
  public.vigia_investigations, public.vigia_sensor_runs from anon, authenticated;

notify pgrst, 'reload schema';
