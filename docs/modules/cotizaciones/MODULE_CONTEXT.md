# Modulo: Cotizaciones

Contexto operativo para agentes que modifiquen cotizaciones, versiones, aprobacion, PDF Premium, diagnostico o datos relacionados.

Estado inferido: activo y critico para ventas.

## Que Hace

Gestiona cotizaciones comerciales con versiones, secciones, partidas, mano de obra, descuentos, viaticos, aliados comerciales, contexto/diagnostico, aprobacion y salida PDF/impresion.

## Mapa Por Flujo

| Flujo | Archivos confirmados | Responsabilidad |
| --- | --- | --- |
| Listar cotizaciones | `app/(admin)/quotes/page.tsx` | Vista de listado y tipo local `Quote`. |
| Crear cotizacion | `app/(admin)/quotes/new/page.tsx` | Construye estado de UI, carga catalogos, crea `quote_groups`, inserta `quotes`, `quote_diagnostic_blocks`, `quote_sections`, `quote_items`, `quote_item_area_allocations` y `quote_item_labor_activities`. |
| Crear borrador asistido | `lib/quotes/draftBuilder.ts` | DAL `server-only` de Sprint G2. Resuelve productos/mano de obra, replica precios/totales del alta estandar, evita duplicados equivalentes y crea grupo, borrador, secciones, partidas, actividades y terminos sin pasar por el editor. |
| Editar cotizacion | `app/(admin)/quotes/[id]/edit/page.tsx` | Lee cotizacion existente, hidrata secciones/items/diagnostico/mano de obra/partners y guarda reemplazando bloques, items y secciones. |
| Guardar cotizacion | `app/(admin)/quotes/new/page.tsx`, `app/(admin)/quotes/[id]/edit/page.tsx` | Insert/update en `quotes`; inserta o reemplaza tablas hijas. Mantiene fallbacks defensivos para columnas faltantes/PostgREST. |
| Nueva version | `app/(admin)/quotes/[id]/CreateQuoteVersionButton.tsx` | Copia datos de `quotes`, diagnostico, secciones, items, mano de obra y `quote_terms_settings`; marca versiones anteriores como `is_latest=false`; crea nueva `quote_number` con `-Vn`. |
| Aprobar version | `app/(admin)/quotes/[id]/ApproveQuoteVersionButton.tsx` | Archiva version aprobada anterior, marca la actual como `approved`, actualiza `quote_groups.approved_quote_id`, marca proyecto como ganado y sincroniza items operativos. |
| Detalle de cotizacion | `app/(admin)/quotes/[id]/page.tsx` | Lee `quotes`, `quote_sections`, `quote_items` y partner para mostrar resumen y acciones. |
| Imprimir | `app/(admin)/quotes/[id]/print/page.tsx`, `app/(admin)/quotes/[id]/print/PrintQuoteButton.tsx` | Vista imprimible y accion UI de impresion/PDF. |
| PDF Premium | `app/api/quotes/[id]/premium-pdf/route.ts`, `lib/quotePdfSnapshot.ts`, `lib/quotePremiumPdfHtml.ts`, `lib/quotePremiumPdf.ts` | API genera snapshot, arma HTML y renderiza PDF. Para cotizaciones de aliado soporta formato para cliente (marca aliado) y formato para aliado (marca ALFA con desglose de descuento y total a liquidar). |
| Diagnostico | `app/(admin)/quotes/QuoteDiagnosticContextEditor.tsx`, `lib/quoteDiagnosticContext.ts`, `lib/quotePdfSnapshot.ts`, `lib/quotePremiumPdfHtml.ts` | UI de bloques, normalizacion/hidratacion, lectura para snapshot y render en PDF. |
| Actividades de mano de obra | `app/(admin)/quotes/QuoteLaborActivitiesPanel.tsx`, `lib/quoteLaborActivities.ts`, `app/(admin)/quotes/new/page.tsx`, `app/(admin)/quotes/[id]/edit/page.tsx`, `app/(admin)/quotes/[id]/CreateQuoteVersionButton.tsx` | UI y calculo de actividades por partida; insercion/copia en `quote_item_labor_activities`. |
| Aliados comerciales | `lib/commercialPartners.ts`, `app/(admin)/quotes/new/page.tsx`, `app/(admin)/quotes/[id]/edit/page.tsx`, `app/(admin)/quotes/[id]/page.tsx`, `app/(admin)/quotes/[id]/PrintQuoteButton.tsx`, `app/api/quotes/[id]/premium-pdf/route.ts` | Seleccion de partner, descuentos/branding y generacion de PDF con marca aliada (cliente) o marca ALFA (aliado). |

Pendiente de confirmar: si existen server actions o rutas API adicionales para cotizaciones fuera de estos archivos.

## Responsabilidad De Archivos Clave

