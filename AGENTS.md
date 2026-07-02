# AGENTS.md

Punto de entrada obligatorio para agentes de IA que trabajen en ALFA OS / Portal_Alfa.

## Lectura Obligatoria

Antes de tocar codigo, leer en este orden:

1. `AGENTS.md`
2. `docs/ai/AI_CONTEXT.md`
3. `docs/ai/PROJECT_MAP.md`
4. `docs/ai/MODULE_INDEX.md`
5. `docs/ai/SECURITY_RULES.md`
6. El documento del modulo afectado en `docs/modules/**/MODULE_CONTEXT.md`

Si la tarea toca Next.js, leer primero la guia relevante en `node_modules/next/dist/docs/`.

## Flujo Minimo de Trabajo

1. Revisar rutas, archivos y tablas reales antes de editar.
2. Buscar primero literales proporcionados por el usuario con `rg`.
3. Mantener cambios pequenos, revisables y alineados con patrones existentes.
4. No modificar logica funcional fuera del alcance solicitado.
5. Validar con comandos proporcionales al cambio.
6. Reportar archivos cambiados, validaciones ejecutadas y riesgos pendientes.

## Restricciones Criticas

- No tocar produccion sin sandbox, pruebas y plan de rollback.
- No ejecutar migraciones, cambios de RLS, storage policies, credenciales, Facturama o datos productivos sin confirmar entorno y respaldo.
- No relajar autenticacion, roles, RLS ni separacion cliente/admin para resolver errores.
- No revertir cambios ajenos del worktree.
- No borrar documentacion existente; integrar o enlazar cuando aplique.
- Si algo no esta confirmado por el repo, documentarlo como `Pendiente de confirmar`.

## Actualizacion de Documentacion

Actualizar esta documentacion cuando un cambio modifique:

- rutas principales;
- modulos o responsabilidades;
- reglas de seguridad, auth, roles, RLS o storage;
- estructura de base de datos;
- flujos criticos de cotizaciones, facturacion o portal cliente;
- comandos de validacion o despliegue.

## Validaciones Base

Para cambios de codigo, preferir:

- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`
- lint dirigido cuando aplique

Para cambios solo de documentacion, al menos revisar enlaces/rutas mencionadas y ejecutar `git diff --check`.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:alfa-design-system -->
# ALFA Design System v1

All ALFA interfaces must follow the same visual philosophy across the public landing page, ALFA OS, ERP, CRM, client portal, PDFs, and administrative dashboards.

Primary references: Apple, Porsche, Bang & Olufsen, McIntosh, Lutron, Bowers & Wilkins, Sonos, Notion, and Linear.

Principles:

1. Fewer elements, more clarity.
2. Generous whitespace.
3. Large, elegant typography.
4. Real photography over illustrations.
5. Invisible technology: show outcomes and experiences before equipment.
6. Clean interfaces: avoid excessive tables, borders, and boxes.
7. Corporate colors: black, white, and ALFA burgundy.
8. Visual alternation: avoid multiple consecutive black sections.
9. Subtle animations only; nothing loud or aggressive.
10. Overall feeling: "High End Services", not "technology installation company".

Before implementing any new screen or section, check that the work respects this system.
<!-- END:alfa-design-system -->
