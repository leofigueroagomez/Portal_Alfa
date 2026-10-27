import { isInternalRole } from "@/lib/permissions";

export type PortalKind = "client" | "contractor";

export type PortalProfileRecord =
  | {
      role?: string | null;
      is_internal?: boolean | null;
      user_type?: string | null;
    }
  | null
  | undefined;

// Devuelve el portal al que pertenece un perfil, o null si es interno o ambiguo.
// Deny-by-default: un perfil con campos nulos no se considera de portal.
export function getPortalProfileKind(profile: PortalProfileRecord): PortalKind | null {
  if (!profile) return null;
  if (
    profile.is_internal === true ||
    profile.user_type === "internal" ||
    isInternalRole(profile.role)
  ) {
    return null;
  }

  if (profile.user_type === "client_portal") return "client";
  if (profile.user_type === "contractor_portal") return "contractor";
  if (!profile.user_type && profile.role === "client") return "client";
  if (!profile.user_type && profile.role === "contractor") return "contractor";

  return null;
}

// Perfil existente que no debe convertirse a portal (empleado ALFA o ambiguo).
export function isProtectedInternalProfile(profile: PortalProfileRecord) {
  return Boolean(profile) && getPortalProfileKind(profile) === null;
}

export function normalizeEmail(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

export function isPlausibleEmail(value: string | null | undefined) {
  const email = normalizeEmail(value);
  return email.length > 3 && email.length <= 254 && /^[^\s@]+@[^\s@]+$/.test(email);
}

export function parsePositiveId(value: unknown) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}
