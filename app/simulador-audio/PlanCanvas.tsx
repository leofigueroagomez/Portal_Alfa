"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  boundingBox,
  normalizeAngle,
  pointInPolygon,
  snapToWall,
  type PlacedSpeaker,
  type Point,
  type SectorCoverage,
} from "@/lib/simuladorAudio/geometry";
import { formatMeters, type SimulatorRoom } from "@/lib/simuladorAudio/design";
import type { RoomLoudness } from "@/lib/simuladorAudio/loudness";

export type CanvasTool = "select" | "calibrate" | "draw";

export type CanvasRoom = {
  room: SimulatorRoom;
  /** Plafon: diametro de cobertura de cada bocina, en metros. */
  diameter: number;
  /** Muro: abanico de cobertura de cada bocina; null si es de plafon. */
  sector: SectorCoverage | null;
  /** Si viene, se pinta el mapa de volumen en lugar de las huellas de cobertura. */
  heat?: RoomLoudness | null;
};

// El mapa de volumen usa la escala del propio espacio (del punto mas suave al
// mas fuerte) para que se vea donde suena mas. El nivel absoluto lo da el
// medidor. Con menos de 6 dB de diferencia se abre la escala para no exagerar.
const HEAT_MIN_SPAN_DB = 6;
const HEAT_SOFT = [246, 228, 231];
const HEAT_LOUD = [122, 20, 37];

function heatColor(level: number, min: number, max: number) {
  const span = Math.max(HEAT_MIN_SPAN_DB, max - min);
  const t = Math.min(1, Math.max(0, (level - (max - span)) / span));
  const channel = (index: number) =>
    Math.round(HEAT_SOFT[index] + (HEAT_LOUD[index] - HEAT_SOFT[index]) * t);

  return `rgb(${channel(0)} ${channel(1)} ${channel(2)})`;
}

type PlanCanvasProps = {
  /** "contain" ajusta todo al recuadro; "width" ocupa el ancho y permite zoom con scroll. */
  fit: "contain" | "width";
  /** Unidades del dibujo: pixeles del plano, o centesimas de metro sin plano. */
  viewBox: { x: number; y: number; width: number; height: number };
  unitsPerMeter: number;
  image?: { src: string; width: number; height: number } | null;
  rooms: CanvasRoom[];
  selectedRoomId: string | null;
  selectedSpeaker: { roomId: string; index: number } | null;
  tool: CanvasTool;
  zoom: number;
  calibration: Point[];
  draft: Point[];
  showDimensions: boolean;
  onCanvasClick: (point: Point, tolerance: number) => void;
  onSelectRoom: (roomId: string) => void;
  onSelectSpeaker: (roomId: string, index: number) => void;
  onMoveSpeaker: (roomId: string, index: number, speaker: PlacedSpeaker) => void;
};

/** Trazo del abanico de una bocina de muro, en unidades del dibujo. */
function sectorPath(speaker: PlacedSpeaker, sector: SectorCoverage, k: number) {
  const cx = speaker.x * k;
  const cy = speaker.y * k;
  const radius = sector.reach * k;
  const aim = speaker.angle ?? 0;
  const toPoint = (degrees: number) => {
    const radians = (degrees * Math.PI) / 180;
    return `${cx + radius * Math.cos(radians)} ${cy + radius * Math.sin(radians)}`;
  };
  const largeArc = sector.apertureDeg > 180 ? 1 : 0;

  return `M ${cx} ${cy} L ${toPoint(aim - sector.apertureDeg / 2)} A ${radius} ${radius} 0 ${largeArc} 1 ${toPoint(
    aim + sector.apertureDeg / 2
  )} Z`;
}

const BURGUNDY = "#9E1B32";
const INK = "#111111";

