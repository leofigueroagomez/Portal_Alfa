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
