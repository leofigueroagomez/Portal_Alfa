import "server-only";

import type {
  InterpretResult,
  Interpretation,
  InvestigationDossier,
  InvestigationFinding,
} from "./types";

/**
 * La unica llamada al modelo por investigacion (Sprint B2).
 *
 * Recibe el expediente determinista y devuelve una interpretacion estructurada
 * via tool use (structured output). No razona sobre datos que no esten en el
 * expediente; no propone escribir nada en la base.
 */

const DEFAULT_MODEL = "claude-sonnet-5";
const MAX_TOKENS = 1500;

const SYSTEM_PROMPT = `Eres "El Vigia" de ALFA OS, el ERP de una integradora mexicana de A/V, automatizacion y seguridad.
Te dan un EXPEDIENTE ya armado (consultas de solo lectura sobre la base) de un hallazgo de integridad de datos o de costos.
Tu trabajo: dar la causa raiz y la accion recomendada, en español, para el dueño (Leo), que no es tecnico.

Reglas:
- Basate SOLO en los datos del expediente. Si algo no esta, dilo ("no consta en el expediente"), no lo inventes.
- "explicacion" es para Leo: 2 a 4 frases, sin jerga de base de datos, di que esta viendo en pantalla y por que.
- "accion_recomendada" concreta. Si es seguro que un ejecutor automatico lo arregle, di es_automatizable=true e indica que partidas conservar/eliminar. Si hay compras u ordenes de trabajo en mas de un lado, es_automatizable=false y explica por que necesita mano humana.
- Se conservador: ante la duda, es_automatizable=false y confianza "media" o "baja".
- No recomiendes tocar datos fiscales ni de facturacion.`;

const TOOL = {
  name: "registrar_diagnostico",
  description: "Registra el diagnostico de causa raiz y la accion recomendada para el hallazgo.",
  input_schema: {
    type: "object" as const,
    properties: {
      causa_raiz: {
        type: "string",
        description: "Una frase: la causa raiz tecnica del problema.",
      },
      explicacion: {
        type: "string",
        description: "2-4 frases para el dueño no tecnico: que ve en pantalla, por que paso, que tan grave es.",
      },
      accion_recomendada: {
        type: "string",
        description: "Que hacer, concreto y accionable.",
      },
      es_automatizable: {
        type: "boolean",
        description: "true solo si un ejecutor automatico puede arreglarlo sin riesgo segun el expediente.",
      },
      partidas_a_conservar: {
        type: "array",
        items: { type: "number" },
        description: "IDs de partidas operativas a conservar, si aplica.",
      },
      partidas_a_eliminar: {
        type: "array",
        items: { type: "number" },
        description: "IDs de partidas operativas a eliminar/desactivar, si aplica.",
      },
      riesgos: {
        type: "string",
        description: "Que podria salir mal o que vigilar al aplicar la accion.",
      },
      pasos_verificacion: {
        type: "array",
        items: { type: "string" },
        description: "Pasos para confirmar que quedo resuelto.",
      },
      confianza: {
        type: "string",
        enum: ["alta", "media", "baja"],
      },
    },
    required: [
      "causa_raiz",
      "explicacion",
      "accion_recomendada",
      "es_automatizable",
      "confianza",
    ],
  },
};

function buildUserPrompt(
  finding: InvestigationFinding,
  dossier: InvestigationDossier,
): string {
  return [
    `HALLAZGO: [${finding.sensor_id}] ${finding.title}`,
    finding.entity_label ? `ENTIDAD: ${finding.entity_label}` : "",
    `RESUMEN DEL SENSOR: ${finding.summary}`,
    finding.proposed_action
      ? `ACCION QUE EL SENSOR PROPUSO: ${JSON.stringify(finding.proposed_action)}`
      : "",
    "",
    `PLAYBOOK: ${dossier.playbook}`,
    `RESUMEN DEL EXPEDIENTE: ${dossier.resumen}`,
    "",
    dossier.senales.length
      ? `SEÑALES DETERMINISTAS (pistas, no la conclusion):\n- ${dossier.senales.join("\n- ")}`
      : "SEÑALES DETERMINISTAS: ninguna.",
    "",
    "EXPEDIENTE COMPLETO (JSON):",
    JSON.stringify(dossier.bloques, null, 1),
    "",
    "Llama a registrar_diagnostico con tu conclusion.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function interpret(
  finding: InvestigationFinding,
  dossier: InvestigationDossier,
): Promise<InterpretResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY no configurado: no se puede correr la interpretacion de la investigacion.",
    );
  }
  const model = process.env.VIGIA_INVESTIGATE_MODEL || DEFAULT_MODEL;

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
      tools: [TOOL],
      tool_choice: { type: "tool", name: TOOL.name },
      messages: [{ role: "user", content: buildUserPrompt(finding, dossier) }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic rechazo la interpretacion (${response.status}): ${body.slice(0, 500)}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; name?: string; input?: unknown }>;
    usage?: { input_tokens?: number; output_tokens?: number };
    stop_reason?: string;
  };

  const toolUse = (data.content ?? []).find(
    (b) => b.type === "tool_use" && b.name === TOOL.name,
  );
  if (!toolUse || !toolUse.input || typeof toolUse.input !== "object") {
    throw new Error(
      `El modelo no devolvio el diagnostico estructurado (stop_reason: ${data.stop_reason ?? "?"}).`,
    );
  }

  const raw = toolUse.input as Record<string, unknown>;
  const interpretation: Interpretation = {
    causa_raiz: String(raw.causa_raiz ?? "").trim(),
    explicacion: String(raw.explicacion ?? "").trim(),
    accion_recomendada: String(raw.accion_recomendada ?? "").trim(),
    es_automatizable: Boolean(raw.es_automatizable),
    partidas_a_conservar: Array.isArray(raw.partidas_a_conservar)
      ? (raw.partidas_a_conservar as unknown[]).map(Number).filter(Number.isFinite)
      : undefined,
    partidas_a_eliminar: Array.isArray(raw.partidas_a_eliminar)
      ? (raw.partidas_a_eliminar as unknown[]).map(Number).filter(Number.isFinite)
      : undefined,
    riesgos: raw.riesgos ? String(raw.riesgos).trim() : undefined,
    pasos_verificacion: Array.isArray(raw.pasos_verificacion)
      ? (raw.pasos_verificacion as unknown[]).map((s) => String(s).trim()).filter(Boolean)
      : undefined,
    confianza:
      raw.confianza === "alta" || raw.confianza === "baja"
        ? raw.confianza
        : "media",
  };

  return {
    interpretation,
    usage: {
      input_tokens: Number(data.usage?.input_tokens ?? 0),
      output_tokens: Number(data.usage?.output_tokens ?? 0),
    },
    model,
  };
}
