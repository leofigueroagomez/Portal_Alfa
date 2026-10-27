# Auditoría de seguridad ALFA — 16 de septiembre de 2026

## Dictamen

**El portal todavía requiere trabajo antes de considerarse endurecido para producción.** La auditoría encontró fallos de autorización y de manejo de enlaces públicos en el código, preparó correcciones locales y comprobó algunas propiedades del entorno activo sin modificar datos. No equivale a una certificación, un pentest exhaustivo ni evidencia de que todas las correcciones estén desplegadas.

La prioridad inmediata es el registro público: el proyecto productivo permite altas por correo, mientras el SQL versionado asigna por defecto un perfil interno comercial. La configuración de registro está comprobada; falta confirmar el trigger/RPC instalado para determinar la explotación efectiva. No se crearon cuentas para probarlo.

Los cambios de esta auditoría **no se han publicado**. No se aplicaron migraciones, políticas, cambios de credenciales ni configuración productiva. No se enviaron correos, timbraron CFDI ni realizaron pagos.

## Alcance y método

Repositorio inspeccionado: `C:\Users\Leo Figueroa\Desktop\alfa-portal`, rama `main`, worktree inicialmente limpio. Inventario inicial: 854 archivos versionados, 49 handlers en `app/api`, 52 handlers totales, 22 archivos de Server Actions con 63 funciones exportadas y 96 archivos SQL. Son cifras de inventario, **no una afirmación de revisión manual exhaustiva de cada línea**.

Se revisaron autenticación/perfiles, separación cliente/contratista/interno, autorización de acciones y recursos, SQL/RLS/grants/Storage, enlaces y firmas públicas, pagos/webhooks, crons, correos, archivos/PDF, dependencias, patrones de secretos, headers, caché, límites de abuso y recuperación. Se contrastaron rutas y helpers reales con la documentación local y fuentes oficiales. Hubo revisión independiente de los cambios por otro agente.

Las comprobaciones dinámicas de regresión ejecutan código real con Auth/DB/proveedores simulados y sin red. Las consultas productivas fueron limitadas y de lectura: configuración pública de Auth, headers, conteos HEAD, listado de raíz de Storage sin mostrar nombres, configuración de buckets y lista de proyectos. No hubo fuerza bruta, carga, extracción de documentos, explotación del filtro de contratos ni pruebas de escritura en producción.

Informes de detalle:

- [Autenticación y acciones](./2026-09-16-auth.md).
- [APIs, documentos e integraciones](./2026-09-16-routes.md).
- [Base de datos, RLS y Storage](./2026-09-16-database.md).
- [Inventario SQL de solo lectura preparado](./2026-09-16-database-inventory.sql).

## Hallazgos prioritarios y estado

La severidad expresa impacto y condiciones del escenario; no afirma que haya ocurrido un incidente. «Local» significa corregido en este worktree, pendiente de sandbox y despliegue.

