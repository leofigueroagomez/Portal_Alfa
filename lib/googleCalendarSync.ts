import crypto from "node:crypto";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { getAppBaseUrl } from "@/lib/appUrl";

export type CalendarEventPayload = {
  serviceId: number;
  serviceNumber: string;
  clientName: string;
  requesterName?: string | null;
  requesterPhone?: string | null;
  technicianName: string;
  technicianPhone?: string | null;
  serviceDate: string; // "YYYY-MM-DD"
  startTime?: string | null; // "HH:mm"
  endTime?: string | null; // "HH:mm"
  isRemote?: boolean;
  serviceLocation?: string | null;
  googleMapsUrl?: string | null;
  background?: string | null;
};

/**
 * Normaliza y extrae el ID real del calendario de Google
 * Soporta correos directos, enlaces compartidos (URLs) y tokens codificados en Base64 (cid).
 */
export function normalizeGoogleCalendarId(rawId?: string | null): string {
  if (!rawId) return "";
  let clean = rawId.trim();
  if (clean.startsWith('"') && clean.endsWith('"')) {
    clean = clean.slice(1, -1).trim();
  }

  // 1. Si es una URL completa de Google Calendar, extraer parámetro ?cid=
  if (clean.includes("calendar.google.com") || clean.includes("cid=")) {
    try {
      const parsed = new URL(clean.startsWith("http") ? clean : `https://${clean}`);
      const cid = parsed.searchParams.get("cid");
      if (cid) {
        clean = cid;
      }
    } catch {
      const match = clean.match(/[?&]cid=([^&#]+)/);
      if (match) clean = match[1];
    }
  }

  // 2. Si es una cadena codificada en Base64 (ej. Y1_...), decodificar a UTF-8
  if (!clean.includes("@") && clean.length > 20) {
    try {
      const decoded = Buffer.from(clean, "base64").toString("utf-8");
      if (decoded.includes("@")) {
        clean = decoded;
      }
    } catch {
      // noop
    }
  }

  return clean;
}

/**
 * Normaliza horas a formato HH:mm
 */
function normalizeTimeSlot(timeStr?: string | null, fallback: string = "10:00"): string {
  if (!timeStr) return fallback;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

/**
 * Obtiene un Access Token de Google Cloud mediante Service Account (JWT Bearer Flow)
 */
async function getGoogleServiceAccountAccessToken(
  clientEmail: string,
  privateKey: string
): Promise<string> {
  let cleanPrivateKey = privateKey.trim();
  if (cleanPrivateKey.startsWith('"') && cleanPrivateKey.endsWith('"')) {
    cleanPrivateKey = cleanPrivateKey.slice(1, -1);
  }
  cleanPrivateKey = cleanPrivateKey.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signatureInput = `${base64Header}.${base64Payload}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signatureInput);
  signer.end();
  const signature = signer.sign(cleanPrivateKey, "base64url");

  const jwtAssertion = `${signatureInput}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwtAssertion,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error autenticando con Google Service Account: ${errText}`);
  }

  const data = await res.json();
  return data.access_token;
}

/**
 * Función de diagnóstico y prueba de conexión con Google Calendar
 */
export async function testGoogleCalendarConnection(): Promise<{
  ok: boolean;
  step: string;
  config: {
    hasEmail: boolean;
    emailMasked: string | null;
    hasKey: boolean;
    keyLength: number;
    hasCalendarId: boolean;
    calendarId: string | null;
  };
  details?: any;
  error?: string;
  advice?: string;
}> {
  const serviceAccountEmail =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL ||
    process.env.GOOGLE_ACCOUNT_EMAIL;
  const serviceAccountKey =
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GOOGLE_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const rawCalendarId =
    process.env.GOOGLE_CALENDAR_ID ||
    process.env.GOOGLE_CALENDAR_EMAIL;
  const calendarId = normalizeGoogleCalendarId(rawCalendarId);

  const config = {
    hasEmail: Boolean(serviceAccountEmail),
    emailMasked: serviceAccountEmail
      ? `${serviceAccountEmail.substring(0, 6)}...${serviceAccountEmail.slice(-10)}`
      : null,
    hasKey: Boolean(serviceAccountKey),
    keyLength: serviceAccountKey ? serviceAccountKey.length : 0,
    hasCalendarId: Boolean(calendarId),
    calendarId: calendarId || null,
  };

  if (!serviceAccountEmail || !serviceAccountKey || !calendarId) {
    return {
      ok: false,
      step: "env_check",
      config,
      error: "Faltan variables de entorno requeridas.",
      advice:
        "Verifica que en Vercel estén configuradas: GOOGLE_SERVICE_ACCOUNT_EMAIL (o GOOGLE_CLIENT_EMAIL), GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (o GOOGLE_PRIVATE_KEY) y GOOGLE_CALENDAR_ID.",
    };
  }

  let token: string;
  try {
    token = await getGoogleServiceAccountAccessToken(
      serviceAccountEmail,
      serviceAccountKey
    );
  } catch (authError: any) {
    return {
      ok: false,
      step: "oauth_token",
      config,
      error: authError?.message || "Fallo al generar JWT Token con Google OAuth2.",
      advice:
        "Verifica que GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY contenga el texto completo desde '-----BEGIN PRIVATE KEY-----' hasta '-----END PRIVATE KEY-----' y que el Service Account no esté inhabilitado en Google Cloud Console.",
    };
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      let advice = "Revisa los permisos del calendario en Google Calendar.";
      if (res.status === 404) {
        advice = `El calendario '${calendarId}' no fue encontrado o no está compartido con el Service Account. Ve a Google Calendar ➔ Configuración del Calendario ➔ 'Compartir con personas específicas' y añade a '${serviceAccountEmail}' con permisos de 'Hacer cambios en eventos'.`;
      } else if (res.status === 403) {
        advice = `El Service Account '${serviceAccountEmail}' no tiene permisos suficientes para acceder al calendario '${calendarId}'. Asegúrate de otorgarle permisos de 'Hacer cambios en eventos' en Google Calendar.`;
      }

      return {
        ok: false,
        step: "calendar_access",
        config,
        error: `Google Calendar API devolvió código ${res.status}: ${errText}`,
        advice,
      };
    }

    const calendarInfo = await res.json();
    return {
      ok: true,
      step: "success",
      config,
      details: {
        summary: calendarInfo.summary,
        timeZone: calendarInfo.timeZone,
        id: calendarInfo.id,
      },
    };
  } catch (apiError: any) {
    return {
      ok: false,
      step: "api_fetch",
      config,
      error: apiError?.message || "Error al consultar la API de Google Calendar.",
    };
  }
}

/**
 * Sincroniza un servicio técnico con el Calendario de la Organización en Google Calendar
 */
export async function syncServiceToGoogleCalendar(
  eventData: CalendarEventPayload
): Promise<{ ok: boolean; eventId?: string; htmlLink?: string; error?: string }> {
  const serviceAccountEmail =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL ||
    process.env.GOOGLE_ACCOUNT_EMAIL;
  const serviceAccountKey =
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
    process.env.GOOGLE_PRIVATE_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const rawCalendarId =
    process.env.GOOGLE_CALENDAR_ID ||
    process.env.GOOGLE_CALENDAR_EMAIL;
  const calendarId = normalizeGoogleCalendarId(rawCalendarId);

  if (!serviceAccountEmail || !serviceAccountKey || !calendarId) {
    console.log(
      "[Google Calendar Sync] Variables no configuradas. Usando modo enlace directo."
    );
    return {
      ok: false,
      error: "Google Service Account o GOOGLE_CALENDAR_ID no configurados.",
    };
  }

  try {
    const accessToken = await getGoogleServiceAccountAccessToken(
      serviceAccountEmail,
      serviceAccountKey
    );

    const startTime = normalizeTimeSlot(eventData.startTime, "10:00");
    const endTime = normalizeTimeSlot(eventData.endTime, "12:00");

    const startDateTime = `${eventData.serviceDate}T${startTime}:00`;
    const endDateTime = `${eventData.serviceDate}T${endTime}:00`;

    const baseUrl = getAppBaseUrl();
    const serviceUrl = `${baseUrl}/services/${eventData.serviceId}`;

    const summary = `[${eventData.serviceNumber}] ${
      eventData.isRemote ? "🛠️ Soporte Remoto" : "📍 Servicio Técnico"
    }: ${eventData.clientName}`;

    const location = eventData.isRemote
      ? "Soporte Remoto ALFA IT (Online / Asistencia Telefónica)"
      : eventData.serviceLocation || "Instalaciones del Cliente";

    const description = [
      `🔧 SERVICIO TÉCNICO ALFA IT - FOLIO: ${eventData.serviceNumber}`,
      `🏢 Cliente: ${eventData.clientName}`,
      eventData.requesterName
        ? `👤 Solicitante: ${eventData.requesterName} ${
            eventData.requesterPhone ? `(WA: ${eventData.requesterPhone})` : ""
          }`
        : null,
      `👷‍♂️ Técnico Asignado: ${eventData.technicianName}`,
      `📡 Modalidad: ${eventData.isRemote ? "Remoto (Online)" : "Presencial en Sitio"}`,
      eventData.googleMapsUrl ? `🗺️ Maps: ${eventData.googleMapsUrl}` : null,
      "",
      "📋 ANTECEDENTES Y MOTIVO DEL REPORTE:",
      eventData.background || "Sin antecedentes registrados.",
      "",
      `📱 Abrir en ALFA OS: ${serviceUrl}`,
    ]
      .filter((l) => l !== null)
      .join("\n");

    const eventBody = {
      summary,
      location,
      description,
      start: {
        dateTime: startDateTime,
        timeZone: "America/Mexico_City",
      },
      end: {
        dateTime: endDateTime,
        timeZone: "America/Mexico_City",
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 60 },
          { method: "email", minutes: 120 },
        ],
      },
    };

    // Consultar si ya tiene un event_id en Supabase
    const adminClient = createSupabaseAdminClient();
    const { data: currentReport } = await adminClient
      .from("service_reports")
      .select("google_calendar_event_id")
      .eq("id", eventData.serviceId)
      .maybeSingle();

    const existingEventId = currentReport?.google_calendar_event_id;
    let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events`;
    let method = "POST";

    if (existingEventId) {
      url = `${url}/${encodeURIComponent(existingEventId)}`;
      method = "PUT";
    }

    const calendarRes = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    });

    if (!calendarRes.ok) {
      const errText = await calendarRes.text();
      console.error("[Google Calendar API Error]:", errText);
      return { ok: false, error: errText };
    }

    const calendarResult = await calendarRes.json();
    const eventId = calendarResult.id;
    const htmlLink = calendarResult.htmlLink;

    // Actualizar en base de datos
    await adminClient
      .from("service_reports")
      .update({
        google_calendar_event_id: eventId,
        google_calendar_event_url: htmlLink,
      })
      .eq("id", eventData.serviceId);

    return { ok: true, eventId, htmlLink };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error sincronizando con Google Calendar";
    console.error("[Google Calendar Sync Exception]:", error);
    return { ok: false, error: msg };
  }
}
