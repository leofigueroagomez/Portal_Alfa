# Modulo: Facturacion

Contexto operativo para agentes que modifiquen facturas, CFDI, complementos de pago, PDF/XML, correos fiscales o datos fiscales.

Estado inferido: activo y fiscalmente critico.

## Que Hace

Gestiona facturacion interna por proyecto, facturas desde cotizacion o captura manual, validacion fiscal de clientes/productos, timbrado CFDI con Facturama, descarga PDF/XML, envio de documentos fiscales por correo y complementos de pago para facturas PPD.

## Mapa Por Flujo

| Flujo | Archivos confirmados | Responsabilidad |
| --- | --- | --- |
| Listar facturas | `app/(admin)/invoices/page.tsx` | Lee `project_invoices`, clientes, proyectos, cotizaciones aprobadas y logs fiscales; muestra acciones de timbrado, status, archivos y correo. |
| Crear factura | `app/(admin)/invoices/InvoiceForm.tsx`, `lib/invoiceFolios.ts` | Valida cliente/proyecto, datos fiscales, conceptos, PUE/PPD, folio interno e inserta `project_invoices` y `project_invoice_items`. |
| Preparar/editar datos fiscales antes de factura | `app/(admin)/invoices/InvoiceForm.tsx`, `lib/fiscalData.ts`, `lib/productFiscalData.ts`, `lib/cfdiDescription.ts` | Corrige datos fiscales de cliente/producto y descripcion CFDI antes de crear la factura. |
| Cambiar estado interno de factura | `app/(admin)/invoices/InvoiceStatusSelect.tsx`, `lib/invoices.ts` | Actualiza `project_invoices.status` entre `draft`, `issued`, `cancelled`, `paid`. No confirma cancelacion ante PAC. |
| Timbrar CFDI | `app/(admin)/invoices/StampInvoiceButton.tsx`, `app/(admin)/invoices/actions.ts`, `lib/facturama.ts` | Valida permisos, factura draft, cliente, catalogos SAT, totales, IVA por concepto y llama Facturama para CFDI de ingreso. |
| Consultar/descargar PDF/XML factura | `app/api/invoices/[id]/pdf/route.ts`, `app/api/invoices/[id]/xml/route.ts`, `lib/facturama.ts` | Valida auth/acceso fiscal al proyecto y descarga archivo desde Facturama si la factura esta `issued` o `paid`. |
| Enviar factura por correo | `app/(admin)/invoices/InvoiceFileLinks.tsx`, `app/api/fiscal-documents/[type]/[id]/email-preview/route.ts`, `app/api/fiscal-documents/[type]/[id]/send-email/route.ts`, `lib/fiscalDocumentsEmail.ts` | Previsualiza y envia documentos fiscales PDF/XML; guarda logs en `fiscal_document_email_logs`. |
| Envio legacy de factura por correo | `app/api/invoices/[id]/send-email/route.ts` | Envia PDF/XML de factura con Resend y registra `invoice_email_logs`. Pendiente confirmar si sigue en uso frente al flujo generico. |
| Crear complemento de pago | `app/(admin)/invoices/PaymentComplementPanel.tsx`, `app/(admin)/invoices/paymentComplementActions.ts`, `lib/paymentComplements.ts` | Crea borrador en `project_payment_complements` para factura PPD emitida, opcionalmente asociado a `project_payments`. |
| Timbrar complemento de pago | `app/(admin)/invoices/paymentComplementActions.ts`, `lib/paymentComplements.ts`, `lib/facturama.ts` | Valida complemento draft, factura PPD emitida, UUID fiscal y saldo; llama Facturama con CFDI tipo `P`. |
| Descargar PDF/XML complemento | `app/api/payment-complements/[id]/pdf/route.ts`, `app/api/payment-complements/[id]/xml/route.ts`, `lib/facturama.ts` | Valida auth/acceso fiscal y descarga complemento desde Facturama usando `complement_env`. |
| Asociar pago a factura/complemento | `app/(admin)/invoices/paymentComplementActions.ts`, `app/(admin)/projects/[id]/account-statement/ProjectPaymentForm.tsx`, `app/(admin)/projects/[id]/account-statement/EditProjectPaymentButton.tsx` | Registra pagos de proyecto en `project_payments`; complemento puede referenciar `project_payment_id`. |
| Vista por proyecto | `app/(admin)/projects/[id]/invoices/page.tsx` | Reutiliza formulario, timbrado, archivos y panel de complementos dentro del contexto de proyecto. |
| Portal cliente | `app/portal/page.tsx`, `app/portal/projects/[id]/page.tsx`, `app/portal/services/[id]/page.tsx`, `lib/clientPortal.ts` | Muestra facturas/saldos y documentos publicos relacionados; cualquier cambio de visibilidad es sensible. |
| Cancelar CFDI | Pendiente de confirmar | No se encontro ruta/accion confirmada que cancele CFDI ante Facturama/SAT. Existe estado interno `cancelled`. |
| Sincronizar/consultar estado fiscal PAC | Pendiente de confirmar | No se encontro flujo dedicado de consulta de estado fiscal remoto; se usan `status`, `facturama_id`, `sat_uuid`, `last_error` y `facturama_response`. |

