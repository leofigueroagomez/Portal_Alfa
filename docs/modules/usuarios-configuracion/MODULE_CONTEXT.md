# Modulo: Usuarios/Configuracion

Contexto operativo para agentes que modifiquen usuarios internos, roles, acceso de Portal Cliente, login, proteccion de rutas o hubs de configuracion. Antes de tocar auth, SQL, RLS, Supabase Auth Admin, service role o visibilidad cliente/admin, revisar [`../../ai/SECURITY_RULES.md`](../../ai/SECURITY_RULES.md).

Estado inferido: activo y critico por controlar acceso interno, separacion de usuarios cliente, roles, sesiones y rutas administrativas.

## Que Hace

Administra usuarios internos de ALFA OS, perfiles en `profiles`, roles internos, activacion/desactivacion, acceso de usuarios de Portal Cliente por cliente/proyecto y enlaces de configuracion general.

El modulo no es solo UI: depende de Supabase Auth, `profiles`, RLS, `proxy.ts`, helpers server-side y rutas que usan service role. Cualquier cambio puede permitir acceso indebido a datos internos o bloquear usuarios legitimos.

## Mapa Por Flujo

| Flujo | Archivos confirmados | Responsabilidad |
| --- | --- | --- |
| Login general | `app/login/page.tsx`, `services/supabase.ts`, `services/profile.ts` | Autentica con Supabase Auth, ejecuta `ensure_current_user_profile` y redirige a `/portal` o `/dashboard` segun `user_type`/`is_internal`. |
| Recuperacion de contrasena | `app/login/page.tsx`, `app/auth/reset-password/page.tsx` | Envia reset con Supabase Auth hacia `/auth/reset-password`. Pendiente de confirmar detalle del form de reset. |
| Aceptar invitacion Portal Cliente | `app/auth/accept-invite/page.tsx` | Lee tokens de invitacion del hash, crea sesion, actualiza password y redirige a `/portal`. |
| Proteccion de rutas internas | `proxy.ts` | Protege rutas internas y `/portal`; usuarios cliente o no internos no entran a ALFA OS interno. |
| Proteccion de Portal Cliente | `proxy.ts`, `lib/clientPortal.ts`, `lib/apiAuth.ts` | Requiere sesion y valida usuario portal/proyecto para rutas y APIs sensibles. |
| Perfil actual | `services/profile.ts` | Obtiene usuario Supabase, llama `ensure_current_user_profile` y normaliza rol, `user_type`, `is_internal`, `is_active`. |
| Roles y permisos | `lib/permissions.ts` | Define roles internos, `client`, normalizacion legacy y permisos compartidos por modulo. |
| Guards API | `lib/apiAuth.ts`, `lib/adminUsers.ts` | Centraliza respuestas 401/403 y permisos por rol; `requireAdminProfile` es el guard de usuarios admin. |
| Listar usuarios internos | `app/(admin)/users/page.tsx`, `app/(admin)/users/UsersAdminClient.tsx`, `app/api/admin/users/route.ts`, `lib/adminUsers.ts` | Solo `admin`; lista Auth users con service role y filtra perfiles internos. |
| Crear usuario interno | `app/(admin)/users/UsersAdminClient.tsx`, `app/api/admin/users/route.ts` | Solo `admin`; crea usuario en Supabase Auth con password temporal y upsert en `profiles`. |
| Editar usuario interno | `app/(admin)/users/[id]/page.tsx`, `UserDetailClient.tsx`, `UserProfileForm.tsx`, `app/api/admin/users/[id]/route.ts` | Solo `admin`; edita `full_name`, `role`, `is_active`; bloquea desactivarse a si mismo. |
| Desactivar usuario interno | `UsersAdminClient.tsx`, `app/api/admin/users/[id]/route.ts` | Solo `admin`; marca `profiles.is_active = false`; no borra Auth user. |
| Crear usuario Portal Cliente | `app/(admin)/clients/[id]/portal-users/page.tsx`, `actions.ts` | Solo `admin`; invita o reutiliza Auth user, fuerza perfil `client`, crea `client_portal_users` y accesos a proyectos validados por cliente. |
| Reenviar invitacion Portal Cliente | `app/(admin)/clients/[id]/portal-users/actions.ts` | Solo `admin`; llama `inviteUserByEmail`, actualiza `invited_at`, `invitation_status`, `invitation_error`. |
| Activar/revocar proyectos visibles | `app/(admin)/clients/[id]/portal-users/actions.ts` | Solo `admin`; valida que `client_projects.id` pertenezca al cliente antes de upsert/revocar `client_portal_project_access`. |
| Desactivar usuario Portal Cliente | `app/(admin)/clients/[id]/portal-users/actions.ts` | Solo `admin`; desactiva `client_portal_users` y todos sus accesos a proyectos. |
| Hub de configuracion | `app/(admin)/settings/page.tsx`, `components/AdminShell.tsx` | Enlaza usuarios, notificaciones, categorias, tags, aliados y operaciones del sistema; visibilidad en shell depende de `canManageUsers`. |
| Operaciones del sistema | `app/(admin)/admin/operations/page.tsx`, `RegenerateOperationalBaseButton.tsx` | Herramienta manual de mantenimiento para regenerar base operativa de proyectos aprobados/ganados. Riesgo operativo alto. |

