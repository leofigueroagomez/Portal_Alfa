# Module Index

Indice operativo para ubicar rapido donde trabajar. Los niveles de riesgo se basan en impacto potencial observado en rutas, auth, fiscalidad, PDF, datos y produccion.

| Modulo | Estado Inferido | Rutas Principales | Archivos/Carpetas Clave | Doc | Riesgo |
| --- | --- | --- | --- | --- | --- |
| Cotizaciones | Activo, critico para ventas y PDF Premium | `app/(admin)/quotes/`, `app/api/quotes/` | `lib/quotePremiumPdf.ts`, `lib/quotePremiumPdfHtml.ts`, `lib/quotePdfSnapshot.ts`, `lib/quoteDiagnosticContext.ts`, `sql/*quote*` | [`../modules/cotizaciones/MODULE_CONTEXT.md`](../modules/cotizaciones/MODULE_CONTEXT.md) | Critico |
| Facturacion | Activo, fiscal | `app/(admin)/invoices/`, `app/api/invoices/`, `app/api/payment-complements/` | `lib/facturama.ts`, `lib/invoices.ts`, `lib/paymentComplements.ts`, `lib/satBillingProviders.ts` | [`../modules/facturacion/MODULE_CONTEXT.md`](../modules/facturacion/MODULE_CONTEXT.md) | Critico |
| Portal cliente | Activo, separacion de datos cliente/admin | `app/portal/`, `app/(client)/`, `app/public/documents/` | `lib/clientPortal.ts`, `lib/publicDocuments.ts`, `proxy.ts`, `lib/apiAuth.ts` | [`../modules/portal-cliente/MODULE_CONTEXT.md`](../modules/portal-cliente/MODULE_CONTEXT.md) | Critico |
| Proyectos | Activo | `app/(admin)/projects/` | `lib/project*`, `app/api/projects/` | Pendiente de crear | Alto |
| Servicios | Activo | `app/(admin)/services/`, `app/portal/services/` | `app/api/services/`, librerias `service*` si existen | Pendiente de crear | Alto |
| Compras y contratistas | Activo | `app/(admin)/contractors/`, rutas de compras bajo proyectos | `lib/projectOperationalItems.ts`, `app/api/projects/` | Pendiente de crear | Alto |
| Productos y catalogo | Activo | `app/(admin)/products/`, `product-categories`, `product-tags` | `app/(admin)/products/`, storage de imagenes si aplica | Pendiente de crear | Medio |
| Aliados comerciales | Activo | `app/(admin)/commercial-partners/` | `lib/commercialPartners.ts`, SQL de white-label | Pendiente de crear | Alto |
| Leads y landing publica | Activo | `app/page.tsx`, `app/(admin)/leads/` | `app/public/`, docs de auditoria si aplica | Pendiente de crear | Medio |
| Usuarios y configuracion | Activo | `app/(admin)/users/`, `app/(admin)/settings/` | `services/profile.ts`, `lib/permissions.ts`, `proxy.ts` | Pendiente de crear | Critico |
| Dashboard direccion | Activo | `app/(admin)/director-dashboard/`, `app/(admin)/dashboard/` | reportes y SQL relacionados | Pendiente de crear | Alto |
| Ingenieria | Activo | `app/(admin)/engineering/`, `app/(admin)/engineering-quotes/` | rutas bajo `app/(admin)/engineering*` | Pendiente de crear | Medio |
| Notificaciones | Activo | `app/(admin)/notifications/` | rutas/API relacionadas a notificaciones | Pendiente de crear | Medio |
| Postventa | Activo | `app/(admin)/post-sale/` | rutas bajo `post-sale` | Pendiente de crear | Alto |

## Uso Para Agentes

1. Ubicar el modulo en esta tabla.
2. Leer su `MODULE_CONTEXT.md` si existe.
3. Verificar rutas con `rg --files`.
4. Revisar `SECURITY_RULES.md` antes de tocar auth, storage, SQL o API routes.

## Pendientes De Fase 2

- Crear contexto especifico para proyectos, servicios, compras/contratistas, usuarios/configuracion y aliados comerciales.
- Confirmar tablas exactas por modulo desde Supabase o migraciones completas.
- Documentar comandos de validacion por modulo.
