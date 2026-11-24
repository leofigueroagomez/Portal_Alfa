/**
 * Motor de calculo del simulador de audio. Funciones puras, en metros.
 *
 * El modelo es geometrico: cada bocina de plafon cubre un circulo en el plano
 * de escucha cuyo diametro depende solo del angulo de dispersion y de la
 * altura libre entre la bocina y el oido. No considera reflexiones, muebles,
 * materiales ni respuesta fuera de eje: es una estimacion de cobertura, no un
 * estudio acustico.
 */

export type Point = { x: number; y: number };

export const LISTENING_HEIGHTS = {
  sentado: 1.3,
  de_pie: 1.75,
} as const;

export type ListeningPosture = keyof typeof LISTENING_HEIGHTS;

export type CoverageMode = "ambiental" | "uniforme" | "maxima";

/**
 * Ambientes. Para quien usa el simulador es "que tan fuerte lo quiero"; por
 * dentro cada ambiente fija dos cosas:
 *
 * - `spacingFactor`: separacion entre bocinas como fraccion del diametro de
 *   cobertura. Ambiental: los circulos se tocan borde con borde. Convivencia:
 *   la diagonal de la reticula iguala al diametro, sin huecos. Fiesta: el
 *   borde de cada circulo llega al centro del vecino.
 * - `targetDb`: nivel sostenido que se busca en el espacio. Son referencias
 *   de diseño de ALFA, no una norma: 65 dB deja platicar sin alzar la voz,
 *   78 dB ya obliga a acercarse y 90 dB obliga a alzar la voz.
 *
 * Las llaves (ambiental, uniforme, maxima) se conservan porque ya viajan en
 * los diseños guardados.
 */
export const COVERAGE_MODES: Record<
  CoverageMode,
  { label: string; description: string; spacingFactor: number; targetDb: number }
> = {
  ambiental: {
    label: "Ambiental",
    description: "Música de fondo. Se platica sin alzar la voz.",
    spacingFactor: 1,
    targetDb: 65,
  },
  uniforme: {
    label: "Convivencia",
    description: "La música está presente. Para platicar hay que acercarse.",
    spacingFactor: Math.SQRT1_2,
    targetDb: 78,
  },
  maxima: {
    label: "Fiesta",
    description: "La música manda. Hay que alzar la voz para platicar.",
    spacingFactor: 0.5,
    targetDb: 90,
  },
};

const MAX_SPEAKERS_PER_ROOM = 200;

/**
 * Tope del angulo que usa el calculo. En el borde de un cono de 120° el oyente
 * esta al doble de distancia que justo debajo de la bocina, y solo por esa
 * distancia el nivel ya cae 6 dB. Mas alla de eso la formula geometrica promete
 * una cobertura que no se escucha: una bocina de 160° a 1.40 m del oido
 * "cubriria" casi 11 m de diametro.
 */
export const MAX_EFFECTIVE_DISPERSION_DEG = 120;

export function effectiveDispersion(dispersionDeg: number) {
  return Math.min(dispersionDeg, MAX_EFFECTIVE_DISPERSION_DEG);
}

export function listeningHeight(posture: ListeningPosture) {
  return LISTENING_HEIGHTS[posture];
}

/**
 * D = 2·(H−h)·tan(A/2), con A limitado a MAX_EFFECTIVE_DISPERSION_DEG.
 * Devuelve 0 si los datos no permiten calcular.
 */
export function coverageDiameter(
  dispersionDeg: number,
  ceilingHeight: number,
  earHeight: number
) {
  if (
    !Number.isFinite(dispersionDeg) ||
    !Number.isFinite(ceilingHeight) ||
    !Number.isFinite(earHeight)
  ) {
    return 0;
  }

  const clearance = ceilingHeight - earHeight;
  if (clearance <= 0 || dispersionDeg <= 0 || dispersionDeg >= 180) return 0;

  return 2 * clearance * Math.tan((effectiveDispersion(dispersionDeg) * Math.PI) / 360);
}

export function rectanglePolygon(width: number, length: number): Point[] {
  return [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: length },
    { x: 0, y: length },
  ];
}

export function polygonArea(points: Point[]) {
  if (points.length < 3) return 0;

  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }

  return Math.abs(sum) / 2;
}

