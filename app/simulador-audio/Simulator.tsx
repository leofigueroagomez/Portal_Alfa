"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Check,
  MousePointer2,
  PenLine,
  Plus,
  RotateCcw,
  Ruler,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  COVERAGE_MODES,
  MAX_EFFECTIVE_DISPERSION_DEG,
  boundingBox,
  coverageDiameter,
  distance,
  interiorPoint,
  listeningHeight,
  polygonArea,
  rectanglePolygon,
  suggestLayout,
  type CoverageMode,
  type ListeningPosture,
  type Point,
} from "@/lib/simuladorAudio/geometry";
import {
  MAX_CEILING_HEIGHT,
  MAX_ROOMS,
  MIN_CEILING_HEIGHT,
  equipmentList,
  formatMeters,
  roomMetrics,
  type SimulatorDesign,
  type SimulatorRoom,
} from "@/lib/simuladorAudio/design";
import {
  DEFAULT_SIMULATOR_SPEAKER_ID,
  SIMULATOR_SPEAKERS,
  getSimulatorSpeaker,
} from "@/lib/simuladorAudio/speakers";
import PlanCanvas, { type CanvasTool } from "./PlanCanvas";
import { PlanFileError, loadPlanFile, type LoadedPlan } from "./planFile";

type ViewerKind = "interno" | "portal" | "visitante";
type Source = "medidas" | "plano";
type EditorRoom = SimulatorRoom & { width?: number; length?: number };
type PlanState = LoadedPlan & { pxPerMeter: number | null };

const UNITS_PER_METER = 100;
const MIN_SIDE = 1;
const MAX_SIDE = 60;

const PROJECT_TYPES = [
  { value: "residencial", label: "Casa o departamento" },
  { value: "comercial", label: "Restaurante, tienda u hotel" },
  { value: "corporativo", label: "Oficina" },
  { value: "industrial", label: "Nave o planta" },
];

const fieldClass =
  "mt-2 w-full rounded-xl border border-[#E5E3DD] bg-white px-3.5 py-2.5 text-[15px] text-[#111111] outline-none transition focus:border-[#9E1B32] focus:ring-2 focus:ring-[#9E1B32]/15";
const labelClass = "block text-[13px] font-medium text-[#5F626A]";
const ghostButtonClass =
  "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium text-[#33353B] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40";

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `area-${Math.random().toString(36).slice(2)}`;
}

function roomDiameter(room: SimulatorRoom) {
  const speaker = getSimulatorSpeaker(room.modelId);
  if (!speaker) return 0;

  return coverageDiameter(
    speaker.dispersionDeg,
    room.ceilingHeight,
    listeningHeight(room.posture)
  );
}

/** Recalcula el reparto automatico, salvo que el usuario ya haya acomodado bocinas a mano. */
function layoutRoom<T extends SimulatorRoom>(room: T): T {
  if (room.manual) return room;
  return { ...room, speakers: suggestLayout(room.points, roomDiameter(room), room.mode) };
}

