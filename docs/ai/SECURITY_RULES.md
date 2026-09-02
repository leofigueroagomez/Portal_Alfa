# Security Rules

Reglas criticas para agentes. No debilitar seguridad para resolver errores de producto.

## Auditoria de seguridad 2026-09-01 (Supabase + rutas API)

Hallazgos y correcciones de una revision completa de RLS/grants en Supabase y de
autorizacion en `app/api/**`. Ver [[project_security_audit_20260901]] en memoria.
Patrones a repetir/vigilar en cambios futuros:

- **Una policy RLS para el rol `public` es casi siempre un bug.** `public` en
  Postgres incluye `anon` (cualquiera en internet, sin login). Se encontraron y
  cerraron policies `public`/`true` (o con `qual` que no verifica nada, como
  `columna IS NOT NULL`) en `project_contracts` (RFC, CURP, INE, firmas —
  critico), `suppliers` (RFC, credito) y `project_members`. Antes de escribir
  `to public` o `to anon` en una policy, confirmar que el dato es realmente
  publico (como `quotable_systems`, catalogo sin PII, si es correcto).
- **Un `qual` de policy debe comparar contra algo que el llamante demuestre
  poseer**, no solo verificar que la columna no sea null. Un flujo "acceso por
  token" (onboarding, firma) se protege dejando la tabla sin policy publica y
  haciendo el match exacto de token en un server action/route con
  `createSupabaseAdminClient()` (service_role, bypasa RLS) — nunca confiando en
  que PostgREST valide el token del cliente.
- **Vista con `SECURITY DEFINER` + grant a `anon`/`authenticated` = bypass total
  de RLS.** Se encontraron 22 vistas `vigia_v_*` con grants completos
  (`SELECT/INSERT/UPDATE/DELETE`) al rol `anon`, exponiendo reportes financieros
  y de pipeline de ventas sin login. Toda vista nueva sobre datos de negocio
  debe revisar sus grants explícitamente (`revoke all ... ; grant select to
  authenticated;`) — no asumir que hereda el RLS de las tablas base.
- **Cada API route bajo `app/api/[algo]/[id]/...` necesita dos checks, no uno:**
  ¿esta autenticado? y ¿tiene permiso sobre ESTE `id`? (`requireInternalUser()`
  para rutas de staff, o `requireFiscalProjectAccessForProfile`/
  `requirePortalProjectAccessForProfile` para rutas que un cliente/contratista
  puede tocar). Se encontro y corrigio `app/api/contracts/[id]/pdf` que solo
  verificaba sesion, sin rol — cualquier usuario logueado (incluido portal
  cliente) podia pedir el contrato de cualquier otro `id`.
- **Todo webhook externo debe verificar firma con fail-closed**, nunca un
  fallback que confie en el body si falta la firma/secreto. Se encontro y
  corrigio `app/api/webhooks/stripe` con un fallback `JSON.parse(rawBody)` sin
  verificar cuando faltaba el header `stripe-signature` — permitia falsificar
  eventos de pago (marcar servicios como pagados sin pagar).
- **Pendiente de confirmar por Leo (no verificable via SQL/MCP):** que el
  signup publico de email este deshabilitado en el Dashboard de Supabase
  (Authentication → Sign In / Providers). `handle_new_user_profile()` y
  `ensure_current_user_profile()` asignan `is_internal = true, role =
  'comercial'` por default a cualquier usuario nuevo cuyo `user_metadata` no
  lo marque como `client_portal` — fail-open. Ningun flujo de la app crea
  usuarios asi (todos usan `service_role` + rol explicito), pero si el signup
  publico de GoTrue esta habilitado, es una escalada de privilegios directa.
  Corregir esto requiere tambien tocar `app/api/admin/users/route.ts` (que hoy
  depende de ese default para dejar `is_internal=true` en altas de staff) —
  no cambiar sin revisar ambos lados a la vez.

## Autenticacion

- La proteccion de rutas vive principalmente en `proxy.ts`.
- Rutas internas protegidas detectadas: `/admin`, `/dashboard`, `/leads`, `/customers`, `/clients`, `/projects`, `/post-sale`, `/contractors`, `/services`, `/invoices`, `/products`, `/quotes`, `/engineering`, `/engineering-quotes`, `/users`, `/settings`, `/notifications`, `/product-categories`, `/product-tags`.
- El portal cliente vive bajo `/portal` y debe mantenerse separado de rutas internas.
- `proxy.ts` usa Supabase SSR y claims para decidir redirecciones.

## Roles Y Permisos

- Roles y helpers centrales: `lib/permissions.ts`.
- Perfil actual e identificacion interno/cliente: `services/profile.ts`.
- Guards server-side para API: `lib/apiAuth.ts`.
- No duplicar reglas de permisos en pantallas si ya existe helper compartido.
- No convertir usuarios cliente en internos ni al reves por workaround.

Roles detectados en codigo:

- `admin`
- `direccion`
- `comercial`
- `ingenieria`
- `project_manager`
- `instalador`
- `compras`
- `finanzas`
- `client`

