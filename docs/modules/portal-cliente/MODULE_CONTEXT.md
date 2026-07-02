# Modulo: Portal Cliente

Contexto para agentes que modifiquen vistas cliente, acceso a proyectos, servicios o documentos publicos. Antes de cambiar seguridad, SQL, storage o visibilidad de datos, leer [`../../ai/SECURITY_RULES.md`](../../ai/SECURITY_RULES.md).

## Que Hace

Permite a usuarios cliente consultar informacion autorizada de sus proyectos, servicios, estado de cuenta y documentos. El portal debe mantenerse separado de ALFA OS interno.

Estado inferido: activo y critico por exposicion de datos de clientes, documentos fiscales y enlaces publicos.

## Mapa Por Flujo

| Flujo | Rutas / archivos confirmados | Contrato principal | Riesgo |
| --- | --- | --- | --- |
| Login y separacion cliente/admin | `proxy.ts`, `services/profile.ts`, `lib/permissions.ts` | `profiles.role`, `profiles.user_type`, `profiles.is_internal`, `profiles.is_active` | Critico: un cliente no debe entrar a rutas internas. |
| Dashboard del portal | `app/portal/page.tsx`, `lib/clientPortal.ts` | `client_portal_users`, `client_portal_project_access`, `client_projects`, `project_deliveries`, `project_warranties`, `project_invoices`, `project_payments`, `service_reports` | Alto: no mostrar proyectos ajenos ni facturas no emitidas. |
| Detalle de proyecto | `app/portal/projects/[id]/page.tsx`, `lib/clientPortal.ts`, `lib/publicDocumentLinks.ts` | Acceso activo por `client_portal_project_access`; datos del proyecto por `client_projects.client_id` | Critico: combina datos financieros, entregas, garantias y documentos. |
| Detalle de servicio | `app/portal/services/[id]/page.tsx`, `lib/clientPortal.ts`, `lib/serviceReports.ts` | `service_reports.client_id`, `service_reports.client_project_id`, `service_report_photos.image_url` | Alto: el codigo filtra por cliente/proyecto; RLS especifica de servicios queda pendiente de confirmar. |
| Administrar usuarios portal | `app/(admin)/clients/[id]/portal-users/page.tsx`, `app/(admin)/clients/[id]/portal-users/actions.ts` | `client_portal_users`, `client_portal_project_access`, Supabase Auth admin invite | Critico: solo `admin` puede crear, invitar, desactivar o asignar proyectos. |
| Crear invitacion portal | `app/(admin)/clients/[id]/portal-users/actions.ts`, `services/profile.ts` | Auth metadata `portal: client`, `role: client`, `user_type: client_portal`, `is_internal: false` | Critico: no convertir usuarios internos a cliente sin validacion. |
| Asignar / revocar proyecto visible | `app/(admin)/clients/[id]/portal-users/actions.ts` | `client_portal_project_access.client_portal_user_id`, `client_project_id`, `is_active` | Alto: validar que el proyecto pertenezca al cliente antes de asignar. |
| Documentos del proyecto | `app/portal/projects/[id]/page.tsx`, `lib/publicDocumentLinks.ts`, `lib/publicDocuments.ts` | `public_document_links`, `documents.is_client_visible`, `documents.document_type` | Critico: tokens deben apuntar solo al documento autorizado. |
| Documento publico por token | `app/public/documents/[token]/page.tsx`, `app/public/documents/[token]/quote/page.tsx`, `app/public/documents/[token]/pdf/route.ts`, `app/public/documents/[token]/xml/route.ts`, `app/public/documents/[token]/file/route.ts` | `public_document_links.token`, `expires_at`, `revoked_at`, `document_type` | Critico: rutas publicas usan service role; cada handler debe revalidar tipo, id y proyecto. |
| Cotizacion autorizada publica | `app/public/documents/[token]/quote/page.tsx` | `public_document_links.document_type = approved_quote`, `quote_groups.approved_quote_id`, `quotes.status = approved` | Alto: no exponer cotizaciones no aprobadas ni de otro proyecto. |
| Factura PDF/XML publica | `app/public/documents/[token]/pdf/route.ts`, `app/public/documents/[token]/xml/route.ts`, `lib/facturama.ts` | `project_invoices.status in ('issued', 'paid')`, `project_invoices.facturama_id` | Critico: documentos fiscales solo para facturas emitidas/pagadas. |
| Archivo/plano autorizado | `app/public/documents/[token]/file/route.ts` | `documents.is_client_visible = true`, `document_type/type = authorized_plan`, `bucket_id`, `storage_path` | Critico: usa URL firmada de storage; no exponer paths privados sin firmar. |
| Ruta legacy cliente | `app/(client)/dashboard/projects/[id]/page.tsx` | Redireccion a `/portal/projects/[id]` | Bajo: mantener redireccion si cambia la ruta canonica. |

