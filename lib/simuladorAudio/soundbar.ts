/**
 * Comprobacion de barra de sonido.
 *
 * Con las medidas del espacio decide si la Sonos Beam alcanza o si hace falta
 * la Arc Ultra, y deja la cuenta a la vista para que el visitante vea por que.
 * Se elige la barra mas chica que cumple las tres comprobaciones: tamaño del
 * espacio, distancia del sillon a la television y tamaño de la television.
 *
 * De donde salen los numeros (detalle y citas en
 * docs/modules/simulador-audio/MODULE_CONTEXT.md, "Comprobacion de barra"):
 *
 * - Tamaño de espacio y de television: recomendacion de Sonos.
 * - Alcance: criterio de ALFA. Es el radio del medio circulo que tiene el area
 *   que recomienda Sonos, porque la barra va contra un muro y suena hacia el
 *   frente. Es el mismo metodo que ya se usa para el alcance de la Era 100.
 *
 * PROVISIONAL: la regla la propuso Claude el 2026-11-25 y esta pendiente de
 * que Leo la valide. No calcula decibeles: Sonos no publica el nivel maximo de
 * sus barras, y hasta que ALFA lo mida no se inventa.
 */

export type TvRoom = {
  /** Largo y ancho del espacio, en metros. */
  lengthM: number;
  widthM: number;
  /** Del sillon a la television, en metros. */
  seatDistanceM: number;
  /** Diagonal de la television, en pulgadas. */
  tvInches: number;
};

export const TV_ROOM_LIMITS = {
  sideM: { min: 1.5, max: 30 },
  seatDistanceM: { min: 1, max: 15 },
  tvInches: { min: 24, max: 120 },
} as const;

export type SoundbarId = "sonos-beam" | "sonos-arc-ultra";

export type SoundbarSpec = {
  id: SoundbarId;
  name: string;
  /** Nombre corto para las frases, sin repetir la marca. */
  shortName: string;
  /** Espacio mas grande para el que Sonos la recomienda, en m². `null`: Sonos no publica tope. */
  maxRoomM2: number | null;
  /** Television mas grande para la que Sonos la recomienda, en pulgadas. `null`: sin tope. */
  maxTvInches: number | null;
  /** Desde que tamaño de espacio la recomienda Sonos, en m². Solo informativo. */
  recommendedFromM2: number | null;
};

/** De la mas chica a la mas grande: se propone la primera que cumple. */
export const SOUNDBARS: SoundbarSpec[] = [
  {
    id: "sonos-beam",
    name: "Sonos Beam",
    shortName: "Beam",
    maxRoomM2: 23,
    maxTvInches: 65,
    recommendedFromM2: null,
  },
  {
    id: "sonos-arc-ultra",
    name: "Sonos Arc Ultra",
    shortName: "Arc Ultra",
    maxRoomM2: null,
    maxTvInches: null,
    recommendedFromM2: 32,
  },
];

/**
 * Alcance de diseño, en metros: hasta donde llega la barra dentro del espacio
 * para el que Sonos la recomienda. `null` si Sonos no publica tope de espacio.
 */
export function soundbarReachM(spec: SoundbarSpec) {
  return spec.maxRoomM2 === null ? null : Math.sqrt((2 * spec.maxRoomM2) / Math.PI);
}

export type SoundbarCheckKey = "espacio" | "distancia" | "tele";

export type SoundbarCheck = {
  key: SoundbarCheckKey;
  label: string;
  /** Lo que la barra cubre, ya en texto: "hasta 23 m²", "sin tope". */
  limit: string;
  pass: boolean;
};

export type SoundbarVerdict = {
  room: TvRoom;
  areaM2: number;
  /** Las medidas del visitante en una linea. */
  roomText: string;
  chosen: SoundbarId;
  /** `true` cuando la barra chica cumple todo. */
  compactFits: boolean;
  title: string;
  /** Por que: una frase por comprobacion que la barra chica no cumple, o la frase de que alcanza. */
  reasons: string[];
  bars: {
    id: SoundbarId;
    name: string;
    shortName: string;
    fits: boolean;
    checks: SoundbarCheck[];
  }[];
};

/** Un decimal como maximo, sin ceros de mas: 3.83 → "3.8", 45 → "45". */
function formatNumber(value: number) {
  return String(Math.round(value * 10) / 10);
}

