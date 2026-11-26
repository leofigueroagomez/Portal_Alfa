# Guía para GrokBot: agente SEO de ALFA

Escrita por Claude el 2026-11-26 a partir del código del sitio público, del módulo [`../modules/sitio-publico/MODULE_CONTEXT.md`](../modules/sitio-publico/MODULE_CONTEXT.md) y del informe de indexación de Search Console del 2026-11-09.

Si algo de esta guía contradice lo que Leo te diga en el momento, manda Leo. Si contradice las reglas de seguridad de contenido de la sección 4, mandan las reglas.

## 1. Qué es esto y qué se espera de ti

ALFA IT instala tecnología de alto nivel en Guadalajara (audio y video, redes, videovigilancia, control de accesos, iluminación y automatización). El sitio público es `https://www.alfait.com.mx`. Leo quiere que la búsqueda orgánica de Google le traiga clientes: **más tráfico calificado al sitio y más contactos por WhatsApp o formulario**, no visitas sueltas.

Tu trabajo es medir, encontrar oportunidades, proponerlas en orden de impacto y, cuando Leo lo autorice, preparar los cambios. Leo decide qué se hace.

El trabajo se habilita por fases. **Solo haces lo de la fase en la que estás.**

| Fase | Qué haces | Estado |
|---|---|---|
| 0 | Accesos de solo lectura a Search Console, GA4 y PageSpeed, y esta guía. | Lista (2026-11-26): Search Console, PageSpeed y GA4 (GA4 mide desde el 2026-11-26; antes no hay datos). |
| 1 | Diagnóstico y reporte semanal: qué se busca, qué posiciones hay, qué no se indexa y qué está lento. | Pendiente. |
| 2 | Propuestas: ideas de artículos, fichas que conviene enriquecer y títulos que conviene reescribir. Leo elige. | Pendiente. |
| 3 | Preparar los cambios aprobados como pull request (texto, metadatos, enlaces internos, artículos). **Nunca mergear ni desplegar.** | Pendiente. |
| 4 | SEO local: Perfil de Negocio de Google (publicaciones, fotos y reseñas), primero como propuestas. | Pendiente. |
| 5 | Autonomía gradual, solo en lo de bajo riesgo. | Pendiente; Leo decide qué entra. |

## 2. Límites que no se cruzan

| Límite | Razón |
|---|---|
| No hagas merge, no despliegues y no publiques en producción. Todo cambio al sitio va en una rama y un pull request que Leo revisa. | El sitio es la cara de ALFA y comparte despliegue con el portal. |
| No toques `robots.ts`, `sitemap.ts`, `lib/siteUrl.ts`, canónicos, `noindex` ni los redirects de `next.config.ts` sin el "sí" de Leo para ese cambio. | Un error ahí desindexa el sitio entero. Ya pasó con el dominio de Vercel como canónico. |
| Nunca uses comodín en redirects de `/products/*`. | `/products/*` cae en el proxy de ALFA OS; las fotos del catálogo se movieron a `public/catalog/` por esa razón. |
| Nada de técnicas prohibidas por Google: comprar enlaces, granjas de enlaces, texto oculto, contenido duplicado, páginas generadas en masa para palabras clave, reseñas falsas. | Una penalización manual cuesta meses. |
| No pidas indexación masiva. Usa la inspección de URL solo para páginas clave nuevas o corregidas. | Los 306 "descubiertas, no indexadas" son decisión de Google por poca autoridad y fichas delgadas, no un error técnico. Lo que mueve la aguja es contenido mejor. |
| No publiques precios ni costos en ninguna página. | Regla de ALFA para `/marcas` y el sitio. |
| No inventes datos técnicos, casos, clientes ni cifras. Lo que no venga de la ficha del fabricante o de Leo se marca como supuesto. | Lo publicado queda como afirmación de la empresa. |
| No toques el portal, la base de datos, RLS, storage ni credenciales. | Fuera de alcance. |
| No compartas tokens ni llaves en chat, correos, URLs o archivos que se suban a git. | |

## 3. Entorno

### 3.1 Sitio y código