export function boundingBox(points: Point[]) {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

export function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;

    if (crosses) inside = !inside;
  }

  return inside;
}

export function polygonCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };

  let signedArea = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const cross = a.x * b.y - b.x * a.y;
    signedArea += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }

  if (Math.abs(signedArea) < 1e-9) {
    const box = boundingBox(points);
    return { x: box.minX + box.width / 2, y: box.minY + box.height / 2 };
  }

  return { x: cx / (3 * signedArea), y: cy / (3 * signedArea) };
}

/** Un punto que con seguridad cae dentro del poligono (el centroide puede quedar fuera en formas en L). */
export function interiorPoint(polygon: Point[]): Point {
  const centroid = polygonCentroid(polygon);
  if (pointInPolygon(centroid, polygon)) return centroid;

  const box = boundingBox(polygon);
  const steps = 24;

  for (let iy = 0; iy < steps; iy += 1) {
    for (let ix = 0; ix < steps; ix += 1) {
      const candidate = {
        x: box.minX + ((ix + 0.5) * box.width) / steps,
        y: box.minY + ((iy + 0.5) * box.height) / steps,
      };
      if (pointInPolygon(candidate, polygon)) return candidate;
    }
  }

  return centroid;
}

/**
 * Reparte bocinas en reticula dentro del poligono. La reticula se calcula
 * sobre la caja envolvente y se descartan las celdas cuyo centro cae fuera.
 */
export function suggestLayout(
  polygon: Point[],
  diameter: number,
  mode: CoverageMode
): Point[] {
  if (polygon.length < 3 || diameter <= 0) return [];

  const box = boundingBox(polygon);
  if (box.width <= 0 || box.height <= 0) return [];

  const spacing = diameter * COVERAGE_MODES[mode].spacingFactor;
  // Tolerancia del 2%: un area de 8.00 m con separacion de 3.999 m no pide
  // una columna extra.
  let cols = Math.max(1, Math.ceil(box.width / spacing - 0.02));
  let rows = Math.max(1, Math.ceil(box.height / spacing - 0.02));

  // Tope de seguridad: un plano mal calibrado puede pedir miles de bocinas.
  while (cols * rows > MAX_SPEAKERS_PER_ROOM) {
    if (cols >= rows) cols -= 1;
    else rows -= 1;
  }

  const stepX = box.width / cols;
  const stepY = box.height / rows;
  const speakers: Point[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const candidate = {
        x: box.minX + (col + 0.5) * stepX,
        y: box.minY + (row + 0.5) * stepY,
      };
      if (pointInPolygon(candidate, polygon)) speakers.push(candidate);
    }
  }

  if (speakers.length === 0) return [interiorPoint(polygon)];

  return speakers;
}

/** Fraccion (0 a 1) del area que queda dentro de la huella de al menos una bocina. */
export function coverageRatio(
  polygon: Point[],
  speakers: Point[],
  radius: number,
  samplesPerSide = 56
) {
  if (polygon.length < 3 || speakers.length === 0 || radius <= 0) return 0;

  const box = boundingBox(polygon);
  if (box.width <= 0 || box.height <= 0) return 0;

  const radiusSquared = radius * radius;
  let inside = 0;
  let covered = 0;

  for (let iy = 0; iy < samplesPerSide; iy += 1) {
    for (let ix = 0; ix < samplesPerSide; ix += 1) {
      const sample = {
        x: box.minX + ((ix + 0.5) * box.width) / samplesPerSide,
        y: box.minY + ((iy + 0.5) * box.height) / samplesPerSide,
      };

      if (!pointInPolygon(sample, polygon)) continue;
      inside += 1;

      for (const speaker of speakers) {
        const dx = speaker.x - sample.x;
        const dy = speaker.y - sample.y;
        if (dx * dx + dy * dy <= radiusSquared) {
          covered += 1;
          break;
        }
      }
    }
  }

  return inside === 0 ? 0 : covered / inside;
}

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ---------------------------------------------------------------------------
// Bocinas de muro: cubren un abanico (sector) en lugar de un circulo
// ---------------------------------------------------------------------------

/** Bocina colocada: posicion en metros y, si es de muro, hacia donde apunta. */
export type PlacedSpeaker = Point & {
  /** Direccion de apuntado en grados: 0 = +x, 90 = +y (hacia abajo en pantalla). */
  angle?: number;
};