| Prioridad | Hallazgo | Evidencia / estado |
| --- | --- | --- |
| Crítica | Registro abierto combinado con bootstrap interno permisivo | Registro comprobado en vivo; defaults en SQL. Confirmar trigger/RPC/RLS efectivos y corregir de forma coordinada. AUTH-01. |
| Crítica | Token de PDF de contrato interpolado en filtro PostgREST privilegiado | Confirmado en código; validación estricta y consulta `.eq` preparadas localmente. ROUTE-01. |
| Crítica potencial | Policies heredadas de Storage y vinculaciones de contratistas permiten permisos excesivos | SQL/snapshot reciente; estado efectivo sin verificar. No ejecutar los SQL históricos como si fueran seguros. DB-01/02. |
| Alta | Acciones de leads, contratos, servicios y despacho sin autorización suficiente | Gates de perfil activo/rol preparados localmente; relación servicio–contratista y orden–proyecto comprobada. AUTH-02/03/06. |
| Alta | Reescritura de contratos/firmas, tokens de lectura aceptados para firmar, carreras y reinicio de pagos | Controles de tipo, estado y actualización condicional locales; se conserva `paid`. ROUTE-05/07. |
| Alta | Firma contractual podía provocar lectura/fetch arbitrario al renderizar un PDF | Nuevas firmas restringidas a PNG limitado; revisar imágenes históricas y otras fuentes de imagen. ROUTE-06. |
| Alta | Crons públicos al faltar secreto; tokens Terminal disponibles con cualquier login | Rechazo sin secreto y gates internos locales. ROUTE-02/03. |
| Alta | Stripe no concilia importe/moneda/sesión esperados antes de liquidar un servicio | Pendiente: cambios coordinados de persistencia, webhook y expiración de Checkout en sandbox. ROUTE pendiente 1. |
| Alta | Fetch/render de imágenes de cotizaciones con protección SSRF incompleta | Pendiente: restringir destinos, redirects, DNS y límites de descarga; evitar fallback remoto en renderer. ROUTE pendiente 2. |
| Alta potencial | Lectura de expedientes, respaldos y datos internos para cualquier `authenticated` | SQL local; probar RLS efectiva con cliente/contratista, no solo con anon. DB-03/04. |
| Media | Usuarios inactivos y logout incompleto | Guards y contextos reforzados; endpoint de logout local con control de origen. RLS/sesiones reales pendientes. AUTH-04/05. |
| Media | Abuso distribuido y consumo de memoria/recursos | Memoria acotada y timeout Redis locales; quedan límites compartidos, cuotas y configuración WAF/CAPTCHA. |
| Media | Adjuntos INE/fotos de contratista sin validación suficiente y tokens contractuales sin caducidad | Pendiente: formato real, tamaño, cuotas, retención, expiración/revocación y minimización. |
| Media | Caché PWA podía guardar rutas privadas por coincidencias `.png`/`.ico` en URL | Allowlist de rutas estáticas, rechazo de queries/redirects/private/no-store y migración de caché locales. |
| Media | CSP permisiva, posibilidad de tracking sobre URLs sensibles y permisos de cuenta/recuperación sin certificar | Parcial/pending; detalles abajo. |

## Evidencia pasiva del entorno

El CLI identifica `Alfa IT` (`jcdnfjitvyfizcsjvwww`) como `ACTIVE_HEALTHY` y `alfa-os-sandbox` (`pkqwlvqosooewbejbktx`) como `INACTIVE`. El entorno local apunta al primero. No se trató `.env.local` como sandbox.

| Comprobación | Resultado | Qué no demuestra |
| --- | --- | --- |
| Auth `/auth/v1/settings` | HTTP 200; `disable_signup=false`, email habilitado, `mailer_autoconfirm=false` | No confirma el código efectivo de creación de perfiles ni demuestra una escalada ejecutada. |
| HEAD anon a contratos/proveedores/miembros | Cero filas visibles; service role confirma que las tablas tienen registros | No prueba otras tablas, escritura ni aislamiento entre usuarios autenticados. |
| Dos vistas financieras/Vigía con anon | HTTP 401 | No certifica todas las vistas/grants. |
| Raíz de tres buckets privados con anon, límite 1 | Arreglos vacíos | No demuestra bloqueo de un objeto con ruta conocida. |
| Configuración de buckets | Documentos/fotos/contratos/persianas privados; contratos sin límite propio de tamaño/MIME | Privacidad del bucket no prueba corrección de policies; existe además un límite global pendiente de verificar. |
| Headers login y sitio público | HSTS, nosniff, X-Frame-Options, CSP y Permissions-Policy presentes | Los headers no sustituyen autorización ni RLS. |
| HTML inicial del login | No aparecen inicializadores GTM/GA/Meta en la muestra | No prueba el resto de rutas ni otras configuraciones de despliegue. |
| Inventario SQL y security advisors por CLI | No disponibles: queda en `Initialising login role...`; intentos cancelados | No se obtuvieron policies/advisors actuales. El SQL preparado no se ejecutó. |

## Otros controles revisados

