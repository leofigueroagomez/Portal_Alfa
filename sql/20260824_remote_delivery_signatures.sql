-- ============================================================================
-- Migración: Firma Digital Remota y Recepción de Proyectos
-- Fecha: 2026-08-24
-- ============================================================================

-- 1. Agregar columnas para firma remota y receptor en sitio en project_deliveries
alter table public.project_deliveries
  add column if not exists site_attended_by_name text,
  add column if not exists site_attended_by_role text,
  add column if not exists client_signer_name text,
  add column if not exists client_signer_phone text,
  add column if not exists client_signer_email text,
  add column if not exists client_signed_at timestamptz,
  add column if not exists client_signature_ip text,
  add column if not exists client_signature_user_agent text,
  add column if not exists signature_method text;

-- 2. Actualizar constraint de status en project_deliveries
alter table public.project_deliveries
  drop constraint if exists project_deliveries_status_check;

alter table public.project_deliveries
  add constraint project_deliveries_status_check
  check (status in ('draft', 'pending_signature', 'pending_client_signature', 'delivered', 'accepted'));

-- 3. Constraint para signature_method
alter table public.project_deliveries
  drop constraint if exists project_deliveries_signature_method_check;

alter table public.project_deliveries
  add constraint project_deliveries_signature_method_check
  check (
    signature_method is null
    or signature_method in ('onsite', 'whatsapp_link', 'email_link', 'portal')
  );

-- 4. Actualizar constraint de document_type en public_document_links para admitir firma de entregas
alter table public.public_document_links
  drop constraint if exists public_document_links_document_type_check;

alter table public.public_document_links
  add constraint public_document_links_document_type_check
  check (
    document_type in (
      'project_delivery',
      'project_delivery_sign',
      'project_warranty',
      'service_report',
      'service_report_sign',
      'approved_quote',
      'authorized_plan',
      'project_invoice_pdf',
      'project_invoice_xml'
    )
  );

-- 5. Índices de consulta rápida
create index if not exists project_deliveries_client_signed_at_idx
  on public.project_deliveries(client_signed_at);

create index if not exists project_deliveries_signature_method_idx
  on public.project_deliveries(signature_method);
