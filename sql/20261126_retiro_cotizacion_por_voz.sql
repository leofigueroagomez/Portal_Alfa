-- 2026-11-26: retiro de la cotizacion por voz (Leo: no funciono).
-- Se conserva la tabla quote_voice_drafts (historial de dictados), pero se quita
-- la lectura abierta a cualquier usuario con sesion. Solo service_role.
-- No modifica ni borra datos. Rollback: sql/20261126_retiro_cotizacion_por_voz_rollback.sql

drop policy if exists quote_voice_drafts_authenticated_select on public.quote_voice_drafts;
revoke all on public.quote_voice_drafts from anon, authenticated;

notify pgrst, 'reload schema';
