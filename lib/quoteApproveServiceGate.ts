import { timingSafeEqual } from "node:crypto";

/**
 * Candado de POST /api/quotes/[id]/approve.
 * Token distinto del PDF: QUOTE_APPROVE_SERVICE_TOKEN. El de lectura no sirve.
 * Apagado (401) si falta, es corto o el deploy de Vercel no es Production.
 */

export const QUOTE_APPROVE_SERVICE_TOKEN_ENV = "QUOTE_APPROVE_SERVICE_TOKEN";
export const QUOTE_APPROVE_SERVICE_MIN_TOKEN_LENGTH = 32;
export const QUOTE_APPROVE_SERVICE_MAX_TOKEN_LENGTH = 256;
export const QUOTE_APPROVE_SERVICE_IP_LIMIT = 3;
export const QUOTE_APPROVE_SERVICE_GLOBAL_LIMIT = 6;
export const QUOTE_APPROVE_SERVICE_WINDOW_MS = 60_000;
export const QUOTE_APPROVE_SERVICE_GLOBAL_RATE_KEY = "quote-approve:global";

export type QuoteApproveServiceEnv = {
  VERCEL_ENV?: string;
  QUOTE_APPROVE_SERVICE_TOKEN?: string;
};

export function quoteApproveServiceIpRateKey(ip: string) {
  return `quote-approve:ip:${ip}`;
}

export function readConfiguredQuoteApproveServiceToken(
  env: QuoteApproveServiceEnv
): string | null {
  if (env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "development") {
    return null;
  }

  const token = env.QUOTE_APPROVE_SERVICE_TOKEN;
  if (!token) return null;
  if (token.length < QUOTE_APPROVE_SERVICE_MIN_TOKEN_LENGTH) return null;
  if (token.length > QUOTE_APPROVE_SERVICE_MAX_TOKEN_LENGTH) return null;
  if (/\s/.test(token)) return null;
  return token;
}

export function extractBearerCredential(authorizationHeader: string | null): string | null {
  if (!authorizationHeader || authorizationHeader.length > 512) return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(authorizationHeader);
  return match?.[1] ?? null;
}

export function timingSafeTokenEqual(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) {
    timingSafeEqual(expectedBuf, expectedBuf);
    return false;
  }
  return timingSafeEqual(providedBuf, expectedBuf);
}

export function authorizeQuoteApproveService(
  authorizationHeader: string | null,
  env: QuoteApproveServiceEnv
): boolean {
  const expected = readConfiguredQuoteApproveServiceToken(env);
  if (!expected) return false;
  const provided = extractBearerCredential(authorizationHeader);
  if (provided === null) {
    timingSafeEqual(Buffer.from(expected), Buffer.from(expected));
    return false;
  }
  return timingSafeTokenEqual(provided, expected);
}

export function parseQuoteApproveId(value: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(value)) return null;
  const quoteId = Number(value);
  return Number.isSafeInteger(quoteId) ? quoteId : null;
}
