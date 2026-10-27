// Helpers puros (sin dependencias de servidor) para decidir que rutas son
// sensibles y que enlaces de Auth se aceptan. Se usan desde componentes cliente,
// asi que aqui no va nada de node:crypto ni server-only.

/** Prefijos donde no se cargan trackers ni se guarda la ruta para atribucion. */
const SENSITIVE_PREFIXES = ["/public", "/auth", "/portal", "/login"];

// Segmentos que parecen capability token: los de contratos (`onb_`/`sgn_` + hex),
// UUIDs, hex largo o base64url largo sin guiones (los slugs del blog si llevan
// guiones y letras, por eso no caen aqui).
const TOKEN_SEGMENT_PATTERNS = [
  /^(onb|sgn)_[A-Za-z0-9]+$/,
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  /^[0-9a-f]{24,}$/i,
  /^[A-Za-z0-9_]{32,}$/,
];

export function isTokenLikeSegment(segment: string) {
  return TOKEN_SEGMENT_PATTERNS.some((pattern) => pattern.test(segment));
}

/**
 * true si la ruta no debe llevar trackers de terceros (GTM/GA4/Meta) ni
 * quedar guardada en la atribucion: firmas/documentos publicos por token,
 * auth, portal cliente, login y cualquier ruta con un segmento tipo token.
 */
export function isSensitiveTrackingPath(pathname: string | null | undefined) {
  // Sin ruta conocida no se arriesga: se trata como sensible.
  if (!pathname) return true;
  const path = pathname.split(/[?#]/)[0] || "/";
  const lower = path.toLowerCase();

  if (
    SENSITIVE_PREFIXES.some(
      (prefix) => lower === prefix || lower.startsWith(`${prefix}/`)
    )
  ) {
    return true;
  }

  return path.split("/").some((segment) => {
    if (!segment) return false;
    let decoded = segment;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return true;
    }
    return isTokenLikeSegment(decoded);
  });
}

/**
 * Referrer apto para guardar en la atribucion: si viene del propio sitio y de
 * una ruta sensible se reduce al origen; si no se puede parsear se descarta.
 */
export function sanitizeAttributionReferrer(
  referrer: string | null | undefined,
  currentOrigin: string
): string | undefined {
  if (!referrer) return undefined;
  try {
    const url = new URL(referrer);
    if (url.origin === currentOrigin && isSensitiveTrackingPath(url.pathname)) {
      return url.origin;
    }
    return referrer;
  } catch {
    return undefined;
  }
}

/** Tipos de enlace que genera ALFA hacia /auth/accept-invite. */
export const ACCEPTED_INVITE_LINK_TYPES = ["invite", "recovery", "magiclink"] as const;
export type AcceptedInviteLinkType = (typeof ACCEPTED_INVITE_LINK_TYPES)[number];

/** null si el tipo no es uno de los aceptados (o viene vacio). */
export function parseInviteLinkType(
  value: string | null | undefined
): AcceptedInviteLinkType | null {
  if (!value) return null;
  return (ACCEPTED_INVITE_LINK_TYPES as readonly string[]).includes(value)
    ? (value as AcceptedInviteLinkType)
    : null;
}