| Archivo | Responsabilidad | Cuando modificar | Riesgos |
| --- | --- | --- | --- |
| `app/(admin)/quotes/new/page.tsx` | Creacion completa de cotizacion y tablas hijas. | Cambios de formulario, calculos iniciales, payload de insert, diagnostico, mano de obra o partner en creacion. | Puede dejar cotizaciones parciales si falla despues de insertar `quotes`; revisar orden de inserts y fallbacks PostgREST. |
| `lib/quotes/draftBuilder.ts` | Construye borradores estandar desde un contrato reducido para plantillas/voz/IA; consulta el mismo catalogo y fuentes de tipo de cambio del editor. | Evolucion de G2-G5, formulas deterministas, idempotencia o nuevas entradas del borrador asistido. | No tiene transaccion SQL: una falla posterior al alta principal puede dejar datos parciales, igual que el alta cliente actual. Mantener RLS y usar un cliente Supabase de sesion autorizado. |
| `app/(admin)/quotes/[id]/edit/page.tsx` | Edicion e hidratacion de cotizacion existente; reemplaza diagnostico, items y secciones. | Cambios de guardado, carga inicial, recalculo, diagnostico, mano de obra o partner en edicion. | Borra y recrea tablas hijas; riesgo de perdida de datos si cambia el mapeo o falla a mitad del flujo. |
| `app/(admin)/quotes/[id]/CreateQuoteVersionButton.tsx` | Duplica una cotizacion a nueva version. | Cambios en campos que deben copiarse entre versiones o tablas hijas nuevas. | Si se agrega una tabla hija y no se copia aqui, la nueva version queda incompleta. |
| `app/(admin)/quotes/[id]/ApproveQuoteVersionButton.tsx` | Aprueba version, archiva aprobada previa, actualiza grupo y sincroniza operacion. | Cambios de estados, aprobacion o sincronizacion con proyecto. | Impacta version aprobada, `client_projects.sales_stage` y `project_operational_items`. |
| `app/(admin)/quotes/[id]/page.tsx` | Vista detalle y acciones de version/aprobacion/impresion. | Cambios de lectura o presentacion del resumen. | Puede ocultar advertencias de partner o usar selects incompletos. |
| `app/(admin)/quotes/[id]/print/page.tsx` | Vista imprimible tradicional. | Cambios de salida impresa no Premium. | Debe mantenerse alineada con datos visibles en detalle/PDF cuando aplique. |
| `app/api/quotes/[id]/premium-pdf/route.ts` | Endpoint protegido que genera PDF Premium. | Cambios de generacion PDF, rate limit, branding partner o errores HTTP. | Puede romper descarga PDF o exponer una version no autorizada si se cambia auth. |
| `lib/quotePdfSnapshot.ts` | Construye snapshot de datos para PDF: quote, cliente, proyecto, secciones, items, terms, diagnostico, imagenes y mano de obra. | Cambios en datos disponibles para PDF o resolucion de imagenes/storage. | Punto central para compatibilidad de PDF; fallos aqui rompen PDF Premium. |
| `lib/quotePremiumPdfHtml.ts` | Convierte snapshot a HTML del PDF Premium. | Cambios visuales/contenido del PDF. | HTML/CSS incompatible con Chromium puede romper render o layout. |
| `lib/quotePremiumPdf.ts` | Render final del HTML a PDF. | Cambios de runtime PDF/Chromium. | Riesgo alto en Vercel/runtime. |
| `app/(admin)/quotes/QuoteDiagnosticContextEditor.tsx` | Editor de bloques de diagnostico e imagenes. | Cambios de UX, validacion de imagenes, upload/storage o contenido de diagnostico. | Debe preservar fallback de URL antigua e imagen privada. |
| `lib/quoteDiagnosticContext.ts` | Tipos y helpers de diagnostico: crear, normalizar, hidratar y detectar schema faltante. | Cambios de contrato `quote_diagnostic_blocks` o defensas PostgREST. | Si cambia el contrato sin SQL/PDF, se pierden bloques o falla guardado. |
| `app/(admin)/quotes/QuoteLaborActivitiesPanel.tsx` | Editor de actividades de mano de obra por partida. | Cambios de captura de actividades. | Debe mantenerse alineado con calculos en `lib/quoteLaborActivities.ts`. |
| `lib/quoteLaborActivities.ts` | Tipos y calculos de actividades de mano de obra. | Cambios de totales, defaults o fallback legacy. | Cambios afectan totales de cotizacion, PDF y sincronizacion operativa. |
| `lib/commercialPartners.ts` | Tipos, bucket y helpers de branding partner. | Cambios de logo/color/branding o storage de partner. | Partner PDF requiere logo y color validos; no convertir buckets privados/publicos sin revisar seguridad. |

## Contratos De Datos Confirmados

Esta seccion mezcla esquemas confirmados por migraciones SQL y contratos confirmados por selects/inserts en codigo. Si no hay migracion base local completa, se marca como pendiente.

### `quotes`

Confirmado por inserts/selects en `new`, `edit`, `CreateQuoteVersionButton` y `quotePdfSnapshot`:

- Identidad/version: `id`, `quote_group_id`, `quote_base_number`, `version`, `quote_number`, `parent_quote_id`, `is_latest`, `status`.
- Cliente/proyecto: `client_id`, `client_project_id`.
- Moneda/totales: `currency`, `exchange_rate`, `exchange_rate_source`, `exchange_rate_date`, `equipment_total`, `labor_total`, `tax_total`, `discount_total`, `grand_total`, `subtotal_mxn`, `taxable_base_mxn`, `iva_mxn`, `total_mxn`.
- Descuentos: `discount_type`, `discount_percent`, `discount_amount_mxn`.
- Viaticos: `includes_travel_expenses_detail`, `travel_fuel_mxn`, `travel_tolls_mxn`, `travel_food_mxn`, `travel_total_mxn`.
- Partner: `is_partner_quote`, `commercial_partner_id`, `partner_equipment_discount_percent`, `partner_labor_discount_percent`, `partner_equipment_discount_mxn`, `partner_labor_discount_mxn`, `partner_total_discount_mxn`.
- Diagnostico/notas: `notes`, `include_diagnostic_context`.
- Auditoria: `created_at` confirmado por lecturas para PDF/detalle.

