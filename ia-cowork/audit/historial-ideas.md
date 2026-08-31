# Historial de ideas

## Formato mínimo

```yaml
id: IA-YYYYMMDD-001
author: ChatGPT
type: idea|decision|execution|discard
status: proposed|accepted|in_progress|executed|discarded
owner: responsable
history:
  - YYYY-MM-DD | autor | acción
``` 

## Registro inicial

```yaml
id: IA-20260830-001
author: ChatGPT
type: idea
status: accepted
owner: equipo ALFA OS
history:
  - 2026-08-30 | ChatGPT | created
  - 2026-08-30 | ChatGPT | accepted
```

## Registros Antigravity

```yaml
id: IA-20260830-002
author: Antigravity
type: architecture
status: executed
owner: Antigravity (UI Bandeja v1)
history:
  - 2026-08-30 | Antigravity | created (Bandeja de Decision UI /admin/vigia con 1-click actions)
  - 2026-08-31 | Antigravity | executed (Sprint A3 completado en app/(admin)/vigia/)
```

```yaml
id: IA-20260830-003
author: Antigravity
type: automation
status: proposed
owner: equipo ALFA OS
history:
  - 2026-08-30 | Antigravity | created (Nuevos sensores FSC-*, VTA-*, SRV-*)
```

```yaml
id: IA-20260830-004
author: Antigravity
type: automation
status: proposed
owner: equipo ALFA OS
history:
  - 2026-08-30 | Antigravity | created (Auto-remediacion segura con Banxico FIX y sincronizaciones)
```

```yaml
id: IA-20260830-005
author: Antigravity
type: optimization
status: executed
owner: Claude (A1) + Antigravity (A2)
history:
  - 2026-08-30 | Antigravity | created (Paralelizacion runner y correcion de rollup de impacto MXN)
  - 2026-08-31 | Claude | executed A1 (fix doble conteo rollup)
  - 2026-08-31 | Antigravity | executed A2 (paralelizacion en lotes con Promise.allSettled)
```

## Registros Claude (2026-08-31)

```yaml
id: IA-20260831-001
author: Claude
type: improvement
status: proposed
owner: Claude
history:
  - 2026-08-31 | Claude | created (digest semanal + loop de calibracion real)
```

```yaml
id: IA-20260831-002
author: Claude
type: improvement
status: proposed
owner: Claude
history:
  - 2026-08-31 | Claude | created (investigar a fondo un hallazgo bajo demanda)
```

```yaml
id: IA-20260831-003
author: Claude
type: risk
status: proposed
owner: Claude
history:
  - 2026-08-31 | Claude | created (guardarrailes obligatorios antes de auto_aplicado)
```

```yaml
id: IA-20260831-004
author: Claude
type: improvement
status: proposed
owner: Claude
history:
  - 2026-08-31 | Claude | created (silenciar por entidad + WhatsApp para critico)
```

```yaml
id: IA-20260831-005
author: Claude
type: improvement
status: proposed
owner: Claude
history:
  - 2026-08-31 | Claude | created (score de riesgo por proyecto como vista derivada)
```

```yaml
id: IA-20260901-001
author: Claude + Antigravity
type: feature
status: executed
owner: Claude (backend) + Antigravity (UI)
history:
  - 2026-09-01 | Claude | backend B1 entregado (framework ejecutores + 3 ejecutores + respaldos)
  - 2026-09-01 | Antigravity | UI B1 entregada (FindingCard con botones ejecutar/revertir y feedback)
```

```yaml
id: IA-20260901-002
author: Claude
type: feature
status: executed
owner: Claude
history:
  - 2026-09-01 | Leo | decisiones: hibrido, Vercel Pro, tope $25/mes, auto en critico, correo aparte
  - 2026-09-01 | Claude | ejecutado B2 "Investigar a fondo" (vigia_investigations, lib/vigia/investigate/*, boton Bandeja, runAutoInvestigations en cron, docs). Pendiente prueba end-to-end en prod
```

```yaml
id: IA-20260901-003
author: Antigravity
type: feature
status: executed
owner: Antigravity
history:
  - 2026-09-01 | Antigravity | ejecutado Sprint C1 + C2 (sensores VTA-01..03 y SRV-01..02, vistas SQL, enrich, navegación UI y filtros).
```