Pendiente de confirmar: si existe flujo de invitacion para usuarios internos; el codigo revisado crea usuarios internos con password temporal, no con invitacion.

## Responsabilidad De Archivos Clave

| Archivo | Responsabilidad | Cuando modificar | Riesgos |
| --- | --- | --- | --- |
| `proxy.ts` | Protege rutas internas y `/portal`; decide redirecciones por sesion y perfil. | Nuevas rutas protegidas, cambios de separacion cliente/admin, host de portal. | Critico: puede permitir clientes en admin o bloquear todo ALFA OS. |
| `services/profile.ts` | Fuente server-side de perfil actual y perfil interno. | Cambios de columnas de `profiles`, roles, `user_type`, `is_internal`. | Critico: usado por permisos, paginas y APIs. |
| `lib/permissions.ts` | Lista roles internos y helpers de permisos. | Nuevos roles o cambios de matriz de permisos. | Critico: un cambio afecta cotizaciones, facturacion, servicios, compras, usuarios y shell. |
| `lib/apiAuth.ts` | Guards server/API para roles financieros, servicios, work orders, portal y proyecto. | Nuevas APIs sensibles o cambios de permisos por dominio. | Alto: no duplicar permisos fuera de helpers si ya existe guard. |
| `lib/adminUsers.ts` | Guard `requireAdminProfile`, lectura de Auth users con service role y payload seguro para UI. | Cambios de administracion de usuarios internos. | Critico: usa `SUPABASE_SERVICE_ROLE_KEY`; no exponer datos Auth a clientes. |
| `app/api/admin/users/route.ts` | GET/POST de usuarios internos. | Crear/listar usuarios internos o cambiar validaciones. | Critico: usa Auth Admin `listUsers`/`createUser`; solo admin. |
| `app/api/admin/users/[id]/route.ts` | PATCH/DELETE logico de perfil interno. | Editar rol, nombre, estado. | Critico: prevenir autodesactivacion y roles invalidos. |
| `app/(admin)/users/page.tsx` | Gate server de `/users`; monta cliente admin. | Cambios de autorizacion o layout de usuarios. | Alto: debe mantenerse solo `admin`. |
| `app/(admin)/users/UsersAdminClient.tsx` | UI de listado, creacion y desactivacion de usuarios internos. | Cambios de formulario o acciones UI. | Medio: validacion real debe seguir server-side. |
| `app/(admin)/users/UserProfileForm.tsx` | Form de edicion de perfil interno. | Cambios de campos editables o roles. | Alto: no permitir editar campos que rompan separacion cliente/admin sin server guard. |
| `app/(admin)/clients/[id]/portal-users/page.tsx` | UI admin para usuarios portal de un cliente y proyectos visibles. | Cambios de visibilidad portal o datos mostrados. | Critico: debe listar solo usuarios/proyectos del cliente. |
| `app/(admin)/clients/[id]/portal-users/actions.ts` | Server actions de invitacion, perfil cliente y accesos por proyecto. | Cambios de invitaciones, conversion de usuarios o acceso portal. | Critico: usa service role/Auth Admin; valida no convertir usuarios internos por accidente. |
| `app/login/page.tsx` | Login, recuperacion y redireccion inicial. | Cambios de auth UX o destino post-login. | Alto: no confiar solo en redireccion cliente; `proxy.ts` sigue siendo autoridad. |
| `app/auth/accept-invite/page.tsx` | Activacion de invitaciones portal. | Cambios de activacion de cuenta o contrasena. | Alto: no aceptar enlaces sin `type=invite` y tokens validos. |
| `components/AdminShell.tsx` | Navegacion, logout y visibilidad de enlaces de configuracion. | Nuevos modulos o enlaces restringidos. | Alto: visibilidad UI no reemplaza autorizacion server/API. |
| `app/(admin)/settings/page.tsx` | Hub de accesos administrativos. | Agregar/quitar enlaces de configuracion. | Medio: cada destino debe tener su propio guard. |
| `app/(admin)/admin/operations/RegenerateOperationalBaseButton.tsx` | Accion manual de mantenimiento operativo. | Cambios de herramientas administrativas. | Alto: accion cliente llama sync directo; validar RLS/permisos antes de ampliar. |

