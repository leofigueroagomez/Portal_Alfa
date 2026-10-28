-- Rollback de 20261028_whatsapp_agent.sql.
--
-- Borra las conversaciones del agente (no toca leads ni clientes) y regresa
-- leads_source_check a su lista anterior. Si ya hay leads con source
-- 'WhatsApp', se pasan a 'Prospectación Directa' antes de restaurar el check.

drop table if exists public.whatsapp_agent_messages;
drop table if exists public.whatsapp_agent_inbound;
drop table if exists public.whatsapp_agent_conversations;

update public.leads set source = 'Prospectación Directa' where source = 'WhatsApp';

alter table public.leads drop constraint if exists leads_source_check;
alter table public.leads
  add constraint leads_source_check
  check (source = any (array[
    'Landing Web'::text,
    'Referido'::text,
    'LinkedIn'::text,
    'Google'::text,
    'Prospectación Directa'::text,
    'Cliente Existente'::text
  ]));
