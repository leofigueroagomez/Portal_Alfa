# Plan Maestro de Ejecución — El Vigía de ALFA OS

- **Autor / líder:** Claude
- **Fecha:** 2026-08-31
- **Estado:** APROBADO por Leo el 2026-08-31. Sprint A en marcha.
- **Consolida:** ideas de ChatGPT (IA-20260830-001..008), Antigravity (IA-20260830-002..005) y Claude (IA-20260831-001..006).
- **Plan de negocio de referencia:** artifact "El Vigía de ALFA OS" — https://claude.ai/code/artifact/321f9ba1-a6ee-471a-a4e5-f05279cf74a4

---

## 1. Dónde estamos hoy (hecho y en vivo)

| Entregado | Detalle |
| --- | --- |
| Fase 0 — Cimientos | Tablas `vigia_sensor_runs`, `vigia_findings`, `vigia_audit_log`; RLS; runner con deduplicación por fingerprint, auto-resolución, reapertura, respeto a `descartado`; bitácora append-only. |
| Fase 1 — Observa | 15 sensores en producción: integridad de datos (`INT-01..10`) y costos/márgenes (`CST-01..05`). |
| Brief diario | Correo dos niveles (Requiere autorización / Prestar atención / Señales por confirmar) vía Resend, cron Vercel `0 13 * * *` (07:00 CDMX). Envío real verificado. |
| Nombres legibles | El brief dice "proyecto Marsella 4064 · Eduardo Venzor", no "proyecto 48". |
| Documentación para IAs | `docs/modules/vigia/MODULE_CONTEXT.md` + índices en `docs/ai/`. |

**Estado actual:** 22 hallazgos abiertos. El único que pide autorización es INT-02 / proyecto Sauces 21 (línea de compra huérfana, DS-1280ZJ-XS).

---

## 2. Consenso de las tres IAs

| Punto | ChatGPT | Antigravity | Claude | Veredicto |
| --- | --- | --- | --- | --- |
| El Vigía = vigilancia operativa, no chatbot | sí | sí (vistas SQL deterministas) | sí | **Cerrado.** Es la arquitectura actual. |
| Supervisión humana antes de automatizar | sí | sí (`proposed_action` + bandeja) | sí (guardarraíles IA-20260831-003) | **Cerrado.** |
| Cerrar el lazo con una Bandeja de Decisión en `/admin/vigia` | parcial (panel dirección) | **sí, prioridad 1** | sí (era la Fase 2 del plan) | **Aprobado. Es el siguiente gran paso.** |
| Nuevos dominios de sensores | Proyectos/compras/cotiz. | **Fiscal/SAT, Leads, Postventa** | + Procesos (PRC-*), Ingeniería (ING-*) | **Aprobado, por lotes y por riesgo.** |
| Auto-remediación (TC Banxico, recálculos) | "automatización supervisada" | **sí (IA-20260830-004)** | sí, **pero con guardarraíles primero** | **Aprobado para el final, tras guardarraíles.** |
| Score de riesgo por proyecto | **sí (IA-20260830-002)** | — | sí, como vista derivada (IA-20260831-005) | **Aprobado, depende de sensores de proceso.** |
| Trazabilidad de ideas | **sí (esta carpeta)** | sí | sí | **Cerrado.** |

### Hallazgo de la auditoría de Antigravity que se confirma como bug real
`impactMxnOpen` en `runner.ts` suma el sobrecosto de un proyecto **dos veces**: una por los hallazgos hoja de `CST-01` (por evento) y otra por el rollup `CST-05` (total del proyecto). El número de "dinero en riesgo" del brief está inflado. **Se corrige en el Sprint A.**

---

## 3. Backlog consolidado y priorizado

Prioridad = (impacto para Leo) × (cierra un lazo) ÷ (riesgo de romper algo).