## Contratos De Datos Confirmados

Esta seccion se basa en migraciones SQL y queries revisadas. Si se requiere esquema completo, consultar SQL y Supabase antes de editar.

### `profiles`

Confirmado por `sql/20260529_profiles_roles_v2.sql`, `sql/20260604_separate_internal_and_client_portal_users.sql`, `sql/20260615_critical_rls_hardening.sql` y codigo:

- `id uuid primary key references auth.users(id) on delete cascade`
- `email`
- `full_name`
- `role`
- `is_active`
- `created_at`
- `updated_at`
- `user_type`
- `is_internal`

Roles confirmados:

- Internos: `admin`, `direccion`, `comercial`, `ingenieria`, `project_manager`, `instalador`, `compras`, `finanzas`.
- Portal: `client`.
- Legacy normalizado en codigo: `sales -> comercial`, `engineering -> ingenieria`.

Tipos confirmados:

- `user_type` en `internal`, `client_portal`.
- Usuario portal debe tener `role = 'client'`, `user_type = 'client_portal'`, `is_internal = false`, `is_active = true`.
- Usuario interno debe tener rol interno, `user_type = 'internal'`, `is_internal = true`.

Funciones confirmadas:

- `ensure_current_user_profile()`
- `current_profile_role()`
- `is_internal_user()`
- `has_internal_role(text[])`
- `has_project_portal_access(bigint)`

RLS confirmada en hardening:

- Select de perfil propio o perfiles internos cuando el usuario actual es interno.
- Insert bootstrap propio para usuario interno `comercial` o portal `client`.
- Update/delete de perfiles por roles `admin` o `direccion` a nivel RLS.

Nota importante: la UI/API de usuarios internos usa `canManageUsers`, que solo permite `admin`; RLS permite tambien `direccion` para update/delete de `profiles`. No asumir equivalencia entre RLS y permisos de producto.

### Supabase Auth users

Confirmado por codigo:

- Usuarios internos se crean con `admin.auth.admin.createUser`, `email_confirm: true`, password temporal y metadata `full_name`.
- Usuarios portal se invitan con `admin.auth.admin.inviteUserByEmail` y metadata `portal: client`, `role: client`, `user_type: client_portal`, `is_internal: false`.
- `lib/adminUsers.ts` lista Auth users con `admin.auth.admin.listUsers({ page: 1, perPage: 1000 })`.
- Desactivar usuario interno solo actualiza `profiles.is_active = false`; no borra ni deshabilita directamente el Auth user.

Pendiente de confirmar: politica operativa para rotar password temporal, deshabilitar Auth user en Supabase y auditoria de cambios de usuario.

### `client_portal_users`

Confirmado por `sql/20260604_client_portal_v2_access.sql` y acciones de portal:

- `id bigserial primary key`
- `user_id uuid references auth.users(id) on delete cascade`
- `client_id bigint references public.clients(id) on delete cascade`
- `is_active boolean default true`
- `invited_at`
- `invitation_status`
- `invitation_error`
- `created_at`
- `updated_at`
- unique `(user_id, client_id)`

Indices confirmados:

- `client_portal_users_user_id_idx`
- `client_portal_users_client_id_idx`

RLS confirmada:

- Select propio por `user_id = auth.uid()`.

Uso confirmado:

- Admin gestiona con service role desde `app/(admin)/clients/[id]/portal-users/actions.ts`.
- Portal lee contexto desde `lib/clientPortal.ts` y `lib/apiAuth.ts`.

### `client_portal_project_access`

Confirmado por `sql/20260604_client_portal_v2_access.sql`:

- `id bigserial primary key`
- `client_portal_user_id bigint references public.client_portal_users(id) on delete cascade`
- `client_project_id bigint references public.client_projects(id) on delete cascade`
- `is_active boolean default true`
- `created_at`
- `updated_at`
- unique `(client_portal_user_id, client_project_id)`

