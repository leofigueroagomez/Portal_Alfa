---
id: REVIEW-Claude-20260831-001
created_at: 2026-08-31T00:00:00Z
author: Claude
role: IA (lider de proyecto)
category: revision
status: proposed
module: ALFA OS / El Vigia / Bandeja de Decision
summary: Code review del commit e5c9ac8 (Sprint A2 + A3 de Antigravity). 2 bloqueantes, 3 menores.
owner: Claude (R1, R2-datos) + Antigravity (R2-UI, R3, R4, R5)
execution_status: pending
history:
  - 2026-08-31 | Claude | created (revision de e5c9ac8)
---

## Contexto
Antigravity entrego A2 (paralelizacion del runner) y A3 (Bandeja de Decision `/vigia`) en `e5c9ac8`. Build y `tsc` en verde. Revision de codigo por Claude segun el reparto del plan maestro.

## A2 - paralelizacion
OK. Lotes de 5 con `Promise.allSettled`. La escritura por sensor sigue aislada por `sensor_id`, no hay condicion de carrera. Sin observaciones.

## A3 - Bandeja: hallazgos

| # | Severidad | Hallazgo | Owner |
| --- | --- | --- | --- |
| R1 | Alto (bloqueante) | `lib/vigia/queries.ts` -> `getVigiaOverview` reimplementa el calculo de impacto: excluye TODOS los CST-05 y suma TODOS los CST-01. Da ~$2,118 mientras el brief (con `computeImpactTotal` de runner.ts) da $6,088. La Bandeja mostraria un numero distinto y mas bajo que el correo. **Debe reusar la misma funcion, no reimplementarla.** | Claude |
| R2 | Alto (bloqueante) | "Posponer" no funciona de fondo: `snoozeFindingAction` pone `status='reconocido'` y mete la fecha en `decision_note` como texto. Los hallazgos `reconocido` SIGUEN apareciendo en el brief y en el impacto, y nada los reactiva al vencer la fecha. Falta columna `snooze_until timestamptz` + que runner, brief y queries la respeten (ocultar mientras este vigente, reactivar al vencer). Igual `snoozeEntityAction`. | Claude (columna + runner/brief/queries) + Antigravity (repuntar las actions) |
| R3 | Medio | `checkAuth()` en `actions.ts` solo valida que sea usuario interno, no el rol. Cualquier rol (instalador, compras...) puede descartar/posponer/ejecutar El Vigia. Debe exigir `admin` o `direccion` via `normalizeRole(profile.role)`. | Antigravity |
| R4 | Bajo | `activeSensorsCount: 15` hardcodeado en `queries.ts`. Usar `SENSORS.length`. | Antigravity |
| R5 | Bajo | `runVigiaNowAction` sin gate de rol ni rate-limit; dispara una corrida completa desde la UI. Agregar gate de rol (R3 lo cubre) y un limite (ej. 1 cada 5 min). | Antigravity |

## Veredicto
Sprint A NO se cierra hasta resolver R1 y R2. La Bandeja no puede mostrar un numero de "dinero en riesgo" distinto al del correo, y "posponer" tiene que ocultar el hallazgo de verdad.

## Plan
1. Claude: mover `computeImpactTotal` + `IMPACT_ROLLUPS` a un modulo compartido (`lib/vigia/impact.ts`), reusarlo en runner y queries (R1). Agregar `snooze_until` a `vigia_findings` + status `pospuesto`; runner/brief/queries lo respetan (R2-datos).
2. Antigravity: repuntar `snoozeFindingAction`/`snoozeEntityAction` al nuevo campo (R2-UI), gate de rol (R3), R4, R5.
3. Leo: smoke test de `/vigia` en produccion una vez cerrados R1-R3.
