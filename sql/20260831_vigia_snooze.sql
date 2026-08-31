-- El Vigia - "Posponer" real (review R2).
--
-- Antes, "posponer" solo ponia status='reconocido' y guardaba la fecha como texto
-- en decision_note; el hallazgo seguia en el brief y en el impacto y nada lo
-- reactivaba. Ahora hay un estado 'pospuesto' + columna snooze_until:
--   - el brief y la Bandeja excluyen los 'pospuesto'
--   - el runner (reactivateExpiredSnoozes) los vuelve a 'abierto' al vencer la fecha
--
-- Aditivo: una columna nueva + ampliar el check de status. Aplicado a prod 2026-08-31.

alter table public.vigia_findings
  add column if not exists snooze_until timestamptz;

alter table public.vigia_findings
  drop constraint if exists vigia_findings_status_check;

alter table public.vigia_findings
  add constraint vigia_findings_status_check
  check (status in (
    'abierto',
    'reconocido',
    'descartado',
    'resuelto',
    'auto_aplicado',
    'expirado',
    'pospuesto'
  ));

create index if not exists vigia_findings_snooze_idx
  on public.vigia_findings (snooze_until)
  where status = 'pospuesto';

notify pgrst, 'reload schema';
