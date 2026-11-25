/**
 * Comprobacion de barra de sonido.
 *
 * Con las medidas del espacio decide si la Sonos Beam alcanza o si hace falta
 * la Arc Ultra, y deja la cuenta a la vista para que el visitante vea por que.
 * La Beam se propone solo si cumple las tres comprobaciones: tamaño del
 * espacio, distancia del sillon a la television y tamaño de la television.
 *
 * De donde salen los numeros (detalle y citas en
 * docs/modules/simulador-audio/MODULE_CONTEXT.md, "Comprobacion de barra"):
 *
 * - Tele de hasta 65" para la Beam y espacios de 32 m² o mas para la Arc
 *   Ultra: recomendacion de Sonos.
 * - Espacio de hasta 23 m² para la Beam: reseñas que lo dan como recomendacion
 *   de Sonos. Pendiente de confirmar en sonos.com, por eso en pantalla no se
 *   le atribuye a Sonos.
 * - Alcance: criterio de ALFA. Es el radio del medio circulo que tiene esos
 *   23 m², porque la barra va contra un muro y suena hacia el frente.
 *
 * Todo se compara con un decimal, igual que se muestra: lo que el visitante
 * lee es exactamente lo que decidio.
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

/** La barra compacta y sus topes. */
export const COMPACT_SOUNDBAR = {
  id: "sonos-beam",
  name: "Sonos Beam",
  shortName: "Beam",
  /** Espacio mas grande para el que se recomienda, en m². */
  maxRoomM2: 23,
  /** Television mas grande para la que Sonos la recomienda, en pulgadas. */
  maxTvInches: 65,
} as const;

/** La barra grande. Sonos no publica topes para ella. */
export const LARGE_SOUNDBAR = {
  id: "sonos-arc-ultra",
  name: "Sonos Arc Ultra",
  shortName: "Arc Ultra",
  /** Desde que tamaño de espacio la recomienda Sonos, en m². */
  recommendedFromM2: 32,
  /** Desde que tamaño de television la recomienda Sonos, en pulgadas. */
  recommendedFromTvInches: 50,
} as const;

/** Un decimal: la precision con la que se comparan y se muestran las medidas. */
function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

/** Sin ceros de mas: 3.8 → "3.8", 45 → "45". */
function formatNumber(value: number) {
  return String(roundToTenth(value));
}

/**
 * Alcance de diseño de la barra compacta, en metros: radio del medio circulo
 * que tiene el area para la que se recomienda.
 */
export function compactSoundbarReachM() {
  return roundToTenth(Math.sqrt((2 * COMPACT_SOUNDBAR.maxRoomM2) / Math.PI));
}

/** El sillon no puede quedar mas lejos de la tele que la diagonal del espacio. */
export function seatFitsRoom(room: Pick<TvRoom, "lengthM" | "widthM" | "seatDistanceM">) {
  return room.seatDistanceM <= Math.hypot(room.lengthM, room.widthM);
}

export type SoundbarCheckKey = "espacio" | "distancia" | "tele";

export type SoundbarCheck = {
  key: SoundbarCheckKey;
  label: string;
  /** La medida del visitante: "45 m²". */
  yours: string;
  /** Lo que cubre la barra compacta: "hasta 23 m²". */
  limit: string;
  pass: boolean;
};

export type SoundbarVerdict = {
  /** Las medidas con las que se decidio, ya a un decimal. */
  room: TvRoom;
  areaM2: number;
  /** Las medidas del visitante en una linea. */
  roomText: string;
  chosen: SoundbarId;
  /** `true` cuando la barra compacta cumple todo. */
  compactFits: boolean;
  title: string;
  /** Las tres comprobaciones de la barra compacta contra las medidas. */
  checks: SoundbarCheck[];
  /** Por que, en frases para el visitante. */
  reasons: string[];
  /** Veredicto en una linea para el prospecto. */
  summary: string;
};

function areaReason(areaM2: number) {
  const limit = COMPACT_SOUNDBAR.maxRoomM2;
  const ratio = areaM2 / limit;
  const tail = `los ${limit} m² para los que está pensada la ${COMPACT_SOUNDBAR.shortName}`;

  if (ratio >= 2) {
    return `Tu espacio mide ${formatNumber(areaM2)} m²: ${formatNumber(ratio)} veces ${tail}.`;
  }
  const extra = Math.round((ratio - 1) * 100);
  if (extra >= 10) return `Tu espacio mide ${formatNumber(areaM2)} m²: ${extra}% más que ${tail}.`;
  return `Tu espacio mide ${formatNumber(areaM2)} m²; la ${COMPACT_SOUNDBAR.shortName} está pensada para espacios de hasta ${limit} m².`;
}

