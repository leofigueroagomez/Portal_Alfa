# Modulo: Proyectos/Entregas/Garantias

Contexto operativo para agentes que modifiquen proyectos, entregas, evidencias, garantias, documentos autorizados, estado de cuenta o visibilidad de proyecto en Portal Cliente. Antes de tocar SQL, RLS, storage, auth, rutas publicas o datos de cliente, revisar [`../../ai/SECURITY_RULES.md`](../../ai/SECURITY_RULES.md).

Estado inferido: activo y alto riesgo por concentrar datos de cliente, cotizaciones aprobadas, facturas/pagos, evidencias, documentos publicos por token y postventa.

## Que Hace

El modulo usa `client_projects` como eje operativo de proyectos ganados o en ejecucion. Desde el detalle admin se enlazan datos de obra, base operativa, traduccion tecnica, estado de cuenta, facturacion, compras, entregas de material, actas de entrega, garantias, ordenes de trabajo, visitas de obra y plano autorizado.

La parte visible al cliente vive en Portal Cliente y muestra solo proyectos asignados, documentos autorizados, entregas emitidas, garantias emitidas, facturas emitidas/pagadas y pagos relacionados.

## Mapa Por Flujo

| Flujo | Archivos confirmados | Responsabilidad |
| --- | --- | --- |
| Listado admin de proyectos | `app/(admin)/projects/page.tsx`, `app/(admin)/projects/ProjectsListClient.tsx` | Lista proyectos operativos ganados o con cotizacion aprobada; filtra fuera `lost`, `installed`, `delivered`, `warranty`, `closed`. |
| Detalle admin de proyecto | `app/(admin)/projects/[id]/page.tsx` | Hub operativo: cliente, etapa, cotizaciones aprobadas, datos de obra, plano autorizado, modulos de ejecucion, pagos, facturas, entregas y garantias. |
| Datos de obra | `app/(admin)/projects/[id]/EditProjectSiteDataButton.tsx`, `sql/20260529_project_site_fields.sql` | Edita contacto, telefono, direccion y Google Maps del sitio. |
| Relacion con cliente | `client_projects.client_id`, `app/(admin)/projects/[id]/page.tsx`, `app/portal/projects/[id]/page.tsx` | Admin lee cliente por `client_id`; portal valida proyecto por `client_id` y acceso asignado. |
| Relacion con cotizacion aprobada | `app/(admin)/projects/page.tsx`, `app/(admin)/projects/[id]/page.tsx`, `docs/modules/cotizaciones/MODULE_CONTEXT.md` | Busca `quotes.status = approved` por `client_project_id`; aprobacion de cotizacion puede mover proyecto a `won`. |
| Estado de cuenta | `app/(admin)/projects/[id]/account-statement/`, `lib/projectFinancials.ts`, `sql/20260527_project_payments.sql` | Admin gestiona pagos y saldos; resumen usa cotizaciones aprobadas y `project_payments`. |
| Facturas por proyecto | `app/(admin)/projects/[id]/invoices/page.tsx`, `docs/modules/facturacion/MODULE_CONTEXT.md` | Facturacion contextual por proyecto; usa `project_invoices` y documentos fiscales relacionados. |
| Portal proyecto | `app/portal/projects/[id]/page.tsx`, `lib/clientPortal.ts` | Cliente ve proyecto solo si `client_portal_project_access` esta activo y `client_id` coincide. |
| Documentos autorizados | `components/UploadAuthorizedPlanButton.tsx`, `app/portal/projects/[id]/page.tsx`, `lib/publicDocumentLinks.ts`, `lib/publicDocuments.ts` | Sube plano a `project-documents`; crea tokens publicos para documentos visibles y recursos emitidos. |
| Entregas de proyecto | `app/(admin)/projects/[id]/deliveries/`, `app/(admin)/projects/[id]/deliveries/new/NewProjectDeliveryForm.tsx` | Crea/lista actas de entrega, evidencias, firmas, sistemas entregados y pendientes. |
| Detalle de entrega | `app/(admin)/projects/[id]/deliveries/[deliveryId]/page.tsx`, `DeliveryPhotoManager.tsx` | Muestra entrega, evidencias, firmas, pendientes, sistemas, historial de correo y accion de PDF. |
| Evidencias de entrega | `app/api/projects/[id]/delivery/photos/route.ts`, `app/api/projects/[id]/delivery/photos/[photoId]/route.ts`, `project_delivery_evidences` | Subida/borrado server-side con `requireWorkOrderRole`; valida que entrega pertenezca al proyecto. |
| PDF de entrega | `app/api/projects/[id]/deliveries/[deliveryId]/pdf/route.ts`, `lib/postSalePdf.tsx`, print bajo `deliveries/[deliveryId]/print/` | Genera PDF formal de acta; valida `delivery.id` y `client_project_id`. |
| Correo de entrega/postventa | `app/(admin)/projects/[id]/deliveries/[deliveryId]/actions.ts`, `SendDeliveryEmailButton.tsx` | Preview/envio con Resend; exige garantia generada para enviar; adjunta PDF de entrega y garantia. |
| Garantias | `app/(admin)/projects/[id]/warranty/`, `app/(admin)/projects/[id]/warranty/new/NewProjectWarrantyForm.tsx` | Crea/lista cartas de garantia; al crear actualiza `client_projects.sales_stage = warranty`. |
| Detalle/PDF garantia | `app/(admin)/projects/[id]/warranty/[warrantyId]/page.tsx`, `app/api/projects/[id]/warranty/[warrantyId]/pdf/route.ts`, `lib/postSalePdf.tsx` | Muestra condiciones y genera PDF formal; valida `warranty.id` y `client_project_id`. |
| Documentos publicos por token | `app/public/documents/[token]/*`, `lib/publicDocuments.ts`, `lib/publicDocumentLinks.ts` | Sirve cotizacion aprobada, plano autorizado, entrega, garantia y factura PDF/XML con validacion por tipo, proyecto y estado. |
| Relacion con Servicios/Postventa | `docs/modules/servicios-postventa/MODULE_CONTEXT.md`, `app/(admin)/post-sale/page.tsx`, `app/(admin)/post-sale/actions.ts` | Postventa resume proyectos `delivered`, `warranty`, `installed`, `closed`; entregas/garantias alimentan portal y correo postventa. |
| Estados de proyecto | `lib/salesStages.ts`, `sql/20260603_project_deliveries.sql` | Estados confirmados en constraint: `lead`, `prospect`, `site_visit`, `engineering`, `quote`, `quoted`, `negotiation`, `won`, `lost`, `installed`, `delivered`, `warranty`, `closed`. |

