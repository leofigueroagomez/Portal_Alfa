# AI Context

Contexto tecnico breve para agentes que trabajen en ALFA OS / Portal_Alfa.

## Que Es

ALFA OS / Portal_Alfa es una aplicacion web de operacion interna y portal cliente para ALFA. El repo combina flujos administrativos, CRM/ERP, cotizaciones, facturacion, proyectos, servicios, compras, dashboard directivo y portal cliente.

## Stack Detectado

- Next.js App Router: `app/`
- React: componentes cliente/servidor en `app/`, `components/` y modulos locales.
- TypeScript: configuracion en `tsconfig.json`.
- Supabase: cliente SSR, auth, base de datos, storage y SQL versionado en `sql/`.
- Tailwind/CSS global: `app/globals.css`, `styles/`.
- PDF/HTML de cotizaciones y documentos: `lib/quotePremiumPdf.ts`, `lib/quotePremiumPdfHtml.ts`, `lib/quotePdfSnapshot.ts`, rutas API PDF.
- Facturama/SAT: `lib/facturama.ts`, `lib/satBillingProviders.ts`, modulo `app/(admin)/invoices/`.
- Vercel/Next runtime: `next.config.ts`, `.vercel/`.

Pendiente de confirmar: version exacta desplegada en produccion y variables activas por entorno.

## Modulos Principales

- Cotizaciones: `app/(admin)/quotes/`, `lib/quote*`, `sql/*quote*`.
- Facturacion fiscal: `app/(admin)/invoices/`, `lib/facturama.ts`, `lib/invoices.ts`, `lib/paymentComplements.ts`.
- Portal cliente: `app/portal/`, `app/(client)/`, `lib/clientPortal.ts`.
- Proyectos y operaciones: `app/(admin)/projects/`, `lib/project*`.
- Servicios: `app/(admin)/services/`, `app/portal/services/`.
- Compras, contratistas y productos: `app/(admin)/contractors/`, `app/(admin)/products/`, librerias relacionadas.
- Leads, landing publica y documentos publicos: `app/page.tsx`, `app/public/`, `app/(admin)/leads/`.
- Usuarios, roles y seguridad: `proxy.ts`, `services/profile.ts`, `lib/permissions.ts`, `lib/apiAuth.ts`.

Ver indice completo en [`MODULE_INDEX.md`](./MODULE_INDEX.md).

## Partes Criticas En Produccion

- Auth y separacion de usuarios internos vs portal cliente.
- RLS, policies de Supabase y storage privado.
- Timbrado fiscal, CFDI, complementos de pago y credenciales Facturama.
- Generacion de PDF Premium de cotizaciones y documentos fiscales.
- Migraciones SQL aplicadas a produccion.
- Rutas API que exponen archivos, XML, PDF o documentos por token.

## Filosofia Tecnica

- Cambios pequenos y de bajo riesgo.
- Reutilizar patrones existentes antes de crear arquitectura nueva.
- Validar comportamiento real cuando haya auth, storage, PDF, fiscal o produccion.
- No relajar seguridad para resolver errores.
- Marcar `Pendiente de confirmar` cuando el repo no alcance para probar una afirmacion.

## Documentos Relacionados

- [`PROJECT_MAP.md`](./PROJECT_MAP.md)
- [`MODULE_INDEX.md`](./MODULE_INDEX.md)
- [`SECURITY_RULES.md`](./SECURITY_RULES.md)
- [`../SETUP_SANDBOX.md`](../SETUP_SANDBOX.md)
