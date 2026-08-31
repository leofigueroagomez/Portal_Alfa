# Security Rules

Reglas criticas para agentes. No debilitar seguridad para resolver errores de producto.

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

### El Vigia

- Tablas `vigia_sensor_runs`, `vigia_findings`, `vigia_audit_log`: RLS activo, unica policy `select` para `authenticated`. La escritura la hace el runner con service_role. No abrir estas tablas a escritura por RLS.
- Endpoint `app/api/vigia/cron/daily`: auth por `CRON_SECRET` (header Bearer que Vercel manda solo, o `?key=`). No quitar el candado. El endpoint corre sensores de solo lectura y puede enviar correo (Resend), asi que su ejecucion es un cambio que envia correos.
- Los sensores (`lib/vigia/sensors.ts`) son solo lectura sobre tablas de negocio. Nunca escribir desde un sensor.

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
