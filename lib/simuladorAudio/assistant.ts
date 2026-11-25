import { DEFAULT_SIMULATOR_AMPLIFIER } from "@/lib/simuladorAudio/amplifiers";
import { COVERAGE_MODES, type CoverageMode } from "@/lib/simuladorAudio/geometry";
import {
  sanitizeTvRoom,
  soundbarVerdict,
  type SoundbarId,
  type SoundbarVerdict,
  type TvRoom,
} from "@/lib/simuladorAudio/soundbar";
import { getSimulatorSpeaker } from "@/lib/simuladorAudio/speakers";

/**
 * Asistente de entrada del simulador de audio.
 *
 * El visitante contesta unas preguntas por espacio y recibe una solucion
 * inicial. Las reglas son fijas (sin IA): son el criterio de diseño de ALFA
 * escrito una vez, para que la recomendacion sea predecible y nunca proponga
 * algo que ALFA no vende.
 *
 * REGLAS PROVISIONALES. Las de television (que barra, cuando lleva subwoofer,
 * que bocina va atras) las propuso Claude el 2026-11-23 y estan pendientes de
 * que Leo las valide. Estan todas en `recommendSpace`.
 *
 * Ese mismo dia se contrastaron con lo que publica Sonos: todas las
 * combinaciones son compatibles y coinciden con sus paquetes (Arc Ultra con
 * Sub 4, Beam con Sub Mini, par de Era o un Sonos Amp con bocinas pasivas
 * como traseras). Las citas estan en
 * docs/modules/simulador-audio/MODULE_CONTEXT.md. Que sean compatibles no las
 * vuelve criterio de ALFA: eso lo decide Leo.
 *
 * Que barra va (Beam o Arc Ultra) ya no depende solo del tipo de espacio: si
 * el visitante da las medidas, lo decide `soundbarVerdict` (soundbar.ts).
 */

export type SpaceKind = "sala" | "recamara" | "cocina" | "terraza" | "negocio";
export type TvChoice = "no" | "mejor" | "cine";
export type SurroundChoice = "techo" | "muro" | "inalambricas";
export type StageChoice = "obra" | "terminado";

export type AssistantAnswers = {
  space: SpaceKind;
  tv: TvChoice;
  /** Solo cuando `tv` es "cine": donde van las bocinas de atras. */
  surround?: SurroundChoice;
  /** Solo con television y si el visitante las dio: medidas para elegir la barra. */
  tvRoom?: TvRoom;
  /** Ambiente: mismas llaves que el simulador. */
  use: CoverageMode;
  stage: StageChoice;
};

export const SPACE_OPTIONS: Record<SpaceKind, { label: string; hint: string }> = {
  sala: { label: "Sala o family", hint: "Donde se reúne la familia" },
  recamara: { label: "Recámara", hint: "Un espacio para descansar" },
  cocina: { label: "Cocina o comedor", hint: "Música mientras cocinas o comes" },
  terraza: { label: "Terraza o jardín", hint: "Al aire libre" },
  negocio: { label: "Oficina o negocio", hint: "Restaurante, tienda, consultorio" },
};

export const TV_OPTIONS: Record<TvChoice, { label: string; hint: string }> = {
  no: { label: "No hay televisión", hint: "Solo quiero música" },
  mejor: { label: "Sí, que se oiga mejor", hint: "Voces claras y buen sonido, sin complicarme" },
  cine: { label: "Sí, cine en casa", hint: "Sonido envolvente, con bocinas atrás" },
};

export const SURROUND_OPTIONS: Record<SurroundChoice, { label: string; hint: string }> = {
  techo: { label: "En el techo", hint: "Empotradas, casi no se ven" },
  muro: { label: "En el muro", hint: "Sobrepuestas en la pared de atrás" },
  inalambricas: { label: "Inalámbricas", hint: "Sobre un mueble o base, sin cablear" },
};

