import "server-only";

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getCurrentUserProfile } from "@/services/profile";

/**
 * Acceso al simulador de audio.
 *
 * Los visitantes NO son usuarios de Supabase Auth: son prospectos con un pase
 * firmado en una cookie. Ver docs/modules/simulador-audio/MODULE_CONTEXT.md
 * para el porque (el alta publica de Auth crea usuarios internos por defecto).
 */

export const SIMULATOR_ACCESS_COOKIE = "alfa_sim_access";
export const SIMULATOR_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const SIMULATOR_CODE_TTL_MS = 15 * 60 * 1000;
export const SIMULATOR_CODE_MAX_ATTEMPTS = 5;
export const SIMULATOR_CODE_RESEND_COOLDOWN_MS = 45 * 1000;

const TOKEN_VERSION = "v1";
const MIN_SECRET_LENGTH = 32;

export type SimulatorViewer =
  | { kind: "interno"; name: string }
  | { kind: "portal"; name: string }
  | { kind: "visitante"; accessId: number };

/** Sin secreto valido el acceso de visitantes queda cerrado (fail-closed). */
export function getSimulatorAccessSecret() {
  const secret = process.env.SIMULADOR_ACCESS_SECRET?.trim() || "";
  return secret.length >= MIN_SECRET_LENGTH ? secret : null;
}

function sign(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createAccessToken(
  secret: string,
  accessId: number,
  nowMs = Date.now()
) {
  const expiresAt = Math.floor(nowMs / 1000) + SIMULATOR_ACCESS_MAX_AGE_SECONDS;
  const payload = `${TOKEN_VERSION}.${accessId}.${expiresAt}`;
  return `${payload}.${sign(secret, payload)}`;
}

export function verifyAccessToken(
  secret: string,
  token: string | null | undefined,
  nowMs = Date.now()
) {
  if (!token || token.length > 200) return null;

  const parts = token.split(".");
  if (parts.length !== 4) return null;

  const [version, rawId, rawExpiry, signature] = parts;
  if (version !== TOKEN_VERSION) return null;
  if (!/^\d{1,15}$/.test(rawId) || !/^\d{1,12}$/.test(rawExpiry)) return null;

  const payload = `${version}.${rawId}.${rawExpiry}`;
  if (!safeEqual(signature, sign(secret, payload))) return null;

  const expiresAt = Number(rawExpiry);
  if (expiresAt * 1000 <= nowMs) return null;

  const accessId = Number(rawId);
  return accessId > 0 ? { accessId, expiresAt } : null;
}

export function generateVerificationCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** El hash va ligado al registro: un codigo no sirve para otro correo. */
export function hashVerificationCode(
  secret: string,
  accessId: number,
  code: string
) {
  return sign(secret, `code.${accessId}.${code}`);
}

export function verificationCodeMatches(
  secret: string,
  accessId: number,
  code: string,
  storedHash: string | null | undefined
) {
  if (!storedHash || !/^\d{6}$/.test(code)) return false;
  return safeEqual(hashVerificationCode(secret, accessId, code), storedHash);
}

export function normalizeEmail(value: unknown) {
  const email = String(value || "").trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;
  return email;
}

export function normalizePhone(value: unknown) {
  const raw = String(value || "").trim().slice(0, 30);
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return raw;
}

/**
 * Quien esta viendo el simulador. Un usuario con sesion de ALFA (interno o de
 * portal) entra directo; un visitante necesita el pase firmado.
 */
export async function resolveSimulatorViewer(): Promise<SimulatorViewer | null> {
  const profile = await getCurrentUserProfile().catch(() => null);

  if (profile?.is_active) {
    const name = profile.full_name?.trim() || profile.email || "Usuario ALFA";
    return profile.is_internal
      ? { kind: "interno", name }
      : { kind: "portal", name };
  }

  const secret = getSimulatorAccessSecret();
  if (!secret) return null;

  const cookieStore = await cookies();
  const verified = verifyAccessToken(
    secret,
    cookieStore.get(SIMULATOR_ACCESS_COOKIE)?.value
  );

  return verified ? { kind: "visitante", accessId: verified.accessId } : null;
}
