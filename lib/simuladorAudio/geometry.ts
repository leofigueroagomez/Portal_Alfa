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
 * Separacion entre bocinas como fraccion del diametro de cobertura.
 * - ambiental: los circulos se tocan borde con borde (quedan huecos en diagonal).
 * - uniforme: la diagonal de la reticula iguala al diametro, sin huecos.
 * - maxima: el borde de cada circulo llega al centro del vecino.
 */
export const COVERAGE_MODES: Record<
  CoverageMode,
  { label: string; description: string; spacingFactor: number }
> = {
  ambiental: {
    label: "Ambiental",
    description: "Música de fondo. Menos bocinas, con zonas de menor nivel entre ellas.",
    spacingFactor: 1,
  },
  uniforme: {
    label: "Uniforme",
    description: "Cobertura continua, sin huecos. La opción recomendada.",
    spacingFactor: Math.SQRT1_2,
  },
  maxima: {
    label: "Máxima",
    description: "Nivel parejo en todo el espacio. Más bocinas a menor volumen.",
    spacingFactor: 0.5,
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