## Responsabilidad De Archivos Clave

| Archivo | Responsabilidad | Cuando modificar | Riesgos fiscales/tecnicos |
| --- | --- | --- | --- |
| `app/(admin)/invoices/page.tsx` | Vista global de facturacion, metricas, listado y acciones. | Cambios de columnas visibles, filtros, carga de logs, status o acciones. | Puede exponer documentos o acciones fiscales a roles incorrectos si se cambia junto con auth. |
| `app/(admin)/projects/[id]/invoices/page.tsx` | Vista de facturas dentro de proyecto; incluye complementos. | Cambios de flujo contextual por proyecto. | Debe mantenerse alineada con `/invoices` para no duplicar reglas fiscales divergentes. |
| `app/(admin)/invoices/InvoiceForm.tsx` | Crea facturas y conceptos fiscales; valida datos fiscales, origen quote/manual, PUE/PPD y totales. | Cambios de captura, calculo, prorrateo, descripcion CFDI, catalogos SAT o payload de factura. | Alto: puede crear facturas con conceptos invalidos o totales que Facturama rechaza. |
| `app/(admin)/invoices/actions.ts` | Server action `stampProjectInvoice`; valida y timbra CFDI de ingreso. | Cambios de timbrado, validaciones fiscales, payload Facturama, manejo de errores. | Critico: toca CFDI, Facturama, RFC, IVA, UUID y estado `issued`. |
| `app/(admin)/invoices/StampInvoiceButton.tsx` | Boton cliente para timbrar; valida disponibilidad visual y datos fiscales faltantes. | Cambios de UX o bloqueo de timbrado. | No debe sustituir validaciones server-side de `actions.ts`. |
| `app/(admin)/invoices/InvoiceStatusSelect.tsx` | Actualiza estado interno de factura. | Cambios de estados o transiciones internas. | No equivale a cancelacion SAT; cuidado con permitir editar status de facturas timbradas. |
| `app/(admin)/invoices/InvoiceFileLinks.tsx` | Muestra PDF/XML, UUID/ID Facturama, previsualizacion y envio por correo. | Cambios de descarga, envio, historial o documentos visibles. | Puede exponer XML/PDF o enviar adjuntos incorrectos. |
| `app/(admin)/invoices/PaymentComplementPanel.tsx` | UI para borradores/timbrado de complementos y visualizacion de errores/archivos. | Cambios de flujo de complemento de pago. | Alto: complementos dependen de PPD, UUID, pagos y saldo insoluto. |
| `app/(admin)/invoices/paymentComplementActions.ts` | Server actions para crear y timbrar complementos. | Cambios de calculo de parcialidad, asociacion a pago, payload, status. | Critico: puede duplicar complementos, pagar de mas o timbrar contra factura incorrecta. |
| `app/api/invoices/[id]/pdf/route.ts` | Descarga PDF de factura desde Facturama. | Cambios de auth, headers, disponibilidad o descarga. | Debe validar acceso fiscal al proyecto y `issued/paid`. |
| `app/api/invoices/[id]/xml/route.ts` | Descarga XML de factura desde Facturama. | Cambios de auth, headers, disponibilidad o descarga. | XML fiscal sensible; no relajar acceso. |
| `app/api/payment-complements/[id]/pdf/route.ts` | Descarga PDF de complemento desde Facturama. | Cambios de archivos de complemento o entorno. | Usa `complement_env`; no mezclar sandbox/production. |
| `app/api/payment-complements/[id]/xml/route.ts` | Descarga XML de complemento desde Facturama. | Cambios de archivos de complemento o entorno. | XML fiscal sensible; no relajar acceso. |
| `app/api/fiscal-documents/[type]/[id]/email-preview/route.ts` | Previsualiza correo fiscal generico. | Cambios de template/preview para facturas o complementos. | Debe validar documento listo antes de mostrar contenido. |
| `app/api/fiscal-documents/[type]/[id]/send-email/route.ts` | Envia correo fiscal generico y registra historial. | Cambios de envio, adjuntos o logs. | Requiere PDF/XML correctos y rate limit. |
| `lib/facturama.ts` | Config, payloads, requests, timbrado y descarga de archivos Facturama. | Cambios de PAC, CFDI, fechas Mexico, credenciales/env o endpoints. | Critico: no tocar sin sandbox fiscal y pruebas. |
| `lib/fiscalData.ts` | Validacion de cliente fiscal: RFC, razon social, regimen, uso CFDI, CP, email. | Cambios de datos fiscales de receptor. | Puede permitir receptores invalidos o bloquear clientes validos. |
| `lib/productFiscalData.ts` | Validacion de producto/concepto: codigo SAT, unidad, objeto de impuesto. | Cambios de catalogos o fiscalizacion de productos. | Impacta conceptos timbrados. |
| `lib/cfdiDescription.ts` | Sanitiza/valida descripcion CFDI. | Cambios de descripcion fiscal. | Puede enviar caracteres no aceptados o truncar informacion necesaria. |
| `lib/paymentTerms.ts` | PUE/PPD, formas de pago y estado esperado de complemento. | Cambios de metodo/forma de pago. | Reglas PPD/PUE deben seguir SAT/Facturama y constraints SQL. |
| `lib/paymentComplements.ts` | Config, calculo de parcialidades/saldos y payload CFDI tipo `P`. | Cambios de complemento de pago. | Alto: afecta saldo insoluto, parcialidad y relacion con UUID original. |
| `lib/invoices.ts` | Tipos, status y helpers de importes/status. | Cambios de estados o helpers compartidos. | Puede afectar dashboard, portal, filtros y cobranza. |
| `lib/fiscalDocumentsEmail.ts` | Resolucion de factura/complemento, validacion, descarga y template de correo. | Cambios de envio fiscal generico. | Puede mezclar tipos de documento o adjuntos. |
| `lib/invoiceFolios.ts` | Folio interno `FAC-*`. | Cambios de formato o calculo de folios. | Riesgo de duplicados o inconsistencia con folios ya emitidos. |
| `lib/satCatalogSearch.ts` | Busqueda de catalogos SAT. | Cambios de catalogos o filtros. | Puede mostrar opciones inactivas o incompatibles con persona fisica/moral. |

