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
id: DECISION-IA-20260831-001
author: Claude
type: decision
status: executed
owner: equipo ALFA OS
history:
  - 2026-08-31 | Claude | created (plan maestro de ejecucion consolidado - ver ia-cowork/roadmap/plan-maestro-ejecucion.md)
  - 2026-08-31 | Leo | aprobado
```

## Regla de auditoría

- toda idea debe dejar rastro
- toda ejecución debe registrar quién la hizo
- toda modificación debe quedar en historial
- todo descarte debe incluir motivo
- todo cambio debe conservar la versión anterior

