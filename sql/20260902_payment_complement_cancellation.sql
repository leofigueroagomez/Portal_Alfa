-- Sprint H — Facturacion: cancelacion de complementos de pago (CFDI tipo P / REP)
-- Fecha: 2026-09-01
-- Docs: docs/modules/facturacion/MODULE_CONTEXT.md
--       ia-cowork/roadmap/sprint-H-cancelacion-fiscal-y-uso-cfdi.md
--
-- Aplicado en produccion como migracion `payment_complement_cancellation_columns`.
-- Aditivo y reversible. Espeja las columnas de cancelacion de project_invoices
-- (migracion add_real_invoice_cancellation, 2026-08-24).
--
-- Rollback:
--   alter table public.project_payment_complements
--     drop column if exists cancellation_motive,
--     drop column if exists cancellation_uuid_replacement,
--     drop column if exists cancellation_status,
--     drop column if exists cancellation_acuse_xml,
--     drop column if exists cancelled_at,
--     drop column if exists cancelled_by_user_id;

alter table public.project_payment_complements
  add column if not exists cancellation_motive text
    check (cancellation_motive in ('01','02','03','04'));
alter table public.project_payment_complements
  add column if not exists cancellation_uuid_replacement text;
alter table public.project_payment_complements
  add column if not exists cancellation_status text
    check (cancellation_status in ('requested','canceled','rejected'));
alter table public.project_payment_complements
  add column if not exists cancellation_acuse_xml text;
alter table public.project_payment_complements
  add column if not exists cancelled_at timestamptz;
alter table public.project_payment_complements
  add column if not exists cancelled_by_user_id uuid references public.profiles(id);

comment on column public.project_payment_complements.cancellation_status is
  'Estado de la solicitud de cancelacion del REP ante el SAT: requested | canceled | rejected. Independiente de status.';

-- Nota: project_payment_complements.status ya admite 'cancelled' (constraint
-- project_payment_complements_status_check). Al cancelar el REP hay que
-- recalcular project_invoices.payment_complement_status de la factura PPD
-- (pending | partial | completed) segun los complementos timbrados que queden.
