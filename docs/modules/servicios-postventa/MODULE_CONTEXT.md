# Modulo: Servicios/Postventa

Contexto operativo para agentes que modifiquen reportes de servicio, evidencias, propuestas de reparacion, correos de servicio, entregas, garantias o visibilidad en Portal Cliente. Antes de tocar SQL, RLS, storage, auth, rutas publicas o datos cliente, revisar [`../../ai/SECURITY_RULES.md`](../../ai/SECURITY_RULES.md).

Estado inferido: activo y alto riesgo por evidencias/fotos, documentos de cliente, portal cliente y postventa.

## Que Hace

Gestiona reportes de servicio tecnico, fotos de evidencia, propuestas de reparacion relacionadas con cotizaciones, correo de servicio finalizado, vista cliente de servicios realizados y flujos postventa de entregas/garantias por proyecto.

El codigo separa dos superficies:

- Servicios: `app/(admin)/services/`, `app/api/services/`, `app/portal/services/`, `lib/service*`.
- Postventa por proyecto: `app/(admin)/post-sale/`, `app/(admin)/projects/[id]/deliveries/`, `app/(admin)/projects/[id]/warranty/`, `lib/postSalePdf.tsx`.

## Mapa Por Flujo

| Flujo | Archivos confirmados | Responsabilidad |
| --- | --- | --- |
| Listar servicios | `app/(admin)/services/page.tsx` | Lee `service_reports`, cliente/proyecto relacionado, tecnico, fecha, estado y refacciones. |
| Crear reporte de servicio | `app/(admin)/services/new/page.tsx`, `app/(admin)/services/ServiceReportForm.tsx` | Carga clientes/proyectos, inserta `service_reports`, genera `service_number` y sube fotos a `project-photos`. |
| Editar reporte de servicio | `app/(admin)/services/[id]/edit/page.tsx`, `app/(admin)/services/ServiceReportForm.tsx` | Carga reporte/fotos, permite editar solo si `status` esta en `draft`, `pending` o `in_progress`. |
| Detalle admin de servicio | `app/(admin)/services/[id]/page.tsx` | Muestra diagnostico, solucion, evidencias, correo al cliente, propuesta y cotizacion de refacciones si aplica. |
| Evidencias/fotos de servicio | `app/(admin)/services/ServiceReportForm.tsx`, `lib/serviceReports.ts`, `app/(admin)/services/[id]/page.tsx` | Guarda paths en `service_report_photos.image_url`; resuelve signed URL desde bucket `project-photos`. |
| Print reporte tecnico | `app/(admin)/services/[id]/print/page.tsx`, `app/(admin)/services/[id]/print/PrintServiceButton.tsx` | Vista imprimible del reporte con cliente, proyecto, diagnostico y fotos. |
| PDF adjunto de servicio | `lib/serviceReportPdf.tsx`, `app/api/services/[id]/completed-email/route.ts` | Genera PDF con `@react-pdf/renderer` para adjuntarlo al correo de servicio finalizado. |
| Propuesta de reparacion | `app/(admin)/services/[id]/proposal/page.tsx`, `app/(admin)/services/[id]/proposal/print/page.tsx`, `lib/serviceProposal.ts` | Calcula servicio + refacciones de `quote_items` relacionadas via `related_quote_id`; aplica descuento de reparacion completa. |
| Crear cotizacion de refacciones desde servicio | `app/(admin)/services/[id]/page.tsx`, `app/(admin)/services/[id]/proposal/page.tsx`, `app/(admin)/quotes/new/page.tsx` | Construye URL `/quotes/new?clientId=...&projectId=...&serviceReportId=...`; la cotizacion actualiza `service_reports.related_quote_id`. |
| Correo de servicio finalizado | `app/api/services/[id]/completed-email/route.ts`, `lib/serviceCompletedEmail.ts`, `app/(admin)/services/[id]/SendServiceCompletedEmailButton.tsx` | Preview por `GET`; envio/reenvio por `POST`; adjunta PDF y registra `service_report_email_history`. |
| Visibilidad en Portal Cliente | `app/portal/page.tsx`, `app/portal/services/[id]/page.tsx`, `lib/clientPortal.ts`, `lib/serviceReports.ts` | Portal lista servicios del cliente y detalle con fotos, trabajo realizado, recomendaciones, facturas y saldo. |
| Dashboard postventa | `app/(admin)/post-sale/page.tsx` | Lista proyectos con `sales_stage` postventa, ultima entrega, garantia, mantenimiento sugerido y saldo. |
| Sincronizar estados postventa | `app/(admin)/post-sale/actions.ts`, `app/(admin)/post-sale/SyncPostSaleButton.tsx` | Admin actualiza `client_projects.sales_stage` a `delivered` o `warranty` segun entregas/garantias. |
| Entregas de proyecto | `app/(admin)/projects/[id]/deliveries/` | Crea/lista/detalla actas de entrega, sistemas entregados, pendientes, evidencias y correo de entrega. |
| Fotos de entrega | `app/api/projects/[id]/delivery/photos/route.ts`, `app/api/projects/[id]/delivery/photos/[photoId]/route.ts`, `app/(admin)/projects/[id]/deliveries/[deliveryId]/DeliveryPhotoManager.tsx` | Subida/borrado de evidencias a `project-photos`; valida que entrega pertenezca al proyecto. |
| Garantias | `app/(admin)/projects/[id]/warranty/`, `app/api/projects/[id]/warranty/[warrantyId]/pdf/route.ts` | Crea/lista/detalla carta de garantia y PDF; alimenta Portal Cliente y postventa. |
| PDF entrega/garantia | `lib/postSalePdf.tsx`, `app/api/projects/[id]/deliveries/[deliveryId]/pdf/route.ts`, `app/api/projects/[id]/warranty/[warrantyId]/pdf/route.ts`, `app/public/documents/[token]/pdf/route.ts` | Genera PDFs internos y publicos por token para acta/carta. |
| Documentos publicos de entrega/garantia | `app/(admin)/projects/[id]/deliveries/[deliveryId]/actions.ts`, `app/public/documents/[token]/pdf/route.ts`, `lib/publicDocuments.ts` | Crea/reusa tokens en `public_document_links`; valida estado y proyecto antes de servir PDF publico. |