Indices confirmados:

- `client_portal_project_access_user_idx`
- `client_portal_project_access_project_idx`

RLS confirmada:

- Select propio cuando el `client_portal_user` corresponde a `auth.uid()` y esta activo.

Uso confirmado:

- Admin valida que cada `client_project_id` pertenezca al `client_id` antes de asignarlo.
- Portal valida acceso activo por proyecto antes de mostrar datos.

### Configuracion general

Confirmado por codigo:

- `app/(admin)/settings/page.tsx` es un hub de enlaces, no una tabla de configuracion persistida.
- Enlaces confirmados: `/users`, `/notifications/recipients`, `/product-categories`, `/product-tags`, `/commercial-partners`, `/admin/operations`.

Pendiente de confirmar: si existe una tabla de configuracion global fuera de este hub; no se encontro una tabla unica de settings en la revision dirigida.

### Notificaciones, catalogos y aliados desde configuracion

Confirmado como rutas enlazadas desde settings/AdminShell:

- Notificaciones: `app/(admin)/notifications/recipients/`, `lib/notifications.ts`.
- Categorias/tags: `app/(admin)/product-categories/page.tsx`, `app/(admin)/product-tags/page.tsx`.
- Aliados comerciales: `app/(admin)/commercial-partners/page.tsx`, `lib/commercialPartners.ts`.

Pendiente de confirmar: contratos de datos completos de esos submodulos; deben documentarse en sus modulos propios si se modifican.

## Reglas De Seguridad Y Acceso

- `/users`, `/settings` y `/admin/operations` estan en `internalRoutes` de `proxy.ts`.
- `proxy.ts` debe incluir cualquier nueva ruta administrativa que no cuelgue de una ruta ya protegida.
- Usuario con `role = client`, `user_type = client_portal` o `is_internal = false` no debe acceder a rutas internas.
- `getCurrentInternalUserProfile()` exige perfil activo, interno y rol interno.
- `canManageUsers(role)` solo devuelve true para `admin`.
- La visibilidad de enlaces en `AdminShell.tsx` y `settings/page.tsx` no es autorizacion suficiente; cada pagina/API debe validar server-side.
- APIs de usuarios internos deben pasar por `requireAdminProfile()`.
- Flujos de Portal Cliente deben validar que el proyecto pertenece al cliente antes de insertar `client_portal_project_access`.
- No convertir un usuario interno existente a portal cliente salvo flujo explicito revisado; el codigo actual bloquea esa conversion si no viene de invitacion nueva.
- No exponer `SUPABASE_SERVICE_ROLE_KEY`, respuestas completas de Auth Admin ni metadata sensible al cliente.
- No relajar RLS ni publicar buckets para resolver errores de acceso.
- Cambios de SQL/RLS/Auth deben tener sandbox, respaldo, pruebas manuales de admin y cliente, y rollback.

## Archivos Que Suelen Cambiar Juntos

- Cambios de roles/permisos: `lib/permissions.ts`, `components/AdminShell.tsx`, `services/profile.ts`, rutas afectadas, SQL de `profiles_role_check`.
- Cambios de separacion cliente/admin: `proxy.ts`, `services/profile.ts`, `lib/apiAuth.ts`, `sql/20260604_separate_internal_and_client_portal_users.sql`, `sql/20260615_critical_rls_hardening.sql`, Portal Cliente.
- Cambios de usuarios internos: `app/(admin)/users/**`, `app/api/admin/users/**`, `lib/adminUsers.ts`, `profiles`.
- Cambios de usuarios Portal Cliente: `app/(admin)/clients/[id]/portal-users/**`, `lib/clientPortal.ts`, `lib/apiAuth.ts`, `client_portal_users`, `client_portal_project_access`, `profiles`.
- Cambios de login/invitacion: `app/login/page.tsx`, `app/auth/accept-invite/page.tsx`, `app/auth/reset-password/page.tsx`, `services/profile.ts`, SQL de `ensure_current_user_profile`.
- Cambios de configuracion/hub: `app/(admin)/settings/page.tsx`, `components/AdminShell.tsx`, rutas destino.
- Cambios de operaciones admin: `app/(admin)/admin/operations/**`, `lib/projectOperationalItems.ts`, permisos/RLS de tablas operativas.

## Validacion Especifica

- Login:
  - usuario interno activo entra y termina en `/dashboard`;
  - usuario portal activo entra y termina en `/portal`;
  - usuario sin sesion en ruta protegida redirige a `/login`;
  - usuario inactivo no debe operar rutas internas.