| # | Item | Origen | Owner | Riesgo |
| --- | --- | --- | --- | --- |
| ~~A1~~ | **HECHO** (2026-08-31, commit `6e1aa7c`) — mapa `IMPACT_ROLLUPS` en `runner.ts`; brief $7,993 → $6,088. | Antigravity IA-005 | Claude | Bajo |
| A2 | Paralelizar el runner con `Promise.allSettled` en lotes | Antigravity IA-005 | Antigravity | Bajo |
| A3 | **Bandeja de Decisión `/admin/vigia` v1** — lectura + acciones no destructivas (Reconocer, Posponer, Descartar con nota, Silenciar proyecto). Índice de salud arriba. Sin ejecutores. | Antigravity IA-002 + ChatGPT IA-004 + Claude IA-20260831-004 | Antigravity (UI), Claude (review) | Medio |
| B1 | Ejecutores de 1 clic. **Backend HECHO** (2026-09-01, `idea-IA-20260901-001.md`): tabla `vigia_action_backups`, `lib/vigia/executors.ts` (3 ejecutores con candados), `execute-actions.ts` (server actions con revertir), anotacion de ejecutabilidad en `queries.ts`. Probado contra prod. **Falta:** botones `[Autorizar y ejecutar]` / `[Revertir]` en `FindingCard.tsx` (Antigravity). | Antigravity IA-002 | Claude (backend) + Antigravity (UI) | Medio |
| ~~B2~~ | **HECHO** (2026-09-01, `idea-IA-20260901-002.md`). "Investigar a fondo": híbrido playbook determinista + 1 llamada a Claude, tope mensual $25 USD, correo aparte, automático en `severity=critico`. Tablas `vigia_investigations`. Botón en la Bandeja + `runAutoInvestigations()` en el cron. Vercel Pro + `ANTHROPIC_API_KEY` ya en prod. Playbook INT-01 + genérico. **Falta:** probar end-to-end en prod (no hay hallazgo INT-01/crítico abierto ahora mismo); playbook dedicado para INT-04. | Claude IA-20260831-002 | Claude | Medio |
| C1 | Sensores `VTA-01/02/03` — leads desatendidos, cotizaciones dormidas de alto valor, `won` sin anticipo | Antigravity IA-003 | Antigravity | Bajo |
| C2 | Sensores `SRV-01/02` — garantía por vencer (→ oferta de póliza), tickets de servicio estancados | Antigravity IA-003 | Antigravity | Bajo |
| C3 | Sensores de proceso `PRC-01/02` — cotización estancada, proyecto sin avance de compra (base del score de riesgo) | Claude IA-20260831-005 | Claude | Bajo |
| ~~C4~~ | ~~Canal WhatsApp solo para `severity = critico`~~ — **DIFERIDO** (2026-08-31). Por ahora la comunicación del Vigía es solo por correo. Se retoma en un sprint posterior; ver `idea-IA-20260831-006.md`. | Plan maestro + Claude IA-20260831-004/006 | Claude + Leo | Bajo |
| D1 | Score de riesgo por proyecto `vigia_v_project_risk` + pestaña "Proyectos en riesgo" | ChatGPT IA-002 concretado en Claude IA-20260831-005 | Claude | Bajo |
| D2 | Digest semanal (tendencia, abiertos vs resueltos, sensores ruidosos) + calibración automática | Claude IA-20260831-001 | Claude | Bajo |
| D3 | Panel de dirección (proyectos en riesgo, tendencias, alertas activas) — pestaña de la Bandeja | ChatGPT IA-004 | Antigravity | Bajo |
| E1 | Sensores `FSC-01/02/03` — PPD sin REP a tiempo, cotización cobrada sin CFDI, CSD por caducar. **Solo alerta, read-only.** | Antigravity IA-003 | Claude + revisión de Leo | Alto (fiscal) |
| E2 | Guardarraíles de `auto_aplicado`: simulación 2 semanas, tope diario, kill switch, veto 24h, lista blanca | Claude IA-20260831-003 | Claude | Alto |
| E3 | Auto-captura de TC vía Banxico FIX para `INT-05` | Antigravity IA-004 | Antigravity (tras E2) | Alto |
| E4 | Auto-recálculo nocturno de totales `INT-09` | Antigravity IA-004 | Antigravity (tras E2) | Medio |
| F1 | Talleres diarios de reglas de ingeniería → `docs/ai/engineering-rules/*` | Plan maestro | Leo + Claude | — |
| F2 | Sensores `ING-*` contra el catálogo de reglas | Plan maestro | Claude | Medio |

---

## 4. Secuencia de ejecución (sprints)

Cada sprint es una unidad entregable que no rompe lo anterior.

