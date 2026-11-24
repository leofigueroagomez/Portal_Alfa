import {
  COVERAGE_MODES,
  LISTENING_HEIGHTS,
  coverageDiameter,
  coverageRatio,
  listeningHeight,
  polygonArea,
  sectorCoverageRatio,
  type CoverageMode,
  type ListeningPosture,
  type PlacedSpeaker,
  type Point,
  type SectorCoverage,
} from "@/lib/simuladorAudio/geometry";
import {
  DEFAULT_SIMULATOR_AMPLIFIER,
  amplifiersForRoom,
  type SimulatorAmplifier,
} from "@/lib/simuladorAudio/amplifiers";
import {
  LOUDNESS_VERDICT_TEXT,
  roomLoudness,
} from "@/lib/simuladorAudio/loudness";
import {
  getSimulatorSpeaker,
  speakerSector,
  type SimulatorSpeaker,
} from "@/lib/simuladorAudio/speakers";

export { speakerSector };

/** Modelo del diseño. Lo comparten el simulador (cliente) y la ruta de propuesta (servidor). */

export type SimulatorRoom = {
  id: string;
  name: string;
  /** Vertices del area, en metros. */
  points: Point[];
  ceilingHeight: number;
  posture: ListeningPosture;
  modelId: string;
  mode: CoverageMode;
  /** Posicion de cada bocina, en metros (y hacia donde apunta, si es de muro). */
  speakers: PlacedSpeaker[];
  /** true cuando el usuario movio, agrego o quito bocinas a mano. */
  manual: boolean;
};

export type SimulatorDesign = {
  source: "medidas" | "plano";
  rooms: SimulatorRoom[];
};

export type RoomMetrics = {
  speaker: SimulatorSpeaker | null;
  area: number;
  /** Plafon: diametro de cobertura de cada bocina, en metros. 0 en muro. */
  diameter: number;
  /** Muro: abanico de cobertura de cada bocina. null en plafon. */
  sector: SectorCoverage | null;
  coverage: number;
  count: number;
  /** Amplificadores sugeridos para este espacio (una zona). */
  amplifiers: number;
};

export const MIN_CEILING_HEIGHT = 2;
export const MAX_CEILING_HEIGHT = 8;
export const MAX_ROOMS = 30;
const MAX_POINTS = 80;
const MAX_SPEAKERS = 200;
const MAX_COORDINATE = 2000;

export function roomMetrics(room: SimulatorRoom): RoomMetrics {
  const speaker = getSimulatorSpeaker(room.modelId);
  const area = polygonArea(room.points);
  const sector = speakerSector(speaker);
  const diameter =
    speaker && !sector
      ? coverageDiameter(
          speaker.dispersionDeg,
          room.ceilingHeight,
          listeningHeight(room.posture)
        )
      : 0;

  return {
    speaker,
    area,
    diameter,
    sector,
    coverage: sector
      ? sectorCoverageRatio(room.points, room.speakers, sector)
      : coverageRatio(room.points, room.speakers, diameter / 2),
    count: room.speakers.length,
    amplifiers: speaker
      ? amplifiersForRoom(DEFAULT_SIMULATOR_AMPLIFIER, speaker, room.speakers.length)
      : 0,
  };
}

function toFiniteNumber(value: unknown, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return number;
}

function sanitizePoints(raw: unknown, maxLength: number): PlacedSpeaker[] | null {
  if (!Array.isArray(raw) || raw.length > maxLength) return null;

  const points: PlacedSpeaker[] = [];
  for (const item of raw) {
    const source = item as PlacedSpeaker | null;
    const x = toFiniteNumber(source?.x, -MAX_COORDINATE, MAX_COORDINATE);
    const y = toFiniteNumber(source?.y, -MAX_COORDINATE, MAX_COORDINATE);
    if (x === null || y === null) return null;

    const point: PlacedSpeaker = {
      x: Math.round(x * 1000) / 1000,
      y: Math.round(y * 1000) / 1000,
    };

    // El angulo solo aplica a bocinas de muro; si viene, debe ser un numero valido.
    if (source?.angle !== undefined && source.angle !== null) {
      const angle = toFiniteNumber(source.angle, -720, 720);
      if (angle === null) return null;
      point.angle = Math.round(angle * 10) / 10;
    }

    points.push(point);
  }

  return points;
}