Pendiente de confirmar: flujo completo de creacion/edicion comercial de `client_projects` fuera de cotizaciones/clientes; el detalle admin permite editar datos de obra, no todo el proyecto.

## Responsabilidad De Archivos Clave

| Archivo | Responsabilidad | Cuando modificar | Riesgos |
| --- | --- | --- | --- |
| `app/(admin)/projects/page.tsx` | Listado operativo de proyectos con cotizaciones aprobadas y total aprobado. | Cambios de filtros, etapas o metricas de entrada a operacion. | Puede ocultar proyectos activos o mostrar proyectos cerrados/perdidos. |
| `app/(admin)/projects/ProjectsListClient.tsx` | Busqueda y UI del listado. | Cambios de columnas o acciones visibles. | Riesgo bajo funcional; mantener enlaces a `/projects/[id]`. |
| `app/(admin)/projects/[id]/page.tsx` | Hub admin de proyecto; concentra modulos y datos sensibles. | Cualquier nueva tarjeta, link, documento o dato de proyecto. | Alto: mezcla finanzas, documentos, portal, storage, cotizaciones y postventa. |
| `app/(admin)/projects/[id]/EditProjectSiteDataButton.tsx` | Edicion de datos de obra. | Cambios de contacto/direccion/ubicacion. | Puede afectar PDFs, visitas, ordenes y comunicacion en sitio. |
| `components/UploadAuthorizedPlanButton.tsx` | Sube plano autorizado a `project-documents` e inserta `documents`. | Cambios de upload, visibilidad cliente o metadata de documento. | Critico: `is_client_visible` debe quedar `false` hasta revision explicita. |
| `lib/clientPortal.ts` | Contexto y validacion de acceso a proyecto en portal. | Cambios de dashboard/proyecto portal o saldo. | Critico: no omitir `client_portal_project_access` ni `client_id`. |
| `app/portal/projects/[id]/page.tsx` | Vista cliente de proyecto, documentos, facturas, pagos, entregas y garantias. | Cambios de visibilidad o documentos. | Critico: usa service role para tokens/documentos; debe revalidar alcance. |
| `lib/publicDocumentLinks.ts` | Crea/reusa tokens publicos con expiracion. | Nuevos tipos de documento o reglas de expiracion. | Critico: cada token debe tener identidad de recurso y proyecto. |
| `lib/publicDocuments.ts` | Valida token, expiracion/revocacion y audita accesos. | Cambios de seguridad de rutas publicas. | Critico: no tratar token como permiso general. |
| `app/(admin)/projects/[id]/deliveries/new/NewProjectDeliveryForm.tsx` | Crea entrega, sube evidencias/firmas y actualiza `sales_stage = delivered`. | Cambios de creacion de acta, evidencias, sistemas o firmas. | Usa Supabase client directo; RLS/storage deben ser correctos. |
| `app/(admin)/projects/[id]/deliveries/[deliveryId]/page.tsx` | Detalle admin de entrega y correo postventa. | Cambios de lectura, historial, fotos o envio. | Debe validar entrega por `client_project_id`. |
| `app/api/projects/[id]/delivery/photos/route.ts` | GET/POST evidencias de entrega con signed URLs. | Cambios de upload o respuesta de fotos. | Usa service role admin; debe mantener validacion proyecto-entrega. |
| `app/api/projects/[id]/delivery/photos/[photoId]/route.ts` | Borra evidencia y objeto storage. | Cambios de delete de fotos. | Puede borrar evidencia de otro proyecto si se rompe el join de pertenencia. |
| `app/api/projects/[id]/deliveries/[deliveryId]/pdf/route.ts` | PDF interno de entrega protegido por rol de work orders. | Cambios de generacion/headers/auth. | No relajar `requireWorkOrderRole`; PDF contiene evidencias. |
| `app/api/projects/[id]/warranty/[warrantyId]/pdf/route.ts` | PDF interno de garantia protegido. | Cambios de generacion/headers/auth. | No servir garantia de otro proyecto. |
| `app/(admin)/projects/[id]/deliveries/[deliveryId]/actions.ts` | Preview/envio de correo de entrega, tokens y adjuntos. | Cambios de email, Resend, enlaces publicos o adjuntos. | Requiere `APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM`; riesgo de enviar a correo incorrecto. |
| `app/(admin)/projects/[id]/warranty/new/NewProjectWarrantyForm.tsx` | Crea carta de garantia y actualiza etapa a `warranty`. | Cambios de condiciones, fechas, soporte o mantenimiento. | Fechas/condiciones incorrectas afectan documento legal/comercial. |
| `lib/postSalePdf.tsx` | Genera PDFs de entrega y garantia con `@react-pdf/renderer`. | Cambios visuales/datos de PDFs. | Puede romper PDFs publicos e internos o imagenes firmadas. |
| `lib/projectFinancials.ts` | Resumen aprobado/pagado/saldo por proyecto. | Cambios de saldo en entregas/postventa. | Puede informar saldo incorrecto al cliente en correo. |

