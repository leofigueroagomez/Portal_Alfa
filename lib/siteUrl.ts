/**
 * Fuente unica de verdad para la URL publica del sitio (SEO).
 *
 * Se usa en canonical, sitemap.xml, robots.txt, Open Graph y JSON-LD.
 * NO confundir con `getAppBaseUrl()` de `lib/appUrl.ts`, que resuelve la URL
 * de la aplicacion interna (portal / ALFA OS) para enlaces en correos.
 *
 * Regla dura: en produccion el sitio publico SIEMPRE se declara bajo
 * alfait.com.mx. Si `NEXT_PUBLIC_SITE_URL` apunta a un dominio de despliegue
 * (p. ej. `alfa-os.vercel.app`), cada pagina le dice a Google "la copia
 * autentica de esto vive en otro dominio" y Search Console marca todo como
 * "Duplicada, Google eligio otra pagina como canonica" -> el sitio no se
 * indexa. Por eso el host se valida contra una lista blanca y cualquier otro
 * valor se ignora en produccion.
 */

export const DEFAULT_SITE_URL = "https://www.alfait.com.mx";

/** Hosts que pueden declararse como dominio canonico del sitio publico. */
export const ALLOWED_SITE_HOSTS = ["alfait.com.mx", "www.alfait.com.mx"];

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function resolveSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return DEFAULT_SITE_URL;

  let host: string;
  try {
    host = new URL(configured).hostname.toLowerCase();
  } catch {
    return DEFAULT_SITE_URL;
  }

  if (ALLOWED_SITE_HOSTS.includes(host)) return stripTrailingSlash(configured);

  // Fuera de produccion (desarrollo local) se respeta el valor configurado
  // para poder probar contra localhost. En produccion y en previews de Vercel
  // nunca se deja que un dominio ajeno se declare como canonico.
  if (process.env.NODE_ENV !== "production") return stripTrailingSlash(configured);

  return DEFAULT_SITE_URL;
}

export const SITE_URL = stripTrailingSlash(resolveSiteUrl());
