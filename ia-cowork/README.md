# IA Cowork

Este directorio centraliza las ideas, observaciones, decisiones y propuestas de las IAs y agentes que participan en ALFA OS.

## Propósito

- registrar ideas de mejora
- documentar decisiones
- mantener trazabilidad por autor y ejecución
- separar propuestas de implementación
- facilitar auditoría y revisión por humanos

## Reglas obligatorias

Toda entrada dentro de esta carpeta debe seguir este formato de trazabilidad:

```yaml
id: IA-20260830-001
created_at: 2026-08-30T00:00:00Z
author: ChatGPT
role: IA
category: idea
status: proposed
module: ALFA OS / Vigilancia Operativa
summary: El vigia debe detectar riesgo operativo antes de que el proyecto se descontrole.
owner: por definir
execution_status: pending
history:
  - 2026-08-30 | ChatGPT | created
  - 2026-08-30 | [persona o IA] | reviewed
```

### Reglas

1. Todo registro debe incluir `id`, `created_at`, `author`, `status` y `history`.
2. Todo cambio debe quedar registrado en `history`.
3. La ejecución debe indicar `owner` y `execution_status`.
4. Si una idea se descarta, debe incluir `discard_reason`.
5. Si se modifica, debe conservar el historial previo.
6. Si se acepta, debe pasar a `accepted` o `in_progress`.
7. El contenido debe estar en formato legible para IA y humanos.

## Estructura sugerida

```text
ia-cowork/
  README.md
  ideas/
    idea-IA-20260830-001.md
  decisions/
    decision-IA-20260830-001.md
  roadmap/
    roadmap-automatizacion.md
  audit/
    historial-ideas.md
```

## Enfoque recomendado para ALFA OS

El vigia no debe ser un chatbot aislado. Debe funcionar como sistema de vigilancia del negocio:

- detectar riesgo operativo
- avisar antes de las crisis
- sugerir acciones concretas
- registrar decisiones humanas
- automatizar tareas repetitivas con supervisión

## Registro de ejemplo

```yaml
id: IA-20260830-001
created_at: 2026-08-30T00:00:00Z
author: ChatGPT
role: IA
category: idea
status: proposed
module: ALFA OS / Operación
summary: Crear El vigia como observador operacional inteligente.
owner: por definir
execution_status: pending
history:
  - 2026-08-30 | ChatGPT | created
```

## Recomendación práctica

Usa este directorio como una memoria compartida de IA y operación. Aquí se deben guardar:

- ideas
- observaciones
- propuestas
- roadmaps
- ejecuciones
- descartes
- decisiones finales

Esto permite que todas las IAs y humanos trabajen con la misma trazabilidad y sin perder contexto.
