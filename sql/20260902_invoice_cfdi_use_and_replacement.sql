-- Sprint H — Facturacion: cancelacion fiscal completa + uso de CFDI editable por factura
-- Fecha: 2026-09-01
-- Docs: docs/modules/facturacion/MODULE_CONTEXT.md
--       ia-cowork/roadmap/sprint-H-cancelacion-fiscal-y-uso-cfdi.md
--
-- Aplicado en produccion como migracion `invoice_cfdi_use_and_replacement`.
-- Todo es aditivo y reversible. No toca RLS, constraints de importes ni datos existentes.
--
-- Rollback:
--   alter table public.project_invoices
--     drop column if exists cfdi_use,
--     drop column if exists replaces_invoice_id;

-- ---------------------------------------------------------------------------
-- Contexto: columnas de cancelacion CFDI (ya en produccion desde 2026-08-24,
-- migracion `add_real_invoice_cancellation`). Se listan aqui solo como
-- referencia del contrato; NO se re-crean.
--
--   cancellation_motive            text  check in ('01','02','03','04')
--   cancellation_uuid_replacement  text
--   cancellation_status            text  check in ('requested','canceled','rejected')
--   cancellation_acuse_xml         text  (XML del acuse SAT en base64)
--   cancelled_at                   timestamptz
--   cancelled_by_user_id           uuid  references profiles(id)
-- ---------------------------------------------------------------------------

-- H4 — Uso de CFDI (tipo de gasto) del receptor para esta factura en particular.
-- NULL  => heredar del cliente al timbrar (lib/fiscalData.getCfdiUseCode).
-- valor => sobreescribe SOLO esta factura (p. ej. G01 Adquisicion de mercancias
--          vs G03 Gastos en general). Se valida contra cfdi_use_catalog y el
--          tipo de persona en el server action y en el timbrado, no con un constraint.
alter table public.project_invoices
  add column if not exists cfdi_use text;

comment on column public.project_invoices.cfdi_use is
  'Uso de CFDI del receptor para esta factura. NULL = heredar del cliente. Se valida contra cfdi_use_catalog al editar y al timbrar.';

-- H1 — Sustitucion de factura (motivo 01, relacion SAT 04).
-- El borrador sustituto apunta a la factura timbrada que corrige. El CFDI del
-- sustituto se timbra con Relations Type 04 y luego se cancela la original con
-- motivo 01 y uuidReplacement = UUID del sustituto.
alter table public.project_invoices
  add column if not exists replaces_invoice_id bigint references public.project_invoices(id);

comment on column public.project_invoices.replaces_invoice_id is
  'Si esta presente, esta factura sustituye (relacion SAT 04) a la factura indicada. Timbrado con Relations Type 04 + cancelacion de la original con motivo 01.';

create index if not exists project_invoices_replaces_invoice_id_idx
  on public.project_invoices (replaces_invoice_id);