Confirmado por SQL:

- `include_diagnostic_context boolean not null default false` en `sql/20260702_quote_diagnostic_context.sql`.
- Campos de viaticos/partner en `sql/20260528_quote_travel_partner_mode.sql`.
- `commercial_partner_id` referencia `commercial_partners(id)` con `on delete set null` en `sql/20260619_commercial_partners_white_label.sql`.
- `notes text` en `sql/20260526_add_quote_notes.sql`.
- Sprint 1 de Persianas agrega `quote_type text not null default 'standard'` con valores `standard` y `blinds` en `sql/20260724_quote_blinds_sprint1.sql`.
- El trigger `enforce_quote_group_quote_type_consistency` evita mezclar verticales dentro de un mismo `quote_group_id`.
- Sprint 1 crea `is_internal_user()` y `has_internal_role(text[])` sólo si
  faltan, reutilizando las definiciones mínimas del hardening histórico sin
  modificar las policies ajenas al módulo.

Estado por entorno: Sprint 1 esta aplicado y validado en sandbox `pkqwlvqosooewbejbktx`; produccion sigue pendiente y no debe consumir este backend hasta aplicar y validar primero el esquema.

Pendiente de confirmar: migracion base completa de `quotes`, constraints, defaults originales, triggers y RLS final en produccion.

### `quote_groups`

Confirmado por codigo:

- Creacion usa `base_number` y retorna `id` en `app/(admin)/quotes/new/page.tsx`.
- Aprobacion actualiza `approved_quote_id` en `app/(admin)/quotes/[id]/ApproveQuoteVersionButton.tsx`.

Pendiente de confirmar: esquema completo, FK exactas y defaults.

### `quote_sections`

Confirmado por inserts/selects:

- `id`, `quote_id`, `name`, `sort_order`, `equipment_total`, `labor_total`, `total`.
- Ordenamiento por `sort_order`.
- En creacion/edicion se inserta una seccion por cada bloque de UI.
- En edicion se borran secciones por `quote_id` despues de borrar items.

Pendiente de confirmar: migracion base completa, `on delete`, timestamps y RLS final.

### `quote_items`

Confirmado por inserts/selects:

- `id`, `quote_id`, `quote_section_id`, `product_id`, `quantity`, `sale_currency`, `unit_equipment_price`, `unit_equipment_price_usd`, `unit_labor_price`, `equipment_total`, `equipment_total_usd`, `labor_total`, `line_total`, `product_brand`, `product_model`, `product_name`, `product_image_url`, `sort_order`.
- Fase 1: `existing_customer_equipment`, `area`, `customer_visible_note` para equipo existente/reutilizado del cliente, agrupacion simple visible por area/zona y nota visible para cliente.
- Ordenamiento por `sort_order`.
- `quote_section_id` se usa para agrupar items en PDF y versionado.

Confirmado por SQL:

- `existing_customer_equipment boolean not null default false`, `area text`, `customer_visible_note text` en `sql/20260706_quote_item_customer_equipment_area.sql`.

Pendiente de confirmar: migracion base completa, columnas legacy, constraints y RLS final.

### `quote_blind_item_details`

Implementado por `sql/20260724_quote_blinds_sprint1.sql` para la vertical de Cotizaciones de Persianas:

- Relacion 1:1 mediante `quote_item_id bigint primary key references quote_items(id) on delete cascade`.
- Dimensiones: `width_cm`, `height_cm` positivas.
- `calculated_m2_per_unit numeric(14,4)` generado como `width_cm * height_cm / 10000`.
- Especificacion: `blind_type`, `collection`, `color`, `mechanism`, `control`.
- Precio base: `price_per_m2_mxn`.
- Ajuste auditable: `billable_m2_override` y `override_reason`; ambos deben existir juntos y el motivo no puede estar vacio.
- Imagen: `reference_image_path` debe ser un path persistente `quote-blinds/...`, nunca URL HTTP, data URL ni signed URL.
- `internal_notes` es solo interno y no debe incluirse en PDF, portal ni documentos publicos.
- `created_at`, `updated_at` y trigger `set_updated_at`.
- Trigger de integridad: solo admite `quote_item_id` perteneciente a una cotizacion `quote_type = 'blinds'`.
- RLS: lectura directa solo para usuarios internos; insert/update para `admin`, `direccion`, `comercial`, `ingenieria`; delete para `admin`, `direccion`.
- El portal/PDF no debe consultar esta tabla directamente porque contiene `internal_notes` y `override_reason`. La futura exposicion de Sprint 3 debera usar backend con validacion de proyecto/token y un select explicito que excluya campos internos.

Los campos comerciales compartidos siguen en `quote_items`: area, marca, modelo, cantidad, nota visible, producto fiscal, orden y totales.

Sprint 4B asigna la foto de referencia al bucket dedicado y privado
`quote-blinds-private`, bajo
`quote-blinds/{quoteId}/{quoteItemId}/...`. La fila conserva únicamente ese
path persistente; nunca guarda una signed URL.

Estado por entorno: aplicado en sandbox; pendiente en produccion.

