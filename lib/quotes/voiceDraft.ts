import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDraftQuote } from "./draftBuilder";
import { buildDraftFromTemplate, listQuoteTemplates } from "./templates";

/**
 * Sprint G4 - Voz/texto -> intencion -> borrador de cotizacion.
 *
 * Un loop de herramientas sobre Claude: recibe la transcripcion de lo que Leo
 * dicto, usa las herramientas para resolver cliente + productos + plantillas, y
 * crea un borrador via draftBuilder. Si algo es genuinamente ambiguo, pide
 * aclaracion en vez de adivinar. El borrador SIEMPRE se abre para revision.
 */

const DEFAULT_MODEL = "claude-sonnet-5";
const MAX_TURNS = 8;
const MAX_TOKENS = 1500;

/** Quita metacaracteres de filtro PostgREST de un termino de busqueda libre. */
function safeTerm(value: string): string {
  return value.replace(/[(),.:%*\\]/g, " ").replace(/\s+/g, " ").trim();
}
const DEFAULT_MONTHLY_CAP_USD = 15;
const PRICE_IN = 3;
const PRICE_OUT = 15;

function envNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function costUsd(inputTokens: number, outputTokens: number): number {
  const cost =
    (inputTokens / 1_000_000) * envNumber("VIGIA_PRICE_INPUT_USD_PER_MTOK", PRICE_IN) +
    (outputTokens / 1_000_000) * envNumber("VIGIA_PRICE_OUTPUT_USD_PER_MTOK", PRICE_OUT);
  return Math.round(cost * 10_000) / 10_000;
}

async function monthlySpendUsd(supabase: SupabaseClient): Promise<number> {
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
  const { data } = await supabase
    .from("quote_voice_drafts")
    .select("cost_usd")
    .gte("started_at", monthStart);
  return (data ?? []).reduce(
    (sum, r) => sum + Number((r as { cost_usd: number | null }).cost_usd ?? 0),
    0,
  );
}

// ---------------------------------------------------------------------------
// Herramientas
// ---------------------------------------------------------------------------

type AnthropicTool = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

const TOOLS: AnthropicTool[] = [
  {
    name: "buscar_cliente",
    description:
      "Busca clientes por nombre o empresa. Devuelve hasta 5 coincidencias con su id.",
    input_schema: {
      type: "object",
      properties: { texto: { type: "string" } },
      required: ["texto"],
    },
  },
  {
    name: "buscar_producto",
    description:
      "Busca productos del catalogo por marca, modelo o descripcion. Devuelve hasta 8 coincidencias con id y precio de catalogo. NUNCA inventes un product_id: usa solo los que devuelve esta herramienta.",
    input_schema: {
      type: "object",
      properties: { texto: { type: "string" } },
      required: ["texto"],
    },
  },
  {
    name: "buscar_mano_de_obra",
    description:
      "Busca actividades de mano de obra del catalogo por nombre. Devuelve hasta 8 con id y precio.",
    input_schema: {
      type: "object",
      properties: { texto: { type: "string" } },
      required: ["texto"],
    },
  },
  {
    name: "listar_plantillas",
    description:
      "Lista las plantillas de cotizacion disponibles (paquetes estandar) con su id, escenario y numero de lineas.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "crear_borrador",
    description:
      "Crea el borrador de cotizacion. Termina la conversacion. Usa product_id y labor_activity_id reales de las busquedas.",
    input_schema: {
      type: "object",
      properties: {
        client_id: { type: "number" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              product_id: { type: "number" },
              qty: { type: "number" },
            },
            required: ["product_id", "qty"],
          },
        },
        labor: {
          type: "array",
          items: {
            type: "object",
            properties: {
              labor_activity_id: { type: "number" },
              qty: { type: "number" },
            },
            required: ["labor_activity_id", "qty"],
          },
        },
        template_id: {
          type: "number",
          description: "Opcional: si el pedido calza con una plantilla, usala en vez de items sueltos.",
        },
        notas: { type: "string" },
        supuestos: {
          type: "array",
          items: { type: "string" },
          description: "Que asumiste al elegir cliente/productos/cantidades. Para que Leo lo revise.",
        },
      },
      required: ["client_id"],
    },
  },
  {
    name: "pedir_aclaracion",
    description:
      "Usa esto SOLO si no puedes resolver el pedido sin adivinar a ciegas (varios clientes iguales, producto imposible de identificar). Termina la conversacion con una pregunta corta.",
    input_schema: {
      type: "object",
      properties: {
        pregunta: { type: "string" },
        opciones: { type: "array", items: { type: "string" } },
      },
      required: ["pregunta"],
    },
  },
];