Pendiente de confirmar: si existe un modelo separado de tickets fuera de `service_reports`; no se encontro tabla/ruta independiente de tickets en la revision.

## Responsabilidad De Archivos Clave

| Archivo | Responsabilidad | Cuando modificar | Riesgos |
| --- | --- | --- | --- |
| `app/(admin)/services/page.tsx` | Listado interno de reportes de servicio. | Cambios de columnas, filtros, estado o acciones. | Puede mostrar servicios sin control si se combina con RLS abierta. |
| `app/(admin)/services/ServiceReportForm.tsx` | Formulario cliente para crear/editar servicio y fotos. | Campos del reporte, estados, costos, descuentos o upload de evidencias. | Riesgo de perdida/exposicion de fotos; usa Supabase client directo. |
| `app/(admin)/services/new/page.tsx` | Carga clientes/proyectos y monta formulario en modo nuevo. | Cambios de seleccion de cliente/proyecto. | Debe evitar asociar proyecto de otro cliente; el form filtra proyectos por `client_id`. |
| `app/(admin)/services/[id]/edit/page.tsx` | Carga reporte y fotos existentes; bloquea edicion cuando el status ya no permite editar. | Reglas de edicion post-finalizacion. | Si se relaja, puede alterar reportes ya enviados/finalizados. |
| `app/(admin)/services/[id]/page.tsx` | Detalle interno, acciones, correo, propuesta, refacciones y fotos. | Cambios de workflow operativo o acciones. | Puede exponer links internos de cotizaciones/refacciones o permitir reenvios indebidos. |
| `app/(admin)/services/[id]/proposal/page.tsx` | Propuesta de reparacion con refacciones y descuento. | Cambios de totales o presentacion de propuesta. | Debe mantenerse alineada con `lib/serviceProposal.ts` y cotizaciones relacionadas. |
| `app/(admin)/services/[id]/print/page.tsx` | Print tecnico del servicio. | Cambios de documento imprimible. | Riesgo bajo funcional, pero debe resolver fotos privadas correctamente. |
| `lib/serviceProposal.ts` | Calculos de propuesta: servicio, refacciones, descuento, IVA y total. | Cambios de precios/descuentos/refacciones. | Puede descuadrar total mostrado al cliente. |
| `lib/serviceReports.ts` | Helpers de fecha, labels y resolucion de fotos de servicio. | Cambios de storage o signed URLs. | Si falla, portal/PDF/print pueden perder evidencias o exponer paths. |
| `lib/serviceReportPdf.tsx` | PDF formal de reporte de servicio para correo. | Cambios visuales o datos del PDF. | PDF adjunto puede romperse si fotos privadas no resuelven. |
| `lib/serviceCompletedEmail.ts` | Construye preview/envio de correo finalizado con saldo, evidencias y PDF. | Cambios de template, destinatarios, adjuntos o saldo pendiente. | Puede enviar informacion a correo incorrecto o duplicar avisos. |
| `app/api/services/[id]/completed-email/route.ts` | API protegida para preview/envio/reenvio de correo de servicio. | Cambios de permisos, rate limit o estado de envio. | Requiere `requireServicesRole`; no relajar para resolver errores. |
| `app/(admin)/services/[id]/SendServiceCompletedEmailButton.tsx` | UI de preview y envio/reenvio. | Cambios de UX del correo. | No sustituye validaciones server-side. |
| `app/portal/services/[id]/page.tsx` | Detalle cliente de servicio realizado. | Cambios de visibilidad cliente o fotos. | Critico: valida `client_id` y acceso a proyecto si existe `client_project_id`. |
| `app/(admin)/post-sale/page.tsx` | Dashboard interno de proyectos entregados/en garantia. | Cambios de postventa, saldos, garantias o mantenimiento. | Puede mezclar datos financieros y de garantia. |
| `app/(admin)/post-sale/actions.ts` | Sincronizacion de `sales_stage` postventa. | Cambios de estados `delivered`/`warranty`. | Mutacion masiva; restringida a `canManageUsers`. |
| `app/(admin)/projects/[id]/deliveries/**` | Flujo de entregas, evidencias, pendientes, correo y PDF. | Cambios de acta de entrega o documentos al cliente. | Conecta con portal, documentos publicos y storage. |
| `app/(admin)/projects/[id]/warranty/**` | Flujo de cartas de garantia y PDF. | Cambios de garantia/mantenimiento. | Afecta portal, vencimientos y documentos publicos. |
| `app/api/projects/[id]/delivery/photos/**` | API de evidencia de entrega. | Cambios de upload/delete de fotos. | Usa service role admin; debe validar pertenencia proyecto-entrega. |
| `lib/postSalePdf.tsx` | PDFs de acta de entrega y carta de garantia. | Cambios de documentos postventa. | PDFs publicos por token dependen de esta salida. |

