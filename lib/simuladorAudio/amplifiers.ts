import type { SimulatorSpeaker } from "@/lib/simuladorAudio/speakers";

/**
 * Amplificadores que propone el simulador de audio.
 *
 * Misma regla que el catalogo de bocinas: cada dato sale de la ficha del
 * fabricante (ver `source`). Sin precios. Los siete modelos se verificaron
 * contra su ficha el 2026-11-23.
 *
 * La lista sale de los formularios que lleno GrokBot con el catalogo de RDA y
 * de Dextra (docs/modules/simulador-audio/datos/). Aqui solo entran los de
 * baja impedancia con streaming integrado, que son los que sirven para un
 * sistema estereo por zonas. Los mezcladores y amplificadores de 70/100 V
 * (Apart, Voltera, Tesira, Q-SYS, Bose Veritas, JBL, Crown, LEA, Fonestar)
 * son para audio comercial y necesitan otro modelo de calculo.
 */

export type SimulatorAmplifier = {
  id: string;
  brand: string;
  model: string;
  /** Descripcion corta para la lista de equipos. */
  label: string;
  supplier: "RDA" | "Dextra";
  /** Canales de salida del equipo. Cada zona estereo usa dos. */
  channels: number;
  /** Zonas independientes que maneja un equipo. */
  zones: number;
  /** Potencia continua por canal a 8 Ω, en watts. */
  powerPerChannelW: number;
  /** Potencia continua por canal a 4 Ω, si el fabricante la publica. */
  power4OhmW: number | null;
  /**
   * Carga minima por canal, en ohms. 4 cuando el fabricante lo dice o cuando
   * publica potencia a 4 Ω; 8 cuando solo publica potencia a 8 Ω.
   */
  minLoadOhms: number;
  /** Tope de bocinas por zona que fija el fabricante, si lo hay. */
  maxSpeakersPerZone: number | null;
  /** Plataformas de streaming integradas. */
  streaming: string;
  sourceQuote: string;
  source: string;
  /** id en `products` de ALFA OS (produccion), si ya esta dado de alta. */
  productId: number | null;
  /** Foto del producto, servida desde public/, si existe. */
  image: string | null;
};

