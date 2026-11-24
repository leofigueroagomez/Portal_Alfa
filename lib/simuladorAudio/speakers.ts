/**
 * Catalogo de bocinas del simulador de audio.
 *
 * Regla dura: `dispersionDeg` lleva el angulo de cobertura que publica el
 * fabricante en su ficha tecnica (ver `source`). Si el fabricante no lo
 * publica, el modelo queda en PENDING_SIMULATOR_SPEAKERS y no se ofrece en el
 * simulador: no se estima ni se copia de un modelo parecido.
 *
 * Unica excepcion: un modelo con `coverageBasis: "criterio_alfa"`. Ahi los
 * numeros no son del fabricante sino un criterio de diseño que Leo aprobo de
 * forma explicita, y el simulador lo dice en pantalla. Hoy solo la B&W AM-1.
 *
 * Dos tipos de montaje:
 * - `plafon`: cobertura conica hacia abajo; el diametro sale del angulo y la altura.
 * - `muro`: cobertura en abanico; apertura `dispersionDeg` y alcance `reachM`.
 *
 * Sin precios, igual que el catalogo publico de /marcas.
 */

export type SimulatorSpeaker = {
  id: string;
  brand: string;
  model: string;
  /** Descripcion corta para el selector. */
  label: string;
  mount: "plafon" | "muro";
  /** Angulo de cobertura en grados: conico en plafon, apertura horizontal en muro. */
  dispersionDeg: number;
  /** Solo muro: hasta donde se considera cubierta el area, en metros. */
  reachM?: number;
  /** De donde salen el angulo y el alcance. */
  coverageBasis: "fabricante" | "criterio_alfa";
  /** Sensibilidad en dB (2.83 V o 1 W a 1 m), para la fase de nivel sonoro. */
  sensitivityDb: number;
  /** Impedancia nominal por entrada, en ohms, segun la ficha del fabricante. */
  impedanceOhms: number;
  /**
   * Canales de amplificador que ocupa cada bocina: 1 en una bocina normal, 2 en
   * una estereo de doble bobina (recibe izquierdo y derecho en la misma bocina).
   */
  amplifierChannels: 1 | 2;
  /** Texto de la ficha de donde sale el angulo. */
  sourceQuote: string;
  source: string;
  /** id en `products` de ALFA OS (produccion), para ligar con cotizaciones. */
  productId: number;
};

export const SIMULATOR_SPEAKERS: SimulatorSpeaker[] = [
  {
    id: "kef-ci160er",
    brand: "KEF",
    model: "Ci160ER",
    label: "Plafón 6.5″ Uni-Q",
    mount: "plafon",
    coverageBasis: "fabricante",
    dispersionDeg: 110,
    sensitivityDb: 89,
    impedanceOhms: 8,
    amplifierChannels: 1,
    sourceQuote: "Nominal coverage (degrees) 110°",
    source: "https://assets.kef.com/pdf_doc/ci/Ci_Group_Specification_Sheet.pdf",
    productId: 20,
  },
  {
    id: "kef-ci160tr",
    brand: "KEF",
    model: "Ci160TR",
    label: "Plafón ultradelgado 4.5″",
    mount: "plafon",
    coverageBasis: "fabricante",
    dispersionDeg: 160,
    sensitivityDb: 87,
    impedanceOhms: 8,
    amplifierChannels: 1,
    sourceQuote: "Nominal coverage (degrees) 160°",
    source: "https://assets.kef.com/pdf_doc/ci/Ci_Group_Specification_Sheet.pdf",
    productId: 97,
  },
  {
    id: "kef-ci160crds",
    brand: "KEF",
    model: "Ci160CRds",
    label: "Plafón estéreo 6.5″ (una sola bocina)",
    mount: "plafon",
    coverageBasis: "fabricante",
    dispersionDeg: 120,
    sensitivityDb: 91,
    impedanceOhms: 8,
    amplifierChannels: 2,
    sourceQuote: "Nominal coverage 120°",
    source: "https://assets.kef.com/pdf_doc/ci/Ci_Group_Specification_Sheet.pdf",
    productId: 386,
  },
  {
    id: "bose-dm6c",
    brand: "Bose",
    model: "DesignMax DM6C",
    label: "Plafón 6.5″ coaxial",
    mount: "plafon",
    coverageBasis: "fabricante",
    dispersionDeg: 120,
    sensitivityDb: 88,
    impedanceOhms: 8,
    amplifierChannels: 1,
    sourceQuote: "Nominal Coverage Angle (1 – 4 kHz) 120° conical",
    source:
      "https://assets.boseprofessional.com/m/45b11f1f533e6087/original/tds_DesignMax_DM6C_LTR_enUS.pdf",
    productId: 317,
  },
  {
    id: "bw-am1",
    brand: "Bowers & Wilkins",
    model: "AM-1",
    label: "Sobreponer en muro, interior y exterior",
    mount: "muro",
    // B&W no publica angulo, grafica polar ni archivo de simulacion de la AM-1
    // (ficha, folleto y manual revisados el 2026-11-23). Apertura de 90° y
    // alcance de 6 m son criterio de ALFA, aprobado por Leo el 2026-11-23.
    // Referencia para el alcance: con los 86 dB de sensibilidad que si publica
    // B&W, a 6 m llegan ~80 dB con 10 W.
    coverageBasis: "criterio_alfa",
    dispersionDeg: 90,
    reachM: 6,
    sensitivityDb: 86,
    impedanceOhms: 8,
    amplifierChannels: 1,
    sourceQuote: "Sensitivity 86dB (2.83V, 1m) · Nominal Impedance 8Ω (5.2 Ω min)",
    source:
      "https://www.bowerswilkins.com/on/demandware.static/-/Library-Sites-bowers_northamerica_shared/default/dw9f875329/downloads/am-1_brochure-eng.pdf",
    productId: 410,
  },
];

/**
 * Modelos del catalogo interno que todavia no entran al simulador.
 * Para activar uno de plafon: conseguir el angulo con el fabricante o el
 * distribuidor y moverlo a SIMULATOR_SPEAKERS con su fuente.
 */
export const PENDING_SIMULATOR_SPEAKERS = [
  {
    brand: "Bowers & Wilkins",
    model: "CCM665",
    productId: 47,
    reason: "Plafón. El fabricante no publica ángulo de cobertura (info sheet y manual CCM6).",
  },
  {
    brand: "Sonance",
    model: "VPXT6R",
    productId: 181,
    reason:
      "Plafón. El fabricante no publica ángulo de cobertura. Sonance lo marca como modelo descontinuado (reemplazo: VXXT6R).",
  },
  {
    brand: "Klipsch",
    model: "CS-18C",
    productId: 8119,
    reason: "Plafón. El fabricante no publica ángulo de cobertura.",
  },
  {
    brand: "Yamaha",
    model: "VS4",
    productId: 563,
    reason:
      "Bocina de muro (110° × 110° según Yamaha). Falta definir su alcance como criterio de ALFA.",
  },
  {
    brand: "Sonance",
    model: "VXXT8RW",
    productId: 385,
    reason:
      "Según la ficha de Sonance es un subwoofer de plafón, no una bocina de rango completo. Pendiente de confirmar el dato del catálogo interno.",
  },
] as const;

export function getSimulatorSpeaker(id: string | null | undefined) {
  return SIMULATOR_SPEAKERS.find((speaker) => speaker.id === id) || null;
}

export const DEFAULT_SIMULATOR_SPEAKER_ID = SIMULATOR_SPEAKERS[0].id;
