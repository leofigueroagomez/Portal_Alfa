import type { SimulatorSpeaker } from "@/lib/simuladorAudio/speakers";

/**
 * Amplificadores que propone el simulador de audio.
 *
 * Misma regla que el catalogo de bocinas: cada dato sale de la ficha o del
 * soporte del fabricante (ver `source`). Sin precios.
 *
 * Hoy solo esta el Sonos Amp, que es el que ALFA instala por defecto. Los de
 * Dextra y Biamp entran cuando llegue el formulario de
 * docs/modules/simulador-audio/FORMULARIO_AMPLIFICADORES.md.
 */

export type SimulatorAmplifier = {
  id: string;
  brand: string;
  model: string;
  /** Descripcion corta para la lista de equipos. */
  label: string;
  channels: number;
  /** Potencia continua por canal, en watts, a `ratedImpedanceOhms`. */
  powerPerChannelW: number;
  ratedImpedanceOhms: number;
  /** Carga minima que acepta cada canal, en ohms. */
  minLoadOhms: number;
  /** Tope de bocinas por equipo que fija el fabricante, sin importar la impedancia. */
  maxSpeakers: number;
  /** Zonas independientes que maneja un equipo. */
  zones: number;
  sourceQuote: string;
  source: string;
  /** id en `products` de ALFA OS (produccion). */
  productId: number;
  /** Foto del producto, servida desde public/. */
  image: string;
};

export const SIMULATOR_AMPLIFIERS: SimulatorAmplifier[] = [
  {
    id: "sonos-amp",
    brand: "Sonos",
    model: "Amp",
    label: "Amplificador con streaming, una zona",
    channels: 2,
    powerPerChannelW: 125,
    ratedImpedanceOhms: 8,
    minLoadOhms: 4,
    maxSpeakers: 4,
    zones: 1,
    // Guia del Amp: "125W/Ch into 8 ohms", "Do not connect speakers rated at less
    // than 4 ohm" y "Two pairs of 8 ohm speakers wired in parallel are also
    // supported". Soporte: "Don't attach more than four speakers to your Amp
    // unless you're using Sonos Architectural speakers".
    sourceQuote: "Two pairs of 8 ohm speakers wired in parallel are also supported.",
    source: "https://www.sonos.com/en-us/guides/amp",
    productId: 19,
    image: "/simulador/sonos-amp.avif",
  },
];

export const DEFAULT_SIMULATOR_AMPLIFIER = SIMULATOR_AMPLIFIERS[0];

export function getSimulatorAmplifier(id: string | null | undefined) {
  return SIMULATOR_AMPLIFIERS.find((amplifier) => amplifier.id === id) || null;
}

/**
 * Cuantas bocinas de ese modelo puede mover un amplificador sin bajar de su
 * carga minima, conectandolas en paralelo.
 *
 * Dos bocinas de 8 Ω en paralelo dan 4 Ω. Con carga minima de 4 Ω caben dos
 * por canal: cuatro bocinas normales en un amplificador de dos canales, o dos
 * bocinas estereo de doble bobina (cada una ocupa los dos canales).
 */
export function speakersPerAmplifier(
  amplifier: SimulatorAmplifier,
  speaker: SimulatorSpeaker
) {
  const perChannel = Math.floor(speaker.impedanceOhms / amplifier.minLoadOhms);
  if (perChannel < 1) return 0;

  const byImpedance =
    speaker.amplifierChannels === 2 ? perChannel : perChannel * amplifier.channels;

  return Math.min(byImpedance, amplifier.maxSpeakers);
}

/**
 * Amplificadores para un espacio. Cada espacio es una zona con su propio
 * volumen y su propia musica, asi que lleva al menos un amplificador.
 */
export function amplifiersForRoom(
  amplifier: SimulatorAmplifier,
  speaker: SimulatorSpeaker,
  speakerCount: number
) {
  if (speakerCount <= 0) return 0;

  const capacity = speakersPerAmplifier(amplifier, speaker);
  if (capacity < 1) return 0;

  return Math.ceil(speakerCount / capacity);
}