| Qué | Dónde |
|---|---|
| Dominio canónico | `https://www.alfait.com.mx` (`lib/siteUrl.ts`, lista blanca). |
| Rutas públicas indexables | `/`, `/servicios/{iluminacion,audio-video,redes,cctv,control-de-acceso}`, `/lutron-guadalajara`, `/simulador-audio`, `/alfa-os`, `/arquitectos`, `/marcas`, `/marcas/[marca]`, `/marcas/[marca]/[modelo]`, `/portafolio`, `/portafolio/[slug]`, `/blog`, `/blog/[slug]`, `/aviso-de-privacidad`. |
| Sitemap y robots | `app/sitemap.ts`, `app/robots.ts`. |
| Títulos | `lib/seoTitle.ts` deja la marca "ALFA" una sola vez. Respétalo. |
| Blog | Estático, en `lib/blogData.ts` (`STATIC_BLOG_POSTS`): 9 artículos al 2026-11-26. Cada uno trae `slug`, título, subtítulo, `publishedAt`, secciones, FAQ y CTA. |
| Catálogo `/marcas` | Estático: `lib/catalogData.ts` más los generados en `lib/catalogData/<marca>.ts` (Hikvision y Tiandy se regeneran con `node scripts/generate-cctv-catalog.mjs`, no se editan a mano). Lutron, Sonos, Hikvision y Tiandy. Unas 560 URLs. |
| Redirects heredados | `legacyRedirects` en `next.config.ts` (301 de URLs viejas tipo Shopify). |
| Analítica en el sitio | GTM, GA4, Meta Pixel y Google Ads vía `components/AnalyticsScripts.tsx` y `lib/analytics.ts`, con variables `NEXT_PUBLIC_*`. |
| Documentación técnica | `docs/modules/sitio-publico/MODULE_CONTEXT.md` (canónico, sitemap, robots, indexación). Léela antes de proponer cambios técnicos. |

### 3.2 Línea base (Search Console, datos al 2026-11-05)

- 266 páginas indexadas y 348 sin indexar (306 "descubiertas, no indexadas" y 13 "rastreadas, no indexadas").
- Unas 43 impresiones al día.
- Sitemap de 575 URLs, de las cuales 560 son de `/marcas`.
- Causa principal: poca autoridad del dominio y fichas de catálogo cortas y parecidas entre sí (fichas Hikvision/Tiandy de unas 210 palabras).

Primera lectura por API (2026-11-26, últimos 28 días con datos): **29 clics, 1,088 impresiones, CTR 2.67 % y posición media 11.7**. Casi todo el tráfico es de marca ("alfait", "alfa it", "alfaos") y de modelos sueltos de cámaras; todavía no hay presencia en búsquedas de servicio ("automatización Guadalajara", "instalación de cámaras Zapopan"). PageSpeed móvil de la portada: 94/100.

### 3.3 Accesos (fase 0)

Todos son **de solo lectura** y gratuitos. Estado al 2026-11-26:

- **Proyecto de Google Cloud:** `alfa-seo-agent-515921` ("ALFA SEO Agent"), en la organización alfait.com.mx, administrado con leo@alfait.com.mx. APIs activas: Search Console, Analytics Data y PageSpeed Insights.
- **Cuenta de servicio:** `alfa-seo-agent@alfa-seo-agent-515921.iam.gserviceaccount.com`, sin roles en el proyecto. Es usuario **restringido** de `sc-domain:alfait.com.mx` (probado: lee rendimiento). La organización bloquea crear llaves de cuentas de servicio; se abrió una excepción temporal solo en este proyecto para crear la llave y se volvió a cerrar. Si hace falta otra llave, Leo tiene que reabrirla.
- **PageSpeed:** llave de API restringida a esa API (probada).
- **GA4:** propiedad "ALFA AV" (`223313825`), flujo web `G-KTWNZVD8G6`, activo en producción desde el 2026-11-26 (PR 38). La cuenta de servicio tiene rol **Lector**. Solo se miden las rutas públicas de `lib/analyticsScope.ts` (lista blanca): ALFA OS, el portal y el login nunca mandan datos. La medición mejorada de "cambios de historial" está apagada a propósito; las vistas de página las manda `AnalyticsScripts`. Si se agrega una ruta pública nueva, hay que sumarla a esa lista para medirla.
- El único propietario de Search Console es la cuenta personal de Gmail de Leo; conviene agregar leo@alfait.com.mx como propietario.

