/**
 * Helper para generar enlaces interactivos de Google Calendar
 * y exportación de eventos de citas técnicas en ALFA OS.
 */

export type ServiceCalendarEventParams = {
  serviceNumber: string;
  clientName: string;
  requesterName?: string | null;
  requesterPhone?: string | null;
  technicianName: string;
  serviceDate: string; // "YYYY-MM-DD"
  startTime?: string | null; // "HH:mm" ej. "10:00"
  endTime?: string | null; // "HH:mm" ej. "12:00"
  isRemote?: boolean;
  serviceLocation?: string | null;
  googleMapsUrl?: string | null;
  background?: string | null;
  serviceUrl?: string | null;
};

/**
 * Limpia y normaliza una hora a formato HHMMSS
 */
function normalizeTime(timeStr?: string | null, fallback: string = "100000"): string {
  if (!timeStr) return fallback;
  const parts = timeStr.replace(/[^0-9:]/g, "").split(":");
  const hours = (parts[0] || "10").padStart(2, "0");
  const minutes = (parts[1] || "00").padStart(2, "0");
  return `${hours}${minutes}00`;
}

/**
 * Genera el enlace de creación directa de evento en Google Calendar
 */
export function buildGoogleCalendarUrl(params: ServiceCalendarEventParams): string {
  const dateCompact = params.serviceDate.replace(/-/g, "");
  const startCompact = normalizeTime(params.startTime, "100000");
  const endCompact = normalizeTime(params.endTime, "120000");

  const datesParam = `${dateCompact}T${startCompact}/${dateCompact}T${endCompact}`;

  const title = `[${params.serviceNumber}] ${
    params.isRemote ? "🛠️ Soporte Remoto" : "📍 Servicio Técnico"
  }: ${params.clientName}`;

  const location = params.isRemote
    ? "Soporte Remoto ALFA IT (Online / Asistencia Telefónica)"
    : params.serviceLocation || "Instalaciones del Cliente";

  const detailsLines = [
    `🔧 SERVICIO TÉCNICO ALFA IT - FOLIO: ${params.serviceNumber}`,
    `🏢 Cliente: ${params.clientName}`,
    params.requesterName
      ? `👤 Solicitante: ${params.requesterName} ${
          params.requesterPhone ? `(WhatsApp: ${params.requesterPhone})` : ""
        }`
      : null,
    `👷‍♂️ Técnico Asignado: ${params.technicianName}`,
    `📡 Modalidad: ${params.isRemote ? "Remoto (Online)" : "Presencial en Sitio"}`,
    params.googleMapsUrl ? `🗺️ Google Maps: ${params.googleMapsUrl}` : null,
    "",
    "📋 ANTECEDENTES Y MOTIVO DEL REPORTE:",
    params.background || "Sin antecedentes adicionales registrados.",
    "",
    params.serviceUrl ? `📱 Abrir Reporte en ALFA OS: ${params.serviceUrl}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const query = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: datesParam,
    details: detailsLines,
    location: location,
    ctz: "America/Mexico_City",
  });

  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

/**
 * Genera el mensaje estructurado de WhatsApp para el técnico
 */
export function buildTechnicianAssignmentWhatsAppMessage(
  params: ServiceCalendarEventParams
): { phone: string; text: string; waUrl: string } {
  const cleanPhone = (params.requesterPhone || "").replace(/\D/g, "");
  const startTime = params.startTime || "10:00";
  const endTime = params.endTime || "12:00";

  const message = [
    `🛠️ *ASIGNACIÓN DE SERVICIO TÉCNICO - ALFA IT*`,
    `📋 *Folio:* ${params.serviceNumber}`,
    `🏢 *Cliente:* ${params.clientName}`,
    params.requesterName
      ? `👤 *Solicitante:* ${params.requesterName} ${
          cleanPhone ? `(wa.me/${cleanPhone})` : ""
        }`
      : null,
    `🗓️ *Fecha:* ${params.serviceDate}`,
    `⏰ *Horario Asignado:* ${startTime} a ${endTime}`,
    `👷‍♂️ *Técnico Responsable:* ${params.technicianName}`,
    params.isRemote
      ? `📡 *Modalidad:* 🛠️ *SERVICIO REMOTO* (Soporte en línea)`
      : `📍 *Ubicación:* ${params.serviceLocation || "En sitio"}${
          params.googleMapsUrl ? `\n🗺️ *Maps:* ${params.googleMapsUrl}` : ""
        }`,
    "",
    `⚠️ *Motivo / Falla Reportada:*`,
    params.background || "Revisión general y diagnóstico técnico.",
    "",
    params.serviceUrl
      ? `📱 *Abrir reporte en ALFA OS (para captura y firma):*\n${params.serviceUrl}`
      : null,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const cleanTechPhone = (params.requesterPhone || "").replace(/\D/g, ""); // Se reemplazará con technician_phone si existe

  return {
    phone: cleanTechPhone,
    text: message,
    waUrl: cleanTechPhone
      ? `https://wa.me/${cleanTechPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`,
  };
}
