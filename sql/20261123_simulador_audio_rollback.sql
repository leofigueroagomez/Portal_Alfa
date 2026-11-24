-- Rollback de 20261123_simulador_audio.sql.
--
-- Antes de correrlo: los leads con source = 'Simulador de Audio' violarian el
-- check anterior. Este script los pasa a 'Landing Web' (el servicio del lead
-- sigue diciendo "Simulador de audio", asi que el origen no se pierde).
--
-- Borra simulator_access y simulator_designs con todo su contenido. Los leads
-- ya creados se conservan.

update public.leads
  set source = 'Landing Web'
  where source = 'Simulador de Audio';

alter table public.leads drop constraint if exists leads_source_check;
alter table public.leads
  add constraint leads_source_check
  check (source = any (array[
    'Landing Web'::text,
    'Referido'::text,
    'LinkedIn'::text,
    'Google'::text,
    'Prospectación Directa'::text,
    'Cliente Existente'::text,
    'WhatsApp'::text
  ]));

drop table if exists public.simulator_designs;
drop table if exists public.simulator_access;

notify pgrst, 'reload schema';