function checksFor(spec: SoundbarSpec, room: TvRoom, areaM2: number): SoundbarCheck[] {
  const reach = soundbarReachM(spec);

  return [
    {
      key: "espacio",
      label: "Espacio",
      limit: spec.maxRoomM2 === null ? "sin tope" : `hasta ${formatNumber(spec.maxRoomM2)} m²`,
      pass: spec.maxRoomM2 === null || areaM2 <= spec.maxRoomM2,
    },
    {
      key: "distancia",
      label: "Distancia",
      limit: reach === null ? "sin tope" : `hasta ${formatNumber(reach)} m`,
      pass: reach === null || room.seatDistanceM <= reach,
    },
    {
      key: "tele",
      label: "Tele",
      limit: spec.maxTvInches === null ? "sin tope" : `hasta ${spec.maxTvInches}"`,
      pass: spec.maxTvInches === null || room.tvInches <= spec.maxTvInches,
    },
  ];
}

export function soundbarVerdict(room: TvRoom): SoundbarVerdict {
  const areaM2 = room.lengthM * room.widthM;
  const bars = SOUNDBARS.map((spec) => {
    const checks = checksFor(spec, room, areaM2);
    return {
      id: spec.id,
      name: spec.name,
      shortName: spec.shortName,
      fits: checks.every((check) => check.pass),
      checks,
    };
  });

  const compact = SOUNDBARS[0];
  const large = SOUNDBARS[SOUNDBARS.length - 1];
  const compactResult = bars[0];
  const compactFits = compactResult.fits;
  const chosen = (bars.find((bar) => bar.fits) || bars[bars.length - 1]).id;
  const failed = new Set(
    compactResult.checks.filter((check) => !check.pass).map((check) => check.key)
  );

  const reasons: string[] = [];
  if (compactFits) {
    reasons.push(
      `Tu espacio, la distancia a tu sillón y tu tele están dentro de lo que cubre la ${compact.shortName}. No necesitas una barra más grande para que la tele se oiga bien.`
    );
  } else {
    if (failed.has("espacio") && compact.maxRoomM2 !== null) {
      const extra = Math.round((areaM2 / compact.maxRoomM2 - 1) * 100);
      reasons.push(
        `Tu espacio mide ${formatNumber(areaM2)} m²: ${extra}% más que los ${formatNumber(
          compact.maxRoomM2
        )} m² hasta donde Sonos recomienda la ${compact.shortName}.`
      );
    }
    const reach = soundbarReachM(compact);
    if (failed.has("distancia") && reach !== null) {
      reasons.push(
        `Te sientas a ${formatNumber(room.seatDistanceM)} m de la tele; la ${compact.shortName} está pensada para escucharse hasta ${formatNumber(reach)} m.`
      );
    }
    if (failed.has("tele") && compact.maxTvInches !== null) {
      reasons.push(
        `Tu tele es de ${room.tvInches}"; Sonos recomienda la ${compact.shortName} para teles de hasta ${compact.maxTvInches}".`
      );
    }
    if (large.recommendedFromM2 !== null && areaM2 >= large.recommendedFromM2) {
      reasons.push(
        `Sonos recomienda la ${large.shortName} para espacios de ${large.recommendedFromM2} m² o más, como el tuyo.`
      );
    }
  }

  return {
    room,
    areaM2,
    roomText: `${formatNumber(room.lengthM)} × ${formatNumber(room.widthM)} m (${formatNumber(
      areaM2
    )} m²), sillón a ${formatNumber(room.seatDistanceM)} m, tele de ${room.tvInches}"`,
    chosen,
    compactFits,
    title: compactFits
      ? `La ${compact.name} alcanza para este espacio`
      : `La ${compact.name} se queda corta aquí`,
    reasons,
    bars,
  };
}

function numberWithin(value: unknown, limits: { min: number; max: number }) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < limits.min || value > limits.max) return null;
  return value;
}

/** Valida las medidas que llegan del navegador. Centimetros y pulgadas enteras. */
export function sanitizeTvRoom(raw: unknown): TvRoom | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;

  const lengthM = numberWithin(input.lengthM, TV_ROOM_LIMITS.sideM);
  const widthM = numberWithin(input.widthM, TV_ROOM_LIMITS.sideM);
  const seatDistanceM = numberWithin(input.seatDistanceM, TV_ROOM_LIMITS.seatDistanceM);
  const tvInches = numberWithin(input.tvInches, TV_ROOM_LIMITS.tvInches);
  if (lengthM === null || widthM === null || seatDistanceM === null || tvInches === null) {
    return null;
  }

  const toCentimeters = (value: number) => Math.round(value * 100) / 100;
  return {
    lengthM: toCentimeters(lengthM),
    widthM: toCentimeters(widthM),
    seatDistanceM: toCentimeters(seatDistanceM),
    tvInches: Math.round(tvInches),
  };
}