## Responsabilidad De Archivos Clave

| Archivo | Responsabilidad | Cuando se modifica | Riesgos |
| --- | --- | --- | --- |
| `proxy.ts` | Protege rutas internas y `/portal`; redirige usuarios cliente fuera de ALFA OS interno. | Cambios de auth, host del portal, nuevas rutas protegidas. | Critico: puede bloquear admins o permitir clientes en rutas internas. |
| `services/profile.ts` | Normaliza perfil actual y separa usuario interno vs `client_portal`. | Cambios de roles, perfiles o metadata de Auth. | Critico: base de todas las decisiones de acceso. |
| `lib/permissions.ts` | Define roles internos y helpers de permisos. | Nuevos roles o permisos administrativos. | Alto: no tratar `client` como rol interno. |
| `lib/apiAuth.ts` | Guards server/API, rate limit basico, `requirePortalProjectAccess*`, `requireFiscalProjectAccess*`. | APIs nuevas de portal, fiscal o documentos. | Critico: toda API sensible debe validar proyecto/recurso. |
| `lib/clientPortal.ts` | Contexto portal, validacion de proyecto accesible y calculos de estado de cuenta. | Cambios en dashboard, detalle proyecto, saldos o estados. | Alto: errores aqui afectan todo el portal autenticado. |
| `lib/publicDocumentLinks.ts` | Crea o reutiliza tokens publicos con expiracion por tipo. | Nuevos tipos de documento o reglas de expiracion. | Critico: no crear tokens sin identidad de recurso y proyecto. |
| `lib/publicDocuments.ts` | Lee token, valida expiracion/revocacion y registra auditoria. | Cambios de seguridad, auditoria o eventos de acceso. | Critico: rutas publicas dependen de este helper. |
| `app/portal/page.tsx` | Dashboard cliente con proyectos, garantias, saldos y servicios. | Nuevas tarjetas/resumenes del portal. | Alto: filtrar por cliente y proyectos asignados. |
| `app/portal/projects/[id]/page.tsx` | Vista completa de proyecto y generacion de links publicos. | Documentos visibles, facturas, pagos, entregas, garantias. | Critico: mezcla service role para documentos con datos de cliente. |
| `app/portal/services/[id]/page.tsx` | Detalle de servicio y evidencias. | Servicios, fotos, saldos relacionados a servicio. | Alto: validar cliente y proyecto antes de mostrar fotos. |
| `app/public/documents/[token]/*` | Landing y descargas publicas por token. | Nuevos formatos o tipos documentales. | Critico: cada handler debe validar `document_type`, ids relacionados, estado y proyecto. |
| `app/(admin)/clients/[id]/portal-users/page.tsx` | UI interna para usuarios portal y proyectos visibles. | Administracion de usuarios cliente. | Alto: solo admin; no debe ser accesible por cliente. |
| `app/(admin)/clients/[id]/portal-users/actions.ts` | Server actions para invitar, desactivar, asignar y revocar accesos. | Cambios en invitaciones o accesos. | Critico: usa service role/Auth admin; validar cliente-proyecto siempre. |

## Contratos De Datos Confirmados

Confirmado desde migraciones y codigo. Si se necesita el esquema completo, consultar SQL antes de editar.

