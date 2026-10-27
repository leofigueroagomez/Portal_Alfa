-- =============================================================================
-- ROLLBACK de sql/20261001_quotes_rls_internal_only.sql
-- Restaura EXACTAMENTE el estado auditado en produccion el 2026-10-01:
--   - policies beta_authenticated_* con true en 9 tablas de cotizaciones;
--   - select = true para authenticated en quote_templates, quote_template_lines
--     y quote_voice_drafts;
--   - grants completos a anon y authenticated en las 14 tablas quote_*.
-- ADVERTENCIA: este estado reabre la exposicion de cotizaciones a usuarios
-- portal/contratista. Usar solo si el endurecimiento rompe un flujo interno y
-- no hay arreglo inmediato; documentar el motivo.
-- En sandbox (donde existian las policies de 20260615) este rollback deja el
-- estado de produccion (beta), no el de 20260615.
-- El cambio de app/portal/projects/[id]/page.tsx (service role) es compatible
-- con ambos estados y no necesita revertirse.
-- =============================================================================

begin;

do $$
declare
  t text;
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
      continue;
    end if;

    execute format('drop policy if exists %I on public.%I', t || '_internal_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_internal_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_internal_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_internal_delete', t);

    execute format('drop policy if exists beta_authenticated_select on public.%I', t);
    execute format('drop policy if exists beta_authenticated_insert on public.%I', t);
    execute format('drop policy if exists beta_authenticated_update on public.%I', t);
    execute format('drop policy if exists beta_authenticated_delete on public.%I', t);

    execute format(
      'create policy beta_authenticated_select on public.%I for select to authenticated using (true)', t);
    execute format(
      'create policy beta_authenticated_insert on public.%I for insert to authenticated with check (true)', t);
    execute format(
      'create policy beta_authenticated_update on public.%I for update to authenticated using (true) with check (true)', t);
    execute format(
      'create policy beta_authenticated_delete on public.%I for delete to authenticated using (true)', t);
  end loop;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array['quote_templates', 'quote_template_lines', 'quote_voice_drafts'] loop
    if to_regclass(format('public.%I', t)) is null then
      continue;
    end if;
    execute format('drop policy if exists %I on public.%I', t || '_internal_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_authenticated_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      t || '_authenticated_select', t);
  end loop;

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
    execute format('grant all on table public.%I to anon, authenticated', t);
  end loop;
end $$;

commit;