### Sprint A — Cerrar el lazo (semana 1)
`A1` corregir el impacto → `A2` paralelizar runner → `A3` Bandeja de Decisión v1.
**Resultado:** Leo resuelve hallazgos desde una pantalla, con un número de "dinero en riesgo" correcto. Todavía sin ejecutores automáticos.

### Sprint B — Ejecutores seguros (semana 2-3) — CERRADO 2026-09-01
`B1` los 3 botones de corrección reversible → `B2` "investigar a fondo".
**Resultado:** el Vigía pasa de "te aviso" a "te entrego la corrección lista, autorízala" y, cuando hace falta más contexto, "te armo el expediente y te mando el diagnóstico". Es lo que Leo pidió.
Pendiente operativo: probar B2 end-to-end en prod con un hallazgo real (ahora mismo no hay ninguno crítico ni INT-01 abierto).

### Sprint C — Más frentes, bajo riesgo (semana 3-5)
`C1` VTA-* → `C2` SRV-* → `C3` PRC-*. (`C4` WhatsApp crítico diferido; comunicación solo por correo por ahora.)
**Resultado:** el Vigía cubre ventas, postventa y procesos, no solo compras.

### Sprint D — Síntesis para dirección (semana 5-7)
`D1` score de riesgo → `D2` digest semanal + calibración → `D3` panel de dirección.
**Resultado:** Leo ve el negocio de un vistazo (proyectos en riesgo, tendencia), no una lista de hallazgos.

### Sprint E — Fiscal y auto-remediación (semana 7-10)
`E1` FSC-* (solo alerta) → `E2` guardarraíles → `E3` TC Banxico → `E4` recálculo nocturno.
**Resultado:** cero riesgo de multa SAT por descuido; las tareas deterministas de bajo riesgo se resuelven solas, con veto humano de 24h.

### Sprint F — Ingeniería asistida (en paralelo, al ritmo de Leo)
`F1` talleres → `F2` sensores ING-*. No bloquea nada; arranca cuando Leo agende el primer taller.

---

## 5. Gobernanza

1. **Toda idea vive en `ia-cowork/`** con su frontmatter de trazabilidad. Al empezar a ejecutarla: `status: in_progress` + entrada en `history`. Al terminar: `execution_status: executed` + PR enlazado.
2. **Roles:**
   - **Claude (líder):** mantiene este plan, hace code review de las PRs de Antigravity, ejecuta lo que toca el núcleo del runner/sensores y las correcciones de datos donde ya hay contexto profundo (Sprints A1, B1, B2, C3, C4, D, E1, E2, F2).
   - **Antigravity:** UI de la Bandeja, sensores nuevos de dominio (VTA, SRV), auto-remediación (Sprints A2, A3, C1, C2, D3, E3, E4).
   - **Leo:** aprueba cada sprint antes de arrancar, agenda los talleres de ingeniería, y es el único que autoriza cambios fiscales (E1) y el paso de cualquier sensor al carril `auto_aplicado`.
3. **Reglas duras:**
   - Todo cambio de estructura → migración revisable en `sql/` + reflejo en `docs/modules/vigia/MODULE_CONTEXT.md`.
   - Los sensores son solo lectura sobre tablas de negocio. Siempre.
   - Nada entra a `auto_aplicado` hasta que E2 (guardarraíles) esté en producción.
   - Cada ejecutor: respaldo previo + registro en `vigia_audit_log` + botón revertir.
   - Fiscal (FSC-*): solo alerta, nunca acción automática. Coordinar con la reconstrucción contable en curso.
4. **Criterio de "listo" por sensor:** vista SQL probada contra datos reales (`?dry=1`), alcance calibrado (pocos falsos positivos), `confidence` honesta, documentado en la lista de sensores.

---

## 6. Estado de aprobación

Aprobado por Leo el 2026-08-31:
- **Sprint A en marcha.** A1 (fix del doble conteo) es lo primero.
- **Reparto Claude / Antigravity confirmado** (ver decisión `decision-IA-20260831-001.md`).
- **WhatsApp diferido (2026-08-31).** Por ahora la comunicación del Vigía es solo por correo. El onboarding de Meta no arranca todavía; se retoma en un sprint posterior.
