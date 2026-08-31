# Code review — Sprint G1 (Antigravity) + G2 (Codex)

- **Revisor:** Claude (líder)
- **Fecha:** 2026-09-01
- **Alcance:** commit `ca06397` (G1 PWA) + trabajo sin commitear de G2 (`lib/quotes/draftBuilder.ts` + pruebas).
- **Veredicto:** **APROBADO para push.** Un ajuste aplicado por el revisor (zoom). Sin bloqueantes.

---

## G2 — `lib/quotes/draftBuilder.ts` (Codex)

### Verificado contra la base real

| Chequeo | Resultado |
| --- | --- |
| Tablas/columnas que escribe (`quote_groups`, `quotes`, `quote_sections`, `quote_items`, `quote_item_labor_activities`, `quote_terms_settings`) | Todas existen. Toda columna `NOT NULL` tiene default o se provee. `quote_groups.status` default `'draft'`. |
| Semántica de columnas (USD vs MXN) | **Exacta.** En `quote_items` reales: `equipment_total` = `equipment_total_usd` (USD), `line_total` en MXN, `cost_unit_price`/`sale_unit_price`/`subtotal_*`/`margin_*` = NULL. Codex hace lo mismo. |
| 5 "golden" (#140, #152, #161, #163, #165) | Los `total_mxn` y `subtotal_mxn` esperados **coinciden al centavo** con las filas reales de `quotes`. |
| `company_settings` (singleton `id = true`, `indirect_cost_percent`) | Existe tal cual. |
| `quote_terms_settings` defaults hardcodeados | 144 de 150 cotizaciones reales usan exactamente esos valores. |
| Cobertura de `products.calculated_sale_price` | 540/555 productos activos. Los 15 sin costo disparan `warning` limpio, no rompen. |
| Uso de indirecto / MISC en cotizaciones históricas | **0 de 152.** La fórmula simple de Codex ES la fórmula real de cómo ALFA cotiza hoy. |
| `npx tsc`, `npm run build`, `npm run test:draft-builder` | Verde (9/9 pruebas). |

### Observaciones (no bloquean, backlog)

1. **Las pruebas no son "golden" en el sentido estricto.** Usan un `FakeSupabase` en memoria y fixtures de producto con `calculated_sale_price` reconstruidos a mano; los `expected` los calculó Codex. Que los 5 totales coincidan con las cotizaciones reales da confianza para el caso estándar, pero **no cubren indirecto ni MISC con datos reales** (no existe ninguna cotización real con eso, así que el riesgo práctico es cero hoy) y **no detectan drift de esquema**. La doc de Codex dice "golden reales ... al centavo con la cotización original" — sobrevende un poco. Que Codex ajuste el texto, o que en G3 se agregue una prueba de integración real.
2. **Sin transacción.** Una falla después de insertar `quotes` deja un borrador vacío de $0 (litter, no corrupción; la idempotencia no lo re-usa). Un `try/catch` que borre `quote` + `quote_group` en fallo posterior sería limpio. Para G3.
3. **`nextBaseNumber` es read-max + 1.** Colisión posible con dos llamadas concurrentes. Sin riesgo para uso de una persona; documentado por Codex.
4. **`created_by` queda NULL** en borradores generados por el sistema. G4 debe pasar el actor.
5. ~~Confirmar con Leo~~: **CONFIRMADO (2026-09-01)** — Leo siempre cotiza a precio de catálogo (`products.calculated_sale_price`), sin ajustar margen por cotización. El uso que Codex hace de ese campo como fuente de precio es correcto. El parámetro `margin_percent` del input queda como opción, no como flujo normal.

### Lo que Codex hizo bien

No tocó `quotes/new/page.tsx` ni el editor. No tocó esquema, RLS ni auth. `server-only`. No agregó endpoint (correcto, se delega a G3/G4). Idempotencia por firma de líneas + notas + indirecto. Guard del doble conteo del indirecto correcto. Fallback de TC Banxico → fuente pública, igual que el endpoint vigente.

---

## G1 — PWA + navegación móvil (Antigravity, `ca06397`)

### Verificado

| Chequeo | Resultado |
| --- | --- |
| `public/sw.js` — alcance del `fetch` handler | **Conservador y seguro.** Solo intercepta `/_next/static/` (hasheados), `/catalog/`, `.png`, `.ico`. **No cachea HTML ni respuestas de API** → cero riesgo de servir páginas autenticadas o datos rancios. |
| `PwaRegister` | Solo registra en `production`, catch silencioso. |
| `manifest.ts` iconos (`/icon.png`, `/apple-touch-icon.png`) | Existen en `public/`. |
| `start_url: /dashboard`, home del bottom nav `/director-dashboard` para admin | Ambas rutas existen. Inconsistencia menor de destino, no rompe. |
| `MobileBottomNav` | `lg:hidden` (desktop intacto), `env(safe-area-inset-bottom)` para el notch, `pb-24` en el contenido para no taparlo. |
| `AdminShell` ya tenía `pathname` y `newLeadsCount` | Sí. |
| tsc + build | Verde. |

### Ajuste aplicado por el revisor

- **`app/layout.tsx`: quité `maximumScale: 1` y `userScalable: false`.** Bloqueaban el pinch-zoom en **todo** el sitio, incluido el público — regresión de accesibilidad (WCAG) y mala señal para SEO. El look "app" ya lo da `display: standalone` en el manifest. Cambio de 2 líneas, build verde.

### Observaciones (backlog, Antigravity)

1. **Safe-area superior.** `statusBarStyle: black-translucent` mete el contenido bajo la barra de estado en iPhones con notch (modo standalone). Antigravity manejó el bottom pero no el top. Agregar `padding-top: env(safe-area-inset-top)` al chrome de AdminShell.
2. **6 destinos en el bottom nav** (Inicio, Proyectos, +FAB, Cotizar, Vigía, Menú) — apretado en pantallas de 360px. Revisar espaciado.
3. **Punto rojo pulsante permanente** en "El Vigía" del bottom nav — quizá solo cuando hay hallazgos que requieren autorización.

---

## Acción

- Claude commitea G2 + el ajuste de layout + esta review. Leo hace `git push`.
- Antigravity: puntos de backlog de G1 (safe-area top, spacing, punto del Vigía).
- Codex: ajustar el texto de la doc sobre "golden"; considerar `try/catch` de limpieza para G3.
