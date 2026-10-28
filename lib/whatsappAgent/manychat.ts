import "server-only";

/**
 * Cliente minimo de la API de ManyChat para el agente de WhatsApp.
 *
 * Se responde por la API (no en la respuesta del External Request) porque
 * ManyChat corta las peticiones externas a los ~10 s y una vuelta de Claude
 * con herramientas puede tardar mas.
 *
 * Pendiente de confirmar con una prueba real: el formato exacto de
 * `sendContent` para WhatsApp. Se usa el de la v2 documentada por ManyChat
 * (`data.version = "v2"`, `content.type = "whatsapp"`).
 */

const MANYCHAT_API = "https://api.manychat.com";

type ManyChatResult = { ok: true } | { ok: false; error: string };

function getToken() {
  return process.env.MANYCHAT_API_TOKEN?.trim() || "";
}

export function isManyChatConfigured() {
  return Boolean(getToken());
}

async function callManyChat(path: string, body: unknown): Promise<ManyChatResult> {
  const token = getToken();
  if (!token) return { ok: false, error: "MANYCHAT_API_TOKEN no configurado" };

  try {
    const response = await fetch(`${MANYCHAT_API}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    const json = (await response.json().catch(() => null)) as
      | { status?: string; message?: string }
      | null;

    if (!response.ok || json?.status !== "success") {
      return {
        ok: false,
        error: `ManyChat ${path} respondio ${response.status}: ${json?.message || "sin detalle"}`,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: `ManyChat ${path} fallo: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function subscriberIdParam(subscriberId: string) {
  // ManyChat usa ids numericos; se mandan como numero cuando caben sin perder precision.
  const asNumber = Number(subscriberId);
  return Number.isSafeInteger(asNumber) ? asNumber : subscriberId;
}

export function sendWhatsAppTexts(subscriberId: string, texts: string[]) {
  return callManyChat("/fb/sending/sendContent", {
    subscriber_id: subscriberIdParam(subscriberId),
    data: {
      version: "v2",
      content: {
        type: "whatsapp",
        messages: texts.map((text) => ({ type: "text", text })),
      },
    },
  });
}

export function addTagByName(subscriberId: string, tagName: string) {
  return callManyChat("/fb/subscriber/addTagByName", {
    subscriber_id: subscriberIdParam(subscriberId),
    tag_name: tagName,
  });
}