export const STAGE_OPTIONS: Record<StageChoice, { label: string; hint: string }> = {
  obra: { label: "En obra o remodelación", hint: "Todavía se puede cablear y empotrar" },
  terminado: { label: "Ya está terminado", hint: "Prefiero no abrir techos ni muros" },
};

/** Equipo para la television. Sin precios. */
export type TvProduct = {
  id: string;
  brand: string;
  model: string;
  label: string;
  image: string;
  /** id en `products` de ALFA OS (produccion). */
  productId: number;
};

export const TV_PRODUCTS = {
  "sonos-arc-ultra": {
    id: "sonos-arc-ultra",
    brand: "Sonos",
    model: "Arc Ultra",
    label: "Barra de sonido",
    image: "/simulador/sonos-arc-ultra.png",
    productId: 100,
  },
  "sonos-beam": {
    id: "sonos-beam",
    brand: "Sonos",
    model: "Beam",
    label: "Barra de sonido compacta",
    image: "/simulador/sonos-beam.png",
    productId: 166,
  },
  "sonos-sub-4": {
    id: "sonos-sub-4",
    brand: "Sonos",
    model: "Sub 4",
    label: "Subwoofer inalámbrico",
    image: "/simulador/sonos-sub-4.png",
    productId: 98,
  },
  "sonos-sub-mini": {
    id: "sonos-sub-mini",
    brand: "Sonos",
    model: "Sub Mini",
    label: "Subwoofer inalámbrico compacto",
    image: "/simulador/sonos-sub-mini.png",
    productId: 179,
  },
} satisfies Record<string, TvProduct>;

export type EquipmentLine = {
  key: string;
  /** Para que es dentro de la solucion. */
  role: string;
  name: string;
  label: string;
  image: string | null;
  /** 0 cuando la cantidad depende del tamaño del espacio y la define el simulador. */
  count: number;
};

export type SpaceRecommendation = {
  answers: AssistantAnswers;
  title: string;
  reasons: string[];
  /** Equipo para la television (barra, subwoofer, traseras y su amplificador). */
  tv: EquipmentLine[];
  /** Por que esa barra, cuando el visitante dio las medidas del espacio. */
  soundbar: SoundbarVerdict | null;
  /** Bocinas de musica; su cantidad y lugar se afinan en el simulador. */
  music: { modelId: string; mode: CoverageMode; line: EquipmentLine } | null;
};

function productLine(id: keyof typeof TV_PRODUCTS, role: string, count = 1): EquipmentLine {
  const product = TV_PRODUCTS[id];
  return {
    key: product.id,
    role,
    name: `${product.brand} ${product.model}`,
    label: product.label,
    image: product.image,
    count,
  };
}

function speakerLine(modelId: string, role: string, count: number): EquipmentLine {
  const speaker = getSimulatorSpeaker(modelId);
  return {
    key: modelId,
    role,
    name: speaker ? `${speaker.brand} ${speaker.model}` : modelId,
    label: speaker?.label || "",
    image: speaker?.image || null,
    count,
  };
}

function amplifierLine(role: string): EquipmentLine {
  const amplifier = DEFAULT_SIMULATOR_AMPLIFIER;
  return {
    key: amplifier.id,
    role,
    name: `${amplifier.brand} ${amplifier.model}`,
    label: amplifier.label,
    image: amplifier.image,
    count: 1,
  };
}

/** Bocina de musica segun el espacio y si se puede cablear. */
function musicModel(answers: AssistantAnswers) {
  // Exterior: la de muro que ALFA usa para sobreponer.
  if (answers.space === "terraza") return "bw-am1";
  // En obra: bocina de plafon con Sonos Amp, el estandar de ALFA.
  if (answers.stage === "obra") return "kef-ci160er";
  // Terminado: inalambrica. La mas grande para los espacios mas grandes.
  return answers.space === "sala" || answers.space === "negocio"
    ? "sonos-era-300"
    : "sonos-era-100";
}