## Contratos De Datos Confirmados

Esta seccion combina esquemas confirmados por migraciones SQL, tipos y queries existentes.

### `project_invoices`

Confirmado por `sql/20260602_internal_invoicing.sql`, `sql/20260603_invoice_payment_terms.sql`, `sql/20260604_invoice_quote_discounts.sql` y codigo:

- Identidad/folio: `id`, `internal_folio`.
- Relaciones: `client_project_id`, `client_id`, `source_type`, `source_quote_id`, `source_service_report_id`.
- Fechas/importes: `invoice_date`, `subtotal_mxn`, `discount_mxn`, `taxable_subtotal_mxn`, `iva_mxn`, `total_mxn`, legacy `subtotal`, `iva`, `total`.
- Estado/PAC: `status`, `facturama_id`, `sat_uuid`, `xml_url`, `pdf_url`, `last_error`, `facturama_response`.
- Pago CFDI: `payment_method_code`, `payment_form_code`, `requires_payment_complement`, `payment_complement_status`.
- Auditoria: `created_at`.

Confirmado por constraints SQL:

- `source_type` en `quote`, `advance`, `partial`, `balance`, `service`, `manual`.
- `status` en `draft`, `issued`, `cancelled`, `paid`.
- `payment_method_code` en `PUE`, `PPD`.
- PPD exige `payment_form_code = '99'`.
- PPD exige `requires_payment_complement = true` y status de complemento `pending`, `partial` o `completed`.
- PUE exige `requires_payment_complement = false` y `payment_complement_status = 'not_required'`.