## Supabase Y RLS

- SQL versionado vive en `sql/`.
- Cambios de tablas, columnas, indices, triggers o RLS deben ir en migracion revisable.
- Reutilizar patrones RLS existentes de tablas similares.
- Incluir recarga de schema cache cuando una migracion cambie estructura usada por PostgREST.
- No inventar policies si existe patron equivalente en el modulo.

Pendiente de confirmar: listado completo y actualizado de policies aplicadas en produccion.

### Tablas de respaldo (`bkp_*`)

- Toda tabla `bkp_*` creada durante una reparacion de datos (ver `sql/20260830_merge_orphan_purchase_lines.sql`) debe llevar `ENABLE ROW LEVEL SECURITY` sin policies en el mismo momento en que se crea. Sin RLS, PostgREST la expone publicamente (lectura/escritura/borrado con el `anon` key) al schema `public` — asi se detecto y corrigio para `bkp_20260830_*` (2026-09-01, alertado por el linter de seguridad de Supabase).
- Estas tablas no las consulta la app; RLS activo sin policy las deja en deny-by-default, que es el estado correcto (no requieren policies de lectura).
- Correr `get_advisors(type: security)` despues de crear cualquier tabla de respaldo o dejar una migracion sin terminar.

### El Vigia

- Tablas `vigia_sensor_runs`, `vigia_findings`, `vigia_audit_log`: RLS activo, unica policy `select` para `authenticated`. La escritura la hace el runner con service_role. No abrir estas tablas a escritura por RLS.
- Endpoint `app/api/vigia/cron/daily`: auth por `CRON_SECRET` (header Bearer que Vercel manda solo, o `?key=`). No quitar el candado. El endpoint corre sensores de solo lectura y puede enviar correo (Resend), asi que su ejecucion es un cambio que envia correos.
- Los sensores (`lib/vigia/sensors.ts`) son solo lectura sobre tablas de negocio. Nunca escribir desde un sensor.
- Ejecutores de 1 clic (`lib/vigia/executors.ts`, `app/(admin)/vigia/execute-actions.ts`): server actions con gate de rol `admin`/`direccion`. Cada uno guarda snapshot en `vigia_action_backups` antes de tocar nada y tiene `revert()`. Si hay cualquier duda, `canApply()` se niega.
- Investigar a fondo (`lib/vigia/investigate/*`): los playbooks son solo lectura; la unica llamada a un modelo (Claude, via `ANTHROPIC_API_KEY`) solo interpreta el expediente y **propone** — nunca escribe en la base. Server action con gate de rol `admin`/`direccion`. Tope de costo mensual (`VIGIA_INVESTIGATE_MONTHLY_CAP_USD`). No enviar el contenido de `vigia_*` ni de las tablas de negocio a ningun otro servicio; el unico destino externo es la API de Anthropic para la interpretacion y Resend para el correo.
- Tablas `vigia_action_backups` y `vigia_investigations`: RLS activo, `select` para `authenticated`. No abrir a escritura.

## Storage

- El repo usa Supabase Storage en flujos de imagenes/documentos.
- Mantener privados los buckets privados; usar URLs firmadas o helpers existentes.
- No cambiar buckets a publicos para resolver renderizado de PDF o preview.
- Validar expiracion y acceso de URLs firmadas en servidor cuando aplique.

Pendiente de confirmar: inventario completo de buckets y policies productivas.

## Portal Cliente

- El portal cliente no debe poder acceder a rutas internas.
- Las API que exponen proyectos, servicios, PDF, XML o archivos deben validar pertenencia/acceso.
- Revisar `lib/apiAuth.ts`, `lib/clientPortal.ts` y `PRUEBA_MANUAL_SEPARACION_PORTAL_CLIENTE.md` antes de tocar portal.
- Rutas publicas por token deben mantener expiracion, alcance minimo y registro de acceso si el flujo existente lo usa.

## Cambios Que Requieren Sandbox

- Migraciones SQL.
- RLS y storage policies.
- Facturama, CFDI, complementos de pago y credenciales fiscales.
- Auth, roles, proxy, middleware y guards API.
- Rutas publicas de documentos por token.
- Cambios que envian correos, generan documentos fiscales o mutan datos productivos.

## Cambios Que No Deben Hacerse Directo En Produccion

- Timbrar CFDI de prueba con credenciales productivas.
- Cambiar `FACTURAMA_ENV`, `FACTURAMA_ENABLE_PRODUCTION` o variables equivalentes sin confirmacion explicita.
- Borrar datos productivos sin SQL revisado, respaldo y confirmacion.
- Relajar RLS/policies para desbloquear UI.
- Publicar buckets privados.

## Referencias

- [`PROJECT_MAP.md`](./PROJECT_MAP.md)
- [`../SETUP_SANDBOX.md`](../SETUP_SANDBOX.md)
- [`../../PRUEBA_MANUAL_SEPARACION_PORTAL_CLIENTE.md`](../../PRUEBA_MANUAL_SEPARACION_PORTAL_CLIENTE.md)
