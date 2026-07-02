# Modulo: Portal Cliente

Contexto para agentes que modifiquen vistas cliente, acceso a proyectos, servicios o documentos publicos.

## Que Hace

Permite a usuarios cliente consultar informacion autorizada de sus proyectos, servicios y documentos. Debe mantenerse separado de ALFA OS interno.

Estado inferido: activo y critico por exposicion de datos.

## Rutas Principales

- `app/portal/page.tsx`
- `app/portal/projects/[id]/page.tsx`
- `app/portal/services/[id]/page.tsx`
- `app/(client)/dashboard/projects/[id]/page.tsx`
- `app/public/documents/[token]/page.tsx`
- `app/public/documents/[token]/quote/page.tsx`
- `app/public/documents/[token]/file/route.ts`
- `app/public/documents/[token]/pdf/route.ts`
- `app/public/documents/[token]/xml/route.ts`
- `app/(admin)/clients/[id]/portal-users/page.tsx`
- `app/(admin)/clients/[id]/portal-users/actions.ts`

## Archivos Clave

- `proxy.ts`
- `services/profile.ts`
- `lib/permissions.ts`
- `lib/apiAuth.ts`
- `lib/clientPortal.ts`
- `lib/publicDocumentLinks.ts`
- `lib/publicDocuments.ts`
- `PRUEBA_MANUAL_SEPARACION_PORTAL_CLIENTE.md`

## Base De Datos / SQL Detectado

Migraciones relevantes detectadas:

- `sql/20260604_client_portal_v2_access.sql`
- `sql/20260604_client_portal_hardening.sql`
- `sql/20260604_client_portal_visible_documents.sql`
- `sql/20260604_separate_internal_and_client_portal_users.sql`
- `sql/20260614_public_document_links_security.sql`

Tablas inferidas por nombres de migraciones/codigo:

- usuarios de portal cliente: Pendiente de confirmar nombre exacto.
- accesos cliente-proyecto: Pendiente de confirmar nombre exacto.
- documentos visibles/publicos: Pendiente de confirmar nombre exacto.
- enlaces publicos por token: Pendiente de confirmar nombre exacto.

## Flujos Principales

- Login de usuario cliente.
- Redireccion de usuarios cliente a `/portal`.
- Consulta de proyectos autorizados.
- Consulta de servicios autorizados.
- Descarga o visualizacion de documentos por token publico.
- Administracion interna de usuarios portal desde cliente.

## Reglas Criticas

- Usuarios cliente no deben entrar a rutas internas.
- Usuarios internos no deben depender de permisos de cliente.
- Toda API de portal debe validar acceso al recurso solicitado.
- Rutas por token deben limitar alcance al documento autorizado.
- No usar solo filtros de UI como control de seguridad.

## Riesgos

- Exposicion cruzada de datos entre clientes.
- Exposicion de documentos fiscales, cotizaciones, PDF o XML.
- Tokens publicos sin expiracion o alcance insuficiente.
- Cambios en `proxy.ts` pueden afectar todo el acceso interno y cliente.

## Validacion Minima Recomendada

- Usuario cliente ve solo sus proyectos.
- Usuario cliente no accede a rutas internas.
- Usuario interno entra a rutas internas normalmente.
- Documento publico por token sirve solo el archivo esperado.
- Probar casos sin sesion, cliente sin acceso y token invalido.
- Revisar `PRUEBA_MANUAL_SEPARACION_PORTAL_CLIENTE.md`.

## Documentos Relacionados

- [`../../ai/SECURITY_RULES.md`](../../ai/SECURITY_RULES.md)
- [`../../../PRUEBA_MANUAL_SEPARACION_PORTAL_CLIENTE.md`](../../../PRUEBA_MANUAL_SEPARACION_PORTAL_CLIENTE.md)