### `profiles`

- Columnas confirmadas: `id`, `email`, `full_name`, `role`, `is_active`, `user_type`, `is_internal`.
- `role` permite `client` ademas de roles internos.
- `user_type` confirmado: `internal` o `client_portal`.
- Usuarios portal deben quedar con `role = 'client'`, `user_type = 'client_portal'`, `is_internal = false`, `is_active = true`.
- Funciones relacionadas: `ensure_current_user_profile()`, `current_profile_role()`, `is_internal_user()`, `has_internal_role(text[])`, `has_project_portal_access(bigint)`.

### `client_portal_users`

- Migracion: `sql/20260604_client_portal_v2_access.sql`.
- Columnas confirmadas: `id`, `user_id`, `client_id`, `is_active`, `invited_at`, `invitation_status`, `invitation_error`, `created_at`, `updated_at`.
- Relaciones confirmadas: `user_id -> auth.users(id)`, `client_id -> clients(id)`.
- Unicidad confirmada: `(user_id, client_id)`.
- RLS confirmada: select propio por `user_id = auth.uid()`.

### `client_portal_project_access`

- Migracion: `sql/20260604_client_portal_v2_access.sql`.
- Columnas confirmadas: `id`, `client_portal_user_id`, `client_project_id`, `is_active`, `created_at`, `updated_at`.
- Relaciones confirmadas: `client_portal_user_id -> client_portal_users(id)`, `client_project_id -> client_projects(id)`.
- Unicidad confirmada: `(client_portal_user_id, client_project_id)`.
- RLS confirmada: select propio cuando el usuario portal esta activo.

### `client_projects`

- Columnas usadas por portal: `id`, `client_id`, `name`, `sales_stage`, `estimated_value_mxn`, `expected_close_date`, `updated_at`, `project_number`.
- RLS vigente en `sql/20260615_critical_rls_hardening.sql`: select para usuario interno o `has_project_portal_access(client_projects.id)`.
- Pendiente de confirmar: esquema completo base de `client_projects` no esta en los SQL revisados.

### `project_invoices`

- Migracion base: `sql/20260602_internal_invoicing.sql`.
- Columnas usadas por portal/documentos: `id`, `internal_folio`, `client_project_id`, `client_id`, `source_type`, `source_quote_id`, `source_service_report_id`, `invoice_date`, `subtotal_mxn`, `iva_mxn`, `total_mxn`, `total`, `status`, `facturama_id`, `sat_uuid`, `xml_url`, `pdf_url`, `last_error`, `facturama_response`, `created_at`.
- Estados relevantes para portal: solo `issued` y `paid`.
- RLS vigente en `sql/20260615_critical_rls_hardening.sql`: clientes solo leen facturas `issued`/`paid` si tienen acceso al proyecto.

### `project_payments`

- Migracion base: `sql/20260527_project_payments.sql`.
- Columnas confirmadas: `id`, `client_project_id`, `payment_date`, `payment_method`, `payment_reference`, `payment_category`, `currency`, `amount`, `exchange_rate`, `amount_mxn`, `notes`, `created_by_user_id`, `created_at`.
- RLS vigente en `sql/20260615_critical_rls_hardening.sql`: select para usuario interno o portal con acceso al proyecto.

### `project_deliveries` / `project_warranties`

- Usadas por `app/portal/page.tsx`, `app/portal/projects/[id]/page.tsx` y PDF publico.
- Columnas usadas de entregas: `id`, `client_project_id`, `delivery_date`, `status`, `delivered_to_name`, `observations`, `created_at`.
- Columnas usadas de garantias: `id`, `client_project_id`, `warranty_date`, `status`, `equipment_warranty_end_date`, `installation_warranty_end_date`, `preventive_maintenance_frequency_months`, `support_email`, `created_at`.
- Estados visibles: entregas `delivered`/`accepted`; garantias `issued`.
- Pendiente de confirmar: RLS vigente especifica para estas tablas despues de todas las migraciones.

### `service_reports`

