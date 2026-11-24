import {
  DEFAULT_SIMULATOR_AMPLIFIER,
  channelPowerW,
  zonesForRoom,
  type SimulatorAmplifier,
} from "@/lib/simuladorAudio/amplifiers";
import {
  COVERAGE_MODES,
  boundingBox,
  coverageDiameter,
  listeningHeight,
  pointInPolygon,
  sectorContains,
  type CoverageMode,
  type ListeningPosture,
  type PlacedSpeaker,
  type Point,
} from "@/lib/simuladorAudio/geometry";
import {
  getSimulatorSpeaker,
  speakerSector,
  type SimulatorSpeaker,
} from "@/lib/simuladorAudio/speakers";

/**
 * Estimacion de que tan fuerte se va a escuchar un espacio.
 *
 * Es sonido directo: sensibilidad de la bocina, potencia que le toca del
 * amplificador y distancia al oyente. No suma el rebote del cuarto (que en
 * interiores agrega nivel) ni resta por muebles o gente, asi que en interiores
 * tiende a quedarse corto y en exteriores se acerca mas. Sirve para comparar
 * ambientes y sistemas, no como medicion.
 */

/**
 * La musica tiene picos unos 10 dB por encima de su nivel promedio. Para que
 * el amplificador no recorte, el nivel sostenido se calcula 10 dB abajo de lo
 * que daria a toda su potencia.
 */
export const MUSIC_HEADROOM_DB = 10;

/** Una bocina de muro suele quedar cerca de un metro arriba del oido. */
const WALL_HEIGHT_ABOVE_EAR_M = 1;

/** Fuera del cono o abanico de cobertura la bocina sigue sonando, pero menos. */
const OFF_COVERAGE_PENALTY_DB = 6;

/** A menos de un metro la formula de distancia deja de ser valida. */
const MIN_DISTANCE_M = 1;

export type LoudnessRoom = {
  points: Point[];
  ceilingHeight: number;
  posture: ListeningPosture;
  modelId: string;
  mode: CoverageMode;
  speakers: PlacedSpeaker[];
};

export type LoudnessVerdict = "sobrado" | "justo" | "corto";

export type RoomLoudness = {
  /** Nivel que se alcanza en al menos 90% del espacio, en dB. */
  level: number;
  /** Punto mas fuerte y mas suave del espacio, en dB. */
  max: number;
  min: number;
  /** Nivel que pide el ambiente elegido, en dB. */
  target: number;
  verdict: LoudnessVerdict;
  /** Watts que le tocan a cada bocina. */
  powerPerSpeakerW: number;
  /** Cuadricula para pintar el mapa de volumen; coordenadas en metros. */
  cells: { x: number; y: number; level: number }[];
  cellWidth: number;
  cellHeight: number;
};

/**
 * Potencia que recibe cada bocina. Las bocinas de un mismo canal se reparten
 * su potencia. Con dos bocinas por canal se usa la potencia a 4 Ω solo si el
 * fabricante del amplificador la publica.
 */
export function powerPerSpeakerW(
  amplifier: SimulatorAmplifier,
  speaker: SimulatorSpeaker,
  speakerCount: number
) {
  const zones = zonesForRoom(amplifier, speaker, speakerCount);
  if (zones === 0) return 0;

  const perZone = Math.ceil(speakerCount / zones);
  const channelsPerZone = Math.max(1, Math.round(amplifier.channels / amplifier.zones));
  const perChannel = Math.max(
    1,
    speaker.amplifierChannels === 2 ? perZone : Math.ceil(perZone / channelsPerZone)
  );

  return Math.min(
    speaker.maxPowerW,
    channelPowerW(amplifier, speaker, perChannel) / perChannel
  );
}

export function loudnessVerdict(level: number, target: number): LoudnessVerdict {
  const margin = level - target;
  if (margin >= 6) return "sobrado";
  if (margin >= 0) return "justo";
  return "corto";
}

export function roomLoudness(
  room: LoudnessRoom,
  amplifier: SimulatorAmplifier = DEFAULT_SIMULATOR_AMPLIFIER,
  cellsPerSide = 24
): RoomLoudness | null {
  const speaker = getSimulatorSpeaker(room.modelId);
  if (!speaker || room.speakers.length === 0 || room.points.length < 3) return null;

  const power = powerPerSpeakerW(amplifier, speaker, room.speakers.length);
  if (power <= 0) return null;

  const box = boundingBox(room.points);
  if (box.width <= 0 || box.height <= 0) return null;

  const sector = speakerSector(speaker);
  const clearance = Math.max(
    0.3,
    room.ceilingHeight - listeningHeight(room.posture)
  );
  const coneRadius = sector
    ? 0
    : coverageDiameter(
        speaker.dispersionDeg,
        room.ceilingHeight,
        listeningHeight(room.posture)
      ) / 2;
  // Nivel a un metro, ya con el margen para los picos de la musica.
  const levelAtOneMeter =
    speaker.sensitivityDb + 10 * Math.log10(power) - MUSIC_HEADROOM_DB;

  const cellWidth = box.width / cellsPerSide;
  const cellHeight = box.height / cellsPerSide;
  const cells: RoomLoudness["cells"] = [];

  for (let iy = 0; iy < cellsPerSide; iy += 1) {
    for (let ix = 0; ix < cellsPerSide; ix += 1) {
      const point = {
        x: box.minX + (ix + 0.5) * cellWidth,
        y: box.minY + (iy + 0.5) * cellHeight,
      };
      if (!pointInPolygon(point, room.points)) continue;

      let energy = 0;
      for (const placed of room.speakers) {
        const horizontal = Math.hypot(point.x - placed.x, point.y - placed.y);
        const vertical = sector ? WALL_HEIGHT_ABOVE_EAR_M : clearance;
        const distance = Math.max(MIN_DISTANCE_M, Math.hypot(horizontal, vertical));
        const inside = sector
          ? sectorContains(placed, sector, point)
          : horizontal <= coneRadius;
        const level =
          levelAtOneMeter -
          20 * Math.log10(distance) -
          (inside ? 0 : OFF_COVERAGE_PENALTY_DB);

        energy += 10 ** (level / 10);
      }

      cells.push({
        x: box.minX + ix * cellWidth,
        y: box.minY + iy * cellHeight,
        level: 10 * Math.log10(energy),
      });
    }
  }

  if (cells.length === 0) return null;

  const sorted = cells.map((cell) => cell.level).sort((a, b) => a - b);
  const level = sorted[Math.floor(sorted.length * 0.1)];
  const target = COVERAGE_MODES[room.mode].targetDb;

  return {
    level,
    max: sorted[sorted.length - 1],
    min: sorted[0],
    target,
    verdict: loudnessVerdict(level, target),
    powerPerSpeakerW: power,
    cells,
    cellWidth,
    cellHeight,
  };
}

export const LOUDNESS_VERDICT_TEXT: Record<
  LoudnessVerdict,
  { title: string; body: string }
> = {
  sobrado: {
    title: "Llega con margen",
    body: "El sistema alcanza este ambiente sin esforzarse, con reserva para subirle.",
  },
  justo: {
    title: "Llega justo",
    body: "El sistema alcanza este ambiente trabajando cerca de su límite.",
  },
  corto: {
    title: "Se queda corto",
    body: "Para este ambiente hacen falta más bocinas o más potencia. Un asesor de ALFA puede proponerte el equipo.",
  },
};
