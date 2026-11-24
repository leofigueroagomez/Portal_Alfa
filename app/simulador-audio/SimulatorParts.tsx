"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronDown, Coffee, PartyPopper, Users, type LucideIcon } from "lucide-react";
import { COVERAGE_MODES, type CoverageMode } from "@/lib/simuladorAudio/geometry";
import {
  LOUDNESS_VERDICT_TEXT,
  type LoudnessVerdict,
  type RoomLoudness,
} from "@/lib/simuladorAudio/loudness";
import { SIMULATOR_SPEAKERS } from "@/lib/simuladorAudio/speakers";

/** Piezas visuales del simulador: tarjetas con foto, ambientes y medidor de volumen. */

const SCENARIO_ICONS: Record<CoverageMode, LucideIcon> = {
  ambiental: Coffee,
  uniforme: Users,
  maxima: PartyPopper,
};

const SCENARIO_ORDER: CoverageMode[] = ["ambiental", "uniforme", "maxima"];

// Escala del medidor, en dB.
const METER_MIN = 55;
const METER_MAX = 100;

const VERDICT_COLOR: Record<LoudnessVerdict, string> = {
  sobrado: "#0F6B43",
  justo: "#8A5A00",
  corto: "#9E1B32",
};

function meterPosition(level: number) {
  const clamped = Math.min(METER_MAX, Math.max(METER_MIN, level));
  return ((clamped - METER_MIN) / (METER_MAX - METER_MIN)) * 100;
}

export function ProductPhoto({
  src,
  alt,
  size,
}: {
  src: string;
  alt: string;
  size: number;
}) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white"
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="h-full w-full object-contain p-1.5"
      />
    </span>
  );
}