- Migracion base: `sql/20260529_service_reports.sql`.
- Columnas usadas por portal: `id`, `service_number`, `client_id`, `client_project_id`, `service_date`, `performed_by_name`, `solution_description`, `recommendations`, `required_parts_notes`, `status`, `labor_sale_mxn`, `client_projects(name)`.
- Estados visibles en dashboard: `pending`, `in_progress`, `completed`.
- El detalle valida `client_id = portalUser.client_id` y, si existe `client_project_id`, exige que el proyecto este asignado al usuario portal.
- Riesgo pendiente: la migracion encontrada mantiene politicas `beta_authenticated_* using (true)` para `service_reports`; no se encontro hardening posterior para esta tabla en los SQL revisados. Confirmar RLS real en Supabase antes de ampliar exposicion.

### `service_report_photos`

- Migracion base: `sql/20260529_service_reports.sql`.
- Columnas confirmadas: `id`, `service_report_id`, `image_url`, `caption`, `sort_order`, `created_at`.
- El portal resuelve `image_url` con `resolveServicePhotoUrl(supabase.storage, ...)`.
- Riesgo pendiente: igual que servicios, RLS encontrada en SQL base es beta abierta; confirmar produccion antes de tocar evidencias.

### `documents`

- Migracion relevante: `sql/20260604_client_portal_visible_documents.sql`.
- Columnas agregadas/confirmadas: `is_client_visible`, `document_type`, `bucket_id`, `storage_path`, `file_name`, `mime_type`.
- Para portal solo se muestran planes autorizados con `is_client_visible = true` y `document_type` o `type` igual a `authorized_plan`.
- El endpoint publico de archivo exige `bucket_id` y `storage_path` para crear URL firmada.

### `public_document_links`

- Migracion base: `sql/20260603_project_deliveries.sql`; ampliaciones en `sql/20260604_client_portal_visible_documents.sql` y `sql/20260614_public_document_links_security.sql`.
- Columnas confirmadas: `id`, `token`, `document_type`, `client_project_id`, `project_delivery_id`, `project_warranty_id`, `quote_id`, `document_id`, `project_invoice_id`, `file_format`, `expires_at`, `revoked_at`, `revoked_by_user_id`, `access_count`, `last_accessed_at`, `created_at`.
- Tipos confirmados: `project_delivery`, `project_warranty`, `approved_quote`, `authorized_plan`, `project_invoice_pdf`, `project_invoice_xml`.
- Expiracion por codigo: fiscales 30 dias; otros 90 dias.
- RLS vigente en `sql/20260615_critical_rls_hardening.sql`: acceso autenticado interno autorizado; las rutas publicas usan service role y validan token en servidor.

### `public_document_access_events`

- Migracion: `sql/20260614_public_document_links_security.sql`.
- Columnas confirmadas: `id`, `public_document_link_id`, `accessed_at`, `ip_hash`, `user_agent`, `result`, `request_id`.
- Uso: auditoria best-effort de accesos publicos y resultado (`success`, `expired`, `revoked`, errores por tipo).

## Storage Y Archivos

- Bucket confirmado para evidencias/fotos de proyecto y servicio: `project-photos`.
- `project-photos` se declara privado en `sql/20260604_storage_buckets.sql` (`public = false`).
- `lib/serviceReports.ts` resuelve `service_report_photos.image_url` con signed URL de 1 hora desde `project-photos`; si falla, cae a public URL/path como fallback.
- Planos autorizados visibles al cliente se sirven desde `documents.bucket_id` + `documents.storage_path` con signed URL de 5 minutos en `app/public/documents/[token]/file/route.ts`.
- `documents.is_client_visible` controla si un archivo puede aparecer en Portal Cliente; el hardening de portal puso planos autorizados existentes en `false` hasta revision explicita.
- No persistir signed URLs como fuente de verdad. Persistir path/bucket y firmar al momento de servir.

## Reglas De Visibilidad Y Seguridad