Pendiente de confirmar: si `status='cancelled'` representa cancelacion fiscal real o solo estado interno en produccion.

### `project_invoice_items`

Confirmado por SQL y `InvoiceForm.tsx`/`actions.ts`:

- `id`
- `project_invoice_id` references `project_invoices(id)` on delete cascade
- `source_quote_item_id` references `quote_items(id)` on delete set null
- `product_id` references `products(id)` on delete set null
- `description`
- `quantity`
- `unit_price_mxn`
- `subtotal_mxn`
- `gross_amount_mxn`
- `discount_mxn`
- `net_amount_mxn`
- `iva_mxn`
- `total_mxn`
- `sat_product_service_code`
- `sat_unit_code`
- `sat_unit_name`
- `fiscal_object`
- `sort_order`
- `created_at`

Confirmado por reglas de timbrado:

- `gross_amount_mxn`, `discount_mxn`, `net_amount_mxn`, `iva_mxn` y `total_mxn` se validan contra totales de factura antes de llamar Facturama.
- `fiscal_object='02'` genera traslado IVA al 16% en `lib/facturama.ts`; otros objetos envian taxes vacios.

Pendiente de confirmar: si existen impuestos distintos a IVA 16% en roadmap o datos productivos.

### `clients` datos fiscales

Confirmado por `sql/20260602_internal_invoicing.sql` y `lib/fiscalData.ts`:

- `tax_rfc`
- `tax_business_name`
- `tax_regime` legacy
- `default_cfdi_use` legacy
- `fiscal_regime`
- `cfdi_use`
- `tax_zip_code`
- `billing_email`

Reglas confirmadas:

- RFC requerido y validado con diagnostico en timbrado.
- Razon social, regimen fiscal, uso CFDI, CP fiscal de 5 digitos y correo de facturacion son requeridos.
- Regimen/uso CFDI se validan contra catalogos y tipo de persona inferido por RFC cuando hay catalogos.

### `products` datos fiscales

Confirmado por SQL, `lib/productFiscalData.ts` y `InvoiceForm.tsx`:

- `sat_product_service_code`
- `sat_unit_code`
- `sat_unit_name`
- `fiscal_object`
- `fiscal_description`

Confirmado adicionalmente:

- `quote_items.invoice_description_snapshot` guarda descripcion fiscal snapshot desde cotizacion.
- `fiscal_object` default es `02`.

### Catalogos SAT

Confirmado por SQL y `lib/satCatalogSearch.ts`:

