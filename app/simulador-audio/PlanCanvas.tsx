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
  pointInPolygon,
  type Point,
} from "@/lib/simuladorAudio/geometry";
import { formatMeters, type SimulatorRoom } from "@/lib/simuladorAudio/design";

export type CanvasTool = "select" | "calibrate" | "draw";

export type CanvasRoom = {
  room: SimulatorRoom;
  /** Diametro de cobertura de cada bocina, en metros. */
  diameter: number;
};

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
  onMoveSpeaker: (roomId: string, index: number, point: Point) => void;
};

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
    room: SimulatorRoom
  ) {
    const drag = dragRef.current;
    if (!drag || drag.roomId !== room.id) return;

    const point = toUnits(event.clientX, event.clientY);
    if (!point) return;

    const meters = { x: point.x / k, y: point.y / k };
    if (pointInPolygon(meters, room.points)) {
      onMoveSpeaker(drag.roomId, drag.index, meters);
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

        {rooms.map(({ room, diameter }) => {
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
                {room.speakers.map((speaker, index) => (
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
                ))}
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
                    onPointerMove={(event) => handleSpeakerMove(event, room)}
                    onPointerUp={handleSpeakerUp}
                    onPointerCancel={handleSpeakerUp}
                  >
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
