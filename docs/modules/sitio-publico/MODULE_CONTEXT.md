# Módulo: Sitio Público — SEO Técnico e Indexación

Cubre la salud técnica de indexación del sitio público `alfait.com.mx`: dominio
canónico, `robots.txt`, `sitemap.xml`, Open Graph, JSON-LD y redirecciones
heredadas. No cubre el contenido de las páginas (ver
[`../catalogo-marcas/MODULE_CONTEXT.md`](../catalogo-marcas/MODULE_CONTEXT.md) y
[`../portafolio/MODULE_CONTEXT.md`](../portafolio/MODULE_CONTEXT.md)).

## 1. Dominio canónico — regla dura

El sitio público **siempre** se declara bajo `alfait.com.mx`. La única fuente de
verdad es `lib/siteUrl.ts`, que exporta `SITE_URL`.

```
DEFAULT_SITE_URL   = https://www.alfait.com.mx
ALLOWED_SITE_HOSTS = alfait.com.mx, www.alfait.com.mx
```

`SITE_URL` lee `NEXT_PUBLIC_SITE_URL`, pero **valida el host contra la lista
blanca**. Si el valor configurado apunta a otro dominio:

- en producción y en previews de Vercel se ignora y se usa `DEFAULT_SITE_URL`;
- fuera de producción (`NODE_ENV !== "production"`) se respeta, para poder
  probar contra `http://localhost:3000`.

**Por qué existe esta validación (incidente 2026-09-02).** La variable
`NEXT_PUBLIC_SITE_URL` estaba configurada en producción como
`https://alfa-os.vercel.app` (el subdominio de despliegue de Vercel). Efecto
medido en vivo:

| Señal | Valor observado |
| --- | --- |
| `robots.txt` | `Sitemap: https://alfa-os.vercel.app/sitemap.xml` |
| `sitemap.xml` | todas las `<loc>` bajo `alfa-os.vercel.app` |
| `<link rel="canonical">` en `/servicios/iluminacion` | `https://alfa-os.vercel.app/servicios/iluminacion` |

Cada página le decía a Google "la copia auténtica de esto vive en otro dominio",
así que Search Console las clasificaba como *"Duplicada, Google eligió otra
página como canónica"* y ni `alfait.com.mx` ni `alfa-os.vercel.app` quedaban
indexados. El código dejó de depender de esa variable para no repetirlo.

### No confundir con `getAppBaseUrl()`

`lib/appUrl.ts` → `getAppBaseUrl()` resuelve la URL de la **aplicación interna**
(portal / ALFA OS) para enlaces en correos y firmas. Son conceptos distintos:

| | Fuente | Uso |
| --- | --- | --- |
| `SITE_URL` (`lib/siteUrl.ts`) | lista blanca, default `www.alfait.com.mx` | canonical, sitemap, robots, OG, JSON-LD |
| `getAppBaseUrl()` (`lib/appUrl.ts`) | `NEXT_PUBLIC_APP_URL` / `APP_URL` / `VERCEL_URL`, default `portal.alfait.com.mx` | enlaces internos en correos y notificaciones |

`lib/notifications.ts` todavía usa `NEXT_PUBLIC_SITE_URL` directamente para
armar enlaces internos — **pendiente de confirmar** si debería migrar a
`getAppBaseUrl()`; se dejó intacto porque no afecta señales de SEO.

## 2. Consumidores de `SITE_URL`

| Archivo | Señal que emite |
| --- | --- |
| `app/layout.tsx` | `metadataBase` (base de todos los canonical y OG relativos) |
| `app/robots.ts` | línea `Sitemap:` de `/robots.txt` |
| `app/sitemap.ts` | todas las `<loc>` de `/sitemap.xml` |
| `app/page.tsx` | JSON-LD `Organization` / `LocalBusiness` de la home |
| `app/blog/page.tsx`, `app/blog/[slug]/page.tsx` | canonical + JSON-LD de blog |
| `app/marcas/**` | canonical + JSON-LD `Brand` / `Product` |
| `app/portafolio/**` | canonical + JSON-LD de proyectos |
| `lib/blog.ts`, `lib/catalog.ts`, `lib/portfolio.ts` | default del parámetro `siteUrl` de los generadores JSON-LD |

Al agregar una página pública nueva, importar `SITE_URL` desde `@/lib/siteUrl`.
**Nunca** volver a leer `process.env.NEXT_PUBLIC_SITE_URL` directo en `app/`.

## 3. Redirecciones del sitio anterior

El sitio HTML estático previo dejó URLs que Google todavía conserva indexadas
bajo `http://` y que hoy responderían 404. Se redirigen con **301 explícito**
desde `legacyRedirects` en `next.config.ts`:

| Origen | Destino |
| --- | --- |
| `/domotica.html` | `/servicios/iluminacion` |
| `/camarasdeseguridad.html` | `/servicios/cctv` |
| `/cercaelectrica.html`, `/controldeacceso.html` | `/servicios/control-de-acceso` |
| `/audiovideo.html` | `/servicios/audio-video` |
| `/redes.html` | `/servicios/redes` |
| `/automatizacion.html` | `/servicios/iluminacion` |
| `/index.html`, `/nosotros.html`, `/contacto.html` | `/` |

Se usa `statusCode: 301` y no `permanent: true`, porque `permanent` emite **308**
y el trabajo de recuperación de indexación se apoya en 301.

El paso apex → `www` y `http` → `https` ya lo resuelve Vercel con 308; no se
duplica en el código.

## 4. Cómo verificar

```
npx tsc --noEmit
npm run build
```

Comprobaciones sobre el build (no requieren desplegar):

```
grep -i sitemap .next/server/app/robots.txt.body
grep -o "<loc>[^<]*</loc>" .next/server/app/sitemap.xml.body | head -3
grep -o 'rel="canonical" href="[^"]*"' .next/server/app/servicios/iluminacion.html
node -e "console.log(require('./.next/routes-manifest.json').redirects.filter(r=>r.source.endsWith('.html')))"
```

Prueba de regresión de la lista blanca — con la variable envenenada, el build
debe seguir emitiendo `www.alfait.com.mx`:

```
NEXT_PUBLIC_SITE_URL="https://alfa-os.vercel.app" npm run build
grep -rl "alfa-os.vercel.app" .next/server/app --include="*.html"   # sin resultados
```

En vivo, tras desplegar:

```
curl -s https://www.alfait.com.mx/robots.txt | grep -i sitemap
curl -s https://www.alfait.com.mx/servicios/iluminacion | grep -o '<link rel="canonical"[^>]*>'
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://www.alfait.com.mx/domotica.html
```

## 5. Pendiente (fuera del código)

Requiere acceso de Leo, no se puede hacer desde el repo:

- Limpiar/eliminar `NEXT_PUBLIC_SITE_URL` en el proyecto de Vercel de producción
  (el código ya la ignora, pero deja la configuración coherente). **Ojo:** si se
  cambia su valor, también cambian los enlaces que arma `lib/notifications.ts`.
- Confirmar en Vercel → Settings → Domains que `alfait.com.mx` es dominio de
  producción del proyecto, no solo apuntado por DNS.
- Alta y verificación de la propiedad de dominio en Google Search Console
  (TXT en DNS cubre `http`, `https`, `www` y no-`www` a la vez).
- Reenviar `sitemap.xml` y solicitar indexación manual de las páginas clave.