- `sat_product_service_catalog(code, description, is_active)`
- `sat_unit_catalog(code, name, description, is_active)`
- `tax_object_catalog(code, name, is_active)`
- `fiscal_regime_catalog(code, name, applies_to_person_type, is_active)`
- `cfdi_use_catalog(code, name, applies_to_person_type, is_active)`
- `sat_payment_form_catalog(code, name, is_active)`

Confirmado por `sql/generated/sat_catalog_seed.sql`:

- Seed de catalogos SAT CFDI 4.0 generado desde `phpcfdi/resources-sat-catalogs`.

### `project_payments`

Confirmado por `sql/20260527_project_payments.sql`, `sql/20260604_payment_complements.sql` y account statement:

- `id`
- `client_project_id`
- `payment_date`
- `payment_method`
- `payment_reference`
- `payment_category` en `equipment` o `labor`
- `currency` en `USD` o `MXN`
- `amount`
- `exchange_rate`
- `amount_mxn`
- `notes`
- `created_by_user_id`
- `created_at`
- `payment_form_code`
- `updated_at`

Reglas confirmadas:

- Pagos de mano de obra deben ser MXN.
- USD requiere `exchange_rate`.
- `payment_form_code` puede alimentar el complemento de pago.

### `project_payment_complements`

Confirmado por `sql/20260604_payment_complements.sql` y `paymentComplementActions.ts`:

- Relaciones: `project_invoice_id`, `project_payment_id`, `client_project_id`, `client_id`.
- Estado/PAC: `status`, `complement_env`, `facturama_id`, `sat_uuid`, `pdf_url`, `xml_url`, `facturama_response`, `last_error`.
- Parcialidad/saldo: `partiality_number`, `previous_balance_mxn`, `amount_paid_mxn`, `paid_amount_mxn`, `source_payment_amount_mxn`, `manual_amount_override`, `manual_override_reason`, `outstanding_balance_mxn`.
- Pago: `payment_date`, `payment_form_code`, `currency`, `exchange_rate`, `payment_reference`.
- Payload/auditoria: `payload_preview`, `created_by_user_id`, `issued_by_user_id`, `issued_at`, `created_at`, `updated_at`.

Confirmado por constraints SQL:

- `status` en `draft`, `validated`, `issued`, `stamped`, `cancelled`, `failed`.
- `complement_env` en `sandbox`, `production`.
- `currency` solo `MXN`.
- `previous_balance_mxn - paid_amount_mxn = outstanding_balance_mxn`.
- Si hay override manual, `manual_override_reason` es requerido.
- Indice unico evita mas de un complemento timbrado por `project_payment_id`.

### Logs de correo fiscal

Confirmado por SQL y rutas:

- `invoice_email_logs`: legacy para `/api/invoices/[id]/send-email`.
- `fiscal_document_email_logs`: generico para `invoice` y `payment_complement`, usado por `InvoiceFileLinks`.

Pendiente de confirmar: si `invoice_email_logs` debe mantenerse o migrarse totalmente al flujo generico.

## Reglas Fiscales Y De Negocio

