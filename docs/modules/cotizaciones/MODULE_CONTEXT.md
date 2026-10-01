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
| Plantillas de cotizacion | `app/(admin)/quotes/templates/` (`page.tsx`, `actions.ts`), `lib/quotes/templates.ts`, `components/quotes/QuoteTemplatesManager.tsx` | Sprint G3. Tablas `quote_templates` + `quote_template_lines`. `buildDraftFromTemplate()` traduce la plantilla al contrato de `draftBuilder` y crea un borrador. UI: lista + flujo "elegir cliente / ajustar cantidades / crear" + editor CRUD (gate `admin`/`direccion`). RLS select-only; escritura por server actions. |
| Dictar cotizacion (voz) | `app/api/quotes/draft-from-intent/route.ts`, `lib/quotes/voiceDraft.ts`, `app/(admin)/quotes/voz/page.tsx`, `components/quotes/VoiceDraftPanel.tsx` | Sprint G4. Loop de herramientas sobre Claude: de una transcripcion resuelve cliente + productos + plantillas y llama a `buildDraftQuote`/`buildDraftFromTemplate`, o pide aclaracion. Registro en `quote_voice_drafts` con costo. Tope mensual `QUOTE_VOICE_MONTHLY_CAP_USD`. Endpoint para Atajo de Siri (`QUOTE_VOICE_SECRET`/`CRON_SECRET`). El borrador SIEMPRE se abre para revision. |
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
| Descuentos por partida y reglas por marca | `lib/quoteLineDiscounts.ts`, `app/(admin)/quotes/QuoteItemDiscountFields.tsx`, `app/(admin)/quotes/QuoteBrandDiscountsPanel.tsx`, `app/(admin)/quotes/brand-rules/` (`page.tsx`, `actions.ts`), `components/quotes/BrandRulesManager.tsx`, `new/page.tsx`, `edit/page.tsx`, `CreateQuoteVersionButton.tsx` | Override de % cliente y % de utilidad del aliado por partida de equipo, tope/% por marca en `brand_commercial_rules`, aplicar % a toda una marca desde el editor. Reparto de utilidad: tras el descuento al cliente, el aliado se lleva un % de la utilidad (50% por defecto). Bloqueo duro al guardar si una partida rebasa el tope de su marca, queda bajo costo o no tiene costo en cotizacion de aliado. |

Pendiente de confirmar: si existen server actions o rutas API adicionales para cotizaciones fuera de estos archivos.

## Responsabilidad De Archivos Clave

| Archivo | Responsabilidad | Cuando modificar | Riesgos |
| --- | --- | --- | --- |
| `app/(admin)/quotes/new/page.tsx` | Creacion completa de cotizacion y tablas hijas. | Cambios de formulario, calculos iniciales, payload de insert, diagnostico, mano de obra o partner en creacion. | Puede dejar cotizaciones parciales si falla despues de insertar `quotes`; revisar orden de inserts y fallbacks PostgREST. |
| `lib/quotes/draftBuilder.ts` | Construye borradores estandar desde un contrato reducido para plantillas/voz/IA; consulta el mismo catalogo y fuentes de tipo de cambio del editor. | Evolucion de G2-G5, formulas deterministas, idempotencia o nuevas entradas del borrador asistido. | No tiene transaccion SQL. Ante una falla intenta limpiar `quote` y `quote_group`, pero la compensacion es best-effort y puede ser rechazada por RLS; mantener un cliente Supabase autorizado y reportar limpieza incompleta. |
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
- Desde 2026-10-01 `discount_amount_mxn` y `partner_*_discount_mxn` son la suma de los descuentos por partida (ver `### Descuentos por partida y reglas por marca

Migraciones (aplicadas en produccion 2026-10-01): `sql/20261001_quote_line_discounts_brand_rules.sql`, `sql/20261001b_partner_profit_share.sql`; limpieza posterior `sql/20261001c_drop_deprecated_partner_percent.sql`; rollback `sql/20261001_quote_line_discounts_brand_rules_rollback.sql`.

- `quotes.partner_profit_share_percent` (default 50): % de la utilidad que se lleva el aliado.
- `quote_items.client_discount_percent`, `quote_items.partner_profit_share_percent`: overrides por partida, nullable (null = hereda).
- `quote_items.client_discount_mxn`, `quote_items.partner_discount_mxn`: montos calculados al guardar.
- `brand_commercial_rules`: `brand` (unico por `lower(btrim)`), `max_client_discount_percent` (null = sin tope), `partner_profit_share_percent` (null = el de la cotizacion), `notes`, `is_active`. RLS select solo `is_internal_user()`; grants solo `SELECT` a `authenticated` (sin TRUNCATE); escritura solo por server action con rol `admin`/`direccion`. Seed: Sonos con tope 0% al cliente.

Regla de negocio (confirmada por Leo 2026-10-01, aplica a todos los aliados): primero el descuento al cliente; la utilidad que queda se reparte con el aliado, 50/50 por defecto, en equipo y en mano de obra. Los margenes normales de ALFA son 30% equipo y 50% mano de obra, por eso el esquema anterior era 15%/25% sobre precio.

- Precio cliente = venta x (1 - c). Utilidad = precio cliente - costo. Aliado = max(utilidad, 0) x s.
- Cliente: override de partida, si no `min(% general porcentual, tope de marca)`. Mano de obra usa el % general.
- Aliado: override de partida, si no % de la marca, si no 0 cuando `products.partner_discount_eligible = false` (solo equipo), si no `quotes.partner_profit_share_percent`.
- El costo indirecto de empresa (markup en precio) cuenta como costo, no como utilidad repartible.
- Descuento por monto (`discount_type = amount`) sigue siendo global y se suma despues.
- `quotes.partner_equipment_discount_percent` / `partner_labor_discount_percent` ahora guardan el % efectivo sobre precio al cliente (informativo); los montos `partner_*_discount_mxn` son la suma por partida.
- Bloqueo duro al guardar: override de cliente mayor al tope de la marca; precio al cliente bajo costo (equipo o mano de obra); en cotizacion de aliado, equipo o mano de obra con venta y sin costo.
- Cotizaciones de aliado existentes cambian su total solo si se vuelven a guardar. Al 2026-10-01 solo ALFA-0017-V1 quedaria bloqueada (3 actividades de mano de obra sin costo interno).
- Prueba: `npx tsx --test tests/quoteLineDiscounts.test.ts`.

Pendiente: desglose por partida/marca en PDF Premium (hoy un solo renglon "Descuento") y funcion "Unificar cotizaciones".

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