## Contratos De Datos Confirmados

Esta seccion combina migraciones SQL, tipos y queries existentes.

### `service_reports`

Confirmado por `sql/20260529_service_reports.sql`, `sql/20260608_service_completed_email.sql`, `sql/20260529_service_proposal_discounts.sql` y codigo:

- Identidad: `id`, `service_number`.
- Relaciones: `client_id`, `client_project_id`, `related_quote_id`, `created_by_user_id`.
- Datos del servicio: `service_location`, `google_maps_url`, `performed_by_name`, `service_date`, `background`, `diagnosis`, `solution_status`, `solution_description`, `recommendations`.
- Refacciones/costos: `requires_parts`, `required_parts_notes`, `technician_cost_mxn`, `labor_sale_mxn`, `service_discount_mxn`, `service_discount_percent`, `service_discount_type`, `service_discount_reason`.
- Estado y correo: `status`, `completed_at`, `service_email_sent_at`, `service_email_sent_to`, `service_email_status`, `service_email_error`.
- Auditoria: `created_at`, `updated_at`.

Reglas confirmadas:

- `solution_status` en `solved`, `not_solved`, `pending`.
- `status` base en `draft`, `pending`, `completed`, `cancelled`; ampliado a `draft`, `pending`, `in_progress`, `completed`, `cancelled`.
- `service_email_status` en `sent` o `error` cuando no es null.
- `service_discount_type` en `none`, `amount`, `percent`.
- Indices por `client_id`, `client_project_id`, `service_date`, `status`, `completed_at`.

