import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * MFA (TOTP) para el area interna de ALFA OS.
 *
 * Regla de seguridad: solo se exige AAL2 a usuarios que YA tienen un factor
 * verificado. Un usuario sin factores conserva nextLevel = "aal1" y sigue
 * entrando exactamente igual que antes (sin bloqueo).
 *
 * Este archivo no importa nada de servidor: los helpers puros se reutilizan en
 * paginas cliente y en tests (node --experimental-strip-types).
 */

export const MFA_ROUTE = "/auth/mfa";
export const MFA_SETTINGS_ROUTE = "/settings/security";
export const MFA_DEFAULT_NEXT = "/dashboard";
export const MFA_TOTP_ISSUER = "ALFA OS";
export const MFA_TOTP_BASE_NAME = "ALFA OS";

export type AssuranceLevels = {
  currentLevel: string | null;
  nextLevel: string | null;
};

export type AssuranceState = AssuranceLevels & {
  needsChallenge: boolean;
  /** Mensaje tecnico si no se pudo consultar el nivel (no se muestra al usuario). */
  error: string | null;
};

/**
 * true solo cuando el usuario tiene un factor verificado (nextLevel = aal2)
 * y la sesion actual todavia no lo ha usado (currentLevel != aal2).
 */
export function needsMfaChallenge(levels: AssuranceLevels | null | undefined): boolean {
  if (!levels) return false;
  return levels.nextLevel === "aal2" && levels.currentLevel !== "aal2";
}

/**
 * Consulta el nivel de aseguramiento de la sesion actual en servidor.
 *
 * Se pasa el access token explicitamente para que auth-js obtenga los factores
 * con `getUser(jwt)` (validado por Supabase Auth) y no desde el objeto de
 * sesion guardado en cookie, que el navegador podria alterar.
 *
 * Si la consulta falla (p. ej. caida transitoria de Auth) NO se exige el reto:
 * preferimos no bloquear al equipo; el error se devuelve para registrarlo.
 */
export async function getAssuranceState(
  supabase: Pick<SupabaseClient, "auth">
): Promise<AssuranceState> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      return {
        currentLevel: null,
        nextLevel: null,
        needsChallenge: false,
        error: sessionError?.message ?? null,
      };
    }

    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel(
      session.access_token
    );

    if (error || !data) {
      return {
        currentLevel: null,
        nextLevel: null,
        needsChallenge: false,
        error: error?.message ?? "Sin datos de AAL.",
      };
    }

    const levels = { currentLevel: data.currentLevel, nextLevel: data.nextLevel };
    return { ...levels, needsChallenge: needsMfaChallenge(levels), error: null };
  } catch (error) {
    return {
      currentLevel: null,
      nextLevel: null,
      needsChallenge: false,
      error: error instanceof Error ? error.message : "Error consultando AAL.",
    };
  }
}

const SAFE_NEXT_BASE = "https://alfa-os.invalid";
const BLOCKED_NEXT_PREFIXES = [MFA_ROUTE, "/login", "/auth/signout"];

/**
 * Devuelve un destino interno seguro para redirigir despues del reto MFA.
 * Solo acepta rutas relativas del mismo origen ("/quotes/12?tab=x").
 * Rechaza URLs absolutas, protocol-relative ("//evil.com"), backslashes,
 * caracteres de control y destinos que provocarian un ciclo.
 */
export function getSafeNextPath(raw: unknown, fallback: string = MFA_DEFAULT_NEXT): string {
  if (typeof raw !== "string") return fallback;

  const value = raw.trim();
  if (!value || value.length > 2048) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("\\")) return fallback;
  if (/[\u0000-\u001F\u007F]/.test(value)) return fallback;

  let parsed: URL;
  try {
    parsed = new URL(value, SAFE_NEXT_BASE);
  } catch {
    return fallback;
  }

  if (parsed.origin !== SAFE_NEXT_BASE) return fallback;

  const pathname = parsed.pathname;
  if (
    BLOCKED_NEXT_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return fallback;
  }

  return `${pathname}${parsed.search}${parsed.hash}`;
}