- Separacion cliente/admin:
  - usuario portal no accede a `/users`, `/settings`, `/clients`, `/projects`, `/quotes`, `/invoices` ni otras rutas internas;
  - usuario interno no debe poder usar rutas portal como cliente si no tiene acceso portal.
- Usuarios internos:
  - solo `admin` ve `/users`;
  - crear usuario con email valido y password minimo 8 caracteres;
  - rol invalido devuelve 400;
  - editar `full_name`, `role`, `is_active`;
  - autodesactivacion bloqueada en UI y API;
  - desactivar marca `profiles.is_active = false` sin borrar Auth user.
- Portal Cliente:
  - crear usuario portal nuevo envia invitacion y crea perfil `client_portal`;
  - correo de usuario interno existente no se convierte a portal sin validacion;
  - proyectos asignables pertenecen al cliente;
  - revocar/desactivar quita acceso efectivo al proyecto;
  - usuario portal desactivado no ve proyectos.
- Rutas/API:
  - `/api/admin/users` devuelve 401/403 para no admin;
  - `/api/admin/users/[id]` devuelve 401/403 para no admin;
  - APIs nuevas usan `requireInternalUser`, `requireAdminProfile` o guard especifico de `lib/apiAuth.ts`.
- SQL/RLS:
  - si se agregan columnas/tablas usadas por PostgREST, migracion con `notify pgrst, 'reload schema';`;
  - validar `profiles_role_check`, `profiles_user_type_check` y policies antes de aplicar;
  - revisar separacion con usuario interno y usuario portal reales.
- Configuracion:
  - cada link nuevo en `/settings` y `AdminShell` apunta a ruta existente;
  - cada destino tiene guard propio;
  - no mostrar herramientas de mantenimiento a roles no admin.

## Riesgos

- Escalada de privilegios si se agrega un rol en UI sin actualizar SQL, permisos y RLS.
- Exposicion de ALFA OS a clientes si `proxy.ts`, `profiles.is_internal` o `user_type` se relajan.
- Bloqueo masivo de usuarios si `ensure_current_user_profile` o `current_profile_role` cambian mal.
- Desalineacion entre permisos de producto (`canManageUsers` solo `admin`) y RLS (`admin`, `direccion` para update/delete de `profiles`).
- Uso de service role en rutas de usuarios y portal: requiere validaciones estrictas antes de leer/mutar.
- Conversion accidental de usuario interno a portal cliente.
- `listUsers({ perPage: 1000 })` puede quedar corto si crece la base de usuarios.
- `app/(admin)/admin/operations/RegenerateOperationalBaseButton.tsx` ejecuta una accion operativa desde cliente; antes de ampliarla, revisar RLS y mover validaciones al servidor si aplica.
- Links de configuracion pueden crear falsa seguridad si solo se ocultan en UI.
- Cambios de login pueden romper tanto ALFA OS interno como Portal Cliente.

## Pendientes De Confirmar

- Flujo exacto y validaciones de `app/auth/reset-password/page.tsx`.
- Politica operativa para usuarios internos: invitacion vs password temporal, rotacion, deshabilitar Auth user y auditoria.
- Si existe tabla global de configuracion persistida fuera del hub `/settings`.
- Contratos completos de notificaciones, catalogos de producto y aliados comerciales.
- RLS real en produccion para `profiles`, `client_portal_users` y `client_portal_project_access`.
- Si `RegenerateOperationalBaseButton` debe migrarse a una API/server action con guard admin explicito.
- Si hace falta paginacion real para `admin.auth.admin.listUsers` cuando haya mas de 1000 usuarios.

## Documentos Relacionados

- [`../../ai/AI_CONTEXT.md`](../../ai/AI_CONTEXT.md)
- [`../../ai/PROJECT_MAP.md`](../../ai/PROJECT_MAP.md)
- [`../../ai/MODULE_INDEX.md`](../../ai/MODULE_INDEX.md)
- [`../../ai/SECURITY_RULES.md`](../../ai/SECURITY_RULES.md)
- [`../portal-cliente/MODULE_CONTEXT.md`](../portal-cliente/MODULE_CONTEXT.md)
- [`../proyectos/MODULE_CONTEXT.md`](../proyectos/MODULE_CONTEXT.md)
- [`../servicios-postventa/MODULE_CONTEXT.md`](../servicios-postventa/MODULE_CONTEXT.md)
