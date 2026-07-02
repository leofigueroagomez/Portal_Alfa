# Project Map

Mapa real del repositorio para agentes. No asumir rutas fuera de este arbol sin verificarlas con `rg --files`.

## Carpetas Principales

| Ruta | Responsabilidad |
| --- | --- |
| `app/` | Rutas Next.js App Router, layouts, paginas y API routes. |
| `app/(admin)/` | ALFA OS interno: cotizaciones, proyectos, facturacion, clientes, servicios, productos, usuarios, dashboards. |
| `app/(auth)/`, `app/auth/`, `app/login/` | Flujos de autenticacion. |
| `app/(client)/`, `app/portal/` | Portal cliente y vistas autenticadas de cliente. |
| `app/api/` | Endpoints server-side para PDF, documentos, integraciones y mutaciones. |
| `app/public/` | Rutas publicas, incluyendo documentos por token. |
| `components/` | Componentes compartidos de UI y shell administrativo. |
| `lib/` | Logica de dominio, integraciones, PDF, permisos, auth API, Supabase helpers. |
| `services/` | Servicios compartidos, incluyendo perfil de usuario y Supabase admin. |
| `types/` | Tipos TypeScript compartidos. |
| `utils/` | Utilidades auxiliares. |
| `sql/` | Migraciones y scripts SQL versionados. |
| `supabase/` | Configuracion/artefactos Supabase. Pendiente de confirmar estado de versionado deseado. |
| `docs/` | Documentacion operativa y contexto para agentes. |
| `public/` | Assets publicos. |
| `scripts/` | Scripts de mantenimiento o soporte. |
| `styles/` | Estilos adicionales. |

## Archivos De Configuracion Relevantes

| Archivo | Uso |
| --- | --- |
| `package.json` | Scripts, dependencias y stack principal. |
| `next.config.ts` | Configuracion Next/Vercel, incluyendo comportamiento de runtime cuando aplique. |
| `proxy.ts` | Middleware/proxy de auth y proteccion de rutas. Critico. |
| `tsconfig.json` | Configuracion TypeScript. |
| `eslint.config.mjs` | Configuracion ESLint. |
| `postcss.config.mjs` | Configuracion CSS/PostCSS. |
| `AGENTS.md` | Punto de entrada para agentes. |

## Rutas Administrativas Detectadas

En `app/(admin)/` existen rutas para:

- `admin`
- `clients`
- `commercial-partners`
- `contractors`
- `customers`
- `dashboard`
- `director-dashboard`
- `engineering`
- `engineering-quotes`
- `invoices`
- `leads`
- `notifications`
- `post-sale`
- `product-categories`
- `product-tags`
- `products`
- `projects`
- `quotes`
- `services`
- `settings`
- `users`

## Archivos Criticos

- `proxy.ts`: proteccion de rutas internas y portal cliente.
- `services/profile.ts`: perfil actual, usuario interno y normalizacion.
- `lib/permissions.ts`: roles y permisos.
- `lib/apiAuth.ts`: guards server-side para API routes.
- `lib/facturama.ts`: integracion fiscal.
- `lib/quotePremiumPdf.ts`, `lib/quotePremiumPdfHtml.ts`, `lib/quotePdfSnapshot.ts`: PDF Premium de cotizaciones.
- `sql/*.sql`: cambios de estructura, RLS, storage y datos base.

## No Modificar Salvo Que La Tarea Lo Pida

- Reglas de auth, roles, RLS y storage.
- Credenciales, variables de entorno o configuracion productiva.
- Logica fiscal de CFDI, timbrado y complementos.
- Generacion de documentos publicos por token.
- Migraciones ya aplicadas, salvo con plan explicito de correccion.
- Worktree ajeno a la tarea.

## Pendientes De Confirmar

- Politica exacta del equipo para versionar `supabase/`.
- Ambientes activos y nombres de proyectos Supabase/Vercel.
- Cobertura de pruebas automatizadas por modulo.