### Backend de Persianas (Sprint 2)

Implementado en `lib/quoteBlindsContract.ts`, `lib/quoteBlindsBackend.ts` y rutas bajo `app/api/quotes/blinds/`:

- `GET /api/quotes/blinds`: lista exclusivamente cotizaciones `quote_type = 'blinds'`.
- `POST /api/quotes/blinds`: crea grupo propio, cotizacion MXN en borrador y seccion operativa `Persianas`.
- `GET /api/quotes/blinds/{id}`: devuelve cotizacion, secciones, partidas y detalle tecnico 1:1.
- `POST /api/quotes/blinds/{id}/items`: agrega partida y recalcula seccion/cotizacion.
- `PATCH /api/quotes/blinds/{id}/items/{itemId}`: reemplaza el contrato completo de la partida y recalcula totales.
- `DELETE /api/quotes/blinds/{id}/items/{itemId}`: elimina por cascade el detalle y recalcula totales.

Contrato de calculo:

- `calculated_m2_per_unit = round(width_cm * height_cm / 10000, 4)`.
- `calculated_m2_total = round(calculated_m2_per_unit * quantity, 4)`.
- `billable_m2 = billable_m2_override ?? calculated_m2_total`.
- `line_total_mxn = round(billable_m2 * price_per_m2_mxn, 2)`.
- `quote_items.unit_equipment_price` guarda el equivalente por pieza para conservar compatibilidad con la estructura comercial compartida.
- La cotizacion suma `equipment_total`, calcula IVA al 16% y guarda subtotal/base/IVA/total en campos existentes; mano de obra queda en cero durante este sprint.

Seguridad y limites:

- Todas las rutas exigen usuario interno y usan el cliente Supabase de sesion; no usan service role ni omiten RLS.
- Alta/edicion: `admin`, `direccion`, `comercial`, `ingenieria`.
- Borrado: `admin`, `direccion`, consistente con RLS de `quote_items` y `quote_blind_item_details`.
- No existe endpoint portal/publico en Sprint 2. Por ello `internal_notes` y `override_reason` solo aparecen en la respuesta interna de detalle.
- Cada alta crea un `quote_group_id` nuevo, por lo que no mezcla verticales. Ademas, el trigger de Sprint 1 conserva la defensa en base.
- Este sprint no implementa versionado de persianas, upload/resolucion de imagen, UI, PDF, portal, aprobacion, sincronizacion operativa ni facturacion.
- Sin una funcion SQL transaccional, la creacion de grupo/cotizacion/seccion y el alta item/detalle son operaciones secuenciales. El backend hace validacion previa y compensacion best-effort, pero una falla intermedia puede requerir limpieza administrativa en sandbox.

Smoke HTTP autenticado en sandbox, 2026-07-24:

- Proyecto confirmado: `pkqwlvqosooewbejbktx`; produccion permanecio `linked:false`.
- Harness reproducible: `scripts/smoke-quote-blinds.mjs`, ejecutado con sesiones reales y cookies SSR.
- Fixture final: `ALFA-BLINDS-SMOKE-20260724234158`; cotizacion `7`, grupo `5`, partida `7`.
- HTTP positivo: crear cotizacion `201`, listar `200`, detalle `200`, agregar partida `201`, editar `200`, borrar como admin `200`.
- Totales comprobados: alta `$2,030.00`, edicion `$2,784.00`, despues de borrar `$0.00`.
- HTTP negativo: anonimo `401`, cliente portal `401`, intento de borrado como comercial `403`.
- La lista no incluyo `internal_notes` ni `override_reason`; el cliente portal no recibio datos de cotizacion. El detalle interno si conserva ambos campos por contrato interno.
- `quote_blind_item_details` quedo sin huerfanos y la cotizacion estandar `SBX-PERSIANAS-BOOTSTRAP-V1` permanecio como `standard`.
- Limpieza confirmada por conteos en cero para cotizacion, grupo, secciones, partidas, detalle, perfiles y usuarios Auth del fixture.
- La llave administrativa de sandbox se uso solamente para alta/baja de identidades sinteticas y auditoria final de limpieza. Ninguna llamada HTTP uso service role; las rutas se probaron con sesiones `commercial`, `admin` y `client`.

### Frontend de Persianas (Sprint 3)

Implementado bajo `app/(admin)/quotes/blinds/` y enlazado desde el listado interno de cotizaciones:

- `/quotes/blinds`: listado separado de cotizaciones de persianas, busqueda, estados vacio/carga/error y acceso a nueva captura.
- `/quotes/blinds/new`: alta de cotizacion MXN asociada a cliente/proyecto usando `POST /api/quotes/blinds`.
- `/quotes/blinds/{id}`: detalle y captura rapida de partidas, agrupadas por area o ubicacion.
- El formulario reutiliza `lib/quoteBlindsContract.ts` para validar campos y mostrar en vivo m2 unitario, m2 total, m2 facturable y total de partida.
- El resumen muestra piezas, m2 facturables, subtotal, IVA 16% y total. La mano de obra permanece en cero por contrato.
- Alta, edicion y borrado consumen exclusivamente las rutas de Sprint 2 con la sesion interna actual. El borrado usa confirmacion en linea y respeta la capacidad `canDelete`.
- La foto se presenta como pendiente de Storage; Sprint 3 no sube archivos ni genera URLs publicas.
- Las notas internas y el motivo de ajuste se muestran solamente en el detalle interno. El listado no solicita ni renderiza esos campos.
- El listado estandar `/quotes` filtra `quote_type = 'standard'`; conserva un fallback para entornos donde Sprint 1 aun no exista.
- Fuera de alcance: PDF, portal cliente, facturacion, CFDI, Facturama, complementos, versionado y aprobacion de persianas.