const SYSTEM_PROMPT = `Eres el asistente de cotizacion de ALFA (integradora mexicana de A/V, automatizacion y seguridad).
Leo te dicta un pedido, normalmente desde el coche. Tu trabajo: convertir ese pedido en un BORRADOR de cotizacion.

Reglas:
- Usa las herramientas para resolver el cliente y cada producto/actividad. NUNCA inventes un id.
- ALFA cotiza a precio de catalogo del producto; tu no fijas precios ni margenes.
- Si el pedido calza claramente con una plantilla, usa template_id en crear_borrador.
- Prefiere AVANZAR con un supuesto razonable (y anotarlo en "supuestos") antes que frenar todo. Solo usa pedir_aclaracion si de verdad no puedes elegir sin adivinar a ciegas.
- Cuando tengas cliente + al menos un producto o actividad (o una plantilla), llama crear_borrador.
- El borrador se abre para revision de Leo; no se envia a nadie.
- Se breve. No expliques tu proceso, solo usa las herramientas.`;

type ToolRunner = (input: Record<string, unknown>) => Promise<unknown>;

function buildToolRunners(supabase: SupabaseClient): Record<string, ToolRunner> {
  const num = (v: unknown) => Number(v ?? 0);
  const text = (v: unknown) => String(v ?? "").trim();

  return {
    async buscar_cliente(input) {
      const q = safeTerm(text(input.texto));
      if (!q) return { clientes: [] };
      const { data } = await supabase
        .from("clients")
        .select("id, client_number, name, company_name")
        .or(`name.ilike.%${q}%,company_name.ilike.%${q}%`)
        .limit(5);
      return { clientes: data ?? [] };
    },
    async buscar_producto(input) {
      const q = safeTerm(text(input.texto));
      if (!q) return { productos: [] };
      const words = q.split(/\s+/).filter((w) => w.length >= 2).slice(0, 4);
      const filter = words
        .map((w) => `brand.ilike.%${w}%,model.ilike.%${w}%,name.ilike.%${w}%`)
        .join(",");
      const { data } = await supabase
        .from("products")
        .select("id, brand, model, name, calculated_sale_price, sale_currency")
        .eq("is_active", true)
        .or(filter || `name.ilike.%${q}%`)
        .limit(8);
      return {
        productos: (data ?? []).map((p) => ({
          id: (p as { id: number }).id,
          nombre: `${text((p as { brand: unknown }).brand)} ${text((p as { model: unknown }).model)}`.trim() || text((p as { name: unknown }).name),
          precio_catalogo: num((p as { calculated_sale_price: unknown }).calculated_sale_price),
          moneda: text((p as { sale_currency: unknown }).sale_currency) || "USD",
        })),
      };
    },
    async buscar_mano_de_obra(input) {
      const q = safeTerm(text(input.texto));
      const { data } = await supabase
        .from("labor_activity_catalog")
        .select("id, name, default_unit, default_sale_price_mxn")
        .eq("is_active", true)
        .ilike("name", `%${q}%`)
        .limit(8);
      return {
        actividades: (data ?? []).map((a) => ({
          id: (a as { id: number }).id,
          nombre: text((a as { name: unknown }).name),
          unidad: text((a as { default_unit: unknown }).default_unit),
          precio_mxn: num((a as { default_sale_price_mxn: unknown }).default_sale_price_mxn),
        })),
      };
    },
    async listar_plantillas() {
      const templates = await listQuoteTemplates(supabase);
      return {
        plantillas: templates.map((t) => ({
          id: t.id,
          nombre: t.name,
          escenario: t.scenario,
          lineas: t.lines.length,
        })),
      };
    },
    // crear_borrador y pedir_aclaracion se manejan como terminales en el loop.
    async crear_borrador() {
      return {};
    },
    async pedir_aclaracion() {
      return {};
    },
  };
}