export const SIMULATOR_AMPLIFIERS: SimulatorAmplifier[] = [
  {
    id: "sonos-amp",
    brand: "Sonos",
    model: "Amp",
    label: "Streaming Sonos, una zona",
    supplier: "RDA",
    channels: 2,
    zones: 1,
    powerPerChannelW: 125,
    // La ficha da "Peak Output Power 250 W/channel (4 ohm)": es potencia pico,
    // no continua, asi que no se usa.
    power4OhmW: null,
    minLoadOhms: 4,
    maxSpeakersPerZone: 4,
    streaming: "Sonos, AirPlay 2",
    // Guia del Amp: "125W/Ch into 8 ohms", "Do not connect speakers rated at less
    // than 4 ohm" y "Two pairs of 8 ohm speakers wired in parallel are also
    // supported". Soporte: "Don't attach more than four speakers to your Amp
    // unless you're using Sonos Architectural speakers".
    sourceQuote: "Two pairs of 8 ohm speakers wired in parallel are also supported.",
    source: "https://www.sonos.com/en-us/guides/amp",
    productId: 19,
    image: "/simulador/sonos-amp.avif",
  },
  {
    id: "sonos-amp-multi",
    brand: "Sonos",
    model: "Amp Multi",
    label: "Streaming Sonos, cuatro zonas",
    supplier: "RDA",
    channels: 8,
    zones: 4,
    powerPerChannelW: 125,
    power4OhmW: null,
    // Sonos solo publica la carga minima para sus propias bocinas (2.67 Ω con
    // Sonos Architectural) y no da una regla para otras marcas. Se toma el caso
    // seguro: una bocina de 8 Ω por salida, un par por zona.
    minLoadOhms: 8,
    maxSpeakersPerZone: null,
    streaming: "Sonos, AirPlay 2",
    sourceQuote: "Four-zone, eight-output; 125 W por canal a 8 Ω",
    source:
      "https://cdn.mediavalet.com/usva/sonos/wC6XfKSCKEKpzI-RZWowgg/f8rzWtzj7kukKTS8pbGkEQ/Original/Sonos_AmpMulti_SpecSheet_EN.pdf",
    productId: null,
    image: null,
  },
  {
    id: "marantz-model-m1",
    brand: "Marantz",
    model: "MODEL M1",
    label: "Streaming HEOS, una zona",
    supplier: "Dextra",
    channels: 2,
    zones: 1,
    powerPerChannelW: 100,
    power4OhmW: 125,
    minLoadOhms: 4,
    maxSpeakersPerZone: null,
    streaming: "HEOS, AirPlay 2, Spotify Connect",
    // Los 125 W a 4 Ω estan medidos a 1 kHz, no en toda la banda.
    sourceQuote: "100 W + 100 W (8 Ω, THD 0.05%); 125 W + 125 W (4 Ω, 1 kHz); 4 – 16 Ω",
    source:
      "https://www.marantz.com/on/demandware.static/-/Library-Sites-marantz_northamerica_shared/default/dw5ed80fb2/archive-downloads/MODEL_M1_Infosheet.pdf",
    productId: null,
    image: null,
  },
  {
    id: "marantz-model-m4",
    brand: "Marantz",
    model: "MODEL M4",
    label: "Streaming HEOS, cuatro zonas",
    supplier: "Dextra",
    channels: 8,
    zones: 4,
    powerPerChannelW: 100,
    power4OhmW: 125,
    minLoadOhms: 4,
    maxSpeakersPerZone: null,
    streaming: "HEOS, AirPlay 2",
    // Los 125 W a 4 Ω estan medidos a 1 kHz, no en toda la banda.
    sourceQuote: "8 × 100 W (8 Ω, 20 Hz to 20 kHz); 8 × 125 W (4 Ω, 1 kHz); 4 – 16 Ω",
    source:
      "https://www.marantz.com/on/demandware.static/-/Library-Sites-marantz_northamerica_shared/default/dw9c7261b6/archive-downloads/Marantz_Infosheet_MODEL_M4.pdf",
    productId: null,
    image: null,
  },
  {
    id: "marantz-model-60n",
    brand: "Marantz",
    model: "MODEL 60n",
    label: "Integrado con streaming HEOS, una zona",
    supplier: "Dextra",
    channels: 2,
    zones: 1,
    powerPerChannelW: 60,
    power4OhmW: 80,
    minLoadOhms: 4,
    maxSpeakersPerZone: null,
    streaming: "HEOS, AirPlay 2, Bluetooth",
    // El rango de 4 a 16 Ω viene del manual oficial, no de la ficha.
    sourceQuote: "Power Output (8 / 4 Ohm RMS) 60 W / 80 W",
    source:
      "https://www.marantz.com/on/demandware.static/-/Library-Sites-marantz_northamerica_shared/default/dw44862cba/archive-downloads/Marantz-MODEL-60n-Information-Sheet.pdf",
    productId: null,
    image: null,
  },
  {
    id: "nad-c700-v2",
    brand: "NAD",
    model: "C 700 V2",
    label: "Streaming BluOS, una zona",
    supplier: "RDA",
    channels: 2,
    zones: 1,
    powerPerChannelW: 80,
    power4OhmW: 100,
    minLoadOhms: 4,
    maxSpeakersPerZone: null,
    streaming: "BluOS",
    // El minimo de 4 Ω se lee en la serigrafia del panel trasero, en la foto de la ficha.
    sourceQuote: "Rated output power into 8 ohms 80W; into 4 ohms 100W (both channels driven)",
    source:
      "https://s3.ca-central-1.amazonaws.com/content-nadelectronics-com/downloads/NAD-C-700-V2-Data-Sheet.pdf",
    productId: null,
    image: null,
  },
  {
    id: "bluesound-powernode-n331",
    brand: "Bluesound",
    model: "POWERNODE N331",
    label: "Streaming BluOS, una zona",
    supplier: "RDA",
    channels: 2,
    zones: 1,
    powerPerChannelW: 100,
    power4OhmW: null,
    minLoadOhms: 8,
    maxSpeakersPerZone: null,
    streaming: "BluOS, AirPlay 2, Bluetooth",
    // La ficha no da carga minima ni potencia continua a 4 Ω (solo dinamica).
    sourceQuote: "Rated Power Output: 100W x 2 (8 Ohms)",
    source:
      "https://cdn.shopify.com/s/files/1/0729/0096/8495/files/POWERNODE_N331_Data_Sheet.pdf",
    productId: null,
    image: null,
  },
];