Validacion manual en navegador contra sandbox, 2026-07-24:

- Fixture `ALFA-BLINDS-UI-20260724235921`, sesion real con rol `admin`; ninguna llamada de la aplicacion uso service role.
- Crear, listar y abrir cotizacion: correcto.
- Alta de partida: 2 piezas, 5.0000 m2 facturables, subtotal `$1,750.00`, IVA `$280.00`, total `$2,030.00`.
- Edicion y retiro de ajuste manual: 3 piezas, 6.0000 m2 facturables, subtotal `$2,400.00`, IVA `$384.00`, total `$2,784.00`.
- Borrado: resumen regreso a cero y se mostro el estado vacio.
- Compatibilidad: `SBX-PERSIANAS-BOOTSTRAP-V1` siguio visible en `/quotes`; la cotizacion `blinds` no aparecio en el listado estandar.
- Limpieza final confirmada: cero cotizaciones, detalles de persiana y perfiles asociados al fixture.

### PDF Comercial de Persianas (Sprint 4A)

Implementado con el mismo patron interno del PDF Premium estandar:

- `GET /api/quotes/blinds/{id}/pdf`: endpoint interno autenticado, dinamico y `nodejs`; usa la sesion Supabase actual y respeta RLS.
- `lib/quoteBlindsPdfSnapshot.ts`: construye un snapshot documental explicito para `quote_type = 'blinds'`.
- `lib/quoteBlindsPdfHtml.ts`: genera HTML comercial escapado, agrupado por area y optimizado para carta.
- `lib/quotePremiumPdf.ts`: renderer Chromium compartido; Sprint 4A no duplica la resolucion del ejecutable ni la configuracion de PDF.
- La pantalla `/quotes/blinds/{id}` expone una sola accion `Imprimir / PDF` hacia el endpoint nuevo.

Contrato documental:

- Encabezado ALFA, cliente, proyecto, folio, fecha y vigencia estandar de 15 dias.
- Portada con piezas, m2 considerados y total con IVA.
- Partidas agrupadas por area con marca, modelo, tipo, coleccion, color, mecanismo, control, medidas, cantidad, m2 e importe.
- Resumen con subtotal, IVA 16%, total, piezas y m2.
- Solo se incluye `customer_visible_note`.
- Si existe `reference_image_path`, el PDF muestra una referencia textual segura; nunca incluye el path privado ni resuelve Storage.
- `internal_notes`, `override_reason`, paths privados, Facturama, CFDI, complementos y datos de portal no forman parte del tipo `QuoteBlindsPdfSnapshot` ni de la plantilla.
- El endpoint exige usuario interno, aplica rate limit y nunca usa service role.

Prueba documental local, 2026-07-24:

- Fixture visual: 2 areas, 4 partidas, 6 piezas, 10.9 m2.
- PDF carta de 3 paginas renderizado con Chromium y revisado como PNG con Poppler.
- Totales verificados: subtotal `$10,400.00`, IVA `$1,664.00`, total `$12,064.00`.
- Sin cortes de partidas; las areas pequenas se mantienen juntas entre paginas.
- Extraccion de texto confirmo cliente, proyecto, areas, notas visibles y totales.
- Extraccion negativa confirmo ausencia de notas internas, motivos de ajuste y paths `quote-blinds/...`.

### Storage privado de Persianas (Sprint 4B)

Implementado y validado exclusivamente en sandbox
`pkqwlvqosooewbejbktx`:

- Bucket dedicado `quote-blinds-private`, `public = false`, límite de 10 MB y
  MIME permitidos `image/jpeg`, `image/png` e `image/webp`.
- Paths persistentes:
  `quote-blinds/{quoteId}/{quoteItemId}/{uuid}.{ext}`.
- Policies `quote_blinds_images_*`: lectura para usuarios internos; alta,
  reemplazo y eliminación para `admin`, `direccion`, `comercial` e
  `ingenieria`. Todas validan bucket, prefijo y cotización `blinds`; alta y
  actualización también validan la partida.
- No existen policies abiertas nuevas con `using (true)` o
  `with check (true)`.
- Ruta interna
  `GET/POST/DELETE /api/quotes/blinds/{id}/items/{itemId}/reference-image`:
  firma por 10 minutos, sube/reemplaza y elimina sin service role.
- La UI permite subir, previsualizar, reemplazar y quitar la foto al editar una
  partida. Las listas internas muestran miniaturas desde signed URLs; no
  renderizan el path privado.
- El borrado autorizado de una partida intenta limpiar su imagen y devuelve
  `image_cleanup_pending` si Storage requiere auditoría posterior.
- El PDF mantiene las fotos como referencia textual. No resuelve signed URLs,
  no incrusta el archivo y no expone bucket ni path.

SQL y rollback:

- `sql/20260724_quote_blinds_storage_sprint4b.sql`.
- `sql/20260724_quote_blinds_storage_sprint4b_rollback.sql`.
- `docs/QUOTE_BLINDS_SPRINT4B_STORAGE_ROLLBACK.md`.
- El rollback aborta si el bucket conserva objetos.