// ---------------------------------------------------------------------------
// Loop principal
// ---------------------------------------------------------------------------

export type VoiceDraftOutcome = {
  status: "completada" | "aclaracion" | "error" | "sin_presupuesto";
  quoteId?: number;
  grandTotalMxn?: number;
  assumptions?: string[];
  warnings?: string[];
  question?: string;
  options?: string[];
  error?: string;
  costUsd?: number;
};

type ConversationMessage = { role: "user" | "assistant"; content: unknown };

export async function runVoiceDraft(
  supabase: SupabaseClient,
  params: { transcript: string; conversation?: ConversationMessage[]; actor: string },
): Promise<VoiceDraftOutcome> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { status: "error", error: "ANTHROPIC_API_KEY no configurado." };
  }
  const transcript = (params.transcript || "").trim();
  if (!transcript) return { status: "error", error: "Transcripcion vacia." };

  const model = process.env.QUOTE_VOICE_MODEL || DEFAULT_MODEL;
  const capUsd = envNumber("QUOTE_VOICE_MONTHLY_CAP_USD", DEFAULT_MONTHLY_CAP_USD);

  const spent = await monthlySpendUsd(supabase);
  if (spent >= capUsd) {
    await supabase.from("quote_voice_drafts").insert({
      transcript,
      actor: params.actor,
      status: "sin_presupuesto",
      error: `Tope mensual de dictado alcanzado ($${spent.toFixed(2)} / $${capUsd.toFixed(2)}).`,
      finished_at: new Date().toISOString(),
    });
    return {
      status: "sin_presupuesto",
      error: `Tope mensual de cotización por voz alcanzado ($${spent.toFixed(
        2,
      )} USD). Se reanuda el 1 del mes o sube QUOTE_VOICE_MONTHLY_CAP_USD.`,
    };
  }

  const { data: logRow } = await supabase
    .from("quote_voice_drafts")
    .insert({ transcript, actor: params.actor, status: "running", model })
    .select("id")
    .single();
  const logId = (logRow as { id: number } | null)?.id;

  const runners = buildToolRunners(supabase);
  const messages: ConversationMessage[] = params.conversation?.length
    ? [...params.conversation, { role: "user", content: transcript }]
    : [{ role: "user", content: transcript }];

  const toolTrace: Array<{ tool: string; input: unknown; output?: unknown }> = [];
  let inputTokens = 0;
  let outputTokens = 0;

  const finish = async (outcome: VoiceDraftOutcome) => {
    const cost = costUsd(inputTokens, outputTokens);
    if (logId) {
      await supabase
        .from("quote_voice_drafts")
        .update({
          status: outcome.status,
          result_quote_id: outcome.quoteId ?? null,
          clarification_question: outcome.question ?? null,
          assumptions: outcome.assumptions ?? null,
          tool_calls: toolTrace,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cost_usd: cost,
          error: outcome.error ?? null,
          finished_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }
    return { ...outcome, costUsd: cost };
  };

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        return finish({
          status: "error",
          error: `Anthropic rechazo (${response.status}): ${body.slice(0, 300)}`,
        });
      }

      const data = (await response.json()) as {
        content?: Array<Record<string, unknown>>;
        usage?: { input_tokens?: number; output_tokens?: number };
        stop_reason?: string;
      };
      inputTokens += Number(data.usage?.input_tokens ?? 0);
      outputTokens += Number(data.usage?.output_tokens ?? 0);

      const content = data.content ?? [];
      const toolUses = content.filter((b) => b.type === "tool_use");

      if (toolUses.length === 0) {
        // El modelo respondio con texto y no llamo herramientas: tratar como aclaracion.
        const textBlock = content.find((b) => b.type === "text");
        return finish({
          status: "aclaracion",
          question:
            (textBlock?.text as string | undefined)?.trim() ||
            "No pude entender el pedido. ¿Puedes repetirlo con el cliente y los equipos?",
        });
      }

      // Terminales
      const createCall = toolUses.find((b) => b.name === "crear_borrador");
      if (createCall) {
        const input = (createCall.input ?? {}) as Record<string, unknown>;
        toolTrace.push({ tool: "crear_borrador", input });
        const clientId = Number(input.client_id);
        if (!clientId) {
          return finish({ status: "error", error: "El agente no resolvio un cliente." });
        }
        const templateId = Number(input.template_id) || null;
        const assumptions = Array.isArray(input.supuestos)
          ? (input.supuestos as unknown[]).map((s) => String(s))
          : [];
        const notas = input.notas ? String(input.notas) : undefined;

        if (templateId) {
          const result = await buildDraftFromTemplate(supabase, {
            templateId,
            clientId,
            notes: notas ?? null,
          });
          return finish({
            status: "completada",
            quoteId: result.quote_id,
            grandTotalMxn: result.grand_total_mxn,
            warnings: result.warnings,
            assumptions,
          });
        }

        const items = Array.isArray(input.items)
          ? (input.items as Array<Record<string, unknown>>)
              .map((it) => ({ product_id: Number(it.product_id), qty: Number(it.qty) }))
              .filter((it) => it.product_id > 0 && it.qty > 0)
          : [];
        const labor = Array.isArray(input.labor)
          ? (input.labor as Array<Record<string, unknown>>)
              .map((it) => ({
                labor_activity_id: Number(it.labor_activity_id),
                qty: Number(it.qty),
              }))
              .filter((it) => it.labor_activity_id > 0 && it.qty > 0)
          : [];
        if (items.length === 0 && labor.length === 0) {
          return finish({
            status: "error",
            error: "El agente no resolvio ningun producto ni actividad.",
          });
        }
        const result = await buildDraftQuote(supabase, {
          client_id: clientId,
          items,
          labor,
          notes: notas,
        });
        return finish({
          status: "completada",
          quoteId: result.quote_id,
          grandTotalMxn: result.grand_total_mxn,
          warnings: result.warnings,
          assumptions,
        });
      }

      const askCall = toolUses.find((b) => b.name === "pedir_aclaracion");
      if (askCall) {
        const input = (askCall.input ?? {}) as Record<string, unknown>;
        toolTrace.push({ tool: "pedir_aclaracion", input });
        return finish({
          status: "aclaracion",
          question: String(input.pregunta ?? "¿Puedes dar más detalle?"),
          options: Array.isArray(input.opciones)
            ? (input.opciones as unknown[]).map((o) => String(o))
            : undefined,
        });
      }

      // Herramientas de lectura: ejecutarlas y continuar el loop.
      messages.push({ role: "assistant", content });
      const toolResults = [];
      for (const use of toolUses) {
        const runner = runners[use.name as string];
        let output: unknown;
        try {
          output = runner
            ? await runner((use.input ?? {}) as Record<string, unknown>)
            : { error: `herramienta desconocida: ${use.name}` };
        } catch (error) {
          output = { error: error instanceof Error ? error.message : String(error) };
        }
        toolTrace.push({ tool: String(use.name), input: use.input, output });
        toolResults.push({
          type: "tool_result",
          tool_use_id: use.id,
          content: JSON.stringify(output),
        });
      }
      messages.push({ role: "user", content: toolResults });
    }

    return finish({
      status: "aclaracion",
      question:
        "El pedido necesita más detalle del que puedo resolver. Ábrelo en la app o dícta de nuevo con el cliente y los equipos.",
    });
  } catch (error) {
    return finish({
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