- CFDI de factura: `lib/facturama.ts` construye CFDI tipo `I`, moneda `MXN`, exportacion `01`, `NameId: 1`, `PaymentForm`, `PaymentMethod`, receptor y conceptos.
- CFDI de complemento: `lib/paymentComplements.ts` construye CFDI tipo `P`, `NameId: 14`, `CfdiUse: CP01`, `TaxObject: 01`, pagos en MXN y documento relacionado por UUID.
- Ambiente Facturama: `FACTURAMA_ENV` debe ser `sandbox` o `production`; produccion requiere `FACTURAMA_ENABLE_PRODUCTION=true`.
- Sandbox Facturama: puede usar receptor fiscal de prueba definido por `FACTURAMA_SANDBOX_RECEIVER_*`.
- Bloqueo productivo: no se permite timbrar en produccion con RFC receptor de prueba `EKU9003173C9`.
- Fecha fiscal: `lib/facturama.ts` usa helpers de Mexico para fecha de CFDI y complemento.
- RFC: requerido, normalizado/diagnosticado y validado antes de timbrar.
- Regimen fiscal y uso CFDI: requeridos y validados contra catalogos activos; se valida compatibilidad con persona fisica/moral cuando aplica.
- Forma/metodo de pago: PUE permite forma real del catalogo SAT; PPD obliga forma `99 - Por definir` y requiere complemento.
- Complemento de pago: solo para facturas `PPD`, `issued`, con `sat_uuid` y saldo pendiente.
- Relacion factura-pago: un complemento puede asociarse a `project_payment_id`; si el importe fiscal difiere del pago registrado, requiere permiso `canManageFiscalPayments` y motivo.
- IVA/impuestos: factura valida sumas por concepto; `fiscal_object='02'` envia IVA 16% a Facturama.
- Factura timbrada: `stampProjectInvoice` solo acepta `status='draft'` y sin `facturama_id`.
- Archivos fiscales: PDF/XML se descargan desde Facturama bajo demanda usando `facturama_id`; rutas requieren auth y acceso fiscal al proyecto.
- Cancelacion fiscal: Pendiente de confirmar. No se encontro accion que cancele CFDI ante Facturama/SAT.

## Archivos Que Suelen Cambiar Juntos

- Timbrado CFDI: `app/(admin)/invoices/actions.ts`, `lib/facturama.ts`, `lib/fiscalData.ts`, `lib/productFiscalData.ts`, `lib/cfdiDescription.ts`, `lib/paymentTerms.ts`, SQL si cambia contrato.
- Creacion de factura: `app/(admin)/invoices/InvoiceForm.tsx`, `lib/invoiceFolios.ts`, `lib/paymentTerms.ts`, `project_invoices`, `project_invoice_items`.
- Complemento de pago: `app/(admin)/invoices/PaymentComplementPanel.tsx`, `app/(admin)/invoices/paymentComplementActions.ts`, `lib/paymentComplements.ts`, `lib/facturama.ts`, `project_payment_complements`, `project_payments`.
- PDF/XML: `app/api/invoices/[id]/pdf/route.ts`, `app/api/invoices/[id]/xml/route.ts`, `app/api/payment-complements/[id]/pdf/route.ts`, `app/api/payment-complements/[id]/xml/route.ts`, `lib/facturama.ts`.
- Correo fiscal: `app/(admin)/invoices/InvoiceFileLinks.tsx`, `app/api/fiscal-documents/[type]/[id]/*`, `lib/fiscalDocumentsEmail.ts`, logs SQL.
- Datos fiscales de cliente: `lib/fiscalData.ts`, `InvoiceForm.tsx`, tablas `clients`, catalogos `fiscal_regime_catalog`, `cfdi_use_catalog`.
- Datos fiscales de producto/concepto: `lib/productFiscalData.ts`, `lib/cfdiDescription.ts`, `InvoiceForm.tsx`, tablas `products`, `project_invoice_items`, `quote_items`.
- Pagos/cobranza: `app/(admin)/projects/[id]/account-statement/*`, `lib/paymentComplements.ts`, `project_payments`, `project_payment_complements`.
- Portal cliente: `app/portal/page.tsx`, `app/portal/projects/[id]/page.tsx`, `app/portal/services/[id]/page.tsx`, `lib/clientPortal.ts`, `public_document_links`.

## Validacion Especifica

Checklist minimo segun tipo de cambio:

- Crear factura:
  - cliente con datos fiscales completos;
  - origen `quote` desde cotizacion aprobada;
  - origen `manual` solo con rol permitido;
  - PUE con forma de pago activa;
  - PPD fuerza forma `99` y `payment_complement_status='pending'`.