## Contratos De Datos Confirmados

### `client_projects`

Confirmado por queries y migraciones parciales:

- Identidad/cliente: `id`, `client_id`, `name`.
- Estado/valor: `sales_stage`, `estimated_value_mxn`, `expected_close_date`, `created_at`, `updated_at`, `project_number`.
- Datos de obra: `site_contact_name`, `site_contact_phone`, `site_address`, `site_google_maps_url`.
- Operacion: `crew_lead_name`, `crew_lead_phone`.

Confirmado por `sql/20260603_project_deliveries.sql`:

- `sales_stage` permite `lead`, `prospect`, `site_visit`, `engineering`, `quote`, `quoted`, `negotiation`, `won`, `lost`, `installed`, `delivered`, `warranty`, `closed`.

RLS confirmada por `sql/20260615_critical_rls_hardening.sql`:

- Select para usuario interno o portal con `has_project_portal_access(client_projects.id)`.
- Insert para `admin`, `direccion`, `comercial`, `project_manager`.
- Update para `admin`, `direccion`, `comercial`, `project_manager`, `ingenieria`.
- Delete para `admin`, `direccion`.

Pendiente de confirmar: migracion base completa de `client_projects`, defaults originales, FK exacta a `clients` y triggers.

### `project_deliveries`

Confirmado por `sql/20260603_project_deliveries.sql`:

- `id`
- `client_project_id references client_projects(id) on delete cascade`
- `delivery_date`
- `status` en `draft`, `delivered`, `accepted`
- `delivered_to_name`, `delivered_to_role`, `delivered_by_name`
- `observations`
- `client_signature_image_url`, `alfa_signature_image_url`, `pdf_url`
- Correo: `delivery_email_sent_at`, `delivery_email_sent_to`, `delivery_email_status`, `delivery_email_error`
- Auditoria: `created_by_user_id`, `created_at`, `updated_at`

