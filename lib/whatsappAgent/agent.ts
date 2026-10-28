import "server-only";

import { randomUUID } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaContentBlock,
  BetaMessageParam,
  BetaToolResultBlockParam,
  BetaToolUseBlock,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { buildTurnContext, recognizeContact } from "./context";
import { splitReply } from "./format";
import { isManyChatConfigured, sendWhatsAppTexts } from "./manychat";
import { WHATSAPP_AGENT_SYSTEM_PROMPT } from "./prompt";
import { runWhatsAppTool, WHATSAPP_AGENT_TOOLS, type ToolConversation } from "./tools";

/**
 * Corre al agente de WhatsApp sobre los mensajes pendientes de una
 * conversacion y contesta por ManyChat.
 *
 * La transcripcion (whatsapp_agent_messages) es append-only: nunca se edita
 * ni se reordena lo ya guardado, porque Claude valida que el historial que se
 * le reenvia sea el mismo (bloques de thinking) y la cache depende del prefijo.
 * Por eso los mensajes recibidos se encolan aparte (whatsapp_agent_inbound) y
 * entran a la transcripcion solo cuando un turno los procesa.
 */

const DEFAULT_MODEL = "claude-opus-5-5";
const DEFAULT_EFFORT = "low";
const MAX_TOKENS = 8000;
const MAX_TOOL_ROUNDS = 4;
const MAX_TURNS_PER_RUN = 3;
const LOCK_STALE_MS = 2 * 60_000;
const FALLBACK_REPLY =
  "Gracias por escribirnos. En este momento te atiende una persona del equipo para darte seguimiento.";

type Effort = "low" | "medium" | "high" | "xhigh" | "max";

type Conversation = ToolConversation & {
  contact_name: string | null;
  status: "active" | "handoff";
  handoff_until: string | null;
  last_inbound_processed_id: number;
};

type TranscriptRow = { role: "user" | "assistant" | "system"; content: unknown };
type NewRow = TranscriptRow & { model?: string; usage?: unknown };

function getModel() {
  return process.env.WHATSAPP_AGENT_MODEL?.trim() || DEFAULT_MODEL;
}

function getEffort(): Effort {
  const value = process.env.WHATSAPP_AGENT_EFFORT?.trim();
  return value === "medium" || value === "high" || value === "xhigh" || value === "max" ? value : DEFAULT_EFFORT;
}

async function acquireLock(supabase: SupabaseClient, conversationId: number) {
  const token = randomUUID();
  const staleBefore = new Date(Date.now() - LOCK_STALE_MS).toISOString();
  const { data, error } = await supabase
    .from("whatsapp_agent_conversations")
    .update({ run_token: token, run_started_at: new Date().toISOString() })
    .eq("id", conversationId)
    .or(`run_token.is.null,run_started_at.lt.${staleBefore}`)
    .select("id");
  if (error) throw error;
  return data && data.length ? token : null;
}

async function releaseLock(supabase: SupabaseClient, conversationId: number, token: string) {
  await supabase
    .from("whatsapp_agent_conversations")
    .update({ run_token: null, run_started_at: null })
    .eq("id", conversationId)
    .eq("run_token", token);
}

async function loadConversation(supabase: SupabaseClient, conversationId: number) {
  const { data, error } = await supabase
    .from("whatsapp_agent_conversations")
    .select(
      "id, manychat_subscriber_id, phone, contact_name, client_id, lead_id, status, handoff_until, last_inbound_processed_id"
    )
    .eq("id", conversationId)
    .single();
  if (error) throw error;
  return data as Conversation;
}

async function loadPending(supabase: SupabaseClient, conversation: Conversation) {
  const { data, error } = await supabase
    .from("whatsapp_agent_inbound")
    .select("id, text")
    .eq("conversation_id", conversation.id)
    .gt("id", conversation.last_inbound_processed_id)
    .order("id", { ascending: true });
  if (error) throw error;
  return (data || []) as { id: number; text: string }[];
}

async function loadTranscript(supabase: SupabaseClient, conversationId: number) {
  const { data, error } = await supabase
    .from("whatsapp_agent_messages")
    .select("seq, role, content")
    .eq("conversation_id", conversationId)
    .order("seq", { ascending: true });
  if (error) throw error;
  return (data || []) as (TranscriptRow & { seq: number })[];
}