export function recommendSpace(answers: AssistantAnswers): SpaceRecommendation {
  const reasons: string[] = [];
  const tvLines: EquipmentLine[] = [];
  // En terraza no se propone barra de sonido: son equipos de interior.
  const tv: TvChoice = answers.space === "terraza" ? "no" : answers.tv;
  const bigRoom = answers.space === "sala" || answers.space === "negocio";
  // Con medidas, la barra sale de la comprobacion. Sin medidas (PROVISIONAL):
  // Arc Ultra en sala y negocio; Beam en recamara y cocina.
  const soundbar = tv !== "no" && answers.tvRoom ? soundbarVerdict(answers.tvRoom) : null;
  const bar: SoundbarId = soundbar
    ? soundbar.chosen
    : bigRoom
      ? "sonos-arc-ultra"
      : "sonos-beam";
  // El subwoofer y las traseras inalambricas acompañan a la barra elegida.
  const bigBar = bar === "sonos-arc-ultra";

  if (tv !== "no") {
    tvLines.push(productLine(bar, "Bajo la televisión"));
    // Con medidas, el porque de la barra va aparte, en `soundbar`.
    if (!soundbar) {
      reasons.push(
        bigBar
          ? "Una barra de sonido grande llena el espacio y deja las voces claras."
          : "Una barra compacta es suficiente para un espacio de este tamaño."
      );
    }
  }

  if (tv === "cine") {
    // PROVISIONAL: el cine en casa siempre lleva subwoofer.
    tvLines.push(productLine(bigBar ? "sonos-sub-4" : "sonos-sub-mini", "Graves"));
    reasons.push("El subwoofer da el golpe de las películas sin subir el volumen.");

    const surround = answers.surround || "inalambricas";
    if (surround === "inalambricas") {
      // PROVISIONAL: Era 300 con Arc Ultra; Era 100 con Beam.
      tvLines.push(
        speakerLine(bigBar ? "sonos-era-300" : "sonos-era-100", "Atrás, inalámbricas", 2)
      );
      reasons.push("Las bocinas de atrás son inalámbricas: solo necesitan un contacto.");
    } else {
      // PROVISIONAL: KEF de plafon en techo; B&W AM-1 en muro. Las mueve un Sonos Amp.
      tvLines.push(
        speakerLine(
          surround === "techo" ? "kef-ci160er" : "bw-am1",
          surround === "techo" ? "Atrás, en el techo" : "Atrás, en el muro",
          2
        )
      );
      tvLines.push(amplifierLine("Mueve las bocinas de atrás"));
      reasons.push(
        answers.stage === "terminado"
          ? "Las bocinas de atrás van cableadas: como el espacio ya está terminado, hay que pasar cable por techo o muro."
          : "Las bocinas de atrás van cableadas a un amplificador, y casi no se ven."
      );
    }
  }

  // Musica aparte de la tele: siempre que no haya tele; con barra sola, solo si
  // se quiere mas que musica de fondo; con cine en casa, el sistema ya la cubre.
  const wantsMusic =
    tv === "no" || answers.space === "terraza" || (tv === "mejor" && answers.use !== "ambiental");
  let music: SpaceRecommendation["music"] = null;

  if (wantsMusic) {
    const modelId = musicModel(answers);
    const speaker = getSimulatorSpeaker(modelId);
    music = {
      modelId,
      mode: answers.use,
      line: speakerLine(modelId, "Música", 0),
    };

    if (answers.space === "terraza") {
      reasons.push("En exterior van bocinas de muro, hechas para intemperie.");
    } else if (speaker?.selfPowered) {
      reasons.push(
        "Como el espacio ya está terminado, la música va con bocinas inalámbricas: sin abrir techos ni muros."
      );
    } else {
      reasons.push(
        "Como está en obra, la música va con bocinas de plafón: quedan empotradas y reparten el sonido parejo."
      );
    }
  } else if (tv === "cine") {
    reasons.push("El mismo sistema de cine sirve para escuchar música en este espacio.");
  }

  if (answers.space === "negocio") {
    reasons.push(
      "En un negocio grande puede convenir audio comercial; un asesor de ALFA lo revisa contigo."
    );
  }

  const title =
    tv === "cine"
      ? "Cine en casa"
      : tv === "mejor"
        ? music
          ? "Barra de sonido y música"
          : "Barra de sonido"
        : `Música ${COVERAGE_MODES[answers.use].label.toLowerCase()}`;

  return { answers: { ...answers, tv }, title, reasons, tv: tvLines, soundbar, music };
}

