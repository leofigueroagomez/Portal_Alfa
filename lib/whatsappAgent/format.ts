/**
 * Utilidades puras del agente de WhatsApp (sin red ni base de datos), para
 * poder probarlas aisladas.
 */

/** Ultimos 10 digitos de un telefono mexicano, o null si no alcanza. */
export function phoneKey(value: string | null | undefined): string | null {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

/**
 * Telefonos a los que el agente si contesta (WHATSAPP_AGENT_ALLOWED_PHONES,
 * separados por coma). null = sin lista: contesta a todos.
 */
export function allowedPhoneKeys(value: string | null | undefined): Set<string> | null {
  const keys = String(value || "")
    .split(",")
    .map((item) => phoneKey(item))
    .filter((item): item is string => Boolean(item));
  return keys.length ? new Set(keys) : null;
}

function cleanField(value: unknown, max: number) {
  if (typeof value === "number") return String(value);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Lee el cuerpo que manda ManyChat. Acepta dos formas:
 * - la plantilla propia `{ subscriber_id, text, phone, name }`;
 * - "Full Contact Data" de ManyChat (`{ id, last_input_text, whatsapp_phone, name, ... }`),
 *   suelta o dentro de `contact`. Es la forma recomendada: ManyChat escapa el
 *   texto, y la plantilla propia se rompe si el mensaje trae saltos de linea.
 * Del contacto solo se toman estos cuatro campos; el resto se descarta.
 */
export function parseInbound(body: unknown) {
  const root = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const nested = root.contact && typeof root.contact === "object" ? (root.contact as Record<string, unknown>) : null;
  const source = root.subscriber_id !== undefined || !nested ? root : nested;

  const fullName = [cleanField(source.first_name, 60), cleanField(source.last_name, 60)]
    .filter(Boolean)
    .join(" ");

  return {
    subscriberId: cleanField(source.subscriber_id ?? source.id, 40),
    text: cleanField(source.text ?? source.last_input_text, 4000),
    phone: cleanField(source.phone ?? source.whatsapp_phone, 30).replace(/[^\d+]/g, "") || null,
    name: cleanField(source.name, 120) || fullName || null,
  };
}

const MAX_CHUNKS = 4;
const MAX_CHUNK_CHARS = 1000;

/**
 * Parte la respuesta del modelo en mensajes de WhatsApp. El prompt le pide
 * separar con una linea en blanco cuando quiere mandar dos mensajes; aqui se
 * respeta esa separacion y se juntan los sobrantes en el ultimo mensaje.
 */
export function splitReply(text: string): string[] {
  const parts = text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > MAX_CHUNKS) {
    const head = parts.slice(0, MAX_CHUNKS - 1);
    head.push(parts.slice(MAX_CHUNKS - 1).join("\n\n"));
    return head.map((part) => part.slice(0, MAX_CHUNK_CHARS * 2));
  }

  return parts.map((part) => part.slice(0, MAX_CHUNK_CHARS * 2));
}

const BUSINESS_TIME_ZONE = "America/Mexico_City";

/** Fecha/hora en Guadalajara y si estamos en horario de atencion (L-V 9-18). */
export function businessClock(now: Date) {
  const parts = new Intl.DateTimeFormat("es-MX", {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const weekdayIndex = new Date(
    now.toLocaleString("en-US", { timeZone: BUSINESS_TIME_ZONE })
  ).getDay();
  const hour = Number(get("hour"));
  const isWeekday = weekdayIndex >= 1 && weekdayIndex <= 5;
  const inHours = isWeekday && hour >= 9 && hour < 18;

  return {
    label: `${get("weekday")} ${get("day")} de ${get("month")}, ${get("hour")}:${get("minute")}`,
    inHours,
  };
}

/** Compara dos secretos en tiempo constante sin filtrar su longitud. */
export async function secretsMatch(provided: string, expected: string) {
  const { createHash, timingSafeEqual } = await import("node:crypto");
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