RLS confirmada en SQL local: habilitada, pero con policies `beta_authenticated_* using (true)`. Pendiente de confirmar si produccion tiene hardening posterior.

### `service_report_photos`

Confirmado por `sql/20260529_service_reports.sql` y `ServiceReportForm.tsx`:

- `id`
- `service_report_id references service_reports(id) on delete cascade`
- `image_url`
- `caption`
- `sort_order`
- `created_at`

Uso confirmado:

- `image_url` guarda path en bucket `project-photos`, por ejemplo `services/{reportId}/{timestamp}-{index}.jpg`.
- `lib/serviceReports.ts` devuelve signed URL de 1 hora desde `project-photos` y fallback a public URL/path.
- El form permite borrar filas de `service_report_photos`, pero no se confirmo borrado del objeto storage asociado para fotos de servicio.

RLS confirmada en SQL local: habilitada, pero con policies `beta_authenticated_* using (true)`. Pendiente de confirmar hardening real.

### `service_report_email_history`

Confirmado por `sql/20260608_service_completed_email.sql` y `app/api/services/[id]/completed-email/route.ts`:

- `id`
- `service_report_id references service_reports(id) on delete cascade`
- `sent_to`, `cc`, `subject`, `body_html`
- `attachment_names text[]`
- `status` en `sent`, `error`, `skipped`
- `error_message`, `resend_response`, `sent_at`, `created_by_user_id`

Uso confirmado:

- `POST /api/services/[id]/completed-email` inserta history en envio exitoso o error.
- El endpoint bloquea envio duplicado automatico cuando `service_email_sent_at` existe y `force` es false.

RLS confirmada en SQL local: habilitada, pero con policies beta abiertas.

### `project_deliveries`

Confirmado por `sql/20260603_project_deliveries.sql` y rutas de entregas:

- `id`, `client_project_id`
- `delivery_date`, `status`
- `delivered_to_name`, `delivered_to_role`, `delivered_by_name`
- `observations`, `client_signature_image_url`, `alfa_signature_image_url`, `pdf_url`
- Correo: `delivery_email_sent_at`, `delivery_email_sent_to`, `delivery_email_status`, `delivery_email_error`
- Auditoria: `created_by_user_id`, `created_at`, `updated_at`

Reglas confirmadas:

- `status` ampliado a `draft`, `delivered`, `accepted`.
- `delivery_email_status` en `sent` o `error` cuando no es null.
- Rutas PDF validan `id` y `client_project_id`.
- Documentos publicos solo validan entrega en estado `delivered` o `accepted`.

Pendiente de confirmar: RLS productiva; SQL local conserva policies beta abiertas.

### `project_delivery_evidences`

Confirmado por `sql/20260603_project_deliveries.sql` y `app/api/projects/[id]/delivery/photos/route.ts`:

- `id`, `project_delivery_id`
- `file_url`, `file_path`, `file_name`, `file_type`, `file_size`
- `uploaded_by`, `caption`, `sort_order`, `created_at`

Uso confirmado:

- Fotos se suben a `project-photos` bajo `project-deliveries/{projectId}/{deliveryId}/...`.
- API valida que `project_deliveries.id` pertenezca al `client_project_id` de la URL.
- Borrado elimina el objeto de storage usando `file_path` o `file_url` y luego borra la fila.

### `project_delivery_pending_items` / `project_delivery_systems`

Confirmado por `sql/20260603_project_deliveries.sql`:

- `project_delivery_pending_items`: `id`, `project_delivery_id`, `description`, `status`, `sort_order`, `created_at`.
- `project_delivery_systems`: `id`, `project_delivery_id`, `system_name`, `delivered`, `notes`, `created_at`.
- Se usan en entregas y correo de entrega para resumen de sistemas/pedientes.

### `project_delivery_email_history`

Confirmado por `sql/20260603_project_deliveries.sql` y `app/(admin)/projects/[id]/deliveries/[deliveryId]/actions.ts`:

- `id`, `project_delivery_id`, `sent_to`, `cc`, `subject`, `body_html`, `attachment_names`, `status`, `error_message`, `resend_response`, `sent_at`, `created_by_user_id`.
- Registra preview/envio de correo de entrega y errores.

### `project_warranties`

Confirmado por `sql/20260603_project_warranties.sql`:

- `id`, `client_project_id`
- `warranty_date`, `installed_systems`
- `equipment_warranty_months`, `equipment_warranty_start_date`, `equipment_warranty_end_date`
- `installation_warranty_months`, `installation_warranty_start_date`, `installation_warranty_end_date`
- `preventive_maintenance_required`, `preventive_maintenance_frequency_months`, `preventive_maintenance_cost_mxn`
- `warranty_management_included_until`, `warranty_management_requires_contract_after`
- `maintenance_policy_active`, `maintenance_policy_reference`
- `support_email`, `alfa_representative_name`
- `status`, `pdf_url`, `created_by_user_id`, `created_at`, `updated_at`

Reglas confirmadas:

- `status` en `draft`, `issued`.
- Indices por `client_project_id`, `warranty_date`, `status`, `maintenance_policy_active`.
- Rutas PDF validan `id` y `client_project_id`.
- Portal Cliente solo considera garantias `issued`.

Pendiente de confirmar: RLS productiva; SQL local conserva policies beta abiertas.

### `public_document_links`

Relacion confirmado desde Postventa:

- Entregas/garantias crean tokens con `document_type` `project_delivery` o `project_warranty`.
- `app/public/documents/[token]/pdf/route.ts` revalida `client_project_id`, id relacionado y estado visible antes de servir PDF.
- Migraciones posteriores amplian esta tabla para otros tipos; ver [`../portal-cliente/MODULE_CONTEXT.md`](../portal-cliente/MODULE_CONTEXT.md).

### `project_invoices`

Uso confirmado en servicios:

- `app/portal/services/[id]/page.tsx` lee facturas por `source_service_report_id` y estados `issued`, `paid`.
- `lib/serviceCompletedEmail.ts` lee facturas pendientes del cliente con `status = issued`.
- `sql/20260602_internal_invoicing.sql` confirma `source_service_report_id references service_reports(id) on delete set null`.

## Reglas De Visibilidad Y Seguridad

- Rutas internas `/services` y `/post-sale` estan protegidas por `proxy.ts` como rutas internas.
- APIs de correo de servicio usan `requireServicesRole`; roles permitidos por `canManageServices`: `admin`, `direccion`, `comercial`, `project_manager`.
- APIs de fotos/PDF de entregas y garantias usan `requireWorkOrderRole`; roles permitidos por `canManageWorkOrders`: `admin`, `direccion`, `ingenieria`, `project_manager`, `instalador`.
- Portal Cliente valida usuario con `getClientPortalContext()` y servicio por `service_reports.client_id = portalUser.client_id`.
- Si el servicio tiene `client_project_id`, `app/portal/services/[id]/page.tsx` exige que el proyecto este en `client_portal_project_access` activo.
- Servicios sin proyecto asociado pueden mostrarse al cliente por `client_id`, segun codigo actual.
- Portal Cliente solo muestra facturas de servicio `issued` o `paid`.
- Fotos de servicio y entrega se sirven mediante signed URLs desde `project-photos`; no deben hacerse publicas.
- Entregas/garantias publicas por token deben validar `document_type`, proyecto, id relacionado y estado (`delivered`/`accepted` para entrega, `issued` para garantia).
- RLS local para servicios, fotos, entregas, garantias y email history aparece abierta con policies beta; no confiar solo en RLS hasta confirmar produccion.
- No usar service role en nuevas rutas salvo que se revalide pertenencia del recurso al proyecto/cliente antes de leer, subir, borrar o servir archivos.