Uso confirmado:

- La creacion de entrega guarda `status = delivered` y actualiza `client_projects.sales_stage = delivered`.
- PDFs y detalle validan `project_deliveries.id` junto con `client_project_id`.

RLS local confirmada: policies beta abiertas en la migracion base. Pendiente de confirmar hardening real en produccion.

### `project_delivery_evidences`

Confirmado por SQL y APIs:

- `id`, `project_delivery_id`
- `file_url`, `file_path`, `file_name`, `file_type`, `file_size`
- `uploaded_by`, `caption`, `sort_order`, `created_at`

Uso confirmado:

- Paths en bucket privado `project-photos`: `project-deliveries/{projectId}/{deliveryId}/...`.
- API GET/POST crea signed URLs de 1 hora.
- API DELETE valida evidencia por join con `project_deliveries.client_project_id`, borra objeto de storage y luego la fila.

### `project_delivery_pending_items`

Confirmado por SQL:

- `id`, `project_delivery_id`, `description`, `status`, `sort_order`, `created_at`.
- `status` en `pending`, `resolved`.

### `project_delivery_systems`

Confirmado por SQL y `lib/projectDeliverySystems.ts`:

- `id`, `project_delivery_id`, `system_name`, `delivered`, `notes`, `created_at`.
- Se usa para mostrar sistemas entregados en detalle, email y PDF. Si no hay sistemas, algunos flujos usan base operativa como fallback.

### `project_delivery_email_history`

Confirmado por SQL y `deliveries/[deliveryId]/actions.ts`:

- `id`, `project_delivery_id`, `sent_to`, `cc`, `subject`, `body_html`, `attachment_names`, `status`, `error_message`, `resend_response`, `sent_at`, `created_by_user_id`.
- Registra envios y errores del correo de entrega/postventa.

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
- `status` en `draft`, `issued`
- `pdf_url`, `created_by_user_id`, `created_at`, `updated_at`

Uso confirmado:

- `NewProjectWarrantyForm` inserta con `status = issued` y actualiza `client_projects.sales_stage = warranty`.
- Portal Cliente solo consulta garantias `issued`.
- PDF interno valida `warranty.id` y `client_project_id`.

RLS local confirmada: policies beta abiertas en la migracion base. Pendiente de confirmar hardening real en produccion.

### `documents`

Confirmado por `sql/20260604_client_portal_visible_documents.sql` y `UploadAuthorizedPlanButton.tsx`:

- Columnas agregadas/confirmadas: `is_client_visible`, `document_type`, `bucket_id`, `storage_path`, `file_name`, `mime_type`.
- El upload de plano autorizado inserta `type = authorized_plan`, `document_type = authorized_plan`, `is_client_visible = false`, `bucket_id = project-documents`, `storage_path`.
- Portal solo genera token para documentos con `is_client_visible = true` y tipo `authorized_plan`.

Pendiente de confirmar: esquema base completo de `documents` y flujo UI para marcar un plano como visible al cliente.

### `public_document_links`

Confirmado por migraciones y helpers:

- `id`, `token`, `document_type`, `client_project_id`
- Relaciones: `project_delivery_id`, `project_warranty_id`, `quote_id`, `document_id`, `project_invoice_id`
- `file_format`, `expires_at`, `revoked_at`, `revoked_by_user_id`, `access_count`, `last_accessed_at`, `created_at`
- Tipos confirmados: `project_delivery`, `project_warranty`, `approved_quote`, `authorized_plan`, `project_invoice_pdf`, `project_invoice_xml`.
- Expiracion por codigo: fiscales 30 dias; otros documentos 90 dias.

RLS confirmada por hardening:

- Select/insert/update/delete solo roles internos autorizados; rutas publicas usan service role y validan token/estado.

### `project_invoices` / `project_payments`

Uso confirmado desde Portal Cliente y facturacion:

- Portal proyecto muestra facturas `issued`/`paid` por `client_project_id`.
- Portal proyecto muestra pagos por `client_project_id`.
- `lib/clientPortal.ts` calcula saldo con facturas no canceladas y pagos.
- `lib/projectFinancials.ts` calcula saldo operativo con cotizaciones aprobadas y `project_payments`.

Ver contrato fiscal completo en [`../facturacion/MODULE_CONTEXT.md`](../facturacion/MODULE_CONTEXT.md).

### Relacion con cotizaciones

Uso confirmado:

- `quotes.client_project_id` relaciona cotizaciones con proyecto.
- Solo `quotes.status = approved` alimenta listado de proyectos, detalle admin y portal/documentos publicos.
- `quote_groups.approved_quote_id` se usa para exponer cotizacion aprobada en Portal Cliente.

Ver contrato completo en [`../cotizaciones/MODULE_CONTEXT.md`](../cotizaciones/MODULE_CONTEXT.md).

## Reglas De Visibilidad Y Seguridad

- Admin interno accede a `/projects` por proteccion general de `proxy.ts`.
- Portal Cliente accede a `/portal/projects/[id]` solo con `client_portal_users.is_active = true`, `client_portal_project_access.is_active = true` y `client_projects.client_id = portalUser.client_id`.
- No basta con recibir `projectId` por URL; las rutas deben validar pertenencia por `client_id`, `client_project_id` o acceso portal.
- Facturas visibles al cliente deben estar `issued` o `paid`; no exponer `draft` ni `cancelled`.
- Entregas visibles al cliente deben estar `delivered` o `accepted`.
- Garantias visibles al cliente deben estar `issued`.
- Planos autorizados requieren `documents.is_client_visible = true`, tipo `authorized_plan`, `bucket_id` y `storage_path`.
- `project-documents` y `project-photos` son buckets privados; servir con signed URLs o rutas publicas con validacion de token.
- APIs de evidencias usan service role y por eso deben validar entrega-proyecto antes de leer/subir/borrar.
- Rutas publicas por token deben validar `document_type`, ids relacionados, proyecto, estado, expiracion y revocacion.
- RLS local de entregas/garantias aparece beta abierta; no confiar solo en RLS hasta confirmar policies productivas.

## Storage Y Archivos

- `project-documents`: bucket privado para planos/documentos de proyecto; `UploadAuthorizedPlanButton` guarda paths `authorized-plans/{projectId}/...`.
- `project-photos`: bucket privado para evidencias, fotos y firmas; entregas usan `project-deliveries/{projectId}/{deliveryId}/...`.
- Evidencias de entrega: `project_delivery_evidences.file_path`/`file_url` guarda path persistente, no signed URL.
- Firmas de entrega: `project_deliveries.client_signature_image_url` y `alfa_signature_image_url` guardan path en `project-photos`.
- PDFs internos de entrega/garantia se generan bajo demanda con `lib/postSalePdf.tsx`.
- Documentos publicos por token se sirven desde `app/public/documents/[token]/*`; los archivos privados se entregan por signed URL temporal.

## Archivos Que Suelen Cambiar Juntos

- Detalle admin de proyecto: `app/(admin)/projects/[id]/page.tsx`, `lib/salesStages.ts`, `EditProjectSiteDataButton.tsx`, SQL de `client_projects` si cambia contrato.
- Portal Cliente de proyecto: `app/portal/projects/[id]/page.tsx`, `lib/clientPortal.ts`, `lib/publicDocumentLinks.ts`, `lib/publicDocuments.ts`, documentos/facturas/entregas/garantias relacionados.
- Entregas: `app/(admin)/projects/[id]/deliveries/**`, `app/api/projects/[id]/delivery/photos/**`, `app/api/projects/[id]/deliveries/[deliveryId]/pdf/route.ts`, `lib/postSalePdf.tsx`, `project_deliveries` y tablas hijas.
- Evidencias/storage: `DeliveryPhotoManager.tsx`, APIs de `delivery/photos`, bucket `project-photos`, `sql/20260604_storage_buckets.sql`.
- Garantias: `app/(admin)/projects/[id]/warranty/**`, `app/api/projects/[id]/warranty/[warrantyId]/pdf/route.ts`, `lib/postSalePdf.tsx`, `project_warranties`.
- Documentos autorizados: `components/UploadAuthorizedPlanButton.tsx`, `documents`, `project-documents`, `app/public/documents/[token]/file/route.ts`.
- Facturacion/pagos ligados a proyecto: `app/(admin)/projects/[id]/account-statement/**`, `app/(admin)/projects/[id]/invoices/page.tsx`, `lib/projectFinancials.ts`, modulo facturacion.
- Postventa: `app/(admin)/post-sale/**`, entregas, garantias, `client_projects.sales_stage`, modulo Servicios/Postventa.

## Validacion Especifica

- Admin proyecto:
  - `/projects` lista solo proyectos operativos esperados;
  - `/projects/[id]` carga cliente, etapa, cotizaciones aprobadas y modulos;
  - datos de obra se editan y persisten sin romper fallback de columnas.
