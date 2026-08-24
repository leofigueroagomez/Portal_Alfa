-- ============================================================================
-- Migración: Levantamiento de Tickets, Horarios, Modalidad Remota y Agenda
-- Fecha: 2026-08-25
-- ============================================================================

alter table public.service_reports
  add column if not exists is_remote boolean not null default false,
  add column if not exists requester_name text,
  add column if not exists requester_phone text,
  add column if not exists scheduled_time_start text default '10:00',
  add column if not exists scheduled_time_end text default '12:00',
  add column if not exists technician_phone text,
  add column if not exists google_calendar_event_url text;

-- Índices para búsqueda por fecha y técnico
create index if not exists service_reports_service_date_idx
  on public.service_reports(service_date);

create index if not exists service_reports_performed_by_name_idx
  on public.service_reports(performed_by_name);