export function ScenarioPicker({
  value,
  onChange,
}: {
  value: CoverageMode;
  onChange: (mode: CoverageMode) => void;
}) {
  return (
    <div className="grid gap-2">
      {SCENARIO_ORDER.map((mode) => {
        const Icon = SCENARIO_ICONS[mode];
        const selected = mode === value;

        return (
          <button
            key={mode}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(mode)}
            className={`flex items-start gap-3 rounded-2xl px-4 py-3.5 text-left transition ${
              selected
                ? "bg-[#111111] text-white shadow-lg shadow-black/10"
                : "bg-white text-[#111111] hover:bg-white/70"
            }`}
          >
            <Icon
              className={`mt-0.5 h-5 w-5 shrink-0 ${selected ? "text-[#E07A8B]" : "text-[#9E1B32]"}`}
              aria-hidden="true"
            />
            <span>
              <span className="block text-[15px] font-semibold">
                {COVERAGE_MODES[mode].label}
              </span>
              <span
                className={`mt-0.5 block text-[13px] leading-5 ${
                  selected ? "text-zinc-300" : "text-[#77797F]"
                }`}
              >
                {COVERAGE_MODES[mode].description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

type SpeakerMount = (typeof SIMULATOR_SPEAKERS)[number]["mount"];

const SPEAKER_GROUPS: { label: string; mount: SpeakerMount }[] = [
  { label: "De plafón", mount: "plafon" },
  { label: "De muro", mount: "muro" },
  { label: "Inalámbricas", mount: "mueble" },
];

export function SpeakerPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (modelId: string) => void;
}) {
  const selected = SIMULATOR_SPEAKERS.find((speaker) => speaker.id === value) || null;
  // Cada grupo se puede plegar. Al entrar solo esta abierto el de la bocina
  // elegida, para que la lista no ocupe media pantalla.
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    selected ? { [selected.mount]: true } : { plafon: true }
  );

  return (
    <div className="space-y-2">
      {SPEAKER_GROUPS.map((group) => {
        const speakers = SIMULATOR_SPEAKERS.filter(
          (speaker) => speaker.mount === group.mount
        );
        if (speakers.length === 0) return null;

        const isOpen = Boolean(open[group.mount]);
        const panelId = `bocinas-${group.mount}`;
        const chosenHere = selected?.mount === group.mount ? selected : null;

        return (
          <div key={group.mount} className="rounded-2xl bg-white/60">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() =>
                setOpen((current) => ({ ...current, [group.mount]: !isOpen }))
              }
              className="flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-3 text-left transition hover:bg-white"
            >
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold uppercase tracking-[0.16em] text-[#5F626A]">
                  {group.label}
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-[#77797F]">
                  {chosenHere
                    ? `Elegida: ${chosenHere.brand === "Bowers & Wilkins" ? "B&W" : chosenHere.brand} ${chosenHere.model}`
                    : `${speakers.length} ${speakers.length === 1 ? "modelo" : "modelos"}`}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[#77797F] transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
                aria-hidden="true"
              />
            </button>

            {isOpen ? (
              <div id={panelId} className="grid grid-cols-2 gap-2 px-2 pb-2">
                {speakers.map((speaker) => {
                  const isSelected = speaker.id === value;

                  return (
                    <button
                      key={speaker.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onChange(speaker.id)}
                      className={`rounded-2xl bg-white p-2.5 text-left transition ${
                        isSelected
                          ? "ring-2 ring-[#9E1B32]"
                          : "ring-1 ring-black/5 hover:ring-black/20"
                      }`}
                    >
                      <span className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-white">
                        <Image
                          src={speaker.image}
                          alt={`${speaker.brand} ${speaker.model}`}
                          width={160}
                          height={160}
                          className="h-full w-full object-contain p-2"
                        />
                      </span>
                      <span className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9E1B32]">
                        {speaker.brand === "Bowers & Wilkins" ? "B&W" : speaker.brand}
                      </span>
                      <span className="block text-[14px] font-semibold leading-5 text-[#111111]">
                        {speaker.model}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function LoudnessMeter({
  mode,
  loudness,
}: {
  mode: CoverageMode;
  loudness: RoomLoudness;
}) {
  const verdict = LOUDNESS_VERDICT_TEXT[loudness.verdict];
  const color = VERDICT_COLOR[loudness.verdict];

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9E1B32]">
        Así se va a escuchar
      </p>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight">
        {COVERAGE_MODES[mode].label}:{" "}
        <span style={{ color }}>{verdict.title.toLowerCase()}</span>
      </h3>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#5F626A]">{verdict.body}</p>

      {/* Medidor: hasta donde llega el sistema frente a los tres ambientes. */}
      <div className="mt-9">
        <div className="relative h-2.5 rounded-full bg-[#EFEDE7]">
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${meterPosition(loudness.level)}%`, backgroundColor: color }}
          />
          {SCENARIO_ORDER.map((scenario) => (
            <span
              key={scenario}
              className="absolute top-1/2 h-5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-[#111111]"
              style={{ left: `${meterPosition(COVERAGE_MODES[scenario].targetDb)}%` }}
              aria-hidden="true"
            />
          ))}
        </div>
        <div className="relative mt-3 h-9 text-[12px] text-[#5F626A]">
          {SCENARIO_ORDER.map((scenario) => (
            <span
              key={scenario}
              className={`absolute -translate-x-1/2 text-center leading-4 ${
                scenario === mode ? "font-semibold text-[#111111]" : ""
              }`}
              style={{ left: `${meterPosition(COVERAGE_MODES[scenario].targetDb)}%` }}
            >
              {COVERAGE_MODES[scenario].label}
            </span>
          ))}
        </div>
      </div>

      <p className="text-sm text-[#33353B]">
        Tu sistema sostiene alrededor de{" "}
        <span className="font-semibold">{Math.round(loudness.level)} dB</span> en casi todo
        el espacio
        {loudness.powerPerSpeakerW > 0
          ? `, con ${Math.round(loudness.powerPerSpeakerW)} W por bocina.`
          : ", con el amplificador que trae cada bocina."}
      </p>
      <p className="mt-3 text-[13px] leading-5 text-[#77797F]">
        Para ubicarte: una conversación normal ronda los 60 dB, un restaurante lleno los
        80 dB y un concierto los 100 dB. Es una estimación de sonido directo; no cuenta el
        rebote del cuarto, que en interiores suma volumen.
      </p>
    </div>
  );
}