- El portal autenticado se basa en `client_portal_users.is_active = true` y `client_portal_project_access.is_active = true`.
- Un usuario con `profile.is_internal = false`, `user_type = 'client_portal'` o `role = 'client'` no debe acceder a rutas internas.
- `proxy.ts` protege rutas internas y redirige clientes a `/portal`; agregar nuevas rutas internas al arreglo si corresponde.
- Las paginas de portal deben filtrar por `portalUser.client_id` y por proyectos asignados, no solo por ids recibidos en URL.
- Los documentos por token no son una autorizacion general: cada handler revalida `document_type`, id relacionado, `client_project_id`, estado del recurso y expiracion/revocacion.
- `documents.is_client_visible` debe ser `false` por defecto. No marcar archivos como visibles sin revision explicita.
- Facturas visibles al cliente deben estar en `issued` o `paid`; no exponer `draft` ni `cancelled`.
- Cotizaciones publicas deben estar aprobadas y enlazadas por `quote_groups.approved_quote_id`.
- Si se toca storage privado, mantener URLs firmadas de corta duracion y no persistir signed URLs como fuente de verdad.
- No usar service role en rutas cliente salvo que el handler haga validaciones estrictas de alcance.

## Archivos Que Suelen Cambiar Juntos

- Cambios de auth/separacion cliente-admin: `proxy.ts`, `services/profile.ts`, `lib/permissions.ts`, `sql/20260604_separate_internal_and_client_portal_users.sql`, `sql/20260615_critical_rls_hardening.sql`.
- Cambios de acceso a proyectos: `lib/clientPortal.ts`, `lib/apiAuth.ts`, `app/portal/page.tsx`, `app/portal/projects/[id]/page.tsx`, `app/(admin)/clients/[id]/portal-users/actions.ts`, `sql/20260604_client_portal_v2_access.sql`.
- Cambios de documentos visibles: `app/portal/projects/[id]/page.tsx`, `lib/publicDocumentLinks.ts`, `lib/publicDocuments.ts`, `app/public/documents/[token]/*`, `sql/20260604_client_portal_visible_documents.sql`.
- Cambios de PDF/XML fiscales publicos: `app/public/documents/[token]/pdf/route.ts`, `app/public/documents/[token]/xml/route.ts`, `lib/facturama.ts`, modulo facturacion.
- Cambios de servicios/evidencias: `app/portal/page.tsx`, `app/portal/services/[id]/page.tsx`, `lib/serviceReports.ts`, SQL de `service_reports` / `service_report_photos`.
- Cambios de entregas/garantias: `app/portal/page.tsx`, `app/portal/projects/[id]/page.tsx`, `app/public/documents/[token]/pdf/route.ts`, `lib/postSalePdf.ts`, SQL de entregas/garantias.

## Validacion Especifica

- Login cliente: usuario portal activo entra a `/portal`; usuario sin sesion redirige a `/login`.
- Separacion admin/cliente: usuario cliente no entra a `/admin`, `/clients`, `/projects`, `/quotes`, `/invoices` ni otras rutas internas; usuario interno sigue entrando normalmente.
- Dashboard: cliente ve solo proyectos en `client_portal_project_access` activo y del mismo `client_id`.
- Proyecto sin acceso: `/portal/projects/[id]` debe responder `notFound()` para proyecto no asignado o de otro cliente.
- Estado de cuenta: facturas `issued`/`paid` y pagos del proyecto calculan saldo sin incluir facturas canceladas.
- Servicios: cliente ve servicios de su `client_id`; si el servicio tiene `client_project_id`, debe estar en sus proyectos asignados.
- Evidencias de servicio: fotos se resuelven con storage sin exponer paths privados permanentes.
- Documentos proyecto: solo aparecen cotizacion aprobada, planos autorizados visibles, entregas entregadas/aceptadas, garantias emitidas y facturas emitidas/pagadas con `facturama_id`.
- Token invalido/expirado/revocado: rutas `/public/documents/[token]/*` no entregan contenido y registran auditoria cuando aplique.
- PDF entrega/garantia: valida que el documento pertenezca al `client_project_id` del token y que su estado sea visible.
- PDF/XML factura: valida `project_invoice_id`, proyecto, estado `issued`/`paid` y `facturama_id`.
- Archivo autorizado: exige `documents.is_client_visible = true`, tipo `authorized_plan`, `bucket_id` y `storage_path`; devuelve signed URL temporal.
- Cotizacion publica: exige `document_type = approved_quote`, `quote_groups.approved_quote_id`, `quotes.status = approved` y mismo `client_project_id`.
- PostgREST/schema cache: si se agregan columnas/tablas para portal, la migracion debe terminar con `notify pgrst, 'reload schema';`.
- Ejecutar al menos revision dirigida de tipos/build si se cambia codigo; para documentacion ejecutar `git diff --check`.
- Revisar [`../../../PRUEBA_MANUAL_SEPARACION_PORTAL_CLIENTE.md`](../../../PRUEBA_MANUAL_SEPARACION_PORTAL_CLIENTE.md) cuando se toque separacion cliente/admin.

