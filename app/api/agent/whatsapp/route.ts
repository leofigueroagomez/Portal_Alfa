import { after, NextResponse } from "next/server";
import { createRequestId, logApiError } from "@/lib/apiAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { processWhatsAppConversation } from "@/lib/whatsappAgent/agent";
import { secretsMatch } from "@/lib/whatsappAgent/format";

/**
 * Entrada del agente de WhatsApp. ManyChat la llama con un External Request
 * por cada mensaje del cliente:
 *
 *   POST /api/agent/whatsapp
 *   Authorization: Bearer <WHATSAPP_AGENT_SECRET>
 *   { "subscriber_id": "...", "text": "...", "phone": "...", "name": "..." }
 *
 * Responde 200 de inmediato (ManyChat corta a los ~10 s) y corre al agente en
 * segundo plano con `after()`. La respuesta al cliente sale por la API de
 * ManyChat, no en este cuerpo.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Espera antes de contestar: en WhatsApp la gente manda varios mensajes
// seguidos y se contesta una sola vez a todos.
const DEBOUNCE_MS = 5_000;
const NON_TEXT_PLACEHOLDER = "[El cliente envió un mensaje sin texto: audio, foto, sticker o archivo]";

function clean(value: unknown, max: number) {
  if (typeof value === "number") return String(value);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const secret = process.env.WHATSAPP_AGENT_SECRET?.trim();

  if (!secret) {
    return NextResponse.json({ error: "Agente no configurado", requestId }, { status: 503 });
  }

  const authorization = request.headers.get("authorization") || "";
  const provided = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!provided || !(await secretsMatch(provided, secret))) {
    return NextResponse.json({ error: "No autorizado", requestId }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const subscriberId = clean(body?.subscriber_id, 40);
  if (!/^\d{1,40}$/.test(subscriberId)) {
    return NextResponse.json({ error: "subscriber_id invalido", requestId }, { status: 400 });
  }

  if (!(await checkRateLimit(`whatsapp-agent:${subscriberId}`, 30, 60_000))) {
    return NextResponse.json({ error: "Demasiados mensajes", requestId }, { status: 429 });
  }

  const text = clean(body?.text, 4000) || NON_TEXT_PLACEHOLDER;
  const phone = clean(body?.phone, 30).replace(/[^\d+]/g, "") || null;
  const name = clean(body?.name, 120) || null;

  try {
    const supabase = createSupabaseAdminClient();
    const now = new Date().toISOString();

    const { data: existing, error: findError } = await supabase
      .from("whatsapp_agent_conversations")
      .select("id, phone, contact_name")
      .eq("manychat_subscriber_id", subscriberId)
      .maybeSingle();
    if (findError) throw findError;

    let conversationId: number;
    if (existing) {
      conversationId = Number(existing.id);
      await supabase
        .from("whatsapp_agent_conversations")
        .update({
          last_inbound_at: now,
          updated_at: now,
          ...(phone && !existing.phone ? { phone } : {}),
          ...(name && !existing.contact_name ? { contact_name: name } : {}),
        })
        .eq("id", conversationId);
    } else {
      const { data: created, error: createError } = await supabase
        .from("whatsapp_agent_conversations")
        .upsert(
          { manychat_subscriber_id: subscriberId, phone, contact_name: name, last_inbound_at: now },
          { onConflict: "manychat_subscriber_id" }
        )
        .select("id")
        .single();
      if (createError) throw createError;
      conversationId = Number(created.id);
    }

    const { data: inbound, error: inboundError } = await supabase
      .from("whatsapp_agent_inbound")
      .insert({ conversation_id: conversationId, text })
      .select("id")
      .single();
    if (inboundError) throw inboundError;
    const inboundId = Number(inbound.id);

    after(async () => {
      await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS));

      // Si llego otro mensaje despues de este, esa peticion contesta a todos.
      const { data: newer } = await supabase
        .from("whatsapp_agent_inbound")
        .select("id")
        .eq("conversation_id", conversationId)
        .gt("id", inboundId)
        .limit(1);
      if (newer && newer.length) return;

      try {
        await processWhatsAppConversation(conversationId);
      } catch (error) {
        logApiError(requestId, "whatsapp agent run failed", error);
      }
    });

    return NextResponse.json({ ok: true, requestId });
  } catch (error) {
    logApiError(requestId, "whatsapp agent inbound failed", error);
    return NextResponse.json({ ok: false, requestId }, { status: 500 });
  }
}
