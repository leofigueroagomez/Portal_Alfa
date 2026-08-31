---
id: REVIEW-Claude-20260831-001
created_at: 2026-08-31T00:00:00Z
author: Claude
role: IA (lider de proyecto)
category: revision
status: partial
module: ALFA OS / El Vigia / Bandeja de Decision
summary: Code review del commit e5c9ac8 (Sprint A2 + A3 de Antigravity). 2 bloqueantes, 3 menores.
owner: Claude (R1, R2) + Antigravity (R3, R4, R5)
execution_status: R1 y R2 hechos por Claude; R3/R4/R5 pendientes de Antigravity
history:
  - 2026-08-31 | Claude | created (revision de e5c9ac8)
  - 2026-08-31 | Claude | R1 y R2 EJECUTADOS. Tome tambien R2-UI (repuntar las 2 actions de snooze) para dejar la funcion entera y probada.
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

## Ejecucion

### R1 - HECHO (Claude)
- Nuevo `lib/vigia/impact.ts` con `computeImpactTotal` + `IMPACT_ROLLUPS`.
- `runner.ts` y `queries.ts` lo importan; se borro la logica duplicada de `queries.ts`.
- Bandeja y brief ahora dan el mismo numero: $6,088.39.
- Bonus: `activeSensorsCount` ya no esta hardcodeado, usa `SENSORS.length` (R4).

### R2 - HECHO (Claude, incluida la parte UI)
- Migracion `sql/20260831_vigia_snooze.sql` (aplicada a prod): columna `snooze_until timestamptz` + estado `pospuesto` en el check.
- `runner.ts` -> `reactivateExpiredSnoozes()` al inicio de cada corrida: los `pospuesto` vencidos vuelven a `abierto` y se auditan (`finding_unsnoozed`).
- El brief y `queries.ts` ya excluyen los `pospuesto` (filtran por `abierto`/`reconocido`); `getVigiaOverview` agrega `snoozedCount`.
- `app/(admin)/vigia/actions.ts` -> `snoozeFindingAction` y `snoozeEntityAction` ahora escriben `status='pospuesto'` + `snooze_until`, no texto en `decision_note`.
- Probado contra prod: posponer un CST-05 baja el impacto de $6,088 a $3,899 y lo saca del conteo; al vencer la fecha, la corrida lo reactiva y el impacto vuelve a $6,088.

### Pendiente - Antigravity
- **R3:** gate de rol en `checkAuth()` (`admin`/`direccion`), no solo usuario interno.
- **R5:** rate-limit en `runVigiaNowAction`.
- (opcional) pestana "Pospuestos" en la Bandeja usando el nuevo `snoozedCount` / filtro `status='pospuesto'`.

## Leo: smoke test de `/vigia`
Una vez que Antigravity cierre R3, abrir `/vigia` en produccion y probar: renderiza, "reconocer" / "descartar con nota" / "posponer 7 dias" persisten y aparecen en la bitacora, el numero de "dinero en riesgo" coincide con el del correo.