**Dependencias.** `npm audit --json` devolvió 0 vulnerabilidades conocidas. Next instalado: 16.3.4, React: 19.2.4. La publicación oficial de seguridad de agosto señala 16.3.3 como versión corregida; el repositorio está por encima de esa corrección. Esto no verifica la versión desplegada ni vulnerabilidades no catalogadas. [Next.js: August 2026 Security Release](https://nextjs.org/blog/august-2026-security-release).

**Secretos y repositorio.** Búsqueda por patrones de claves privadas, tokens de proveedores y JWT en archivos versionados menores de 3 MB: no se encontró un secreto confirmado; la coincidencia de clave privada era texto de ayuda. `.env.local` está ignorado. Búsqueda histórica de determinados prefijos de proveedores sin coincidencias en las 283 revisiones alcanzables de HEAD; no es un escáner exhaustivo de todo tipo de secreto o historial remoto. Existen snapshots operativos versionados en `backups/`: revisar necesidad, permisos/visibilidad del repositorio y retención; no se borraron ni publicaron. Se agregó `server-only` al cliente privilegiado para que una importación al navegador falle en compilación.

**CSP y scripts.** `next.config.ts` conserva `unsafe-inline`/`unsafe-eval`; se añadió `frame-ancestors 'self'`, coherente con el X-Frame-Options existente. Retirar `unsafe-eval` requiere resolver el uso real de `new Function` dentro de `heic2any`, usado al cargar imágenes de diagnóstico. Adoptar nonces exige revisar renderizado estático, scripts y rendimiento: no se cambió sin validación. [Guía CSP de Next.js](https://nextjs.org/docs/app/guides/content-security-policy).

**Tracking y capacidades.** `app/layout.tsx` monta `AnalyticsScripts` globalmente; si se configuran IDs, `components/AnalyticsScripts.tsx` inicializa trackers también en rutas de login/portal/documentos. GA recibe `window.location.pathname`; `lib/utmTracking.ts` conserva pathname+query en sessionStorage. Un enlace público contiene una capacidad de acceso y no debe enviarse a analytics. La muestra live de login no tenía inicializadores, así que esto se clasifica como riesgo condicionado a configuración. Separar marketing de zonas sensibles incluyendo transiciones del router; ocultar el componente después de cargar un SDK no garantiza que el SDK deje de observar navegación.

**Abuso y disponibilidad.** `lib/rateLimit.ts` ahora limita a 10 000 claves en memoria, limpia expiradas, no expulsa límites activos para aceptar nuevas claves, limita espera Redis a 2 segundos y rechaza resultados malformados antes del fallback. La memoria sigue siendo por instancia; no es una solución contra DDoS distribuido. Las rutas costosas y acciones de correo necesitan límites compartidos por identidad/recurso, controles del edge y límites de gasto verificados. Turnstile es opcional en código; no se comprobó su configuración productiva. No se hicieron pruebas de carga.

**Recuperación y operación.** No se verificaron backups/PITR activos, restauración ensayada, retención, MFA de Supabase/Vercel/GitHub/DNS, protección de ramas, acceso de colaboradores, audit logs, alertas o presupuesto de abuso. No se afirma que falten: están pendientes. Los backups de DB de Supabase no incluyen los objetos de Storage; deben respaldarse y restaurarse por separado. [Supabase: Database Backups](https://supabase.com/docs/guides/platform/backups).

## Cambios preparados

- Autorización: guards centrales, contextos de ambos portales, acciones de leads/contratos/servicios/entregas/garantías/órdenes y nuevo `/auth/signout`.
- Rutas: crons de contratos/servicios/Vigía, PDF público contractual, Terminal y diagnóstico Calendar.
- Integridad de documentos: helpers `contractTokens`, `contractPublicValidation`, firmas de contratos/servicios/entregas, consulta garantía–proyecto antes de emitir enlace. Escape de campos de texto del correo de garantía.
- Defensa adicional: límite de memoria/timeout, allowlist de caché PWA, `server-only` del cliente admin y `frame-ancestors`.
- Repetibilidad: cuatro archivos de tests y `npm run test:security`, plantilla del secreto de cron, documentación de módulos e informes. No se modificaron dependencias ni lockfile.

## Validación

Validación final del conjunto local completada. Las pruebas aisladas no reemplazan pruebas de Auth, cookies, RLS, Stripe y Storage reales en sandbox.

| Comando | Resultado |
| --- | --- |
| `npm run test:security` | 29 pruebas aprobadas: 12 auth/acciones, 6 garantías/caché/límites, 11 rutas/firmas |
| `npx tsc --noEmit` | Aprobado tras los últimos ajustes |
| `npm run build` | Aprobado: compilación, TypeScript y generación de 57 páginas estáticas |
| ESLint sobre todos los JS/TS nuevos o modificados | 31 archivos, 0 errores y 0 warnings |
| `git diff --check` | Aprobado |
| `npm audit --json` | 0 vulnerabilidades conocidas |
| Enlaces Markdown relativos de documentación nueva/modificada | 11 documentos comprobados, sin enlaces rotos |

## Plan de cierre y despliegue

1. **Contención prioritaria:** confirmar el modelo por invitación y cerrar signup público en Auth; guardar configuración previa y verificar invitaciones de staff, cliente y contratista. Revisar cuentas recientes con criterios internos, sin borrar ni desactivar masivamente. La contención no sustituye cambiar los defaults inseguros.
2. **Recuperar sandbox y evidencia:** obtener inventario SQL/advisors efectivos del proyecto correcto, exportar schema/policies/grants y confirmar respaldo recuperable de DB y objetos. Reactivar sandbox mediante una operación explícita, sin reutilizar credenciales productivas ni enviar correos a clientes.
3. **Corregir origen de privilegios:** migración aditiva que deniegue privilegios internos por defecto, retire autoalta interna por RLS y use alta administrativa explícita; coordinar con `app/api/admin/users`. Incorporar el hardening histórico actualmente no reproducible. Revisar todos los permisos PERMISSIVE juntos, grants de vistas/RPC y acceso directo a Storage.
4. **Cerrar flujos restantes:** conciliación Stripe/idempotencia, SSRF, validación/cuotas de archivos y tokens con vencimiento. Definir quién puede firmar por ALFA y gestionar cobros; exigir MFA/AAL2 para funciones sensibles, con recuperación administrativa controlada.
5. **Matriz de aceptación en sandbox:** anon; cliente A/B; contratista A/B; staff con/sin permiso; perfil desactivado; admin. Probar acceso directo por API/PostgREST/Storage, logout y sesiones viejas, IDs ajenos, tokens inválidos/expirados/revocados/repetidos, concurrencia, upload inválido, cobro viejo y webhook repetido. Usar únicamente fixtures sintéticos.
6. **Publicar con respaldo y rollback:** aprobar el diff probado, capturar deployment anterior y snapshot de permisos; desplegar app y migraciones coordinadas en la ventana acordada. Confirmar versión desplegada y repetir comprobaciones pasivas y smoke autorizado. Si falla un módulo sensible, deshabilitar temporalmente esa función; no reabrir policies públicas para restaurar funcionamiento.
7. **Resistencia a daño:** copia externa cifrada con acceso separado, ensayo de restauración DB+Storage+Auth/configuración, tiempos de recuperación/pérdida de datos aceptables acordados y medidos; alertas de login privilegiado, cambios de roles, errores de webhook, consumo anómalo y borrado masivo. CI debe ejecutar regresiones y auditoría de dependencias; revisión recurrente con responsable definido, sin crear automatizaciones en esta tarea.

Restricción aplicable: [AGENTS.md](../../AGENTS.md) exige «No tocar produccion sin sandbox, pruebas y plan de rollback». [Security Rules](../ai/SECURITY_RULES.md) exige sandbox para auth/guards, SQL/RLS/Storage y rutas públicas. Con sandbox inactivo y permisos/backups reales sin verificar, no corresponde afirmar endurecimiento productivo completo ni desplegar todavía.