- Portal Cliente:
  - usuario cliente ve solo proyectos asignados activos;
  - `/portal/projects/[id]` de otro cliente o no asignado responde `notFound`;
  - proyecto muestra solo documentos autorizados, facturas emitidas/pagadas, entregas entregadas/aceptadas y garantias emitidas.
- Entrega:
  - crear entrega con receptor, evidencia y sistemas;
  - confirmar `project_deliveries`, `project_delivery_evidences`, `project_delivery_pending_items`, `project_delivery_systems`;
  - confirmar que `client_projects.sales_stage` pasa a `delivered` cuando corresponde.
- Evidencias:
  - subir varias imagenes;
  - rechazar archivo no imagen o mayor a 50 MB;
  - validar signed URLs en detalle/PDF;
  - borrar evidencia y confirmar borrado de fila y objeto storage.
- Garantia:
  - crear carta `issued`;
  - validar fechas inicio/fin de equipos e instalacion;
  - confirmar que `sales_stage` pasa a `warranty`;
  - PDF interno y publico muestran datos correctos.
- Documentos:
  - subir plano autorizado y confirmar `is_client_visible = false` por defecto;
  - si se autoriza visibilidad, token `authorized_plan` debe servir archivo correcto;
  - token expirado/revocado/invalido no debe entregar contenido.
- Facturas/pagos:
  - portal solo muestra `project_invoices.status in ('issued','paid')`;
  - saldo no incluye facturas canceladas;
  - pagos pertenecen al mismo `client_project_id`.
- Rutas directas:
  - PDF entrega/garantia de otro proyecto debe devolver 404;
  - API de fotos debe rechazar `deliveryId` que no pertenece al proyecto;
  - usuario sin rol de work orders no debe subir/borrar evidencias.
- RLS/storage:
  - revisar policies productivas antes de cambios de SQL/storage;
  - validar que `project-documents` y `project-photos` sigan privados;
  - no persistir signed URLs como fuente de verdad.

## Riesgos

- Exposicion cruzada entre clientes si se omite `client_id`, `client_project_id` o `client_portal_project_access`.
- Documentos/evidencias visibles incorrectamente por `is_client_visible`, token o signed URL mal validado.
- Facturas o pagos de otro proyecto pueden alterar saldos del portal.
- Garantias/entregas asociadas al proyecto equivocado afectan documentos publicos y postventa.
- Policies beta abiertas en SQL local para entregas, evidencias, sistemas, pendientes, email history y garantias.
- Uso indebido de service role en rutas publicas o APIs de fotos.
- Cambios en `sales_stage` pueden mover proyectos a postventa incorrectamente.
- Perdida de trazabilidad si se borra evidencia de storage sin borrar DB o viceversa.
- Correos de entrega pueden exponer saldo, PDFs y enlaces publicos a destinatarios incorrectos.
- Cambios en PDF postventa pueden romper portal, correo y descarga interna.

## Pendientes De Confirmar

- Esquema base completo de `client_projects` y `documents`.
- RLS real en produccion para `project_deliveries`, `project_delivery_evidences`, `project_delivery_pending_items`, `project_delivery_systems`, `project_delivery_email_history` y `project_warranties`.
- Flujo UI exacto para marcar `documents.is_client_visible = true`.
- Politica productiva exacta de storage para `project-documents` y `project-photos`.
- Si creacion/edicion completa de `client_projects` vive en otro modulo o solo nace desde clientes/cotizaciones.
- Si se requiere historial/auditoria adicional cuando cambia `sales_stage` por entregas/garantias.

## Documentos Relacionados

- [`../../ai/AI_CONTEXT.md`](../../ai/AI_CONTEXT.md)
- [`../../ai/PROJECT_MAP.md`](../../ai/PROJECT_MAP.md)
- [`../../ai/MODULE_INDEX.md`](../../ai/MODULE_INDEX.md)
- [`../../ai/SECURITY_RULES.md`](../../ai/SECURITY_RULES.md)
- [`../portal-cliente/MODULE_CONTEXT.md`](../portal-cliente/MODULE_CONTEXT.md)
- [`../servicios-postventa/MODULE_CONTEXT.md`](../servicios-postventa/MODULE_CONTEXT.md)
- [`../cotizaciones/MODULE_CONTEXT.md`](../cotizaciones/MODULE_CONTEXT.md)
- [`../facturacion/MODULE_CONTEXT.md`](../facturacion/MODULE_CONTEXT.md)