function isKey<T extends string>(value: unknown, options: Record<T, unknown>): value is T {
  return typeof value === "string" && value in options;
}

/** Valida las respuestas que llegan del navegador. */
export function sanitizeAnswers(raw: unknown): AssistantAnswers | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;

  if (!isKey(input.space, SPACE_OPTIONS)) return null;
  if (!isKey(input.tv, TV_OPTIONS)) return null;
  if (!isKey(input.use, COVERAGE_MODES)) return null;
  if (!isKey(input.stage, STAGE_OPTIONS)) return null;

  const answers: AssistantAnswers = {
    space: input.space,
    tv: input.tv,
    use: input.use,
    stage: input.stage,
  };

  if (input.tv === "cine") {
    if (!isKey(input.surround, SURROUND_OPTIONS)) return null;
    answers.surround = input.surround;
  }

  // Las medidas son opcionales; si vienen, tienen que ser validas. En terraza
  // no hay barra de sonido, asi que no aplican.
  if (input.tv !== "no" && input.space !== "terraza" && input.tvRoom != null) {
    const tvRoom = sanitizeTvRoom(input.tvRoom);
    if (!tvRoom) return null;
    answers.tvRoom = tvRoom;
  }

  return answers;
}

export const MAX_ASSISTANT_SPACES = 12;

export function sanitizeAssistantSpaces(raw: unknown): AssistantAnswers[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_ASSISTANT_SPACES) return null;

  const spaces: AssistantAnswers[] = [];
  for (const item of raw) {
    const answers = sanitizeAnswers(item);
    if (!answers) return null;
    spaces.push(answers);
  }

  return spaces;
}

function describeLine(line: EquipmentLine) {
  return line.count > 1 ? `${line.count} × ${line.name}` : line.name;
}

/** Resumen en texto de lo que contesto el visitante y lo que se le propuso, para el prospecto. */
export function summarizeAssistant(spaces: AssistantAnswers[]) {
  const lines = ["Respuestas del asistente del simulador de audio:"];

  for (const answers of spaces) {
    const recommendation = recommendSpace(answers);
    const tv = recommendation.answers.tv;
    const tvText =
      tv === "no"
        ? "sin televisión"
        : tv === "mejor"
          ? "con televisión (que se oiga mejor)"
          : `con televisión (cine en casa, traseras ${
              answers.surround === "techo"
                ? "en techo"
                : answers.surround === "muro"
                  ? "en muro"
                  : "inalámbricas"
            })`;
    const equipment = [
      ...recommendation.tv.map(describeLine),
      ...(recommendation.music ? [`música con ${recommendation.music.line.name}`] : []),
    ].join(", ");

    lines.push(
      `- ${SPACE_OPTIONS[answers.space].label}: ${tvText}; ambiente ${COVERAGE_MODES[
        answers.use
      ].label.toLowerCase()}; ${
        answers.stage === "obra" ? "en obra" : "ya terminado"
      }. Propuesta inicial: ${equipment}.${
        recommendation.soundbar
          ? ` Medidas: ${recommendation.soundbar.roomText}. ${recommendation.soundbar.title}.`
          : ""
      }`
    );
  }

  return lines.join("\n");
}
