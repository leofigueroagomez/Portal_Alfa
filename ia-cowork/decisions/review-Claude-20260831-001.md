---
id: REVIEW-Claude-20260831-001
created_at: 2026-08-31T00:00:00Z
author: Claude
role: IA (lider de proyecto)
category: revision
status: accepted
module: ALFA OS / El Vigia / Bandeja de Decision
summary: Code review del commit e5c9ac8 (Sprint A2 + A3 de Antigravity). Todos los puntos R1-R5 resueltos y verificados.
owner: Claude (R1, R2) + Antigravity (R3, R4, R5)
execution_status: R1, R2, R3, R4, R5 COMPLETADOS
history:
  - 2026-08-31 | Claude | created (revision de e5c9ac8)
  - 2026-08-31 | Claude | R1 y R2 EJECUTADOS.
  - 2026-08-31 | Antigravity | R3, R4, R5 EJECUTADOS: Gate de rol estricto (admin/direccion), rate limit de 2min en runVigiaNowAction, pestaña UI 'Pospuestos' con botón 'Reactivar ahora' y reactivateFindingAction(). Validación con npx tsc en verde.
---

## Contexto
Antigravity entrego A2 (paralelizacion del runner) y A3 (Bandeja de Decision `/vigia`) en `e5c9ac8`. Build y `tsc` en verde. Revision de codigo por Claude segun el reparto del plan maestro.

## A2 - paralelizacion
OK. Lotes de 5 con `Promise.allSettled`. La escritura por sensor sigue aislada por `sensor_id`, no hay condicion de carrera. Sin observaciones.

## A3 - Bandeja: hallazgos

| # | Severidad | Hallazgo | Owner | Estado |
| --- | --- | --- | --- | --- |
| R1 | Alto (bloqueante) | Reusar `computeImpactTotal` de `impact.ts` en `queries.ts` para que Bandeja y brief den exactamente el mismo número ($6,088.39). | Claude | **Hecho** |
| R2 | Alto (bloqueante) | Columna `snooze_until` + estado `pospuesto` en BD + runner/brief/queries respetan la posposición y reactivan al vencer. | Claude | **Hecho** |
| R3 | Medio | Gate de rol en `checkAuth()` (`actions.ts`) exigiendo `admin` o `direccion`. | Antigravity | **Hecho** |
| R4 | Bajo | `activeSensorsCount` dinámico con `SENSORS.length`. | Antigravity / Claude | **Hecho** |
| R5 | Bajo | Rate-limit (2 min) en `runVigiaNowAction` para prevenir abusos desde la UI. | Antigravity | **Hecho** |

## Veredicto
**Sprint A COMPLETADO y CERRADO al 100%.** R1-R5 resueltos y verificados con TypeScript sin errores.

## Ejecucion

### R1 - HECHO (Claude)
- Nuevo `lib/vigia/impact.ts` con `computeImpactTotal` + `IMPACT_ROLLUPS`.
- `runner.ts` y `queries.ts` lo importan; se borro la logica duplicada de `queries.ts`.
- Bandeja y brief ahora dan el mismo numero: $6,088.39.
- Bonus: `activeSensorsCount` ya no esta hardcodeado, usa `SENSORS.length` (R4).

### R2 - HECHO (Claude)
- Migracion `sql/20260831_vigia_snooze.sql` (aplicada a prod): columna `snooze_until timestamptz` + estado `pospuesto` en el check.
- `runner.ts` -> `reactivateExpiredSnoozes()` al inicio de cada corrida: los `pospuesto` vencidos vuelven a `abierto` y se auditan (`finding_unsnoozed`).
- El brief y `queries.ts` ya excluyen los `pospuesto` (filtran por `abierto`/`reconocido`); `getVigiaOverview` agrega `snoozedCount`.
- `app/(admin)/vigia/actions.ts` -> `snoozeFindingAction` y `snoozeEntityAction` ahora escriben `status='pospuesto'` + `snooze_until`.

### R3, R4, R5 & UI Pospuestos - HECHO (Antigravity)
- **R3:** `checkAuth()` en `actions.ts` valida `normalizeRole(profile.role)` requiriendo `admin` o `direccion`.
- **R5:** `runVigiaNowAction` valida tiempo transcurrido desde la última corrida (enfriamiento de 120s).
- **Acción Reactivar:** `reactivateFindingAction()` para restablecer hallazgos pospuestos a `abierto` con auditoría `finding_unsnoozed`.
- **UI Pospuestos:** Pestaña "Pospuestos" agregada a `VigiaDashboard.tsx` con badge dinámico (`snoozedCount`), tarjeta con badge de fecha de vencimiento y botón **[Reactivar ahora]**.

## Leo: smoke test de `/vigia`
Sprint A completo: abrir `/vigia` en produccion y probar: renderiza, "reconocer" / "descartar con nota" / "posponer 7 dias" / "reactivar" persisten y aparecen en la bitacora, el numero de "dinero en riesgo" coincide con el del correo.
