# Modulo: Cotizaciones

Contexto operativo para agentes que modifiquen cotizaciones, versiones, aprobacion, PDF Premium, diagnostico o datos relacionados.

Estado inferido: activo y critico para ventas.

## Que Hace

Gestiona cotizaciones comerciales con versiones, secciones, partidas, mano de obra, descuentos, viaticos, aliados comerciales, contexto/diagnostico, aprobacion y salida PDF/impresion.

## Mapa Por Flujo

| Flujo | Archivos confirmados | Responsabilidad |
| --- | --- | --- |
| Listar cotizaciones | `app/(admin)/quotes/page.tsx` | Vista de listado y tipo local `Quote`. |
| Crear cotizacion | `app/(admin)/quotes/new/page.tsx` | Construye estado de UI, carga catalogos, crea `quote_groups`, inserta `quotes`, `quote_diagnostic_blocks`, `quote_sections`, `quote_items` y `quote_item_labor_activities`. |
| Editar cotizacion | `app/(admin)/quotes/[id]/edit/page.tsx` | Lee cotizacion existente, hidrata secciones/items/diagnostico/mano de obra/partners y guarda reemplazando bloques, items y secciones. |
| Guardar cotizacion | `app/(admin)/quotes/new/page.tsx`, `app/(admin)/quotes/[id]/edit/page.tsx` | Insert/update en `quotes`; inserta o reemplaza tablas hijas. Mantiene fallbacks defensivos para columnas faltantes/PostgREST. |
| Nueva version | `app/(admin)/quotes/[id]/CreateQuoteVersionButton.tsx` | Copia datos de `quotes`, diagnostico, secciones, items, mano de obra y `quote_terms_settings`; marca versiones anteriores como `is_latest=false`; crea nueva `quote_number` con `-Vn`. |
| Aprobar version | `app/(admin)/quotes/[id]/ApproveQuoteVersionButton.tsx` | Archiva version aprobada anterior, marca la actual como `approved`, actualiza `quote_groups.approved_quote_id`, marca proyecto como ganado y sincroniza items operativos. |
| Detalle de cotizacion | `app/(admin)/quotes/[id]/page.tsx` | Lee `quotes`, `quote_sections`, `quote_items` y partner para mostrar resumen y acciones. |
| Imprimir | `app/(admin)/quotes/[id]/print/page.tsx`, `app/(admin)/quotes/[id]/print/PrintQuoteButton.tsx` | Vista imprimible y accion UI de impresion/PDF. |
| PDF Premium | `app/api/quotes/[id]/premium-pdf/route.ts`, `lib/quotePdfSnapshot.ts`, `lib/quotePremiumPdfHtml.ts`, `lib/quotePremiumPdf.ts` | API genera snapshot, arma HTML y renderiza PDF. Para partner valida `is_partner_quote` y branding. |
| Diagnostico | `app/(admin)/quotes/QuoteDiagnosticContextEditor.tsx`, `lib/quoteDiagnosticContext.ts`, `lib/quotePdfSnapshot.ts`, `lib/quotePremiumPdfHtml.ts` | UI de bloques, normalizacion/hidratacion, lectura para snapshot y render en PDF. |
| Actividades de mano de obra | `app/(admin)/quotes/QuoteLaborActivitiesPanel.tsx`, `lib/quoteLaborActivities.ts`, `app/(admin)/quotes/new/page.tsx`, `app/(admin)/quotes/[id]/edit/page.tsx`, `app/(admin)/quotes/[id]/CreateQuoteVersionButton.tsx` | UI y calculo de actividades por partida; insercion/copia en `quote_item_labor_activities`. |
| Aliados comerciales | `lib/commercialPartners.ts`, `app/(admin)/quotes/new/page.tsx`, `app/(admin)/quotes/[id]/edit/page.tsx`, `app/(admin)/quotes/[id]/page.tsx`, `app/api/quotes/[id]/premium-pdf/route.ts` | Seleccion de partner, descuentos/branding y validacion de PDF con marca aliada. |

Pendiente de confirmar: si existen server actions o rutas API adicionales para cotizaciones fuera de estos archivos.

## Responsabilidad De Archivos Clave

| Archivo | Responsabilidad | Cuando modificar | Riesgos |
| --- | --- | --- | --- |
| `app/(admin)/quotes/new/page.tsx` | Creacion completa de cotizacion y tablas hijas. | Cambios de formulario, calculos iniciales, payload de insert, diagnostico, mano de obra o partner en creacion. | Puede dejar cotizaciones parciales si falla despues de insertar `quotes`; revisar orden de inserts y fallbacks PostgREST. |
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
- Ordenamiento por `sort_order`.
- `quote_section_id` se usa para agrupar items en PDF y versionado.

Pendiente de confirmar: migracion base completa, columnas legacy, constraints y RLS final.

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

## Documentos Relacionados

- [`../../ai/AI_CONTEXT.md`](../../ai/AI_CONTEXT.md)
- [`../../ai/PROJECT_MAP.md`](../../ai/PROJECT_MAP.md)
- [`../../ai/MODULE_INDEX.md`](../../ai/MODULE_INDEX.md)
- [`../../ai/SECURITY_RULES.md`](../../ai/SECURITY_RULES.md)