async function appendTranscript(
  supabase: SupabaseClient,
  conversationId: number,
  startSeq: number,
  rows: NewRow[]
) {
  if (!rows.length) return;
  const { error } = await supabase.from("whatsapp_agent_messages").insert(
    rows.map((row, index) => ({
      conversation_id: conversationId,
      seq: startSeq + index,
      role: row.role,
      content: row.content,
      model: row.model ?? null,
      usage: row.usage ?? null,
    }))
  );
  if (error) throw error;
}

async function markProcessed(
  supabase: SupabaseClient,
  conversation: Conversation,
  lastInboundId: number,
  replied: boolean
) {
  const now = new Date().toISOString();
  await supabase
    .from("whatsapp_agent_conversations")
    .update({
      last_inbound_processed_id: lastInboundId,
      updated_at: now,
      ...(replied ? { last_reply_at: now } : {}),
    })
    .eq("id", conversation.id);
  conversation.last_inbound_processed_id = lastInboundId;
}

async function sendReplies(subscriberId: string, texts: string[]) {
  const chunks = texts.flatMap(splitReply);
  if (!chunks.length) return;
  if (!isManyChatConfigured()) {
    console.warn("[whatsapp-agent] MANYCHAT_API_TOKEN no configurado; respuesta no enviada:", chunks);
    return;
  }
  const sent = await sendWhatsAppTexts(subscriberId, chunks);
  if (!sent.ok) console.error("[whatsapp-agent] envio a ManyChat:", sent.error);
}

/** Un turno: los mensajes pendientes entran a la transcripcion y Claude responde. */
async function runTurn(
  supabase: SupabaseClient,
  client: Anthropic,
  conversation: Conversation,
  pending: { id: number; text: string }[]
) {
  const transcript = await loadTranscript(supabase, conversation.id);
  const nextSeq = transcript.length ? transcript[transcript.length - 1].seq + 1 : 1;

  const recognition = await recognizeContact(supabase, conversation.phone, conversation.client_id);
  if (recognition.clientId && recognition.clientId !== conversation.client_id) {
    conversation.client_id = recognition.clientId;
    await supabase
      .from("whatsapp_agent_conversations")
      .update({ client_id: recognition.clientId })
      .eq("id", conversation.id);
  }

  const userRow: NewRow = {
    role: "user",
    content: pending.map((item) => ({ type: "text", text: item.text })),
  };
  const contextRow: NewRow = {
    role: "system",
    content: buildTurnContext({
      now: new Date(),
      contactName: conversation.contact_name,
      recognition,
      leadId: conversation.lead_id,
    }),
  };

  const newRows: NewRow[] = [userRow, contextRow];
  const messages = [...transcript, ...newRows].map(
    (row) => ({ role: row.role, content: row.content }) as BetaMessageParam
  );
  const replies: string[] = [];
  const model = getModel();
  let handedOff = false;

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const response = await client.beta.messages.create({
        model,
        max_tokens: MAX_TOKENS,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        cache_control: { type: "ephemeral" },
        output_config: { effort: getEffort() },
        system: WHATSAPP_AGENT_SYSTEM_PROMPT,
        tools: WHATSAPP_AGENT_TOOLS,
        messages,
      });

      const content: BetaContentBlock[] = response.content;
      messages.push({ role: "assistant", content });
      newRows.push({ role: "assistant", content, model: response.model, usage: response.usage });

      for (const block of content) {
        if (block.type === "text" && block.text.trim()) replies.push(block.text.trim());
      }

      if (response.stop_reason === "refusal") {
        // Una negativa puede cortar un tool_use a la mitad: no se ejecuta nada.
        console.error("[whatsapp-agent] refusal", response.stop_details);
        replies.length = 0;
        replies.push(FALLBACK_REPLY);
        await runWhatsAppTool(supabase, conversation, "pasar_a_persona", {
          motivo: "otro",
          resumen: "El modelo se nego a responder; revisar la conversacion.",
        });
        handedOff = true;
        break;
      }

      if (response.stop_reason === "pause_turn") continue;
      if (response.stop_reason !== "tool_use") break;

      const toolUses = content.filter((block): block is BetaToolUseBlock => block.type === "tool_use");
      if (!toolUses.length) break;

      const results: BetaToolResultBlockParam[] = [];
      for (const toolUse of toolUses) {
        const outcome = await runWhatsAppTool(supabase, conversation, toolUse.name, toolUse.input);
        if (outcome.leadId) conversation.lead_id = outcome.leadId;
        if (outcome.handoff) handedOff = true;
        results.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: outcome.content,
          ...(outcome.isError ? { is_error: true } : {}),
        });
      }
      messages.push({ role: "user", content: results });
      newRows.push({ role: "user", content: results });
    }

    // Si el loop termino a media herramienta, la transcripcion quedaria con un
    // tool_use sin tool_result: se guarda solo hasta la ultima respuesta completa.
    while (newRows.length > 2) {
      const last = newRows[newRows.length - 1];
      const hasToolUse =
        Array.isArray(last.content) &&
        (last.content as BetaContentBlock[]).some((block) => block.type === "tool_use");
      if (last.role === "user" || hasToolUse) newRows.pop();
      else break;
    }

    if (newRows.length > 2) {
      await appendTranscript(supabase, conversation.id, nextSeq, newRows);
    } else {
      // Sin respuesta valida: se guarda solo lo que dijo el cliente (un
      // mensaje `system` sin respuesta despues invalidaria el historial).
      await appendTranscript(supabase, conversation.id, nextSeq, [userRow]);
    }
  } catch (error) {
    console.error("[whatsapp-agent] turno fallo:", error);
    await appendTranscript(supabase, conversation.id, nextSeq, [userRow]);
    replies.length = 0;
    replies.push(FALLBACK_REPLY);
    if (!handedOff) {
      await runWhatsAppTool(supabase, conversation, "pasar_a_persona", {
        motivo: "otro",
        resumen: "El agente fallo al responder; revisar la conversacion en ManyChat.",
      });
    }
  }

  await sendReplies(conversation.manychat_subscriber_id, replies);
  await markProcessed(supabase, conversation, pending[pending.length - 1].id, replies.length > 0);
}

