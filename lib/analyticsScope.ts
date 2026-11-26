/**
 * Rutas del sitio público que se pueden medir con GA4, GTM y Meta Pixel.
 *
 * El layout raíz se comparte con ALFA OS (admin), el portal de clientes y el
 * login. Esas rutas NO se miden: sus títulos y URLs pueden traer nombres de
 * clientes, folios o montos. Es una lista blanca a propósito: una ruta pública
 * nueva no se mide hasta agregarla aquí.
 */
const PUBLIC_ANALYTICS_PREFIXES = [
  "/blog",
  "/servicios",
  "/lutron-guadalajara",
  "/simulador-audio",
  "/alfa-os",
  "/arquitectos",
  "/marcas",
  "/portafolio",
  "/aviso-de-privacidad",
] as const;

export function isPublicAnalyticsPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname === "/") return true;
  return PUBLIC_ANALYTICS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