export default function PlanCanvas({
  fit,
  viewBox,
  unitsPerMeter,
  image,
  rooms,
  selectedRoomId,
  selectedSpeaker,
  tool,
  zoom,
  calibration,
  draft,
  showDimensions,
  onCanvasClick,
  onSelectRoom,
  onSelectSpeaker,
  onMoveSpeaker,
}: PlanCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ roomId: string; index: number } | null>(null);
  const rotateRef = useRef<{ roomId: string; index: number } | null>(null);
  const [size, setSize] = useState({ width: 800, height: 520 });
  const [cursor, setCursor] = useState<Point | null>(null);
  const clipPrefix = useId().replace(/:/g, "");

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    observer.observe(wrapper);

    return () => observer.disconnect();
  }, []);

  const k = unitsPerMeter;
  // Unidades de dibujo por pixel de pantalla: mantiene trazos y textos del mismo
  // tamaño visual sin importar la resolucion del plano ni el zoom.
  const u =
    fit === "width"
      ? viewBox.width / (size.width * zoom)
      : Math.max(viewBox.width / size.width, viewBox.height / size.height);

  function toUnits(clientX: number, clientY: number): Point | null {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return null;

    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }

  function handleClick(event: ReactMouseEvent<SVGSVGElement>) {
    if (tool === "select") return;

    const point = toUnits(event.clientX, event.clientY);
    if (point) onCanvasClick(point, 12 * u);
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (tool === "select") return;
    setCursor(toUnits(event.clientX, event.clientY));
  }

  function handleSpeakerDown(
    event: ReactPointerEvent<SVGGElement>,
    roomId: string,
    index: number
  ) {
    if (tool !== "select") return;

    event.stopPropagation();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Sin captura el arrastre sigue funcionando mientras el cursor este sobre la bocina.
    }
    dragRef.current = { roomId, index };
    onSelectSpeaker(roomId, index);
  }

  function handleSpeakerMove(
    event: ReactPointerEvent<SVGGElement>,
    room: SimulatorRoom,
    sector: SectorCoverage | null
  ) {
    const drag = dragRef.current;
    if (!drag || drag.roomId !== room.id) return;

    const point = toUnits(event.clientX, event.clientY);
    if (!point) return;

    const meters = { x: point.x / k, y: point.y / k };

    if (sector) {
      // Una bocina de muro se desliza sobre la pared mas cercana al cursor y
      // queda apuntando hacia dentro; despues se puede girar.
      const snapped = snapToWall(room.points, meters);
      if (snapped) onMoveSpeaker(drag.roomId, drag.index, snapped);
      return;
    }

    if (pointInPolygon(meters, room.points)) {
      onMoveSpeaker(drag.roomId, drag.index, meters);
    }
  }

  function handleRotateDown(
    event: ReactPointerEvent<SVGGElement>,
    roomId: string,
    index: number
  ) {
    event.stopPropagation();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Sin captura el giro sigue funcionando mientras el cursor este sobre el punto.
    }
    rotateRef.current = { roomId, index };
  }

  function handleRotateMove(
    event: ReactPointerEvent<SVGGElement>,
    room: SimulatorRoom,
    speaker: PlacedSpeaker
  ) {
    const rotating = rotateRef.current;
    if (!rotating || rotating.roomId !== room.id) return;

    const point = toUnits(event.clientX, event.clientY);
    if (!point) return;

    const dx = point.x - speaker.x * k;
    const dy = point.y - speaker.y * k;
    if (Math.hypot(dx, dy) < 4 * u) return;

    onMoveSpeaker(rotating.roomId, rotating.index, {
      ...speaker,
      angle: Math.round(normalizeAngle((Math.atan2(dy, dx) * 180) / Math.PI)),
    });
  }

  function handleRotateUp(event: ReactPointerEvent<SVGGElement>) {
    rotateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleSpeakerUp(event: ReactPointerEvent<SVGGElement>) {
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const toPath = (points: Point[]) =>
    points.map((point) => `${point.x * k},${point.y * k}`).join(" ");
  const draftPath = draft.map((point) => `${point.x},${point.y}`).join(" ");
  const lastDraft = draft[draft.length - 1];
  const gridId = `${clipPrefix}-grid`;

  return (
    <div
      ref={wrapperRef}
      className={
        fit === "width"
          ? "max-h-[72vh] min-h-[320px] overflow-auto rounded-2xl bg-[#EFEDE7]"
          : "h-[min(62vh,540px)] min-h-[320px] overflow-hidden rounded-2xl bg-[#FBFAF8]"
      }
    >
      <svg
        ref={svgRef}
        role="img"
        aria-label="Vista de planta con la cobertura de cada bocina"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="block select-none"
        // El tamaño lo da el CSS, no la medicion en JS: asi el dibujo nunca se
        // desborda aunque el ResizeObserver tarde en responder.
        style={{
          cursor: tool === "select" ? "default" : "crosshair",
          ...(fit === "width"
            ? {
                width: `${zoom * 100}%`,
                aspectRatio: `${viewBox.width} / ${viewBox.height}`,
              }
            : { width: "100%", height: "100%" }),
        }}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setCursor(null)}
      >
        <defs>
          <pattern id={gridId} width={k} height={k} patternUnits="userSpaceOnUse">
            <path
              d={`M ${k} 0 L 0 0 0 ${k}`}
              fill="none"
              stroke="#ECE9E2"
              strokeWidth={u}
            />
          </pattern>
          {rooms.map(({ room }) => (
            <clipPath key={room.id} id={`${clipPrefix}-${room.id}`}>
              <polygon points={toPath(room.points)} />
            </clipPath>
          ))}
        </defs>

        {image ? (
          <image
            href={image.src}
            x={0}
            y={0}
            width={image.width}
            height={image.height}
            preserveAspectRatio="none"
          />
        ) : null}

        {rooms.map(({ room, diameter, sector, heat }) => {
          const isSelected = room.id === selectedRoomId;
          const box = boundingBox(room.points);
          const radius = (diameter / 2) * k;

          return (
            <g key={room.id}>
              <polygon
                points={toPath(room.points)}
                fill={image ? BURGUNDY : "#FFFFFF"}
                fillOpacity={image ? 0.04 : 1}
                style={{ pointerEvents: tool === "select" ? "auto" : "none" }}
                onClick={() => onSelectRoom(room.id)}
              />
              {image ? null : (
                <polygon
                  points={toPath(room.points)}
                  fill={`url(#${gridId})`}
                  pointerEvents="none"
                />
              )}

              <g clipPath={`url(#${clipPrefix}-${room.id})`} pointerEvents="none">
                {heat
                  ? heat.cells.map((cell, index) => (
                      <rect
                        key={index}
                        x={cell.x * k}
                        y={cell.y * k}
                        // Un poco mas grande que la celda para que no se vean rendijas.
                        // El color es opaco: el traslape entre celdas no se nota.
                        width={heat.cellWidth * k + u}
                        height={heat.cellHeight * k + u}
                        fill={heatColor(cell.level, heat.min, heat.max)}
                        // Sobre un plano se deja ver el dibujo de fondo.
                        opacity={image ? 0.78 : 1}
                      />
                    ))
                  : room.speakers.map((speaker, index) =>
                  sector ? (
                    <path
                      key={index}
                      d={sectorPath(speaker, sector, k)}
                      fill={BURGUNDY}
                      fillOpacity={0.13}
                      stroke={BURGUNDY}
                      strokeOpacity={0.35}
                      strokeWidth={u}
                      strokeLinejoin="round"
                    />
                  ) : (
                    <circle
                      key={index}
                      cx={speaker.x * k}
                      cy={speaker.y * k}
                      r={radius}
                      fill={BURGUNDY}
                      fillOpacity={0.13}
                      stroke={BURGUNDY}
                      strokeOpacity={0.35}
                      strokeWidth={u}
                    />
                  )
                )}
              </g>

              <polygon
                points={toPath(room.points)}
                fill="none"
                stroke={isSelected ? BURGUNDY : INK}
                strokeWidth={(isSelected ? 2.25 : 1.5) * u}
                strokeLinejoin="round"
                pointerEvents="none"
              />

              <text
                x={box.minX * k}
                y={box.minY * k - 9 * u}
                fontSize={12.5 * u}
                fontWeight={600}
                fill={isSelected ? BURGUNDY : INK}
                stroke="#FFFFFF"
                strokeWidth={image ? 3 * u : 0}
                paintOrder="stroke"
                pointerEvents="none"
              >
                {room.name}
              </text>

              {showDimensions && isSelected ? (
                <g
                  fontSize={12 * u}
                  fill="#5F626A"
                  textAnchor="middle"
                  pointerEvents="none"
                >
                  <text
                    x={(box.minX + box.width / 2) * k}
                    y={box.maxY * k + 22 * u}
                  >
                    {formatMeters(box.width)} m
                  </text>
                  <text
                    transform={`translate(${box.minX * k - 14 * u} ${
                      (box.minY + box.height / 2) * k
                    }) rotate(-90)`}
                  >
                    {formatMeters(box.height)} m
                  </text>
                </g>
              ) : null}

              {room.speakers.map((speaker, index) => {
                const isActive =
                  selectedSpeaker?.roomId === room.id &&
                  selectedSpeaker.index === index;

                return (
                  <g
                    key={index}
                    transform={`translate(${speaker.x * k} ${speaker.y * k})`}
                    style={{
                      cursor: tool === "select" ? "grab" : "inherit",
                      touchAction: "none",
                      pointerEvents: tool === "select" ? "auto" : "none",
                    }}
                    onPointerDown={(event) => handleSpeakerDown(event, room.id, index)}
                    onPointerMove={(event) => handleSpeakerMove(event, room, sector)}
                    onPointerUp={handleSpeakerUp}
                    onPointerCancel={handleSpeakerUp}
                  >
                    {sector ? (
                      // Marca hacia donde apunta la bocina de muro.
                      <line
                        x2={18 * u * Math.cos(((speaker.angle ?? 0) * Math.PI) / 180)}
                        y2={18 * u * Math.sin(((speaker.angle ?? 0) * Math.PI) / 180)}
                        stroke={isActive ? BURGUNDY : INK}
                        strokeWidth={3 * u}
                        strokeLinecap="round"
                      />
                    ) : null}
                    {/* Zona de agarre mas grande que el punto visible. */}
                    <circle r={14 * u} fill="transparent" />
                    <circle
                      r={(isActive ? 8 : 6.5) * u}
                      fill={isActive ? BURGUNDY : INK}
                      stroke="#FFFFFF"
                      strokeWidth={1.75 * u}
                    />
                    <circle r={2 * u} fill="#FFFFFF" />
                  </g>
                );
              })}

              {/* Punto para girar la bocina de muro seleccionada. */}
              {sector && tool === "select"
                ? room.speakers.map((speaker, index) => {
                    const isActive =
                      selectedSpeaker?.roomId === room.id &&
                      selectedSpeaker.index === index;
                    if (!isActive) return null;

                    const radians = ((speaker.angle ?? 0) * Math.PI) / 180;
                    const distance = 46 * u;

                    return (
                      <g
                        key={`giro-${index}`}
                        transform={`translate(${speaker.x * k + distance * Math.cos(radians)} ${
                          speaker.y * k + distance * Math.sin(radians)
                        })`}
                        style={{ cursor: "crosshair", touchAction: "none" }}
                        onPointerDown={(event) => handleRotateDown(event, room.id, index)}
                        onPointerMove={(event) => handleRotateMove(event, room, speaker)}
                        onPointerUp={handleRotateUp}
                        onPointerCancel={handleRotateUp}
                      >
                        <circle r={14 * u} fill="transparent" />
                        <circle
                          r={5.5 * u}
                          fill="#FFFFFF"
                          stroke={BURGUNDY}
                          strokeWidth={2.25 * u}
                        />
                      </g>
                    );
                  })
                : null}
            </g>
          );
        })}

        {calibration.length > 0 ? (
          <g pointerEvents="none">
            {calibration.length === 2 ? (
              <line
                x1={calibration[0].x}
                y1={calibration[0].y}
                x2={calibration[1].x}
                y2={calibration[1].y}
                stroke={BURGUNDY}
                strokeWidth={2.5 * u}
              />
            ) : cursor && tool === "calibrate" ? (
              <line
                x1={calibration[0].x}
                y1={calibration[0].y}
                x2={cursor.x}
                y2={cursor.y}
                stroke={BURGUNDY}
                strokeWidth={1.5 * u}
                strokeDasharray={`${5 * u} ${4 * u}`}
              />
            ) : null}
            {calibration.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={5 * u}
                fill="#FFFFFF"
                stroke={BURGUNDY}
                strokeWidth={2.5 * u}
              />
            ))}
          </g>
        ) : null}

        {draft.length > 0 ? (
          <g pointerEvents="none">
            <polyline
              points={draftPath}
              fill={BURGUNDY}
              fillOpacity={0.06}
              stroke={BURGUNDY}
              strokeWidth={2 * u}
              strokeLinejoin="round"
            />
            {cursor && lastDraft && tool === "draw" ? (
              <line
                x1={lastDraft.x}
                y1={lastDraft.y}
                x2={cursor.x}
                y2={cursor.y}
                stroke={BURGUNDY}
                strokeWidth={1.5 * u}
                strokeDasharray={`${5 * u} ${4 * u}`}
              />
            ) : null}
            {draft.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={(index === 0 ? 7 : 4) * u}
                fill={index === 0 ? BURGUNDY : "#FFFFFF"}
                stroke={index === 0 ? "#FFFFFF" : BURGUNDY}
                strokeWidth={2 * u}
              />
            ))}
          </g>
        ) : null}
      </svg>
    </div>
  );
}