/**
 * Procesa todo lo pendiente de una conversacion. Si otra corrida ya tiene el
 * candado, sale: esa corrida recoge los mensajes nuevos al terminar.
 */
export async function processWhatsAppConversation(conversationId: number) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[whatsapp-agent] ANTHROPIC_API_KEY no configurado.");
    return;
  }

  const supabase = createSupabaseAdminClient();
  const client = new Anthropic({ apiKey });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const token = await acquireLock(supabase, conversationId);
    if (!token) return;

    try {
      for (let turn = 0; turn < MAX_TURNS_PER_RUN; turn += 1) {
        const conversation = await loadConversation(supabase, conversationId);
        const pending = await loadPending(supabase, conversation);
        if (!pending.length) break;

        if (conversation.status === "handoff") {
          const stillHandedOff =
            !conversation.handoff_until || new Date(conversation.handoff_until).getTime() > Date.now();
          if (stillHandedOff) {
            // Una persona lleva la conversacion: se registra pero no se contesta.
            await appendTranscript(
              supabase,
              conversation.id,
              await nextSeqFor(supabase, conversation.id),
              [{ role: "user", content: pending.map((item) => ({ type: "text", text: item.text })) }]
            );
            await markProcessed(supabase, conversation, pending[pending.length - 1].id, false);
            break;
          }
          await supabase
            .from("whatsapp_agent_conversations")
            .update({ status: "active", handoff_until: null })
            .eq("id", conversation.id);
          conversation.status = "active";
        }

        await runTurn(supabase, client, conversation, pending);
      }
    } finally {
      await releaseLock(supabase, conversationId, token);
    }

    // Un mensaje pudo llegar justo antes de soltar el candado; si quedo
    // pendiente, se da una vuelta mas.
    const conversation = await loadConversation(supabase, conversationId);
    const pending = await loadPending(supabase, conversation);
    if (!pending.length) return;
  }
}

async function nextSeqFor(supabase: SupabaseClient, conversationId: number) {
  const { data } = await supabase
    .from("whatsapp_agent_messages")
    .select("seq")
    .eq("conversation_id", conversationId)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data as { seq: number } | null)?.seq ?? 0) + 1;
}
