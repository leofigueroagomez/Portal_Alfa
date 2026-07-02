# Modulo: Cotizaciones

Contexto para agentes que modifiquen cotizaciones, versiones, PDF Premium o datos relacionados.

## Que Hace

Gestiona cotizaciones comerciales, versiones, partidas, secciones, aprobacion, PDF/impresion y extensiones como actividades de mano de obra, aliados comerciales y contexto/diagnostico.

Estado inferido: activo y critico para ventas.

## Rutas Principales

- `app/(admin)/quotes/page.tsx`
- `app/(admin)/quotes/new/page.tsx`
- `app/(admin)/quotes/[id]/page.tsx`
- `app/(admin)/quotes/[id]/edit/page.tsx`
- `app/(admin)/quotes/[id]/print/page.tsx`
- `app/api/quotes/[id]/premium-pdf/route.ts`

## Archivos Clave

- `app/(admin)/quotes/QuoteDiagnosticContextEditor.tsx`
- `app/(admin)/quotes/QuoteLaborActivitiesPanel.tsx`
- `app/(admin)/quotes/[id]/CreateQuoteVersionButton.tsx`
- `app/(admin)/quotes/[id]/ApproveQuoteVersionButton.tsx`
- `app/(admin)/quotes/[id]/PrintQuoteButton.tsx`
- `lib/quoteDiagnosticContext.ts`
- `lib/quoteLaborActivities.ts`
- `lib/quotePdfSnapshot.ts`
- `lib/quotePremiumPdf.ts`
- `lib/quotePremiumPdfHtml.ts`
- `lib/commercialPartners.ts`

## Base De Datos / SQL Detectado

Tablas o modelos observados por nombres de codigo y migraciones:

- `quotes`
- `quote_groups`
- `quote_sections`
- `quote_items`
- `quote_diagnostic_blocks`
- `quote_item_labor_activities`
- `commercial_partners`

Migraciones relevantes detectadas:

- `sql/20260702_quote_diagnostic_context.sql`
- `sql/20260529_quote_item_labor_activities.sql`
- `sql/20260528_quote_travel_partner_mode.sql`
- migraciones relacionadas con `commercial_partners`

Pendiente de confirmar: esquema completo de todas las tablas productivas y policies RLS efectivamente aplicadas.

## Flujos Principales

- Crear cotizacion nueva.
- Editar cotizacion.
- Crear nueva version.
- Aprobar version.
- Generar PDF Premium.
- Imprimir/vista PDF.
- Agregar contexto y diagnostico con bloques e imagenes.
- Asociar branding de aliado comercial cuando aplique.

## Riesgos

- PDF Premium puede fallar por assets, storage, Chromium/runtime o HTML no compatible.
- Cambios de schema deben recargar cache PostgREST si afectan queries desde Supabase.
- Versionado de cotizaciones puede duplicar o perder datos si no se copian tablas hijas.
- RLS debe seguir patrones existentes de cotizaciones y tablas hijas.
- No romper cotizaciones antiguas al agregar campos nuevos.

## Validacion Minima Recomendada

- Crear/editar cotizacion con y sin secciones.
- Crear nueva version.
- Guardar cotizacion antigua.
- Generar PDF Premium y verificar respuesta PDF.
- Si toca diagnostico: probar bloques vacios, bloques con texto, imagen valida, imagen invalida.
- Ejecutar `npx tsc --noEmit`, `npm run build` y `git diff --check` cuando haya codigo.

## Documentos Relacionados

- [`../../ai/AI_CONTEXT.md`](../../ai/AI_CONTEXT.md)
- [`../../ai/SECURITY_RULES.md`](../../ai/SECURITY_RULES.md)