function createRectRoom(
  name: string,
  template?: SimulatorRoom,
  id = newId()
): EditorRoom {
  const width = 5;
  const length = 4;

  return layoutRoom({
    id,
    name,
    width,
    length,
    points: rectanglePolygon(width, length),
    ceilingHeight: template?.ceilingHeight ?? 2.7,
    posture: template?.posture ?? "sentado",
    modelId: template?.modelId ?? DEFAULT_SIMULATOR_SPEAKER_ID,
    mode: template?.mode ?? "uniforme",
    speakers: [],
    manual: false,
  });
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [syncedValue, setSyncedValue] = useState(value);

  // Si el valor cambia desde fuera (otra area seleccionada), el texto se alinea.
  if (value !== syncedValue) {
    setSyncedValue(value);
    setText(String(value));
  }

  return (
    <label className={labelClass}>
      {label}
      <div className="relative">
        <input
          className={`${fieldClass} pr-9`}
          inputMode="decimal"
          value={text}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);

            const parsed = Number(next.replace(",", "."));
            if (next.trim() && Number.isFinite(parsed) && parsed >= min && parsed <= max) {
              setSyncedValue(parsed);
              onChange(parsed);
            }
          }}
          onBlur={() => setText(String(value))}
        />
        <span className="pointer-events-none absolute right-3.5 top-1/2 mt-1 -translate-y-1/2 text-[13px] text-[#A3A5AB]">
          m
        </span>
      </div>
    </label>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="mt-2 flex rounded-xl bg-[#F1EFEA] p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={`flex-1 rounded-lg px-2 py-2 text-[13px] font-medium transition ${
            option.value === value
              ? "bg-white text-[#111111] shadow-sm"
              : "text-[#5F626A] hover:text-[#111111]"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function Simulator({ viewerKind }: { viewerKind: ViewerKind }) {
  const [source, setSource] = useState<Source>("medidas");
  // El primer espacio lleva un id fijo: uno aleatorio no coincidiria entre el
  // render del servidor y el del navegador.
  const [measureRooms, setMeasureRooms] = useState<EditorRoom[]>(() => [
    createRectRoom("Sala", undefined, "espacio-inicial"),
  ]);
  const [planRooms, setPlanRooms] = useState<EditorRoom[]>([]);
  const [selectedIds, setSelectedIds] = useState<Record<Source, string | null>>({
    medidas: null,
    plano: null,
  });
  const [selectedSpeaker, setSelectedSpeaker] = useState<{
    roomId: string;
    index: number;
  } | null>(null);

  const [plan, setPlan] = useState<PlanState | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");
  const [tool, setTool] = useState<CanvasTool>("select");
  const [zoom, setZoom] = useState(1);
  const [calibration, setCalibration] = useState<Point[]>([]);
  const [calibrationMeters, setCalibrationMeters] = useState("");
  const [draft, setDraft] = useState<Point[]>([]);
  const planFileRef = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [projectType, setProjectType] = useState("residencial");
  const [note, setNote] = useState("");
  const [proposalState, setProposalState] = useState<"idle" | "sending" | "sent">("idle");
  const [proposalError, setProposalError] = useState("");

  const rooms = source === "medidas" ? measureRooms : planRooms;
  const setRooms = source === "medidas" ? setMeasureRooms : setPlanRooms;
  const selectedRoom =
    rooms.find((room) => room.id === selectedIds[source]) || rooms[0] || null;
  const selectedMetrics = selectedRoom ? roomMetrics(selectedRoom) : null;
  const activeSpeaker =
    selectedSpeaker && selectedSpeaker.roomId === selectedRoom?.id
      ? selectedSpeaker
      : null;

  const design: SimulatorDesign = useMemo(
    () => ({
      source,
      rooms: rooms.map((room) => ({
        id: room.id,
        name: room.name,
        points: room.points,
        ceilingHeight: room.ceilingHeight,
        posture: room.posture,
        modelId: room.modelId,
        mode: room.mode,
        speakers: room.speakers,
        manual: room.manual,
      })),
    }),
    [rooms, source]
  );
  const equipment = equipmentList(design);
  const totalSpeakers = equipment.reduce((sum, entry) => sum + entry.count, 0);

  function selectRoom(roomId: string) {
    setSelectedIds((current) => ({ ...current, [source]: roomId }));
    setSelectedSpeaker(null);
  }

  function updateRoom(roomId: string, patch: Partial<EditorRoom>) {
    setRooms((current) =>
      current.map((room) => (room.id === roomId ? layoutRoom({ ...room, ...patch }) : room))
    );
    setProposalState("idle");
  }

  function updateRectSide(room: EditorRoom, side: "width" | "length", value: number) {
    const width = side === "width" ? value : room.width ?? 5;
    const length = side === "length" ? value : room.length ?? 4;

    // Al cambiar las medidas, las bocinas movidas a mano podrian quedar fuera.
    updateRoom(room.id, {
      width,
      length,
      points: rectanglePolygon(width, length),
      manual: false,
    });
    setSelectedSpeaker(null);
  }

  function addRectRoom() {
    if (measureRooms.length >= MAX_ROOMS) return;

    const room = createRectRoom(
      `Espacio ${measureRooms.length + 1}`,
      measureRooms[measureRooms.length - 1]
    );
    setMeasureRooms((current) => [...current, room]);
    setSelectedIds((current) => ({ ...current, medidas: room.id }));
    setSelectedSpeaker(null);
  }

  function removeRoom(roomId: string) {
    setRooms((current) => current.filter((room) => room.id !== roomId));
    setSelectedIds((current) => ({ ...current, [source]: null }));
    setSelectedSpeaker(null);
  }

  function addSpeaker(room: EditorRoom) {
    const position = interiorPoint(room.points);
    updateRoom(room.id, { speakers: [...room.speakers, position], manual: true });
    setSelectedSpeaker({ roomId: room.id, index: room.speakers.length });
  }

  function removeSpeaker(room: EditorRoom, index: number) {
    updateRoom(room.id, {
      speakers: room.speakers.filter((_, position) => position !== index),
      manual: true,
    });
    setSelectedSpeaker(null);
  }

  function moveSpeaker(roomId: string, index: number, point: Point) {
    setRooms((current) =>
      current.map((room) =>
        room.id === roomId
          ? {
              ...room,
              manual: true,
              speakers: room.speakers.map((speaker, position) =>
                position === index ? point : speaker
              ),
            }
          : room
      )
    );
    setProposalState("idle");
  }

  // ----- Plano ---------------------------------------------------------------

  async function openPlan(file: File, page = 1) {
    setPlanLoading(true);
    setPlanError("");

    try {
      const loaded = await loadPlanFile(file, page);
      if (plan) URL.revokeObjectURL(plan.src);

      planFileRef.current = file;
      setPlan({ ...loaded, pxPerMeter: null });
      setPlanRooms([]);
      setSelectedSpeaker(null);
      setCalibration([]);
      setCalibrationMeters("");
      setDraft([]);
      setZoom(1);
      setTool("calibrate");
    } catch (error) {
      setPlanError(
        error instanceof PlanFileError
          ? error.message
          : "No pudimos abrir el archivo. Prueba con otro."
      );
    } finally {
      setPlanLoading(false);
    }
  }

  function applyCalibration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plan || calibration.length !== 2) return;

    const meters = Number(calibrationMeters.replace(",", "."));
    const pixels = distance(calibration[0], calibration[1]);
    if (!Number.isFinite(meters) || meters <= 0 || pixels < 2) return;

    const pxPerMeter = pixels / meters;

    // Las areas se guardan en metros: al recalibrar se reescalan para que
    // sigan en el mismo lugar del plano.
    if (plan.pxPerMeter) {
      const factor = plan.pxPerMeter / pxPerMeter;
      const rescale = (point: Point) => ({ x: point.x * factor, y: point.y * factor });

      setPlanRooms((current) =>
        current.map((room) =>
          layoutRoom({
            ...room,
            points: room.points.map(rescale),
            speakers: room.speakers.map(rescale),
          })
        )
      );
    }

    setPlan({ ...plan, pxPerMeter });
    setCalibration([]);
    setCalibrationMeters("");
    setTool(planRooms.length > 0 ? "select" : "draw");
  }

  function finishDraft(points: Point[]) {
    if (!plan?.pxPerMeter || points.length < 3 || planRooms.length >= MAX_ROOMS) return;

    const scale = plan.pxPerMeter;
    const meters = points.map((point) => ({ x: point.x / scale, y: point.y / scale }));
    if (polygonArea(meters) < 0.5) {
      setDraft([]);
      return;
    }

    const template = planRooms[planRooms.length - 1];
    const room = layoutRoom<EditorRoom>({
      id: newId(),
      name: `Área ${planRooms.length + 1}`,
      points: meters,
      ceilingHeight: template?.ceilingHeight ?? 2.7,
      posture: template?.posture ?? "sentado",
      modelId: template?.modelId ?? DEFAULT_SIMULATOR_SPEAKER_ID,
      mode: template?.mode ?? "uniforme",
      speakers: [],
      manual: false,
    });

    setPlanRooms((current) => [...current, room]);
    setSelectedIds((current) => ({ ...current, plano: room.id }));
    setSelectedSpeaker(null);
    setDraft([]);
    setTool("select");
    setProposalState("idle");
  }

  function handleCanvasClick(point: Point, tolerance: number) {
    if (tool === "calibrate") {
      setCalibration((current) => (current.length >= 2 ? [point] : [...current, point]));
      return;
    }

    if (tool === "draw") {
      if (draft.length >= 3 && distance(point, draft[0]) <= tolerance) {
        finishDraft(draft);
      } else {
        setDraft((current) => [...current, point]);
      }
    }
  }

  function changeTool(next: CanvasTool) {
    setTool(next);
    setDraft([]);
    if (next !== "calibrate") setCalibration([]);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      if (event.key === "Escape") {
        setDraft([]);
        setCalibration([]);
      }

      if ((event.key === "Delete" || event.key === "Backspace") && activeSpeaker && selectedRoom) {
        event.preventDefault();
        removeSpeaker(selectedRoom, activeSpeaker.index);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // ----- Propuesta -----------------------------------------------------------

  async function submitProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProposalState("sending");
    setProposalError("");

    try {
      const response = await fetch("/api/simulador-audio/propuesta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design, projectType, note }),
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

  // ----- Vista ---------------------------------------------------------------

  const canvasRooms = (source === "medidas" ? (selectedRoom ? [selectedRoom] : []) : rooms).map(
    (room) => ({ room, diameter: roomDiameter(room) })
  );

  const measureBox = selectedRoom ? boundingBox(selectedRoom.points) : null;
  const measureMargin = measureBox
    ? Math.max(measureBox.width, measureBox.height) * UNITS_PER_METER * 0.12 + 40
    : 0;
  const viewBox =
    source === "plano" && plan
      ? { x: 0, y: 0, width: plan.width, height: plan.height }
      : measureBox
        ? {
            x: measureBox.minX * UNITS_PER_METER - measureMargin,
            y: measureBox.minY * UNITS_PER_METER - measureMargin,
            width: measureBox.width * UNITS_PER_METER + measureMargin * 2,
            height: measureBox.height * UNITS_PER_METER + measureMargin * 2,
          }
        : { x: 0, y: 0, width: 800, height: 520 };

  const needsScale = source === "plano" && plan !== null && plan.pxPerMeter === null;
  const planReady = source === "plano" && plan !== null && plan.pxPerMeter !== null;

  return (
    <section className="bg-[#F7F6F3] text-[#111111]">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#9E1B32]">
              Simulador
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Diseña tu espacio
            </h2>
          </div>

          <div className="flex rounded-full bg-white p-1 shadow-sm">
            {(
              [
                { value: "medidas", label: "Con medidas" },
                { value: "plano", label: "Con mi plano" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={source === option.value}
                onClick={() => {
                  setSource(option.value);
                  setSelectedSpeaker(null);
                  setProposalState("idle");
                }}
                className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${
                  source === option.value
                    ? "bg-[#111111] text-white"
                    : "text-[#5F626A] hover:text-[#111111]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Lienzo */}
          <div className="min-w-0 rounded-3xl bg-white p-4 shadow-sm sm:p-5">
            {source === "plano" && !plan ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
                <Upload className="h-8 w-8 text-[#9E1B32]" aria-hidden="true" />
                <h3 className="mt-5 text-xl font-semibold">Sube el plano de tu espacio</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-[#5F626A]">
                  PDF, JPG o PNG. El archivo se queda en tu navegador: no se envía a
                  ALFA.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={planLoading}
                  className="mt-7 rounded-xl bg-[#9E1B32] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#B91C3C] disabled:opacity-60"
                >
                  {planLoading ? "Abriendo plano…" : "Elegir archivo"}
                </button>
                {planError ? (
                  <p role="alert" className="mt-4 text-sm text-[#9E1B32]">
                    {planError}
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                {source === "plano" && plan ? (
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        className={`${ghostButtonClass} ${tool === "select" ? "bg-black/5" : ""}`}
                        aria-pressed={tool === "select"}
                        onClick={() => changeTool("select")}
                        disabled={!planReady}
                      >
                        <MousePointer2 className="h-4 w-4" />
                        Mover
                      </button>
                      <button
                        type="button"
                        className={`${ghostButtonClass} ${tool === "draw" ? "bg-black/5" : ""}`}
                        aria-pressed={tool === "draw"}
                        onClick={() => changeTool("draw")}
                        disabled={!planReady}
                      >
                        <PenLine className="h-4 w-4" />
                        Dibujar área
                      </button>
                      <button
                        type="button"
                        className={`${ghostButtonClass} ${tool === "calibrate" ? "bg-black/5" : ""}`}
                        aria-pressed={tool === "calibrate"}
                        onClick={() => changeTool("calibrate")}
                      >
                        <Ruler className="h-4 w-4" />
                        Escala
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className={ghostButtonClass}
                        aria-label="Alejar"
                        onClick={() => setZoom((value) => Math.max(1, value / 1.3))}
                        disabled={zoom <= 1}
                      >
                        <ZoomOut className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className={ghostButtonClass}
                        aria-label="Acercar"
                        onClick={() => setZoom((value) => Math.min(5, value * 1.3))}
                        disabled={zoom >= 5}
                      >
                        <ZoomIn className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className={ghostButtonClass}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Cambiar plano
                      </button>
                    </div>
                  </div>
                ) : null}

                <PlanCanvas
                  fit={source === "plano" ? "width" : "contain"}
                  viewBox={viewBox}
                  unitsPerMeter={
                    source === "plano" ? plan?.pxPerMeter || 1 : UNITS_PER_METER
                  }
                  image={source === "plano" ? plan : null}
                  rooms={canvasRooms}
                  selectedRoomId={selectedRoom?.id || null}
                  selectedSpeaker={activeSpeaker}
                  tool={source === "plano" ? tool : "select"}
                  zoom={source === "plano" ? zoom : 1}
                  calibration={source === "plano" ? calibration : []}
                  draft={source === "plano" ? draft : []}
                  showDimensions={source === "medidas"}
                  onCanvasClick={handleCanvasClick}
                  onSelectRoom={selectRoom}
                  onSelectSpeaker={(roomId, index) => {
                    setSelectedIds((current) => ({ ...current, [source]: roomId }));
                    setSelectedSpeaker({ roomId, index });
                  }}
                  onMoveSpeaker={moveSpeaker}
                />

                {source === "plano" && plan && plan.pageCount > 1 ? (
                  <label className="mt-3 flex items-center gap-2 text-[13px] text-[#5F626A]">
                    Página del PDF
                    <select
                      className="rounded-lg border border-[#E5E3DD] bg-white px-2 py-1 text-[13px] text-[#111111]"
                      value={plan.page}
                      disabled={planLoading}
                      onChange={(event) => {
                        if (planFileRef.current) {
                          void openPlan(planFileRef.current, Number(event.target.value));
                        }
                      }}
                    >
                      {Array.from({ length: plan.pageCount }, (_, index) => (
                        <option key={index} value={index + 1}>
                          {index + 1} de {plan.pageCount}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {planError && plan ? (
                  <p role="alert" className="mt-3 text-sm text-[#9E1B32]">
                    {planError}
                  </p>
                ) : null}
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void openPlan(file);
              }}
            />
          </div>

          {/* Panel */}
          <aside className="space-y-8">
            {needsScale || (source === "plano" && tool === "calibrate" && plan) ? (
              <form onSubmit={applyCalibration}>
                <h3 className="text-lg font-semibold">Indica la escala</h3>
                <p className="mt-2 text-sm leading-6 text-[#5F626A]">
                  Haz clic en dos puntos del plano cuya distancia conozcas (por ejemplo,
                  los extremos de un muro) y escribe cuánto miden en la realidad.
                </p>
                <label className={`${labelClass} mt-5`}>
                  Distancia real entre los dos puntos
                  <div className="relative">
                    <input
                      className={`${fieldClass} pr-9`}
                      inputMode="decimal"
                      value={calibrationMeters}
                      onChange={(event) => setCalibrationMeters(event.target.value)}
                      placeholder="4.20"
                      disabled={calibration.length !== 2}
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 mt-1 -translate-y-1/2 text-[13px] text-[#A3A5AB]">
                      m
                    </span>
                  </div>
                </label>
                <button
                  type="submit"
                  disabled={
                    calibration.length !== 2 ||
                    !(Number(calibrationMeters.replace(",", ".")) > 0)
                  }
                  className="mt-4 w-full rounded-xl bg-[#111111] px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {calibration.length === 2
                    ? "Aplicar escala"
                    : `Marca ${2 - calibration.length} punto${calibration.length === 1 ? "" : "s"} en el plano`}
                </button>
              </form>
            ) : null}

            {planReady && tool === "draw" ? (
              <div>
                <h3 className="text-lg font-semibold">Dibuja un área</h3>
                <p className="mt-2 text-sm leading-6 text-[#5F626A]">
                  Haz clic en cada esquina del espacio. Para terminar, haz clic en el
                  primer punto o usa el botón.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => finishDraft(draft)}
                    disabled={draft.length < 3}
                    className="flex-1 rounded-xl bg-[#111111] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Cerrar área
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft((current) => current.slice(0, -1))}
                    disabled={draft.length === 0}
                    className="rounded-xl px-4 py-2.5 text-sm font-medium text-[#33353B] transition hover:bg-black/5 disabled:opacity-40"
                  >
                    Deshacer
                  </button>
                </div>
              </div>
            ) : null}

            {source === "medidas" || (planReady && rooms.length > 0) ? (
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {rooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => selectRoom(room.id)}
                      className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition ${
                        room.id === selectedRoom?.id
                          ? "bg-[#111111] text-white"
                          : "bg-white text-[#33353B] hover:bg-black/5"
                      }`}
                    >
                      {room.name}
                    </button>
                  ))}
                  {source === "medidas" ? (
                    <button
                      type="button"
                      onClick={addRectRoom}
                      className={ghostButtonClass}
                      disabled={rooms.length >= MAX_ROOMS}
                    >
                      <Plus className="h-4 w-4" />
                      Espacio
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {selectedRoom && selectedMetrics && (source === "medidas" || planReady) ? (
              <div className="space-y-5">
                <label className={labelClass}>
                  Nombre del espacio
                  <input
                    className={fieldClass}
                    value={selectedRoom.name}
                    maxLength={60}
                    onChange={(event) =>
                      updateRoom(selectedRoom.id, { name: event.target.value })
                    }
                  />
                </label>

                {source === "medidas" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField
                      key={`${selectedRoom.id}-w`}
                      label="Ancho"
                      value={selectedRoom.width ?? 5}
                      min={MIN_SIDE}
                      max={MAX_SIDE}
                      onChange={(value) => updateRectSide(selectedRoom, "width", value)}
                    />
                    <NumberField
                      key={`${selectedRoom.id}-l`}
                      label="Largo"
                      value={selectedRoom.length ?? 4}
                      min={MIN_SIDE}
                      max={MAX_SIDE}
                      onChange={(value) => updateRectSide(selectedRoom, "length", value)}
                    />
                  </div>
                ) : null}

                <NumberField
                  key={`${selectedRoom.id}-h`}
                  label="Altura del plafón"
                  value={selectedRoom.ceilingHeight}
                  min={MIN_CEILING_HEIGHT}
                  max={MAX_CEILING_HEIGHT}
                  onChange={(value) => updateRoom(selectedRoom.id, { ceilingHeight: value })}
                />

                <div>
                  <span className={labelClass}>¿Cómo se escucha?</span>
                  <Segmented<ListeningPosture>
                    value={selectedRoom.posture}
                    onChange={(posture) => updateRoom(selectedRoom.id, { posture })}
                    options={[
                      { value: "sentado", label: "Sentado" },
                      { value: "de_pie", label: "De pie" },
                    ]}
                  />
                </div>

                <label className={labelClass}>
                  Bocina
                  <select
                    className={fieldClass}
                    value={selectedRoom.modelId}
                    onChange={(event) =>
                      updateRoom(selectedRoom.id, { modelId: event.target.value })
                    }
                  >
                    {SIMULATOR_SPEAKERS.map((speaker) => (
                      <option key={speaker.id} value={speaker.id}>
                        {speaker.brand} {speaker.model}
                      </option>
                    ))}
                  </select>
                  {selectedMetrics.speaker ? (
                    <span className="mt-2 block text-[13px] font-normal text-[#77797F]">
                      {selectedMetrics.speaker.label} · cobertura de{" "}
                      {selectedMetrics.speaker.dispersionDeg}° según el fabricante
                      {selectedMetrics.speaker.dispersionDeg > MAX_EFFECTIVE_DISPERSION_DEG
                        ? `; el cálculo usa ${MAX_EFFECTIVE_DISPERSION_DEG}° para no prometer cobertura con poco nivel`
                        : ""}
                    </span>
                  ) : null}
                </label>

                <div>
                  <span className={labelClass}>Tipo de cobertura</span>
                  <Segmented<CoverageMode>
                    value={selectedRoom.mode}
                    onChange={(mode) =>
                      updateRoom(selectedRoom.id, { mode, manual: false })
                    }
                    options={(Object.keys(COVERAGE_MODES) as CoverageMode[]).map((mode) => ({
                      value: mode,
                      label: COVERAGE_MODES[mode].label,
                    }))}
                  />
                  <p className="mt-2 text-[13px] leading-5 text-[#77797F]">
                    {COVERAGE_MODES[selectedRoom.mode].description}
                  </p>
                </div>

                {selectedMetrics.diameter <= 0 ? (
                  <p role="alert" className="text-sm text-[#9E1B32]">
                    El plafón debe estar más alto que el oído de quien escucha.
                  </p>
                ) : null}

                <dl className="grid grid-cols-2 gap-x-4 gap-y-5 pt-2">
                  {[
                    { label: "Bocinas", value: String(selectedMetrics.count) },
                    {
                      label: "Área cubierta",
                      value: `${Math.round(selectedMetrics.coverage * 100)}%`,
                    },
                    { label: "Área", value: `${formatMeters(selectedMetrics.area, 1)} m²` },
                    {
                      label: "Cobertura por bocina",
                      value: `${formatMeters(selectedMetrics.diameter)} m`,
                    },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <dt className="text-[13px] text-[#77797F]">{stat.label}</dt>
                      <dd className="mt-1 text-2xl font-semibold tracking-tight">
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="flex flex-wrap gap-1 pt-1">
                  <button
                    type="button"
                    className={ghostButtonClass}
                    onClick={() => addSpeaker(selectedRoom)}
                  >
                    <Plus className="h-4 w-4" />
                    Bocina
                  </button>
                  <button
                    type="button"
                    className={ghostButtonClass}
                    disabled={!activeSpeaker}
                    onClick={() =>
                      activeSpeaker && removeSpeaker(selectedRoom, activeSpeaker.index)
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                    Quitar
                  </button>
                  <button
                    type="button"
                    className={ghostButtonClass}
                    disabled={!selectedRoom.manual}
                    onClick={() => {
                      updateRoom(selectedRoom.id, { manual: false });
                      setSelectedSpeaker(null);
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reacomodar
                  </button>
                </div>
                <p className="text-[13px] leading-5 text-[#77797F]">
                  Arrastra una bocina para moverla. Tócala y usa Quitar para eliminarla.
                </p>

                {rooms.length > 1 || source === "plano" ? (
                  <button
                    type="button"
                    className="text-[13px] font-medium text-[#9E1B32] underline-offset-4 hover:underline"
                    onClick={() => removeRoom(selectedRoom.id)}
                  >
                    Eliminar este espacio
                  </button>
                ) : null}
              </div>
            ) : null}
          </aside>
        </div>

        {/* Resumen */}
        {totalSpeakers > 0 ? (
          <div className="mt-16 grid gap-12 border-t border-black/10 pt-12 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight">Tu sistema</h3>
              <ul className="mt-6 divide-y divide-black/10">
                {equipment.map((entry) => (
                  <li
                    key={entry.speaker.id}
                    className="flex items-baseline justify-between gap-6 py-4"
                  >
                    <div>
                      <p className="text-lg font-medium">
                        {entry.speaker.brand} {entry.speaker.model}
                      </p>
                      <p className="mt-0.5 text-sm text-[#77797F]">{entry.speaker.label}</p>
                    </div>
                    <p className="text-2xl font-semibold tabular-nums">{entry.count}</p>
                  </li>
                ))}
              </ul>

              {rooms.length > 1 ? (
                <ul className="mt-6 space-y-1.5 text-sm text-[#5F626A]">
                  {rooms.map((room) => {
                    const metrics = roomMetrics(room);
                    return (
                      <li key={room.id}>
                        {room.name}: {metrics.count} ×{" "}
                        {metrics.speaker
                          ? `${metrics.speaker.brand} ${metrics.speaker.model}`
                          : ""}
                        , {formatMeters(metrics.area, 1)} m²
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              <p className="mt-8 max-w-2xl text-[13px] leading-6 text-[#77797F]">
                Es una estimación geométrica de cobertura, calculada con el ángulo que
                publica cada fabricante y la altura del plafón. No considera muebles,
                materiales ni la acústica del lugar. El diseño final lo ajusta un
                ingeniero de ALFA en sitio.
              </p>
            </div>

            <div>
              {viewerKind === "visitante" ? (
                proposalState === "sent" ? (
                  <div>
                    <Check className="h-7 w-7 text-[#0F6B43]" aria-hidden="true" />
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight">
                      Recibimos tu diseño
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#5F626A]">
                      Un asesor de ALFA te contactará para afinarlo y enviarte una
                      propuesta.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={submitProposal}>
                    <h3 className="text-2xl font-semibold tracking-tight">
                      Pide tu propuesta
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#5F626A]">
                      Enviamos este diseño a un asesor de ALFA para que lo revise y te
                      cotice el sistema instalado.
                    </p>
                    <label className={`${labelClass} mt-6`}>
                      Tipo de proyecto
                      <select
                        className={fieldClass}
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
                    <label className={`${labelClass} mt-4`}>
                      ¿Algo que debamos saber? (opcional)
                      <textarea
                        className={`${fieldClass} min-h-24 resize-y`}
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
                      className="mt-6 w-full rounded-xl bg-[#9E1B32] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#B91C3C] disabled:opacity-60"
                    >
                      {proposalState === "sending" ? "Enviando…" : "Solicitar propuesta"}
                    </button>
                  </form>
                )
              ) : (
                <p className="text-sm leading-6 text-[#5F626A]">
                  {viewerKind === "interno"
                    ? "Entraste con tu sesión de ALFA OS. La solicitud de propuesta solo aparece para los visitantes del sitio."
                    : "Entraste con tu cuenta del portal. Si quieres cotizar este diseño, escríbele a tu asesor de ALFA."}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