- Timbrar CFDI:
  - factura `draft` sin `facturama_id`;
  - RFC valido y regimen/uso CFDI activos;
  - conceptos con codigo SAT, unidad, objeto de impuesto y descripcion valida;
  - suma bruta, descuento, neto, IVA y total cuadran;
  - sandbox Facturama antes de produccion.
- Descargar/ver XML/PDF:
  - factura `issued` o `paid`;
  - `facturama_id` presente;
  - ruta devuelve content-type esperado;
  - usuario sin acceso fiscal/proyecto recibe bloqueo.
- Crear complemento de pago:
  - factura PPD `issued` con `sat_uuid`;
  - pago pertenece al mismo proyecto;
  - forma de pago real distinta de `99`;
  - saldo insoluto no queda negativo;
  - duplicado por `project_payment_id` se bloquea salvo override permitido.
- Timbrar complemento:
  - complemento `draft` sin `facturama_id`;
  - `PAYMENT_COMPLEMENTS_ENABLED` y `PAYMENT_COMPLEMENTS_STAMPING_ENABLED` activos;
  - parcialidad, saldo anterior, monto pagado y saldo insoluto cuadran;
  - `project_invoices.payment_complement_status` pasa a `partial` o `completed`.
- Correo fiscal:
  - documento listo con `facturama_id`, UUID, PDF y XML;
  - preview genera HTML;
  - correo lleva PDF + XML;
  - se guarda log en `fiscal_document_email_logs`.
- Factura timbrada:
  - no permitir retimbrar;
  - no editar datos fiscales/importe de manera que contradiga XML ya emitido;
  - confirmar si cambio de `status` interno es suficiente o requiere flujo fiscal real.
- Portal cliente:
  - cliente ve solo facturas de sus proyectos;
  - links PDF/XML publicos se controlan por tokens/documentos visibles;
  - factura cancelada no debe sumar saldos si el flujo asi lo requiere.

## Reglas De Seguridad

- Cualquier cambio en SQL, RLS, Supabase, storage, XML/PDF, datos fiscales o visibilidad de facturas debe revisar [`../../ai/SECURITY_RULES.md`](../../ai/SECURITY_RULES.md).
- No aplicar cambios productivos sin sandbox, respaldo, pruebas y rollback.
- No modificar logica fiscal critica sin pruebas minimas y revision de impacto.
- No usar credenciales productivas para pruebas.
- No relajar `requireFiscalProjectAccessForProfile`, `requireFinancialRole` ni guards de API para resolver errores.
- No exponer XML/PDF fiscal sin validar auth, proyecto y estado del documento.
- No cambiar `FACTURAMA_ENV`, `FACTURAMA_ENABLE_PRODUCTION`, `PAYMENT_COMPLEMENTS_ENV` o flags de timbrado sin confirmacion explicita.

## Riesgos

- Un payload CFDI invalido puede timbrar mal o fallar ante Facturama.
- Cambios de redondeo afectan base, IVA, descuentos y total.
- PPD/PUE mal aplicado rompe complementos de pago.
- Complementos duplicados o con saldo incorrecto generan errores fiscales.
- Estado interno `cancelled` no equivale necesariamente a cancelacion fiscal.
- PDF/XML son documentos fiscales sensibles y aparecen tambien en portal/documentos publicos.
- Produccion Facturama esta protegida por flags; no retirar esos bloqueos.

## Documentos Relacionados

- [`../../ai/AI_CONTEXT.md`](../../ai/AI_CONTEXT.md)
- [`../../ai/PROJECT_MAP.md`](../../ai/PROJECT_MAP.md)
- [`../../ai/MODULE_INDEX.md`](../../ai/MODULE_INDEX.md)
- [`../../ai/SECURITY_RULES.md`](../../ai/SECURITY_RULES.md)
- [`../../SETUP_SANDBOX.md`](../../SETUP_SANDBOX.md)
