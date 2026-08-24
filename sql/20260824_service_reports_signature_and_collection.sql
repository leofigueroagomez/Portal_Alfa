-- ============================================================================
-- Migración: Homologación de Firma Digital Remota y Cobranza para Servicios
-- Fecha: 2026-08-24
-- ============================================================================

-- 1. Agregar columnas de firma, legalidad y cobranza a service_reports
alter table public.service_reports
  add column if not exists client_signature_image_url text,
  add column if not exists alfa_signature_image_url text,
  add column if not exists client_signer_name text,
  add column if not exists client_signer_email text,
  add column if not exists client_signer_phone text,
  add column if not exists client_signed_at timestamptz,
  add column if not exists signature_method text default 'whatsapp_link',
  add column if not exists client_signature_ip text,
  add column if not exists client_signature_user_agent text,
  add column if not exists client_ine_front_url text,
  add column if not exists client_ine_back_url text,
  add column if not exists signature_latitude double precision,
  add column if not exists signature_longitude double precision,
  add column if not exists signature_geo_accuracy_meters double precision,
  add column if not exists privacy_consent_accepted boolean not null default false,
  add column if not exists payment_status text not null default 'pending_payment',
  add column if not exists paid_at timestamptz,
  add column if not exists payment_method text,
  add column if not exists payment_reference text,
  add column if not exists payment_link_url text,
  add column if not exists last_payment_reminder_sent_at timestamptz,
  add column if not exists payment_reminders_count integer default 0;

-- Constraint para payment_status si no existe
do $$
begin
  alter table public.service_reports
    drop constraint if exists service_reports_payment_status_check;
  alter table public.service_reports
    add constraint service_reports_payment_status_check
    check (payment_status in ('pending_payment', 'paid', 'cancelled', 'waived'));
exception
  when others then null;
end $$;

-- 2. Índices para cobranza y búsquedas rápidas
create index if not exists service_reports_payment_status_idx
  on public.service_reports(payment_status);

create index if not exists service_reports_client_signed_at_idx
  on public.service_reports(client_signed_at);

-- 3. Soporte para enlaces públicos de servicio
alter table public.public_document_links
  alter column client_project_id drop not null;

alter table public.public_document_links
  add column if not exists service_report_id bigint references public.service_reports(id) on delete cascade;

create index if not exists public_document_links_service_report_id_idx
  on public.public_document_links(service_report_id);

-- Actualizar constraint de document_type en public_document_links
do $$
begin
  alter table public.public_document_links
    drop constraint if exists public_document_links_document_type_check;
  alter table public.public_document_links
    add constraint public_document_links_document_type_check
    check (document_type in (
      'project_delivery',
      'project_delivery_sign',
      'project_warranty',
      'service_report',
      'service_report_sign',
      'approved_quote',
      'authorized_plan',
      'project_invoice_pdf',
      'project_invoice_xml'
    ));
exception
  when others then null;
end $$;