Validación integrada, 2026-07-24:

- Fixture final `ALFA-BLINDS-S4B-20260725011059`; cotización `15`, grupo `13`,
  partidas `33`, `34`, `35` y `36`.
- Sesiones reales sintéticas `comercial`, `admin` y `client`; la llave
  administrativa se usó sólo para identidades, auditoría y limpieza.
- Dos uploads ejecutados desde el input de la UI, dos miniaturas firmadas
  cargadas, reemplazo y retiro correctos.
- Cliente: acceso al endpoint `401`, signed URL directa denegada y upload
  directo denegado.
- Borrado como `comercial`: `403`; borrado como `admin`: `200`, sin archivo
  residual ni detalle huérfano.
- Totales: 6 piezas, 15.72 m², subtotal `$7,248.00`, IVA `$1,159.68`, total
  `$8,407.68`.
- PDF autenticado: `200`, carta, 3 páginas, cliente/proyecto y áreas correctos.
  No contiene `internal_notes`, `override_reason`, `quote-blinds/` ni
  `quote-blinds-private`.
- Limpieza completa: cotización, grupo, partidas, detalles, imágenes y usuarios
  temporales eliminados; bucket con cero objetos.

### `quote_item_area_allocations`

Confirmado por `sql/20260706_quote_item_area_allocations.sql`:

- `id bigint generated by default as identity primary key`.
- `quote_item_id bigint not null references public.quote_items(id) on delete cascade`.
- `area text not null`.
- `quantity numeric not null` con check `quantity > 0`.
- `supply_type text not null` con check en `new_equipment` o `client_existing`.
- `customer_visible_note text`.
- `sort_order integer not null default 0`.
- `created_at`, `updated_at`.
- Indices por `quote_item_id` y `(quote_item_id, sort_order)`.
- RLS habilitado siguiendo el patron de `quote_items`: lectura interna o portal para cotizaciones aprobadas, escritura para roles comerciales/ingenieria, borrado admin/direccion.

Comportamiento:

- Fase 2 domina sobre Fase 1 cuando una partida tiene allocations.
- La suma de `quantity` por `quote_item_id` debe coincidir con `quote_items.quantity`; la UI bloquea guardado si no coincide.
- `new_equipment` cobra equipo proporcionalmente.
- `client_existing` muestra equipo reutilizado con equipo en $0.00, pero conserva mano de obra proporcional.
- Si una partida no tiene allocations, se crea un fallback visual desde `quote_items.area`, `quote_items.existing_customer_equipment` y `quote_items.customer_visible_note`.
- Partidas sin area se agrupan visualmente bajo `General`.

Pendiente de aplicar: la migracion `sql/20260706_quote_item_area_allocations.sql` debe ejecutarse en Supabase antes de usar persistencia de Fase 2.

### `quote_diagnostic_blocks`

Confirmado por `sql/20260702_quote_diagnostic_context.sql`:

- `id bigserial primary key`
- `quote_id bigint not null references public.quotes(id) on delete cascade`
- `title text`
- `text text`
- `image_url text`
- `sort_order integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- Indice `quote_diagnostic_blocks_quote_id_sort_idx` en `(quote_id, sort_order)`.
- Trigger `set_quote_diagnostic_blocks_updated_at` usa `public.set_updated_at()`.
- RLS habilitado.
- `notify pgrst, 'reload schema';`.

Confirmado por codigo:

- UI usa `imageUrl`; DB usa `image_url`.
- Bloques vacios se filtran por `normalizeDiagnosticBlocks`.
- PDF lee `id, title, text, image_url, sort_order`.
- Errores `PGRST205`, `42P01`, `42703` o mensajes con `quote_diagnostic_blocks`/`include_diagnostic_context` se tratan como schema faltante.

Pendiente de confirmar: si las policies beta actuales son definitivas o temporales.

### `quote_item_labor_activities`

Confirmado por `sql/20260529_quote_item_labor_activities.sql`:

- `id bigint generated by default as identity primary key`
- `quote_item_id bigint not null references public.quote_items(id) on delete cascade`
- `labor_activity_id bigint references public.labor_activity_catalog(id) on delete set null`
- `name_snapshot text not null`
- `quantity numeric(14,2) not null default 1`
- `unit text not null default 'pieza'`
- `internal_unit_cost_mxn numeric(14,2) not null default 0`
- `sale_unit_price_mxn numeric(14,2) not null default 0`
- `internal_total_mxn numeric(14,2) not null default 0`
- `sale_total_mxn numeric(14,2) not null default 0`
- `assigned_role text`
- `notes text`
- `sort_order integer not null default 0`
- `created_at timestamptz not null default now()`
- Indices por `quote_item_id` y `labor_activity_id`.
- RLS habilitado.

Confirmado por codigo:

- Se inserta despues de crear `quote_items`, mapeando por `sort_order`.
- En versionado se copia relacionando item origen con item nuevo.

Pendiente de confirmar: si requiere `updated_at` o policies mas estrictas en produccion.

### `commercial_partners`

Confirmado por `sql/20260619_commercial_partners_white_label.sql`:

- `id bigserial primary key`
- `commercial_name text not null`
- `logo_url text`
- `logo_storage_path text`
- `primary_color text not null default '#9E1B32'`
- `secondary_color text default '#111111'`
- `contact_name`, `contact_email`, `contact_phone`
- `is_active boolean not null default true`
- `created_at`, `updated_at`
- Checks hex para `primary_color` y `secondary_color`.
- Indice `commercial_partners_active_name_idx`.
- RLS habilitado.
- Bucket `commercial-partner-assets` publico con imagenes `png/jpeg/webp/svg`.

Confirmado por `lib/commercialPartners.ts`:

- `getPartnerBranding` requiere partner activo, logo resoluble y `primary_color` hex valido.
- `logo_storage_path` se resuelve con public URL del bucket `commercial-partner-assets`.

Pendiente de confirmar: si el bucket publico de partner sigue siendo el criterio deseado para produccion.

## Archivos Que Suelen Cambiar Juntos

- PDF Premium: `lib/quotePdfSnapshot.ts`, `lib/quotePremiumPdfHtml.ts`, `lib/quotePremiumPdf.ts`, `app/api/quotes/[id]/premium-pdf/route.ts`; si agrega datos, revisar selects y tipos del snapshot.
- Diagnostico: `app/(admin)/quotes/QuoteDiagnosticContextEditor.tsx`, `lib/quoteDiagnosticContext.ts`, `app/(admin)/quotes/new/page.tsx`, `app/(admin)/quotes/[id]/edit/page.tsx`, `app/(admin)/quotes/[id]/CreateQuoteVersionButton.tsx`, `lib/quotePdfSnapshot.ts`, `lib/quotePremiumPdfHtml.ts`, migracion SQL si cambia contrato.
- Mano de obra: `app/(admin)/quotes/QuoteLaborActivitiesPanel.tsx`, `lib/quoteLaborActivities.ts`, `new/page.tsx`, `edit/page.tsx`, `CreateQuoteVersionButton.tsx`, `lib/quotePdfSnapshot.ts`, y flujos operativos si sincronizan partidas aprobadas.
- Partners: `lib/commercialPartners.ts`, `app/(admin)/commercial-partners/`, `new/page.tsx`, `edit/page.tsx`, detalle, API PDF Premium y SQL/storage de `commercial-partner-assets`.
- Versionado/aprobacion: `CreateQuoteVersionButton.tsx`, `ApproveQuoteVersionButton.tsx`, detalle de cotizacion, `quote_groups`, `quotes.is_latest`, `quotes.status`, y `lib/projectOperationalItems.ts` si cambia sincronizacion de proyectos aprobados.
- Cambios de schema: migracion en `sql/`, selects/inserts en crear/editar/versionar/PDF, helpers defensivos y `notify pgrst, 'reload schema';` cuando PostgREST deba reconocer columnas/tablas nuevas.
- Equipo existente / area por partida Fase 1 y allocations Fase 2: `app/(admin)/quotes/new/page.tsx`, `app/(admin)/quotes/[id]/edit/page.tsx`, `app/(admin)/quotes/[id]/page.tsx`, `app/(admin)/quotes/[id]/print/page.tsx`, `app/public/documents/[token]/quote/page.tsx`, `CreateQuoteVersionButton.tsx`, `lib/quotePdfSnapshot.ts`, `lib/quotePremiumPdfHtml.ts`, `lib/quoteItemPresentation.ts`, migraciones SQL.
- Persianas Sprint 1, backend Sprint 2, frontend Sprint 3 y PDF Sprint 4A: SQL/rollback, `lib/quoteBlindsContract.ts`, `lib/quoteBlindsBackend.ts`, `lib/quoteBlindsPdfSnapshot.ts`, `lib/quoteBlindsPdfHtml.ts`, rutas `app/api/quotes/blinds/`, pantallas `app/(admin)/quotes/blinds/`, acceso desde `app/(admin)/quotes/page.tsx`, pruebas dirigidas y este documento. Portal, facturacion y operacion siguen fuera de alcance.

## Validacion Especifica

Checklist minimo segun tipo de cambio:

- Crear cotizacion:
  - cotizacion sin secciones;
  - cotizacion con secciones e items;
  - cliente/proyecto opcional si el flujo lo permite;
  - confirmar `quote_groups`, `quotes`, `quote_sections`, `quote_items` y mano de obra si aplica.
- Editar cotizacion:
  - editar totales, descuentos, viaticos y notas;
  - quitar/agregar secciones e items;
  - confirmar que reemplazo de hijos no deja duplicados;
  - si estaba aprobada, revisar sincronizacion de items operativos.
- Nueva version:
  - version nueva incrementa `version` y `quote_number`;
  - versiones previas quedan `is_latest=false`;
  - se copian secciones, items, diagnostico, mano de obra y terms;
  - la version nueva queda `draft`.
- Aprobar version:
  - aprobada previa queda `archived`;
  - actual queda `approved`;
  - `quote_groups.approved_quote_id` apunta a la actual;
  - proyecto asociado cambia a ganado si aplica;
  - `syncProjectOperationalItems` termina sin errores.
- PDF Premium:
  - endpoint `app/api/quotes/[id]/premium-pdf/route.ts` responde PDF;
  - cotizacion normal y partner quote;
  - diagnostico aparece solo si `include_diagnostic_context` y hay bloques utiles;
  - bloques vacios no aparecen;
  - HTML no rompe layout en Chromium.
- Cotizacion antigua:
  - quote sin columnas nuevas sigue cargando por fallbacks;
  - quote sin diagnostico genera PDF;
  - quote sin `unit_equipment_price_usd` usa fallback.
- Imagenes/storage:
  - imagen de producto en PDF;
  - imagen de diagnostico con URL antigua;
  - imagen de diagnostico privada si usa storage firmado;
  - URL invalida no debe impedir generar PDF.
- PostgREST/schema cache:
  - errores por columna/tabla faltante deben ser deliberados y temporales;
  - migraciones de columnas/tablas usadas por Supabase deben terminar con recarga de schema cuando aplique;
  - revisar `isMissingDiagnosticContextSchema` antes de retirar defensas.
- Persianas Sprint 1, antes de habilitar cualquier UI:
  - confirmar que todas las cotizaciones existentes quedaron como `quote_type = 'standard'`;
  - rechazar valores de `quote_type` fuera de `standard` y `blinds`;
  - rechazar versiones del mismo grupo con distinto `quote_type`;
  - rechazar dimensiones no positivas y precios negativos;
  - confirmar calculo generado `width_cm * height_cm / 10000`;
  - exigir motivo cuando existe `billable_m2_override`;
  - rechazar detalles asociados a cotizaciones `standard`;
  - probar matriz RLS con admin, comercial, ingenieria, usuario interno de solo lectura y usuarios portal; ningun usuario portal debe poder consultar directamente la tabla;
  - confirmar que `project-photos` sigue privado y que no se guarda una signed URL;
  - ejecutar primero en sandbox y conservar `sql/20260724_quote_blinds_sprint1_rollback.sql`.
- Persianas Sprint 3:
  - crear, listar y abrir una cotizacion `blinds` con sesion interna;
  - agregar, editar y eliminar una partida, incluido retirar un ajuste manual;
  - comprobar agrupacion por area y actualizacion de piezas, m2, subtotal, IVA y total;
  - confirmar estados de carga, vacio, error, guardado y eliminado;
  - confirmar que `/quotes` muestra solo cotizaciones `standard`;
  - confirmar que no existe upload, PDF, portal o integracion fiscal en estas rutas.
- Persianas Sprint 4A:
  - generar PDF con sesion interna y confirmar `Content-Type: application/pdf`;
  - verificar bytes iniciales `%PDF-` y `Content-Disposition` con folio seguro;
  - probar al menos 2 areas y 4 partidas con mecanismos, controles y notas visibles distintos;
  - renderizar todas las paginas y revisar cortes, encabezados, agrupacion y resumen;
  - extraer texto para confirmar cliente, proyecto, folio, medidas, piezas, m2 y totales;
  - confirmar ausencia de `internal_notes`, `override_reason` y paths privados;
  - confirmar que el endpoint de PDF estandar conserva su ruta y comportamiento.
- Persianas Sprint 4B:
  - confirmar bucket `quote-blinds-private` privado y MIME/tamaño permitidos;
  - confirmar cero policies abiertas y matriz interna/cliente;
  - subir dos imágenes desde la UI, resolver miniaturas con signed URLs y
    reemplazar/quitar una referencia;
  - confirmar que sólo se persiste
    `quote-blinds/{quoteId}/{quoteItemId}/...`;
  - borrar una partida con imagen y auditar cero objetos/detalles huérfanos;
  - comprobar que PDF y portal no reciben signed URLs, bucket o path privado;
  - limpiar fixtures y confirmar bucket vacío.

## Reglas De Seguridad

- Cualquier cambio en SQL, RLS, Supabase, storage o visibilidad de datos debe revisar [`../../ai/SECURITY_RULES.md`](../../ai/SECURITY_RULES.md).
- No aplicar cambios productivos sin sandbox, respaldo, pruebas y rollback.
- No relajar RLS/policies para desbloquear UI.
- No publicar buckets privados ni cambiar acceso de storage sin validar impacto en portal/PDF.
- No retirar fallbacks defensivos sin confirmar que produccion ya tiene schema y cache actualizados.

## Riesgos

- PDF Premium puede fallar por assets, storage, Chromium/runtime o HTML no compatible.
- Cambios de schema deben recargar cache PostgREST si afectan queries desde Supabase.
- Versionado puede omitir tablas hijas si no se actualiza `CreateQuoteVersionButton.tsx`.
- Edicion borra y recrea hijos; errores intermedios pueden dejar datos inconsistentes.
- Aprobacion afecta proyecto y sincronizacion operativa, no solo `quotes.status`.
- RLS debe seguir patrones existentes de cotizaciones y tablas hijas.
- No romper cotizaciones antiguas al agregar campos nuevos.
- El backend de `quote_type` solo puede habilitarse en entornos donde Sprint 1 ya fue aplicado y validado; actualmente esto se cumple unicamente en sandbox.
- El rollback de Persianas Sprint 1 se detiene si existen cotizaciones `blinds` o detalles persistidos para evitar perdida silenciosa de datos.

## Documentos Relacionados

- [`../../ai/AI_CONTEXT.md`](../../ai/AI_CONTEXT.md)
- [`../../ai/PROJECT_MAP.md`](../../ai/PROJECT_MAP.md)
- [`../../ai/MODULE_INDEX.md`](../../ai/MODULE_INDEX.md)
- [`../../ai/SECURITY_RULES.md`](../../ai/SECURITY_RULES.md)
- [`../../QUOTE_BLINDS_RELEASE_SPRINT5.md`](../../QUOTE_BLINDS_RELEASE_SPRINT5.md)