## Storage Y Archivos

- Bucket confirmado: `project-photos`, privado en `sql/20260604_storage_buckets.sql`.
- Fotos de servicio: path `services/{reportId}/...`, guardado en `service_report_photos.image_url`.
- Fotos de entrega: path `project-deliveries/{projectId}/{deliveryId}/...`, guardado en `project_delivery_evidences.file_path`/`file_url`.
- `lib/serviceReports.ts` y API de fotos de entrega crean signed URLs de 1 hora.
- API de entrega limita imagenes a 50 MB y valida `file.type.startsWith("image/")`.
- Pendiente de confirmar: inventario productivo de policies de storage y si la eliminacion de fotos de servicio tambien debe borrar objeto storage.

## Archivos Que Suelen Cambiar Juntos

- Reporte de servicio: `app/(admin)/services/ServiceReportForm.tsx`, `app/(admin)/services/[id]/page.tsx`, `app/(admin)/services/[id]/edit/page.tsx`, `sql/20260529_service_reports.sql`, `sql/20260608_service_completed_email.sql`.
- Evidencias/fotos de servicio: `ServiceReportForm.tsx`, `lib/serviceReports.ts`, `service_report_photos`, bucket `project-photos`, portal/print/PDF si se muestran.
- Correo de servicio finalizado: `app/api/services/[id]/completed-email/route.ts`, `lib/serviceCompletedEmail.ts`, `lib/serviceReportPdf.tsx`, `SendServiceCompletedEmailButton.tsx`, `service_report_email_history`.
- Propuesta de reparacion: `app/(admin)/services/[id]/proposal/page.tsx`, `app/(admin)/services/[id]/proposal/print/page.tsx`, `lib/serviceProposal.ts`, `quotes`, `quote_items`, `service_reports.related_quote_id`.
- Portal Cliente: `app/portal/page.tsx`, `app/portal/services/[id]/page.tsx`, `lib/clientPortal.ts`, `lib/serviceReports.ts`, `project_invoices`.
- Entregas: `app/(admin)/projects/[id]/deliveries/**`, `app/api/projects/[id]/delivery/photos/**`, `app/api/projects/[id]/deliveries/[deliveryId]/pdf/route.ts`, `lib/postSalePdf.tsx`.
- Garantias: `app/(admin)/projects/[id]/warranty/**`, `app/api/projects/[id]/warranty/[warrantyId]/pdf/route.ts`, `lib/postSalePdf.tsx`, `project_warranties`.
- Postventa dashboard/sync: `app/(admin)/post-sale/page.tsx`, `app/(admin)/post-sale/actions.ts`, `client_projects.sales_stage`, `project_deliveries`, `project_warranties`.
- Storage/policies: `sql/20260604_storage_buckets.sql`, `lib/serviceReports.ts`, APIs de delivery photos y cualquier flujo que lea `project-photos`.

## Validacion Especifica

- Crear servicio:
  - crear con cliente obligatorio y proyecto opcional;
  - validar que proyectos disponibles pertenezcan al cliente seleccionado;
  - confirmar `service_number` `SERV-0000`;
  - confirmar que `labor_sale_mxn` se calcula desde `technician_cost_mxn`.
- Editar servicio:
  - editar solo `draft`, `pending`, `in_progress`;
  - bloquear `completed`/`cancelled`;
  - agregar/quitar fotos y validar que la vista se refresque.
- Evidencias de servicio:
  - subir JPG/PNG/WebP u otra imagen aceptada por `image/*`;
  - confirmar path en `service_report_photos.image_url`;
  - confirmar preview en admin, print, PDF y portal;
  - confirmar que path privado no se expone sin signed URL.
