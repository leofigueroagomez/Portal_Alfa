"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Check,
  Clapperboard,
  Coffee,
  Hammer,
  House,
  PartyPopper,
  Plus,
  Sofa,
  Store,
  Trees,
  Tv,
  TvMinimal,
  Users,
  Utensils,
  Volume2,
  Wifi,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  MAX_ASSISTANT_SPACES,
  SPACE_OPTIONS,
  STAGE_OPTIONS,
  SURROUND_OPTIONS,
  TV_OPTIONS,
  recommendSpace,
  type AssistantAnswers,
  type EquipmentLine,
  type SpaceKind,
  type StageChoice,
  type SurroundChoice,
  type TvChoice,
} from "@/lib/simuladorAudio/assistant";
import { COVERAGE_MODES, type CoverageMode } from "@/lib/simuladorAudio/geometry";
import {
  TV_ROOM_LIMITS,
  sanitizeTvRoom,
  type SoundbarVerdict,
  type TvRoom,
} from "@/lib/simuladorAudio/soundbar";
import { ProductPhoto } from "./SimulatorParts";

type ViewerKind = "interno" | "portal" | "visitante";
type QuestionKey = "space" | "tv" | "surround" | "medidas" | "use" | "stage";
/** Preguntas que se contestan eligiendo una tarjeta. */
type ChoiceKey = Exclude<QuestionKey, "medidas">;
type Draft = Partial<AssistantAnswers>;

const ICONS: Record<string, LucideIcon> = {
  sala: Sofa,
  recamara: BedDouble,
  cocina: Utensils,
  terraza: Trees,
  negocio: Store,
  no: Volume2,
  mejor: TvMinimal,
  cine: Clapperboard,
  techo: House,
  muro: Tv,
  inalambricas: Wifi,
  ambiental: Coffee,
  uniforme: Users,
  maxima: PartyPopper,
  obra: Hammer,
  terminado: Check,
};

const PROJECT_TYPES = [
  { value: "residencial", label: "Casa o departamento" },
  { value: "comercial", label: "Restaurante, tienda u hotel" },
  { value: "corporativo", label: "Oficina" },
  { value: "industrial", label: "Nave o planta" },
];

const QUESTIONS: Record<QuestionKey, { title: string; hint: string }> = {
  space: {
    title: "¿Qué espacio quieres sonorizar?",
    hint: "Empezamos por uno; después puedes agregar los demás.",
  },
  tv: {
    title: "¿Hay televisión en este espacio?",
    hint: "Si la hay, el sonido de la tele y la música pueden ser el mismo sistema.",
  },
  surround: {
    title: "¿Dónde irían las bocinas de atrás?",
    hint: "Son las que te envuelven en las películas.",
  },
  medidas: {
    title: "¿Cómo es el espacio de tu televisión?",
    hint: "Con estas medidas comprobamos qué barra de sonido necesitas, sin que pagues de más ni te quedes corto.",
  },
  use: {
    title: "¿Para qué lo vas a usar más?",
    hint: "Esto define cuántas bocinas y qué tan fuerte.",
  },
  stage: {
    title: "¿Cómo está el espacio hoy?",
    hint: "De esto depende si conviene empotrar o ir inalámbrico.",
  },
};

/** Preguntas que le tocan a este espacio, segun lo que ya contesto. */
function questionsFor(draft: Draft): QuestionKey[] {
  // En exterior no se pregunta por tele ni por obra: van bocinas de muro.
  if (draft.space === "terraza") return ["space", "use"];

  const keys: QuestionKey[] = ["space", "tv"];
  if (draft.tv === "cine") keys.push("surround");
  // Con television, las medidas deciden que barra va.
  if (draft.tv === "mejor" || draft.tv === "cine") keys.push("medidas");
  keys.push("use", "stage");
  return keys;
}

function optionsFor(key: ChoiceKey): { value: string; label: string; hint: string }[] {
  const source =
    key === "space"
      ? SPACE_OPTIONS
      : key === "tv"
        ? TV_OPTIONS
        : key === "surround"
          ? SURROUND_OPTIONS
          : key === "stage"
            ? STAGE_OPTIONS
            : Object.fromEntries(
                (Object.keys(COVERAGE_MODES) as CoverageMode[]).map((mode) => [
                  mode,
                  { label: COVERAGE_MODES[mode].label, hint: COVERAGE_MODES[mode].description },
                ])
              );

  return Object.entries(source).map(([value, option]) => ({
    value,
    label: (option as { label: string }).label,
    hint: (option as { hint: string }).hint,
  }));
}

