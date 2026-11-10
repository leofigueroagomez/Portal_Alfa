import { timingSafeEqual } from "node:crypto";

/**
 * Candado del GET /api/quotes/[id]/pdf-premium.
 *
 * El token solo autoriza la descarga del PDF Premium. La comparación es en
 * tiempo constante. Si la variable no está, es corta, o el deploy no es
 * Production en Vercel, el endpoint queda apagado y responde 401 sin leer
 * la cotización. Preview y Development se rechazan aunque el token exista:
 * en este proyecto esos deploys comparten las credenciales de Supabase de
 * producción.
 */

export const QUOTE_PDF_SERVICE_TOKEN_ENV = "QUOTE_PDF_SERVICE_TOKEN";
export const QUOTE_PDF_SERVICE_MIN_TOKEN_LENGTH = 32;
export const QUOTE_PDF_SERVICE_MAX_TOKEN_LENGTH = 256;
export const QUOTE_PDF_SERVICE_IP_LIMIT = 10;
export const QUOTE_PDF_SERVICE_GLOBAL_LIMIT = 20;
export const QUOTE_PDF_SERVICE_WINDOW_MS = 60_000;
export const QUOTE_PDF_SERVICE_GLOBAL_RATE_KEY = "quote-pdf-premium:global";

const PDF_MAGIC = "%PDF-";

export type QuotePdfServiceEnv = {
  VERCEL_ENV?: string;
  QUOTE_PDF_SERVICE_TOKEN?: string;
};

export type QuotePdfServiceRateLimit = (
  key: string,
  limit?: number,
  windowMs?: number
) => Promise<boolean>;

export type RenderedQuotePdf = {
  pdf: Uint8Array;
  filename: string;
};

export type QuotePdfServiceDeps = {
  env: QuotePdfServiceEnv;
  checkRateLimit: QuotePdfServiceRateLimit;
  renderQuotePdf: (quoteId: number) => Promise<RenderedQuotePdf>;
  onError?: (info: { quoteId: number; error: unknown; requestId: string }) => void;
};

export function quotePdfServiceIpRateKey(ip: string) {
  return `quote-pdf-premium:ip:${ip}`;
}

export function readConfiguredQuotePdfServiceToken(env: QuotePdfServiceEnv): string | null {
  // Vercel fija VERCEL_ENV. Fuera de Vercel (pruebas y next dev) queda vacío
  // y el endpoint puede usarse contra el Supabase que apunte el entorno local.
  if (env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "development") {
    return null;
  }

  const token = env.QUOTE_PDF_SERVICE_TOKEN;
  if (!token) return null;
  if (token.length < QUOTE_PDF_SERVICE_MIN_TOKEN_LENGTH) return null;
  if (token.length > QUOTE_PDF_SERVICE_MAX_TOKEN_LENGTH) return null;
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

export function parseQuotePdfId(value: string): number | null {
  if (!/^[1-9]\d{0,9}$/.test(value)) return null;
  const quoteId = Number(value);
  return Number.isSafeInteger(quoteId) ? quoteId : null;
}

export function quotePdfContentDisposition(filename: string) {
  const safe = filename
    .replace(/[^A-Za-z0-9._-]+/g, "")
    .replace(/^\.+/, "")
    .slice(0, 180);
  const base = safe || "Cotizacion";
  const withExt = base.toLowerCase().endsWith(".pdf") ? base : `${base}.pdf`;
  return `inline; filename="${withExt}"`;
}

function clientIpFromRequest(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

function jsonError(error: string, status: number, requestId?: string) {
  return Response.json(requestId ? { error, requestId } : { error }, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function credentialsMatch(authorizationHeader: string | null, expected: string) {
  const provided = extractBearerCredential(authorizationHeader);
  if (provided === null) {
    timingSafeEqual(Buffer.from(expected), Buffer.from(expected));
    return false;
  }
  return timingSafeTokenEqual(provided, expected);
}

function isQuoteNotFound(error: unknown) {
  return error instanceof Error && error.message === "Cotizacion no encontrada.";
}

export function describeQuotePdfServiceError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`;
  }

  if (error && typeof error === "object") {
    const record = error as { message?: unknown; code?: unknown; hint?: unknown };
    const code = typeof record.code === "string" ? record.code : "";
    const message = typeof record.message === "string" ? record.message : "";
    const hint = typeof record.hint === "string" ? record.hint : "";
    const detail = [code, message, hint].filter(Boolean).join(": ");
    if (detail) return detail;
  }

  return String(error);
}

export function formatQuotePdfServiceErrorLog(info: {
  requestId: string;
  quoteId: number;
  error: unknown;
}) {
  return `[api:${info.requestId}] quote premium PDF service failed for quote ${info.quoteId}: ${describeQuotePdfServiceError(info.error)}`;
}

function looksLikePdf(pdf: Uint8Array) {
  if (pdf.byteLength < PDF_MAGIC.length) return false;
  return Buffer.from(pdf.subarray(0, PDF_MAGIC.length)).toString("ascii") === PDF_MAGIC;
}

export async function serveQuotePdfPremium(
  request: Request,
  quoteIdParam: string,
  deps: QuotePdfServiceDeps
): Promise<Response> {
  const expected = readConfiguredQuotePdfServiceToken(deps.env);
  if (!expected) return jsonError("Unauthorized", 401);

  const ipAllowed = await deps.checkRateLimit(
    quotePdfServiceIpRateKey(clientIpFromRequest(request)),
    QUOTE_PDF_SERVICE_IP_LIMIT,
    QUOTE_PDF_SERVICE_WINDOW_MS
  );
  if (!ipAllowed) return jsonError("Too Many Requests", 429);

  if (!credentialsMatch(request.headers.get("authorization"), expected)) {
    return jsonError("Unauthorized", 401);
  }

  const quoteId = parseQuotePdfId(quoteIdParam);
  if (!quoteId) return jsonError("Bad Request", 400);

  const globalAllowed = await deps.checkRateLimit(
    QUOTE_PDF_SERVICE_GLOBAL_RATE_KEY,
    QUOTE_PDF_SERVICE_GLOBAL_LIMIT,
    QUOTE_PDF_SERVICE_WINDOW_MS
  );
  if (!globalAllowed) return jsonError("Too Many Requests", 429);

  try {
    const rendered = await deps.renderQuotePdf(quoteId);
    if (!looksLikePdf(rendered.pdf)) {
      throw new Error("Rendered quote PDF is empty or not a PDF.");
    }

    return new Response(Buffer.from(rendered.pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": quotePdfContentDisposition(rendered.filename),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    if (isQuoteNotFound(error)) return jsonError("Not Found", 404);

    const requestId = crypto.randomUUID();
    deps.onError?.({ quoteId, error, requestId });
    return jsonError("Unable to process request", 500, requestId);
  }
}