/** Valida un diseño que llega del navegador. Devuelve null si algo no cuadra. */
export function sanitizeDesign(raw: unknown): SimulatorDesign | null {
  if (!raw || typeof raw !== "object") return null;

  const input = raw as { source?: unknown; rooms?: unknown };
  const source = input.source === "plano" ? "plano" : "medidas";

  if (!Array.isArray(input.rooms) || input.rooms.length === 0) return null;
  if (input.rooms.length > MAX_ROOMS) return null;

  const rooms: SimulatorRoom[] = [];

  for (const [index, item] of input.rooms.entries()) {
    if (!item || typeof item !== "object") return null;
    const room = item as Record<string, unknown>;

    const points = sanitizePoints(room.points, MAX_POINTS);
    const speakers = sanitizePoints(room.speakers, MAX_SPEAKERS);
    const ceilingHeight = toFiniteNumber(
      room.ceilingHeight,
      MIN_CEILING_HEIGHT,
      MAX_CEILING_HEIGHT
    );
    const modelId = String(room.modelId || "");
    const posture = String(room.posture || "") as ListeningPosture;
    const mode = String(room.mode || "") as CoverageMode;

    if (!points || points.length < 3 || !speakers || ceilingHeight === null) return null;
    if (!getSimulatorSpeaker(modelId)) return null;
    if (!(posture in LISTENING_HEIGHTS) || !(mode in COVERAGE_MODES)) return null;

    rooms.push({
      id: String(room.id || `area-${index + 1}`).slice(0, 40),
      name:
        String(room.name || "").trim().replace(/\s+/g, " ").slice(0, 60) ||
        `Área ${index + 1}`,
      points,
      ceilingHeight,
      posture,
      modelId,
      mode,
      speakers,
      manual: room.manual === true,
    });
  }

  return { source, rooms };
}

export function formatMeters(value: number, digits = 2) {
  return value.toLocaleString("es-MX", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Totales por modelo, para la lista de equipos (sin precios). */
export function equipmentList(design: SimulatorDesign) {
  const totals = new Map<string, { speaker: SimulatorSpeaker; count: number }>();

  for (const room of design.rooms) {
    const speaker = getSimulatorSpeaker(room.modelId);
    if (!speaker || room.speakers.length === 0) continue;

    const entry = totals.get(speaker.id) || { speaker, count: 0 };
    entry.count += room.speakers.length;
    totals.set(speaker.id, entry);
  }

  return [...totals.values()];
}

/**
 * Amplificacion sugerida para todo el diseño: un amplificador por zona (cada
 * espacio es una zona) y los que hagan falta por numero de bocinas.
 */
export function amplifierPlan(design: SimulatorDesign): {
  amplifier: SimulatorAmplifier;
  total: number;
  zones: number;
} {
  let total = 0;
  let zones = 0;

  for (const room of design.rooms) {
    const amplifiers = roomMetrics(room).amplifiers;
    if (amplifiers > 0) {
      total += amplifiers;
      zones += 1;
    }
  }

  return { amplifier: DEFAULT_SIMULATOR_AMPLIFIER, total, zones };
}

/** Resumen en texto para el prospecto en ALFA OS. */
export function summarizeDesign(design: SimulatorDesign) {
  const lines = [
    design.source === "plano"
      ? "Diseño hecho sobre su plano en el simulador de audio."
      : "Diseño hecho con medidas en el simulador de audio.",
  ];

  for (const room of design.rooms) {
    const metrics = roomMetrics(room);
    const loudness = roomLoudness(room);
    const model = metrics.speaker
      ? `${metrics.speaker.brand} ${metrics.speaker.model}`
      : room.modelId;

    lines.push(
      `- ${room.name}: ${formatMeters(metrics.area, 1)} m², ${
        metrics.sector
          ? "bocinas de muro"
          : `plafón a ${formatMeters(room.ceilingHeight)} m`
      }, ${metrics.count} × ${model} (ambiente ${COVERAGE_MODES[room.mode].label.toLowerCase()}${
        loudness ? `: ${LOUDNESS_VERDICT_TEXT[loudness.verdict].title.toLowerCase()}` : ""
      }, cobertura ${Math.round(metrics.coverage * 100)}%), ${metrics.amplifiers} amplificador${
        metrics.amplifiers === 1 ? "" : "es"
      }`
    );
  }

  const totals = equipmentList(design)
    .map((entry) => `${entry.count} × ${entry.speaker.brand} ${entry.speaker.model}`)
    .join(", ");

  if (totals) lines.push(`Total: ${totals}.`);

  const plan = amplifierPlan(design);
  if (plan.total > 0) {
    lines.push(
      `Amplificación sugerida: ${plan.total} × ${plan.amplifier.brand} ${plan.amplifier.model} (${plan.zones} zona${plan.zones === 1 ? "" : "s"}).`
    );
  }

  return lines.join("\n");
}
