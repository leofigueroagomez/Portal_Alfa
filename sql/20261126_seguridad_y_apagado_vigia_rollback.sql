-- Rollback de sql/20261126_seguridad_y_apagado_vigia.sql
-- Devuelve los permisos al estado previo (el reporte de seguridad volvera a marcarlos).

alter table backups.project_payments_20261104 disable row level security;
alter table backups.project_payment_complements_20261104 disable row level security;

grant execute on function public.next_project_invoice_internal_folio() to public, anon, authenticated, service_role;
grant execute on function public.next_project_profitability_report_number() to public, anon, authenticated, service_role;
grant execute on function public.ensure_current_user_profile() to public, anon, authenticated, service_role;
grant execute on function public.handle_new_user_profile() to public, anon, authenticated, service_role;

do $$
declare v record;
begin
  for v in
    select c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v' and c.relname like 'vigia\_v\_%'
  loop
    execute format('alter view public.%I reset (security_invoker)', v.relname);
    execute format('grant select on public.%I to authenticated, service_role', v.relname);
  end loop;
end $$;

grant select on public.vigia_action_backups, public.vigia_audit_log, public.vigia_findings,
  public.vigia_investigations, public.vigia_sensor_runs to anon, authenticated;

create policy vigia_authenticated_select on public.vigia_action_backups for select to authenticated using (true);
create policy vigia_authenticated_select on public.vigia_audit_log for select to authenticated using (true);
create policy vigia_authenticated_select on public.vigia_findings for select to authenticated using (true);
create policy vigia_authenticated_select on public.vigia_investigations for select to authenticated using (true);
create policy vigia_authenticated_select on public.vigia_sensor_runs for select to authenticated using (true);

notify pgrst, 'reload schema';