export function soundbarVerdict(input: TvRoom): SoundbarVerdict {
  const room: TvRoom = {
    lengthM: roundToTenth(input.lengthM),
    widthM: roundToTenth(input.widthM),
    seatDistanceM: roundToTenth(input.seatDistanceM),
    tvInches: Math.round(input.tvInches),
  };
  const areaM2 = roundToTenth(room.lengthM * room.widthM);
  const reach = compactSoundbarReachM();
  const compact = COMPACT_SOUNDBAR;
  const large = LARGE_SOUNDBAR;

  const checks: SoundbarCheck[] = [
    {
      key: "espacio",
      label: "Espacio",
      yours: `${formatNumber(areaM2)} m²`,
      limit: `hasta ${compact.maxRoomM2} m²`,
      pass: areaM2 <= compact.maxRoomM2,
    },
    {
      key: "distancia",
      label: "Distancia",
      yours: `${formatNumber(room.seatDistanceM)} m`,
      limit: `hasta ${formatNumber(reach)} m`,
      pass: room.seatDistanceM <= reach,
    },
    {
      key: "tele",
      label: "Tele",
      yours: `${room.tvInches}"`,
      limit: `hasta ${compact.maxTvInches}"`,
      pass: room.tvInches <= compact.maxTvInches,
    },
  ];

  const failed = checks.filter((check) => !check.pass);
  const failedKeys = new Set(failed.map((check) => check.key));
  const compactFits = failed.length === 0;

  const reasons: string[] = [];
  if (compactFits) {
    reasons.push(
      `Tu espacio, la distancia a tu sillón y tu tele están dentro de lo que cubre la ${compact.shortName}. No necesitas una barra más grande para que la tele se oiga bien.`
    );
  } else {
    if (failedKeys.has("espacio")) reasons.push(areaReason(areaM2));
    if (failedKeys.has("distancia")) {
      reasons.push(
        `Te sientas a ${formatNumber(room.seatDistanceM)} m de la tele; la ${compact.shortName} está pensada para escucharse hasta ${formatNumber(reach)} m.`
      );
    }
    if (failedKeys.has("tele")) {
      reasons.push(
        `Tu tele es de ${room.tvInches}"; Sonos recomienda la ${compact.shortName} para teles de hasta ${compact.maxTvInches}".`
      );
    }
    reasons.push(
      areaM2 >= large.recommendedFromM2
        ? `Por eso va la ${large.shortName}: Sonos la recomienda para espacios de ${large.recommendedFromM2} m² o más, como el tuyo.`
        : `Por eso va la ${large.shortName}, la barra grande de Sonos.`
    );
    if (room.tvInches < large.recommendedFromTvInches) {
      reasons.push(
        `Sonos recomienda la ${large.shortName} para teles de ${large.recommendedFromTvInches}" o más; un asesor de ALFA revisa contigo cómo queda con la tuya.`
      );
    }
  }

  const title = compactFits
    ? `La ${compact.name} alcanza para este espacio`
    : `La ${compact.name} se queda corta aquí`;

  return {
    room,
    areaM2,
    roomText: `${formatNumber(room.lengthM)} × ${formatNumber(room.widthM)} m (${formatNumber(
      areaM2
    )} m²), sillón a ${formatNumber(room.seatDistanceM)} m, tele de ${room.tvInches}"`,
    chosen: compactFits ? compact.id : large.id,
    compactFits,
    title,
    checks,
    reasons,
    summary: compactFits
      ? title
      : `${title} (${failed.map((check) => check.label.toLowerCase()).join(", ")})`,
  };
}

function numberWithin(value: unknown, limits: { min: number; max: number }) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < limits.min || value > limits.max) return null;
  return value;
}

/**
 * Valida las medidas que llegan del navegador. Metros a un decimal y pulgadas
 * enteras: lo que se guarda es lo mismo que se compara y se muestra.
 */
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

  const room: TvRoom = {
    lengthM: roundToTenth(lengthM),
    widthM: roundToTenth(widthM),
    seatDistanceM: roundToTenth(seatDistanceM),
    tvInches: Math.round(tvInches),
  };
  return seatFitsRoom(room) ? room : null;
}
