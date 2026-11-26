-- Rollback de sql/20261126_retiro_cotizacion_por_voz.sql
grant select on public.quote_voice_drafts to anon, authenticated;
create policy quote_voice_drafts_authenticated_select on public.quote_voice_drafts
  for select to authenticated using (true);
notify pgrst, 'reload schema';