- Correo de servicio finalizado:
  - `GET /api/services/[id]/completed-email` genera preview;
  - `POST` solo para `status = completed`;
  - no reenviar automatico si `service_email_sent_at` existe y `force=false`;
  - reenvio manual con `force=true`;
  - PDF adjunto existe y `service_report_email_history` se inserta.
- Portal Cliente:
  - cliente ve solo servicios de su `client_id`;
  - servicio con proyecto exige acceso activo a `client_portal_project_access`;
  - URL directa a servicio de otro cliente/proyecto debe responder `notFound`;
  - facturas visibles solo `issued`/`paid`.
- Propuesta de reparacion:
  - servicio sin `related_quote_id` muestra opcion de agregar refacciones;
  - servicio con quote relacionada calcula refacciones desde `quote_items`;
  - descuentos `amount` y `percent` no exceden subtotal.
- Entregas:
  - crear entrega por proyecto;
  - subir/borrar evidencias;
  - validar que API rechace delivery que no pertenece al proyecto;
  - generar PDF interno;
  - enviar correo solo con garantia generada si el flujo lo exige.
- Garantias:
  - crear carta `draft`/`issued`;
  - validar fechas de inicio/fin;
  - generar PDF interno y publico;
  - revisar mantenimiento preventivo y poliza si aplica.
- Postventa:
  - proyectos `delivered`, `warranty`, `installed`, `closed` aparecen;
  - sync solo admin cambia `sales_stage`;
  - saldo pendiente coincide con `getProjectFinancialSummary`.
- RLS/storage:
  - revisar policies reales antes de tocar datos productivos;
  - validar que `project-photos` siga privado;
  - validar signed URLs y expiracion.

## Riesgos

- Exposicion cruzada entre clientes por servicios sin `client_project_id` si solo se filtra por proyecto.
- Fotos/evidencias pueden contener informacion sensible de sitio; no publicar bucket ni paths permanentes.
- Policies beta abiertas en SQL local para `service_reports`, `service_report_photos`, `service_report_email_history`, `project_deliveries` y `project_warranties`.
- Uso de service role en APIs de delivery photos exige validacion estricta de proyecto-entrega.
- Correo de servicio puede revelar saldo/facturas/evidencias a destinatario incorrecto si `clients.email`/`billing_email` no esta validado.
- Envio duplicado de servicio finalizado si se altera `service_email_sent_at` o `force`.
- Perdida de evidencia si se borra fila sin borrar storage o viceversa.
- Cambios en `serviceProposal.ts` pueden desalinear totales de propuesta con cotizaciones.
- Cambios en garantias/entregas impactan Portal Cliente y documentos publicos por token.
- Mutacion masiva de `sales_stage` en postventa puede mover proyectos incorrectamente.

## Pendientes De Confirmar

- RLS real en produccion para `service_reports`, `service_report_photos`, `service_report_email_history`, `project_deliveries`, `project_warranties` y tablas hijas de entregas.
- Si existe una tabla/ruta de tickets separada de `service_reports`.
- Si fotos de servicio borradas desde `ServiceReportForm` deben eliminar tambien el objeto en `project-photos`.
- Politica productiva exacta de storage para `project-photos`.
- Si `service_reports` debe tener APIs server-side para crear/editar en lugar de inserts directos desde cliente.
- Flujo definitivo para convertir una propuesta de reparacion en cotizacion/factura aprobada.

## Documentos Relacionados

- [`../../ai/AI_CONTEXT.md`](../../ai/AI_CONTEXT.md)
- [`../../ai/PROJECT_MAP.md`](../../ai/PROJECT_MAP.md)
- [`../../ai/MODULE_INDEX.md`](../../ai/MODULE_INDEX.md)
- [`../../ai/SECURITY_RULES.md`](../../ai/SECURITY_RULES.md)
- [`../portal-cliente/MODULE_CONTEXT.md`](../portal-cliente/MODULE_CONTEXT.md)
- [`../cotizaciones/MODULE_CONTEXT.md`](../cotizaciones/MODULE_CONTEXT.md)
- [`../facturacion/MODULE_CONTEXT.md`](../facturacion/MODULE_CONTEXT.md)