export type SectorCoverage = {
  /** Apertura horizontal total, en grados. */
  apertureDeg: number;
  /** Alcance, en metros. */
  reach: number;
};

/** Separacion de la bocina respecto a la pared, para que quede dentro del area. */
const WALL_INSET = 0.12;

export function normalizeAngle(angle: number) {
  const value = angle % 360;
  return value < 0 ? value + 360 : value;
}

export function sectorContains(
  speaker: PlacedSpeaker,
  sector: SectorCoverage,
  point: Point
) {
  const dx = point.x - speaker.x;
  const dy = point.y - speaker.y;
  const distanceSquared = dx * dx + dy * dy;

  if (distanceSquared > sector.reach * sector.reach) return false;
  if (distanceSquared < 1e-9) return true;

  const bearing = (Math.atan2(dy, dx) * 180) / Math.PI;
  const delta = Math.abs(normalizeAngle(bearing - (speaker.angle ?? 0) + 180) - 180);

  return delta <= sector.apertureDeg / 2;
}

/** Fraccion (0 a 1) del area que queda dentro del abanico de al menos una bocina. */
export function sectorCoverageRatio(
  polygon: Point[],
  speakers: PlacedSpeaker[],
  sector: SectorCoverage,
  samplesPerSide = 56
) {
  if (polygon.length < 3 || speakers.length === 0 || sector.reach <= 0) return 0;

  const samples = samplePolygon(polygon, samplesPerSide);
  if (samples.length === 0) return 0;

  let covered = 0;
  for (const sample of samples) {
    if (speakers.some((speaker) => sectorContains(speaker, sector, sample))) covered += 1;
  }

  return covered / samples.length;
}

function samplePolygon(polygon: Point[], samplesPerSide: number) {
  const box = boundingBox(polygon);
  const samples: Point[] = [];
  if (box.width <= 0 || box.height <= 0) return samples;

  for (let iy = 0; iy < samplesPerSide; iy += 1) {
    for (let ix = 0; ix < samplesPerSide; ix += 1) {
      const sample = {
        x: box.minX + ((ix + 0.5) * box.width) / samplesPerSide,
        y: box.minY + ((iy + 0.5) * box.height) / samplesPerSide,
      };
      if (pointInPolygon(sample, polygon)) samples.push(sample);
    }
  }

  return samples;
}

/**
 * Punto sobre la pared mas cercana a `point`, metido unos centimetros hacia
 * dentro, y la direccion perpendicular a esa pared que mira al interior.
 */
export function snapToWall(polygon: Point[], point: Point): PlacedSpeaker | null {
  let best: { speaker: PlacedSpeaker; distance: number } | null = null;

  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index];
    const b = polygon[(index + 1) % polygon.length];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const length = Math.hypot(ex, ey);
    if (length < 1e-6) continue;

    // Se evita la esquina exacta: ahi la bocina quedaria fuera al meterla.
    const margin = Math.min(0.2, length / 4);
    const along = Math.min(
      length - margin,
      Math.max(margin, ((point.x - a.x) * ex + (point.y - a.y) * ey) / length)
    );
    const foot = { x: a.x + (ex * along) / length, y: a.y + (ey * along) / length };

    let nx = -ey / length;
    let ny = ex / length;
    if (!pointInPolygon({ x: foot.x + nx * WALL_INSET, y: foot.y + ny * WALL_INSET }, polygon)) {
      nx = -nx;
      ny = -ny;
    }

    const speaker = {
      x: foot.x + nx * WALL_INSET,
      y: foot.y + ny * WALL_INSET,
      angle: normalizeAngle((Math.atan2(ny, nx) * 180) / Math.PI),
    };
    if (!pointInPolygon(speaker, polygon)) continue;

    const distance = Math.hypot(point.x - foot.x, point.y - foot.y);
    if (!best || distance < best.distance) best = { speaker, distance };
  }

  return best ? best.speaker : null;
}

/** Fraccion del area que se busca cubrir con bocinas de muro en cada tipo de cobertura. */
const WALL_COVERAGE_TARGETS: Record<CoverageMode, number> = {
  ambiental: 0.75,
  uniforme: 0.9,
  maxima: 0.98,
};

const MAX_WALL_SPEAKERS = 40;