/** Construye la URL del reto MFA conservando un destino seguro. */
export function buildMfaChallengeUrl(nextPath: unknown): string {
  const next = getSafeNextPath(nextPath);
  return `${MFA_ROUTE}?next=${encodeURIComponent(next)}`;
}

/** Normaliza un codigo TOTP capturado ("123 456" -> "123456"); null si no es valido. */
export function normalizeTotpCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(digits) ? digits : null;
}

/** Nombre unico para un nuevo factor: "ALFA OS", "ALFA OS 2", ... */
export function nextTotpFriendlyName(existingNames: Array<string | null | undefined>): string {
  const taken = new Set(
    existingNames.filter((name): name is string => typeof name === "string").map((n) => n.trim())
  );
  if (!taken.has(MFA_TOTP_BASE_NAME)) return MFA_TOTP_BASE_NAME;
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${MFA_TOTP_BASE_NAME} ${index}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${MFA_TOTP_BASE_NAME} ${Date.now()}`;
}

const SVG_DATA_PREFIX = /^data:image\/svg\+xml;(?:utf-8|charset=utf-8),/i;

/**
 * Supabase devuelve el QR como `data:image/svg+xml;utf-8,<svg ...>` sin
 * codificar; un "#" dentro del SVG cortaria la URL. Se re-codifica y solo se
 * acepta un SVG en data URL (nunca una URL remota).
 */
export function toSafeQrDataUrl(qrCode: unknown): string | null {
  if (typeof qrCode !== "string") return null;
  const match = qrCode.match(SVG_DATA_PREFIX);
  if (!match) return null;
  const svg = qrCode.slice(match[0].length);
  if (!svg.trimStart().startsWith("<svg") && !svg.trimStart().startsWith("<?xml")) return null;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Agrupa el secreto TOTP en bloques de 4 para captura manual. */
export function formatTotpSecret(secret: unknown): string {
  if (typeof secret !== "string") return "";
  return secret.replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();
}

type MaybeAuthError = { code?: unknown; message?: unknown; status?: unknown } | null | undefined;

/** Traduce errores de Supabase Auth MFA a mensajes breves en espanol. */
export function getMfaErrorMessage(error: MaybeAuthError, fallback?: string): string {
  const code = typeof error?.code === "string" ? error.code : "";
  const message = typeof error?.message === "string" ? error.message.toLowerCase() : "";

  switch (code) {
    case "mfa_verification_failed":
    case "mfa_verification_rejected":
      return "El código no es correcto o ya venció. Intenta con el siguiente.";
    case "mfa_challenge_expired":
      return "El reto expiró. Escribe el código de nuevo.";
    case "insufficient_aal":
      return "Por seguridad, primero verifica tu código en esta sesión.";
    case "mfa_factor_name_conflict":
      return "Ya existe un factor con ese nombre. Recarga la página e intenta de nuevo.";
    case "mfa_factor_not_found":
      return "El factor ya no existe. Recarga la página.";
    case "too_many_enrolled_mfa_factors":
      return "Alcanzaste el máximo de factores. Quita uno antes de agregar otro.";
    case "mfa_totp_enroll_not_enabled":
    case "mfa_totp_verify_not_enabled":
      return "La verificación en dos pasos no está habilitada en el servidor.";
    case "over_request_rate_limit":
      return "Demasiados intentos. Espera un momento.";
    default:
      break;
  }

  if (message.includes("invalid totp") || message.includes("invalid code")) {
    return "El código no es correcto o ya venció. Intenta con el siguiente.";
  }
  if (message.includes("aal2")) {
    return "Por seguridad, primero verifica tu código en esta sesión.";
  }

  return fallback ?? "No se pudo completar la operación. Intenta de nuevo.";
}