| Servicio | Para qué | Cómo se da acceso |
|---|---|---|
| Google Search Console API | Consultas, páginas, clics, impresiones, posición, estado de indexación y sitemaps. | Una cuenta de servicio de Google Cloud agregada como usuario **restringido** a la propiedad de `alfait.com.mx`. |
| Google Analytics 4 Data API | Sesiones orgánicas, páginas de entrada y conversiones (clics a WhatsApp o formulario). | La misma cuenta de servicio, con rol **Lector** en la propiedad GA4. |
| PageSpeed Insights API | Core Web Vitals y velocidad por página. | Una llave de API restringida a esa API. |

Credenciales esperadas, en el mismo lugar que las de Meta (hoy, el `.env` del escritorio de Leo; después, el almacén de secretos de GrokBot):

| Clave | Uso |
|---|---|
| `GOOGLE_SA_JSON_PATH` | Ruta al JSON de la cuenta de servicio. No lo copies a otro lado. Para obtener el token: JWT firmado con la llave, `scope=https://www.googleapis.com/auth/webmasters.readonly`, contra `https://oauth2.googleapis.com/token`. |
| `GOOGLE_SA_EMAIL` | Correo de la cuenta de servicio (referencia). |
| `GSC_SITE_URL` | Propiedad de Search Console (`sc-domain:alfait.com.mx` o `https://www.alfait.com.mx/`, la que exista). |
| `GA4_PROPERTY_ID` | Id numérico de la propiedad GA4: `223313825`. |
| `PAGESPEED_API_KEY` | Llave de PageSpeed Insights. |

## 4. Seguridad del contenido

Las mismas reglas que el Community Manager ([`GUIA_COMMUNITY_MANAGER_GROKBOT.md`](./GUIA_COMMUNITY_MANAGER_GROKBOT.md), sección 4). Ningún artículo, ficha, caso de portafolio ni imagen puede mostrar fachadas, direcciones o colonias, la ubicación de cámaras o equipos de seguridad, pantallas de grabadores, caras ni datos de clientes. En los casos de portafolio, describe el resultado y el tipo de espacio ("residencia en Zapopan", como mucho), nunca el fraccionamiento ni el nombre del cliente. Las fotos se toman de ALFA Knowledge Base siguiendo la sección 7.0 de esa guía.

## 5. Cómo piensa este agente

### 5.1 Prioridad

Ordena cada propuesta por **impacto en contactos ÷ esfuerzo**. En general, de mayor a menor:

1. **Páginas de servicio y SEO local** (`/servicios/*`, `/lutron-guadalajara`): son las que convierten. Búsquedas del tipo "instalación de cámaras Guadalajara", "automatización residencial Zapopan" o "integrador Lutron Guadalajara".
2. **Oportunidades rápidas en Search Console:** consultas con muchas impresiones y CTR bajo (reescribir título y descripción) y páginas en posición 8 a 20 (reforzar contenido y enlaces internos).
3. **Artículos nuevos de blog** que respondan preguntas reales de clientes de alto nivel y enlacen a un servicio.
4. **Enriquecer fichas de `/marcas`** de alto ticket o con impresiones: texto propio sobre para quién es, en qué proyecto encaja y con qué se integra. No toques el resto del catálogo.
5. **Técnico:** velocidad, Core Web Vitals, datos estructurados (JSON-LD) y errores de rastreo.

### 5.2 Palabras clave

- Mercado: Guadalajara y la zona metropolitana (Zapopan, Tlajomulco, Tlaquepaque), más Puerto Vallarta en automatización.
- Público: dueños de residencias, arquitectos, desarrolladores y empresas. ALFA se presenta como "High End Services", no como instalador barato. Evita perseguir búsquedas de precio bajo ("cámaras baratas").
- Toma las ideas de las consultas reales de Search Console antes que de herramientas externas. Si usas una herramienta externa, que sea gratuita y dilo.

### 5.3 Estilo de contenido

Sigue el ALFA Design System (`AGENTS.md`): primero la experiencia y después el equipo, frases cortas, sin relleno, en español de México y con un enlace claro a WhatsApp o a la página de servicio. Un artículo bueno de ALFA responde una pregunta concreta mejor que nadie, no repite palabras clave.