function countCovered(samples: Point[], speakers: PlacedSpeaker[], sector: SectorCoverage) {
  let covered = 0;
  for (const sample of samples) {
    if (speakers.some((speaker) => sectorContains(speaker, sector, sample))) covered += 1;
  }
  return covered;
}

/**
 * Reparto ordenado: bocinas a distancias iguales sobre una sola pared. Es el
 * acomodo que se ve mas limpio y el que se usa en una terraza tipica. Devuelve
 * el que alcanza el objetivo con menos bocinas, o null si ninguna pared basta.
 */
function evenSingleWallLayout(
  polygon: Point[],
  samples: Point[],
  sector: SectorCoverage,
  target: number
): PlacedSpeaker[] | null {
  let best: { speakers: PlacedSpeaker[]; covered: number } | null = null;

  for (let count = 1; count <= 8; count += 1) {
    for (let index = 0; index < polygon.length; index += 1) {
      const a = polygon[index];
      const b = polygon[(index + 1) % polygon.length];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      // Sin amontonar: al menos un metro de pared por bocina.
      if (length < count) continue;

      const speakers: PlacedSpeaker[] = [];
      for (let step = 0; step < count; step += 1) {
        const t = (step + 0.5) / count;
        const snapped = snapToWall(polygon, {
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
        });
        if (snapped) speakers.push(snapped);
      }
      if (speakers.length !== count) continue;

      const covered = countCovered(samples, speakers, sector);
      if (covered >= target && (!best || covered > best.covered)) {
        best = { speakers, covered };
      }
    }

    if (best) return best.speakers;
  }

  return null;
}

/**
 * Reparte bocinas de muro sobre el perimetro, apuntando hacia dentro.
 *
 * Primero calcula un reparto libre: elige una por una la posicion que cubre
 * mas area todavia descubierta, hasta alcanzar el objetivo del tipo de
 * cobertura. Despues busca un reparto ordenado sobre una sola pared y lo
 * prefiere solo si no usa mas bocinas que el reparto libre.
 */
export function suggestWallLayout(
  polygon: Point[],
  sector: SectorCoverage,
  mode: CoverageMode
): PlacedSpeaker[] {
  if (polygon.length < 3 || sector.reach <= 0 || sector.apertureDeg <= 0) return [];

  const samples = samplePolygon(polygon, 40);
  if (samples.length === 0) return [];

  // Candidatas: un punto cada ~0.5 m sobre cada pared, centradas en el tramo.
  const candidates: PlacedSpeaker[] = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index];
    const b = polygon[(index + 1) % polygon.length];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.round(length / 0.5));

    for (let step = 0; step < steps; step += 1) {
      const t = (step + 0.5) / steps;
      const snapped = snapToWall(polygon, {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      });
      if (snapped) candidates.push(snapped);
    }
  }

  const minSpacing = Math.min(1.5, sector.reach / 3);
  const covered = new Array<boolean>(samples.length).fill(false);
  const chosen: PlacedSpeaker[] = [];
  const target = WALL_COVERAGE_TARGETS[mode] * samples.length;
  let coveredCount = 0;

  while (coveredCount < target && chosen.length < MAX_WALL_SPEAKERS) {
    let bestIndex = -1;
    let bestGain = 0;

    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      if (chosen.some((speaker) => distance(speaker, candidate) < minSpacing)) continue;

      let gain = 0;
      for (let s = 0; s < samples.length; s += 1) {
        if (!covered[s] && sectorContains(candidate, sector, samples[s])) gain += 1;
      }

      if (gain > bestGain) {
        bestGain = gain;
        bestIndex = index;
      }
    }

    // Lo que falta ya no se alcanza desde ninguna pared (area mas honda que el alcance).
    if (bestIndex < 0 || bestGain < samples.length * 0.01) break;

    const pick = candidates[bestIndex];
    chosen.push(pick);
    for (let s = 0; s < samples.length; s += 1) {
      if (!covered[s] && sectorContains(pick, sector, samples[s])) {
        covered[s] = true;
        coveredCount += 1;
      }
    }
  }

  if (chosen.length === 0) {
    const fallback = snapToWall(polygon, interiorPoint(polygon));
    return fallback ? [fallback] : [];
  }

  const tidy = evenSingleWallLayout(polygon, samples, sector, target);
  if (tidy && tidy.length <= chosen.length) return tidy;

  return chosen;
}