## Reglas De Seguridad

- Cualquier cambio en SQL, RLS, Supabase, storage, tokens publicos o visibilidad de datos debe revisar [`../../ai/SECURITY_RULES.md`](../../ai/SECURITY_RULES.md).
- No aplicar cambios productivos de RLS/storage/auth sin sandbox, respaldo, pruebas manuales y rollback.
- No ampliar tipos de `public_document_links.document_type` sin actualizar validaciones en `lib/publicDocumentLinks.ts`, `lib/publicDocuments.ts` y `app/public/documents/[token]/*`.
- No relajar filtros por `client_id`, `client_project_id`, `status`, `is_active`, `is_client_visible`, `expires_at` o `revoked_at`.
- No confiar en nombres de archivo, URLs o parametros de ruta como permisos.
- No guardar secretos, service role keys ni URLs firmadas persistentes en documentos o codigo cliente.

## Riesgos

- Exposicion cruzada de datos entre clientes si se omite `client_id`, `client_project_id` o `client_portal_project_access`.
- Acceso interno indebido si `proxy.ts`, `services/profile.ts` o `profiles.is_internal` se relajan.
- Exposicion de XML/PDF fiscal si tokens publicos no validan estado `issued`/`paid`, `facturama_id` y proyecto.
- Exposicion de archivos privados si `documents.is_client_visible`, `bucket_id` o `storage_path` se usan sin validacion de tipo y token.
- Tokens publicos reutilizables sin control si se ignoran `expires_at`, `revoked_at`, `access_count` o auditoria.
- Servicios/evidencias tienen riesgo adicional porque los SQL revisados muestran RLS beta abierta para `service_reports` y `service_report_photos`.
- El uso de service role en rutas publicas es aceptable solo con validaciones estrictas; cualquier nuevo tipo documental debe seguir ese patron.
- Cambios de storage pueden romper imagenes/evidencias del portal, PDF de entregas/garantias y otros flujos que dependen de `project-photos`.

## Pendientes De Confirmar

- Esquema completo base de `client_projects`.
- RLS real en produccion para `project_deliveries` y `project_warranties`.
- RLS real en produccion para `service_reports` y `service_report_photos`; los SQL revisados conservan politicas beta abiertas.
- Flujo exacto de logout/sesion del portal fuera de la proteccion general de Supabase Auth.
- Politica de rotacion/revocacion manual de tokens publicos desde UI interna.

## Documentos Relacionados

- [`../../ai/AI_CONTEXT.md`](../../ai/AI_CONTEXT.md)
- [`../../ai/PROJECT_MAP.md`](../../ai/PROJECT_MAP.md)
- [`../../ai/MODULE_INDEX.md`](../../ai/MODULE_INDEX.md)
- [`../../ai/SECURITY_RULES.md`](../../ai/SECURITY_RULES.md)
- [`../../../PRUEBA_MANUAL_SEPARACION_PORTAL_CLIENTE.md`](../../../PRUEBA_MANUAL_SEPARACION_PORTAL_CLIENTE.md)