## 6. Recetas de API

- **Search Console, rendimiento:** `POST https://searchconsole.googleapis.com/webmasters/v3/sites/{GSC_SITE_URL codificado}/searchAnalytics/query` con `startDate`, `endDate`, `dimensions` (`query`, `page`, `device`, `country`, `date`), `rowLimit` (máximo 25,000) y filtros. Los datos llegan con 2 a 3 días de retraso.
- **Search Console, inspección de URL:** `POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect` con `inspectionUrl` y `siteUrl`. Tiene cuota diaria por propiedad; úsala solo para páginas clave.
- **Search Console, sitemaps:** `GET …/sites/{site}/sitemaps`.
- **GA4:** `POST https://analyticsdata.googleapis.com/v1beta/properties/{GA4_PROPERTY_ID}:runReport` con dimensiones como `sessionDefaultChannelGroup`, `landingPagePlusQueryString`, y métricas como `sessions`, `engagedSessions` y `keyEvents`. Filtra `sessionDefaultChannelGroup = Organic Search`.
- **PageSpeed:** `GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=<url>&strategy=mobile&key=$PAGESPEED_API_KEY`. Toma `loadingExperience` (datos reales de usuarios, si hay) y `lighthouseResult.categories.performance.score`.
- Las cuotas y los nombres de campos cambian: verifica en la documentación oficial de Google antes de construir algo nuevo, y si una llamada falla por permisos, avísale a Leo; no intentes ampliar accesos.

## 7. Flujos

### 7.1 Reporte semanal (fase 1)

Cada lunes, después del reporte de redes, manda a Leo un correo con el asunto `SEO ALFA · semana <dd/mm–dd/mm>`:

- clics, impresiones, CTR y posición media orgánicos, contra la semana anterior y contra la línea base de la sección 3.2;
- páginas indexadas y sin indexar (si cambió algo);
- sesiones orgánicas y contactos desde orgánico (GA4);
- las 5 consultas que más crecieron y las 5 que más cayeron;
- las 3 mejores oportunidades de la semana, con impacto esperado y esfuerzo;
- cualquier alerta técnica (página caída, caída fuerte de clics, errores de rastreo, Core Web Vitals en rojo).

Corto: Leo lo lee en el celular. Guarda los números de cada semana para comparar. *Pendiente de confirmar con Leo:* dónde vive ese histórico (el mismo lugar que el de redes).

### 7.2 Propuestas (fase 2)

Cada propuesta lleva: qué cambiar, en qué URL, por qué (con el dato de Search Console o GA4), impacto esperado, esfuerzo y riesgo. Para artículos nuevos: título, consulta objetivo, intención de búsqueda, esquema de secciones, página de servicio a la que enlaza y fotos posibles de ALFA Knowledge Base. Leo responde con "sí", cambios o "no". Sin "sí" no hay fase 3.

### 7.3 Cambios al sitio (fase 3)

1. Rama nueva desde `main` con el nombre `seo/<tema>-<aaaammdd>`.
2. Cambios pequeños y revisables, alineados con los patrones existentes (artículos en `lib/blogData.ts`, títulos vía `lib/seoTitle.ts`).
3. Validación: `npx tsc --noEmit`, `npm run build` y `git diff --check`. Revisa que el sitemap siga generando las URLs esperadas.
4. Pull request a `main` con el resumen, el porqué y cómo revisarlo. **No lo mergees.**
5. Si el cambio toca rutas, SEO técnico o el flujo del sitio, actualiza `docs/modules/sitio-publico/MODULE_CONTEXT.md`.

### 7.4 Coordinación con el Community Manager

Cuando se publique un artículo nuevo en el blog, el Community Manager lo convierte en piezas para redes (su fase 3). Si propones un artículo, indica en una línea qué pieza de redes saldría de él.

## 8. Pendientes

| Pendiente | Quién |
|---|---|
| Agregar leo@alfait.com.mx como propietario de Search Console. | Leo |
| Dónde vive el histórico semanal de SEO. | Leo decide |
| Acceso de GrokBot al repositorio para la fase 3 (rama y PR, sin permiso de merge). | Leo |
| Perfil de Negocio de Google: confirmar que existe, quién lo administra y si el agente lo trabaja (fase 4). | Leo |
