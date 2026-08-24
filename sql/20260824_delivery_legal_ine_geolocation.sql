-- ============================================================================
-- Migración: Soporte Legal de INE, Geolocalización y Cumplimiento LFPDPPP
-- Fecha: 2026-08-24
-- ============================================================================

alter table public.project_deliveries
  add column if not exists client_ine_front_url text,
  add column if not exists client_ine_back_url text,
  add column if not exists signature_latitude double precision,
  add column if not exists signature_longitude double precision,
  add column if not exists signature_geo_accuracy_meters double precision,
  add column if not exists signature_geo_timestamp timestamptz,
  add column if not exists privacy_consent_accepted boolean not null default false,
  add column if not exists privacy_consent_accepted_at timestamptz,
  add column if not exists privacy_notice_version text default 'v1.0';

-- Índices de consulta
create index if not exists project_deliveries_geo_idx
  on public.project_deliveries(signature_latitude, signature_longitude);

create index if not exists project_deliveries_privacy_consent_idx
  on public.project_deliveries(privacy_consent_accepted, privacy_consent_accepted_at);
