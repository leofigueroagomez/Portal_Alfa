# Modulo: Facturacion

Contexto para agentes que modifiquen facturas, CFDI, complementos de pago o documentos fiscales.

## Que Hace

Gestiona facturacion fiscal, timbrado CFDI, archivos PDF/XML, complementos de pago, condiciones de pago y envio de documentos fiscales.

Estado inferido: activo y fiscalmente critico.

## Rutas Principales

- `app/(admin)/invoices/page.tsx`
- `app/(admin)/invoices/InvoiceForm.tsx`
- `app/(admin)/invoices/actions.ts`
- `app/api/invoices/[id]/pdf/route.ts`
- `app/api/invoices/[id]/xml/route.ts`
- `app/api/invoices/[id]/send-email/route.ts`
- `app/api/payment-complements/[id]/pdf/route.ts`
- `app/api/payment-complements/[id]/xml/route.ts`

## Archivos Clave

- `app/(admin)/invoices/StampInvoiceButton.tsx`
- `app/(admin)/invoices/PaymentComplementPanel.tsx`
- `app/(admin)/invoices/paymentComplementActions.ts`
- `app/(admin)/invoices/InvoiceFileLinks.tsx`
- `app/(admin)/invoices/InvoiceStatusSelect.tsx`
- `lib/facturama.ts`
- `lib/invoices.ts`
- `lib/invoiceFolios.ts`
- `lib/paymentComplements.ts`
- `lib/paymentTerms.ts`
- `lib/satBillingProviders.ts`
- `lib/satCatalogSearch.ts`
- `lib/fiscalData.ts`
- `lib/fiscalDocumentsEmail.ts`
- `lib/cfdiDescription.ts`
- `lib/productFiscalData.ts`

## Base De Datos / SQL Detectado

Migraciones relevantes detectadas:

- `sql/20260602_internal_invoicing.sql`
- `sql/20260603_invoice_payment_terms.sql`
- `sql/20260604_payment_complements.sql`
- `sql/20260604_invoice_quote_discounts.sql`
- `sql/20260604_invoice_email_logs.sql`
- `sql/20260604_fiscal_document_email_logs.sql`
- `sql/20260604_cfdi_descriptions.sql`
- `sql/generated/sat_catalog_seed.sql`

Tablas inferidas por nombres de migraciones/codigo:

- `invoices` o tablas internas de facturacion: Pendiente de confirmar nombre exacto.
- `payment_complements` o equivalente: Pendiente de confirmar nombre exacto.
- logs de envio fiscal: Pendiente de confirmar nombre exacto.
- catalogos SAT: Pendiente de confirmar estructura exacta.

## Flujos Principales

- Crear factura desde datos fiscales/proyecto/cotizacion.
- Validar conceptos, impuestos, descuentos y totales.
- Timbrar CFDI con Facturama.
- Descargar/servir PDF y XML.
- Enviar documentos por correo.
- Registrar y timbrar complementos de pago.

## Reglas Criticas

- No modificar logica fiscal sin pruebas y caso de negocio claro.
- No debilitar validaciones de CFDI para "hacer pasar" un timbrado.
- No usar credenciales productivas para pruebas.
- Revisar `docs/SETUP_SANDBOX.md` antes de tocar Facturama o complementos.
- Mantener consistencia de zona horaria Mexico cuando el flujo fiscal lo requiera.

## Riesgos

- Errores fiscales pueden producir CFDI invalidos o documentos timbrados incorrectamente.
- Ajustes de redondeo afectan subtotal, IVA, descuentos y totales.
- Cambios en PDF/XML publicos pueden exponer documentos.
- Reintentos o botones pueden duplicar timbrados/envios si no hay guards.

## Validacion Minima Recomendada

- Probar en sandbox fiscal.
- Validar payload antes de timbrar.
- Validar PDF/XML servidos por API.
- Probar complemento de pago si el cambio toca pagos.
- Ejecutar `npx tsc --noEmit`, `npm run build` y `git diff --check` cuando haya codigo.

## Documentos Relacionados

- [`../../ai/SECURITY_RULES.md`](../../ai/SECURITY_RULES.md)
- [`../../SETUP_SANDBOX.md`](../../SETUP_SANDBOX.md)