export const DEFAULT_SIMULATOR_AMPLIFIER = SIMULATOR_AMPLIFIERS[0];

export function getSimulatorAmplifier(id: string | null | undefined) {
  return SIMULATOR_AMPLIFIERS.find((amplifier) => amplifier.id === id) || null;
}

/** Canales que tiene cada zona del equipo (dos en un equipo estereo). */
function channelsPerZone(amplifier: SimulatorAmplifier) {
  return Math.max(1, Math.round(amplifier.channels / amplifier.zones));
}

/**
 * Cuantas bocinas de ese modelo puede mover UNA zona del amplificador sin
 * bajar de su carga minima, conectandolas en paralelo.
 *
 * Dos bocinas de 8 Ω en paralelo dan 4 Ω. Con carga minima de 4 Ω caben dos
 * por canal: cuatro bocinas normales en una zona estereo, o dos bocinas
 * estereo de doble bobina (cada una ocupa los dos canales).
 */
export function speakersPerZone(
  amplifier: SimulatorAmplifier,
  speaker: SimulatorSpeaker
) {
  const perChannel = Math.floor(speaker.impedanceOhms / amplifier.minLoadOhms);
  if (perChannel < 1) return 0;

  const byImpedance =
    speaker.amplifierChannels === 2
      ? perChannel
      : perChannel * channelsPerZone(amplifier);

  return amplifier.maxSpeakersPerZone === null
    ? byImpedance
    : Math.min(byImpedance, amplifier.maxSpeakersPerZone);
}

/**
 * Zonas de amplificador que ocupa un espacio. Cada espacio es al menos una
 * zona (su propio volumen y su propia musica); si lleva mas bocinas de las
 * que mueve una zona, ocupa otra.
 */
export function zonesForRoom(
  amplifier: SimulatorAmplifier,
  speaker: SimulatorSpeaker,
  speakerCount: number
) {
  if (speakerCount <= 0) return 0;

  const capacity = speakersPerZone(amplifier, speaker);
  if (capacity < 1) return 0;

  return Math.ceil(speakerCount / capacity);
}

/** Equipos necesarios para cubrir ese numero de zonas. */
export function amplifierUnits(amplifier: SimulatorAmplifier, zones: number) {
  return zones <= 0 ? 0 : Math.ceil(zones / amplifier.zones);
}

/**
 * Potencia que entrega un canal segun cuantas bocinas tiene conectadas. Con
 * dos bocinas de 8 Ω el canal ve 4 Ω; ahi se usa la potencia a 4 Ω si el
 * fabricante la publica, y si no, la de 8 Ω (no se supone potencia extra).
 */
export function channelPowerW(
  amplifier: SimulatorAmplifier,
  speaker: SimulatorSpeaker,
  speakersOnChannel: number
) {
  const load = speaker.impedanceOhms / Math.max(1, speakersOnChannel);
  return load <= 4.01 && amplifier.power4OhmW !== null
    ? amplifier.power4OhmW
    : amplifier.powerPerChannelW;
}