function EquipmentRow({ line }: { line: EquipmentLine }) {
  return (
    <li className="flex items-center gap-4 py-3">
      {line.image ? (
        <ProductPhoto src={line.image} alt={line.name} size={64} />
      ) : (
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white px-1 text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9E1B32]">
          {line.name.split(" ")[0]}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-[#111111]">{line.name}</p>
        <p className="mt-0.5 text-[13px] text-[#77797F]">{line.role}</p>
      </div>
      <p className="text-right text-[13px] font-medium text-[#33353B]">
        {line.count > 0
          ? line.count === 1
            ? "1 pieza"
            : `${line.count} piezas`
          : "Según el tamaño"}
      </p>
    </li>
  );
}

const MEASURE_FIELDS: {
  key: keyof TvRoom;
  label: string;
  unit: string;
  placeholder: string;
  limits: { min: number; max: number };
}[] = [
  { key: "lengthM", label: "Largo del espacio", unit: "m", placeholder: "9", limits: TV_ROOM_LIMITS.sideM },
  { key: "widthM", label: "Ancho del espacio", unit: "m", placeholder: "5", limits: TV_ROOM_LIMITS.sideM },
  {
    key: "seatDistanceM",
    label: "Del sillón a la tele",
    unit: "m",
    placeholder: "4",
    limits: TV_ROOM_LIMITS.seatDistanceM,
  },
  {
    key: "tvInches",
    label: "Tamaño de la tele",
    unit: "pulgadas",
    placeholder: "75",
    limits: TV_ROOM_LIMITS.tvInches,
  },
];

/** Paso de medidas: cuatro numeros, o seguir sin ellos. */
function MeasuresStep({
  initial,
  onSubmit,
  onSkip,
}: {
  initial?: TvRoom;
  onSubmit: (room: TvRoom) => void;
  onSkip: () => void;
}) {
  const [values, setValues] = useState<Record<keyof TvRoom, string>>({
    lengthM: initial ? String(initial.lengthM) : "",
    widthM: initial ? String(initial.widthM) : "",
    seatDistanceM: initial ? String(initial.seatDistanceM) : "",
    tvInches: initial ? String(initial.tvInches) : "",
  });
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numbers = {} as TvRoom;
    for (const field of MEASURE_FIELDS) {
      const text = values[field.key].trim();
      if (!text) {
        setError(`Falta: ${field.label.toLowerCase()}.`);
        return;
      }
      const value = Number(text.replace(",", "."));
      if (!Number.isFinite(value)) {
        setError(`${field.label}: escribe solo el número, sin letras ni símbolos.`);
        return;
      }
      if (value < field.limits.min || value > field.limits.max) {
        setError(
          `${field.label}: escribe un valor entre ${field.limits.min} y ${field.limits.max} ${field.unit}.`
        );
        return;
      }
      numbers[field.key] = value;
    }

    // Cada medida ya esta en su rango: lo unico que queda es un sillon mas
    // lejos de la tele de lo que mide el espacio.
    const room = sanitizeTvRoom(numbers);
    if (!room) {
      setError("La distancia del sillón a la tele no puede ser mayor que el espacio.");
      return;
    }
    onSubmit(room);
  }

  return (
    <form onSubmit={submit} className="mt-9 max-w-2xl" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {MEASURE_FIELDS.map((field) => (
          <label
            key={field.key}
            className="block rounded-3xl bg-white p-5 ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-[#9E1B32]"
          >
            <span className="block text-[14px] text-[#77797F]">{field.label}</span>
            <span className="mt-2 flex items-baseline gap-2">
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                className="w-full min-w-0 bg-transparent text-3xl font-semibold tracking-tight text-[#111111] outline-none placeholder:text-[#C9C7C1]"
                placeholder={field.placeholder}
                value={values[field.key]}
                onChange={(event) => {
                  setValues((current) => ({ ...current, [field.key]: event.target.value }));
                  setError("");
                }}
              />
              <span className="shrink-0 text-[14px] text-[#77797F]">{field.unit}</span>
            </span>
          </label>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-[#9E1B32]">
          {error}
        </p>
      ) : null}

      <div className="mt-7 flex flex-wrap items-center gap-5">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-[#111111] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-black"
        >
          Continuar
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-[#5F626A] underline-offset-4 hover:underline"
        >
          No tengo las medidas
        </button>
      </div>
    </form>
  );
}

/** La cuenta a la vista: que cubre cada barra contra las medidas del visitante. */
function SoundbarProof({ verdict }: { verdict: SoundbarVerdict }) {
  return (
    <div className="mt-5 rounded-2xl bg-[#F7F6F3] p-5">
      <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
        ¿Por qué esta barra?
      </p>
      <p className="mt-2 text-[17px] font-semibold tracking-tight text-[#111111]">
        {verdict.title}
      </p>
      <p className="mt-1 text-[13px] text-[#77797F]">{verdict.roomText}.</p>

      {/* En celular la etiqueta va en su propio renglon, arriba de sus dos valores. */}
      <div className="mt-4 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-[13px] sm:grid-cols-[auto_auto_1fr] sm:gap-x-6 sm:gap-y-2.5">
        <span className="hidden sm:block" />
        <span className="font-semibold text-[#111111]">Tu espacio</span>
        <span className="font-semibold text-[#111111]">La Beam cubre</span>
        {verdict.checks.map((check) => (
          <div key={check.key} className="contents">
            <span className="col-span-2 mt-2 text-[12px] text-[#77797F] sm:col-span-1 sm:mt-0 sm:text-[13px]">
              {check.label}
            </span>
            <span className="text-[#111111]">{check.yours}</span>
            <span
              className={`flex items-start gap-1.5 whitespace-nowrap ${
                check.pass ? "text-[#33353B]" : "text-[#9E1B32]"
              }`}
            >
              {check.pass ? (
                <Check
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0F6B43]"
                  aria-hidden="true"
                />
              ) : (
                <X className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              <span className="sr-only">{check.pass ? "Cumple:" : "No cumple:"}</span>
              {check.limit}
            </span>
          </div>
        ))}
      </div>

      <ul className="mt-4 space-y-1.5 text-[14px] leading-6 text-[#33353B]">
        {verdict.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] leading-5 text-[#77797F]">
        Guía de selección de ALFA, con base en las recomendaciones de Sonos para cada barra.
        No es una medición acústica.
      </p>
    </div>
  );
}

export default function Assistant({
  viewerKind,
  spaces,
  onSpacesChange,
  onOpenSimulator,
  onSkip,
}: {
  viewerKind: ViewerKind;
  spaces: AssistantAnswers[];
  onSpacesChange: (spaces: AssistantAnswers[]) => void;
  onOpenSimulator: () => void;
  onSkip: () => void;
}) {
  // Si ya hay espacios contestados se muestra la solucion; si no, las preguntas.
  const [asking, setAsking] = useState(spaces.length === 0);
  const [draft, setDraft] = useState<Draft>({});
  const [stepIndex, setStepIndex] = useState(0);

  const [projectType, setProjectType] = useState("residencial");
  const [note, setNote] = useState("");
  const [proposalState, setProposalState] = useState<"idle" | "sending" | "sent">("idle");
  const [proposalError, setProposalError] = useState("");

  const steps = questionsFor(draft);
  const currentKey = steps[Math.min(stepIndex, steps.length - 1)];
  const recommendations = spaces.map(recommendSpace);
  const hasMusic = recommendations.some((recommendation) => recommendation.music);

  function startSpace() {
    setDraft({});
    setStepIndex(0);
    setAsking(true);
    setProposalState("idle");
  }

  function answer(value: string) {
    const next: Draft = { ...draft, [currentKey]: value };
    // Al cambiar el tipo de espacio o de tele, las respuestas que dependian de eso ya no aplican.
    if (currentKey === "space") {
      delete next.tv;
      delete next.surround;
      delete next.tvRoom;
    }
    if (currentKey === "tv" && value !== "cine") delete next.surround;
    if (currentKey === "tv" && value === "no") delete next.tvRoom;

    advance(next);
  }

  /** Guarda las medidas (o las quita si el visitante no las tiene) y sigue. */
  function answerMeasures(room: TvRoom | null) {
    const next: Draft = { ...draft };
    if (room) next.tvRoom = room;
    else delete next.tvRoom;

    advance(next);
  }

  function advance(next: Draft) {
    const nextSteps = questionsFor(next);
    const position = nextSteps.indexOf(currentKey);

    if (position < nextSteps.length - 1) {
      setDraft(next);
      setStepIndex(position + 1);
      return;
    }

    const completed: AssistantAnswers = {
      space: next.space as SpaceKind,
      tv: (next.tv as TvChoice) || "no",
      use: next.use as CoverageMode,
      stage: (next.stage as StageChoice) || "terminado",
      ...(next.surround ? { surround: next.surround as SurroundChoice } : {}),
      ...(next.tvRoom && next.tv && next.tv !== "no" ? { tvRoom: next.tvRoom } : {}),
    };

    onSpacesChange([...spaces, completed]);
    setAsking(false);
    setProposalState("idle");
  }

  function removeSpace(index: number) {
    const next = spaces.filter((_, position) => position !== index);
    onSpacesChange(next);
    setProposalState("idle");
    if (next.length === 0) startSpace();
  }

  async function submitProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProposalState("sending");
    setProposalError("");

    try {
      const response = await fetch("/api/simulador-audio/propuesta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistant: spaces, projectType, note }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setProposalState("idle");
        setProposalError(data?.error || "No pudimos enviar tu solicitud.");
        return;
      }

      setProposalState("sent");
    } catch {
      setProposalState("idle");
      setProposalError("No pudimos enviar tu solicitud. Revisa tu conexión.");
    }
  }

  return (
    <section className="bg-[#F7F6F3] text-[#111111]">
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        {asking ? (
          <div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9E1B32]">
                {spaces.length === 0 ? "Empecemos" : `Espacio ${spaces.length + 1}`} · Paso{" "}
                {Math.min(stepIndex, steps.length - 1) + 1} de {steps.length}
              </p>
              <button
                type="button"
                onClick={onSkip}
                className="text-sm text-[#5F626A] underline-offset-4 hover:underline"
              >
                Ir directo al simulador
              </button>
            </div>

            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              {QUESTIONS[currentKey].title}
            </h2>
            <p className="mt-3 text-[15px] leading-7 text-[#5F626A]">
              {QUESTIONS[currentKey].hint}
            </p>

            {currentKey === "medidas" ? (
              <MeasuresStep
                key={spaces.length}
                initial={draft.tvRoom}
                onSubmit={answerMeasures}
                onSkip={() => answerMeasures(null)}
              />
            ) : (
              <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {optionsFor(currentKey).map((option) => {
                  const Icon = ICONS[option.value] || Volume2;
                  const selected = draft[currentKey] === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => answer(option.value)}
                      className={`flex items-start gap-4 rounded-3xl bg-white p-5 text-left transition hover:shadow-lg hover:shadow-black/5 ${
                        selected ? "ring-2 ring-[#9E1B32]" : "ring-1 ring-black/5"
                      }`}
                    >
                      <Icon className="mt-0.5 h-6 w-6 shrink-0 text-[#9E1B32]" aria-hidden="true" />
                      <span>
                        <span className="block text-[17px] font-semibold">{option.label}</span>
                        <span className="mt-1 block text-[14px] leading-5 text-[#77797F]">
                          {option.hint}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-8 flex items-center gap-5">
              {stepIndex > 0 ? (
                <button
                  type="button"
                  onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
                  className="inline-flex items-center gap-2 text-sm font-medium text-[#33353B] underline-offset-4 hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Pregunta anterior
                </button>
              ) : null}
              {spaces.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setAsking(false)}
                  className="text-sm text-[#5F626A] underline-offset-4 hover:underline"
                >
                  Cancelar y ver mi solución
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9E1B32]">
              Tu solución inicial
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Esto es lo que te proponemos
            </h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[#5F626A]">
              Es un punto de partida con los equipos que instalamos. Un asesor de ALFA lo
              ajusta contigo antes de cotizar.
            </p>

            <div className="mt-9 grid gap-5 lg:grid-cols-2">
              {recommendations.map((recommendation, index) => (
                <article
                  key={index}
                  className="min-w-0 rounded-3xl bg-white p-6 shadow-sm sm:p-7"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
                        {SPACE_OPTIONS[recommendation.answers.space].label}
                      </p>
                      <h3 className="mt-1.5 text-2xl font-semibold tracking-tight">
                        {recommendation.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSpace(index)}
                      className="text-[13px] text-[#77797F] underline-offset-4 hover:underline"
                    >
                      Quitar
                    </button>
                  </div>

                  <ul className="mt-4 divide-y divide-black/10">
                    {recommendation.tv.map((line) => (
                      <EquipmentRow key={`${line.key}-${line.role}`} line={line} />
                    ))}
                    {recommendation.music ? (
                      <EquipmentRow line={recommendation.music.line} />
                    ) : null}
                  </ul>

                  {recommendation.soundbar ? (
                    <SoundbarProof verdict={recommendation.soundbar} />
                  ) : null}

                  <ul className="mt-4 space-y-2 text-[14px] leading-6 text-[#5F626A]">
                    {recommendation.reasons.map((reason) => (
                      <li key={reason} className="flex gap-2.5">
                        <Check
                          className="mt-1 h-4 w-4 shrink-0 text-[#9E1B32]"
                          aria-hidden="true"
                        />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}

              {spaces.length < MAX_ASSISTANT_SPACES ? (
                <button
                  type="button"
                  onClick={startSpace}
                  className="flex min-h-40 items-center justify-center gap-2 rounded-3xl border border-dashed border-black/20 text-[15px] font-medium text-[#33353B] transition hover:border-[#9E1B32] hover:text-[#9E1B32]"
                >
                  <Plus className="h-5 w-5" />
                  Agregar otro espacio
                </button>
              ) : null}
            </div>

            <div className="mt-12 grid gap-10 border-t border-black/10 pt-10 lg:grid-cols-2">
              <div>
                <h3 className="text-2xl font-semibold tracking-tight">Afínalo en el simulador</h3>
                <p className="mt-2 text-sm leading-6 text-[#5F626A]">
                  {hasMusic
                    ? "Abre el simulador con estas bocinas ya elegidas. Pon las medidas o sube tu plano, y verás cuántas son, dónde van y qué tan fuerte se escucha."
                    : "Tu sistema de televisión ya está definido. Si además quieres música en el espacio, ábrelo en el simulador y agrega bocinas."}
                </p>
                <button
                  type="button"
                  onClick={onOpenSimulator}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#111111] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-black"
                >
                  Abrir el simulador
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div>
                {viewerKind === "visitante" ? (
                  proposalState === "sent" ? (
                    <div>
                      <Check className="h-7 w-7 text-[#0F6B43]" aria-hidden="true" />
                      <h3 className="mt-4 text-2xl font-semibold tracking-tight">
                        Recibimos tu solicitud
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[#5F626A]">
                        Un asesor de ALFA te contactará para afinarla y enviarte una
                        propuesta.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={submitProposal}>
                      <h3 className="text-2xl font-semibold tracking-tight">
                        O pide tu propuesta ya
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[#5F626A]">
                        Enviamos estas respuestas a un asesor de ALFA para que te cotice el
                        sistema instalado.
                      </p>
                      <label className="mt-5 block text-[13px] font-medium text-[#5F626A]">
                        Tipo de proyecto
                        <select
                          className="mt-2 w-full rounded-xl border border-[#E5E3DD] bg-white px-3.5 py-2.5 text-[15px] text-[#111111] outline-none focus:border-[#9E1B32] focus:ring-2 focus:ring-[#9E1B32]/15"
                          value={projectType}
                          onChange={(event) => setProjectType(event.target.value)}
                        >
                          {PROJECT_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="mt-4 block text-[13px] font-medium text-[#5F626A]">
                        ¿Algo que debamos saber? (opcional)
                        <textarea
                          className="mt-2 min-h-20 w-full resize-y rounded-xl border border-[#E5E3DD] bg-white px-3.5 py-2.5 text-[15px] text-[#111111] outline-none focus:border-[#9E1B32] focus:ring-2 focus:ring-[#9E1B32]/15"
                          value={note}
                          maxLength={1000}
                          onChange={(event) => setNote(event.target.value)}
                        />
                      </label>
                      {proposalError ? (
                        <p role="alert" className="mt-4 text-sm text-[#9E1B32]">
                          {proposalError}
                        </p>
                      ) : null}
                      <button
                        type="submit"
                        disabled={proposalState === "sending"}
                        className="mt-5 w-full rounded-xl bg-[#9E1B32] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#B91C3C] disabled:opacity-60"
                      >
                        {proposalState === "sending" ? "Enviando…" : "Solicitar propuesta"}
                      </button>
                    </form>
                  )
                ) : (
                  <p className="text-sm leading-6 text-[#5F626A]">
                    {viewerKind === "interno"
                      ? "Entraste con tu sesión de ALFA OS. La solicitud de propuesta solo aparece para los visitantes del sitio."
                      : "Entraste con tu cuenta del portal. Si quieres cotizar esta solución, escríbele a tu asesor de ALFA."}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