```yaml
id: IA-20260901-004
author: Antigravity
type: feature
status: executed
owner: Antigravity
history:
  - 2026-09-01 | Antigravity | ejecutado Sprint G1 (cascarón PWA, manifest, service worker, viewport cover, MobileBottomNav y drawer adaptado).
```

```yaml
id: DECISION-IA-20260831-001
author: Claude
type: decision
status: executed
owner: equipo ALFA OS
history:
  - 2026-08-31 | Claude | created (plan maestro de ejecucion consolidado - ver ia-cowork/roadmap/plan-maestro-ejecucion.md)
  - 2026-08-31 | Leo | aprobado
```

```yaml
id: IA-20260901-005
author: Claude
type: plan
status: accepted
owner: Claude (lider), Antigravity (G1), Codex (G2), Leo
history:
  - 2026-09-01 | Leo | aprobo Sprint G completo ("todas las cosas") y sumo a Codex al equipo
  - 2026-09-01 | Claude | plan Sprint G (ALFA OS Movil + Cotizacion Asistida) en ia-cowork/roadmap/sprint-G-alfa-movil-cotizacion-asistida.md
  - nota: renumerado de 004 a 005 por colision con el registro de Antigravity (G1)
```

```yaml
id: IA-20260901-006
author: Claude
type: feature
status: executed
owner: Claude
history:
  - 2026-09-01 | Claude | ejecutado Sprint C3: sensores de proceso PRC-01/02 (sql/20260901_vigia_phase1_prc.sql, dominio "procesos"). 6 hallazgos PRC-01 reales + 2 PRC-02. Desbloquea D1 (score de riesgo).
```

```yaml
id: IA-20260901-007
author: Claude
type: calibracion
status: executed
owner: Claude
history:
  - 2026-09-01 | Claude | calibracion Sprint C (sql/20260901_vigia_calibracion_c.sql): VTA-03 15->5 (piso cotizacion aprobada >= $25k), PRC-01 6->4. Notas de lane/mensaje para Antigravity en idea-IA-20260901-007.md.
```

```yaml
id: DECISION-IA-20260901-001
author: Claude
type: decision
status: accepted
owner: Claude (coordina), Antigravity (G1), Codex (G2)
history:
  - 2026-09-01 | Claude | reparto Sprint G entre 3 IAs + tickets G1 (Antigravity) y G2 (Codex) con contrato y definicion de listo
```

```yaml
id: REVIEW-Claude-20260901-001
author: Claude
type: review
status: executed
owner: Claude
history:
  - 2026-09-01 | Claude | code review G1 (Antigravity) + G2 (Codex): APROBADO. Verificado contra prod. Fix aplicado: quitado userScalable:false de layout.tsx. Ver ia-cowork/decisions/review-Claude-20260901-001.md
```

```yaml
id: IA-20260901-009
author: Claude
type: feature
status: executed
owner: Claude (impl), Leo (define plantillas)
history:
  - 2026-09-01 | Claude | Sprint G3 plantillas de cotizacion: tablas, lib/quotes/templates.ts, server actions, UI QuoteTemplatesManager. Pendiente prueba en navegador + Leo crea las plantillas.
```

```yaml
id: IA-20260901-011
author: Claude
type: feature
status: executed
owner: Claude
history:
  - 2026-09-01 | Claude | Sprint G4 voz->borrador: quote_voice_drafts, lib/quotes/voiceDraft.ts (loop de herramientas sobre Claude), endpoint /api/quotes/draft-from-intent, panel /quotes/voz. Pendiente prueba en prod + Atajo de Siri de Leo.
  - nota: renumerado de 010 a 011 por colision con el registro de Antigravity (G1 polish + D3)
```

```yaml
id: IA-20260901-010
author: Antigravity
type: feature
status: executed
owner: Antigravity
history:
  - 2026-09-01 | Antigravity | ejecutado G1 Polish (safe-area top, 5 col grid bottom nav) + Sprint D3 (widget ejecutivo de El Vigía en Director Dashboard).
```

## Regla de auditoría

- toda idea debe dejar rastro
- toda ejecución debe registrar quién la hizo
- toda modificación debe quedar en historial
- todo descarte debe incluir motivo
- todo cambio debe conservar la versión anterior

