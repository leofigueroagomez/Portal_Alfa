"use client";

import type React from "react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Eraser, PenLine, Save } from "lucide-react";
import { supabase } from "@/services/supabase";

type Props = {
  projectId: number;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function getExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

function dataUrlToBlob(dataUrl: string) {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/png";
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);

  for (let index = 0; index < bytes.length; index += 1) {
    buffer[index] = bytes.charCodeAt(index);
  }

  return new Blob([buffer], { type: mime });
}

function reportError(step: string, error: unknown) {
  const message =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
      ? ` ${error.message}`
      : "";

  console.error(`Error en ${step}:`, error);
  alert(`Error en ${step}.${message}`);
}

export default function NewProjectDeliveryForm({ projectId }: Props) {
  const router = useRouter();
  const clientCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const alfaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const clientSignedRef = useRef(false);
  const alfaSignedRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(today());
  const [deliveredToName, setDeliveredToName] = useState("");
  const [deliveredToRole, setDeliveredToRole] = useState("");
  const [deliveredByName, setDeliveredByName] = useState("");
  const [observations, setObservations] = useState("");
  const [pendingText, setPendingText] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidencePreviewUrls, setEvidencePreviewUrls] = useState<string[]>([]);
  const [hasClientSignature, setHasClientSignature] = useState(false);
  const [hasAlfaSignature, setHasAlfaSignature] = useState(false);

  function setEvidences(files: FileList | null) {
    const selected = Array.from(files || []).filter((file) =>
      file.type.startsWith("image/")
    );

    if (selected.length === 0) {
      alert("Selecciona imagenes validas para las evidencias.");
      return;
    }

    for (const url of evidencePreviewUrls) URL.revokeObjectURL(url);
    setEvidenceFiles(selected);
    setEvidencePreviewUrls(selected.map((file) => URL.createObjectURL(file)));
  }

  function getCanvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function startSignature(event: React.PointerEvent<HTMLCanvasElement>) {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;

    drawingCanvasRef.current = event.currentTarget;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getCanvasPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function drawSignature(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = drawingCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || canvas !== event.currentTarget) return;

    const point = getCanvasPoint(event);
    context.lineTo(point.x, point.y);
    context.lineWidth = 2.4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111318";
    context.stroke();

    if (canvas === clientCanvasRef.current) {
      clientSignedRef.current = true;
      setHasClientSignature(true);
    } else if (canvas === alfaCanvasRef.current) {
      alfaSignedRef.current = true;
      setHasAlfaSignature(true);
    }
  }

  function stopSignature(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    drawingCanvasRef.current = null;
  }

  function clearSignature(kind: "client" | "alfa") {
    const canvas = kind === "client" ? clientCanvasRef.current : alfaCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    if (kind === "client") {
      clientSignedRef.current = false;
      setHasClientSignature(false);
    } else {
      alfaSignedRef.current = false;
      setHasAlfaSignature(false);
    }
  }

  async function uploadSignature(
    canvas: HTMLCanvasElement | null,
    path: string,
    enabled: boolean
  ) {
    if (!canvas || !enabled) return null;

    const blob = dataUrlToBlob(canvas.toDataURL("image/png"));
    const { error } = await supabase.storage
      .from("project-photos")
      .upload(path, blob, {
        cacheControl: "3600",
        contentType: "image/png",
        upsert: false,
      });

    if (error) throw error;
    return path;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!deliveryDate) {
      alert("Selecciona la fecha de entrega.");
      return;
    }

    if (!deliveredToName.trim()) {
      alert("Captura quien recibe el proyecto.");
      return;
    }

    if (evidenceFiles.length === 0) {
      alert("Agrega al menos una evidencia.");
      return;
    }

    if (!hasClientSignature) {
      const shouldContinue = window.confirm(
        "Se recomienda capturar firma del cliente. Deseas guardar sin firma?"
      );
      if (!shouldContinue) return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setSaving(false);
      reportError("leer usuario actual", userError);
      return;
    }

    const { data: delivery, error: deliveryError } = await supabase
      .from("project_deliveries")
      .insert({
        client_project_id: projectId,
        delivery_date: deliveryDate,
        status: "delivered",
        delivered_to_name: deliveredToName.trim(),
        delivered_to_role: deliveredToRole.trim() || null,
        delivered_by_name: deliveredByName.trim() || null,
        observations: observations.trim() || null,
        created_by_user_id: user?.id || null,
      })
      .select("id")
      .single();

    if (deliveryError || !delivery) {
      setSaving(false);
      reportError("crear entrega de proyecto", deliveryError || "No se recibio entrega");
      return;
    }

    const timestamp = Date.now();
    const deliveryId = Number(delivery.id);

    try {
      const evidenceRows = [];
      for (let index = 0; index < evidenceFiles.length; index += 1) {
        const file = evidenceFiles[index];
        const path = `project-deliveries/${projectId}/${deliveryId}/evidence-${timestamp}-${index}.${getExtension(file)}`;
        const { error } = await supabase.storage
          .from("project-photos")
          .upload(path, file, { cacheControl: "3600", upsert: false });

        if (error) throw error;
        evidenceRows.push({
          project_delivery_id: deliveryId,
          file_url: path,
          caption: `Evidencia ${index + 1}`,
          sort_order: index,
        });
      }

      if (evidenceRows.length > 0) {
        const { error } = await supabase
          .from("project_delivery_evidences")
          .insert(evidenceRows);
        if (error) throw error;
      }

      const pendingItems = pendingText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((description, index) => ({
          project_delivery_id: deliveryId,
          description,
          sort_order: index,
        }));

      if (pendingItems.length > 0) {
        const { error } = await supabase
          .from("project_delivery_pending_items")
          .insert(pendingItems);
        if (error) throw error;
      }

      const [clientSignaturePath, alfaSignaturePath] = await Promise.all([
        uploadSignature(
          clientCanvasRef.current,
          `project-deliveries/${projectId}/${deliveryId}/client-signature-${timestamp}.png`,
          clientSignedRef.current
        ),
        uploadSignature(
          alfaCanvasRef.current,
          `project-deliveries/${projectId}/${deliveryId}/alfa-signature-${timestamp}.png`,
          alfaSignedRef.current
        ),
      ]);

      const { error: updateError } = await supabase
        .from("project_deliveries")
        .update({
          client_signature_image_url: clientSignaturePath,
          alfa_signature_image_url: alfaSignaturePath,
          pdf_url: `/projects/${projectId}/deliveries/${deliveryId}/print`,
        })
        .eq("id", deliveryId);

      if (updateError) throw updateError;
    } catch (error) {
      await supabase.from("project_deliveries").delete().eq("id", deliveryId);
      setSaving(false);
      reportError("guardar evidencias de entrega", error);
      return;
    }

    router.push(`/projects/${projectId}/deliveries/${deliveryId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
        <h2 className="mb-5 text-2xl font-semibold">Datos de entrega</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Fecha entrega</span>
            <input
              type="date"
              value={deliveryDate}
              onChange={(event) => setDeliveryDate(event.target.value)}
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Recibe</span>
            <input
              value={deliveredToName}
              onChange={(event) => setDeliveredToName(event.target.value)}
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              placeholder="Nombre del cliente o responsable"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Cargo / rol</span>
            <input
              value={deliveredToRole}
              onChange={(event) => setDeliveredToRole(event.target.value)}
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              placeholder="Opcional"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Entrega ALFA</span>
            <input
              value={deliveredByName}
              onChange={(event) => setDeliveredByName(event.target.value)}
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              placeholder="Responsable ALFA"
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-[#B3B3B8]">Observaciones</span>
            <textarea
              value={observations}
              onChange={(event) => setObservations(event.target.value)}
              className="min-h-28 w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              placeholder="Alcance entregado, condiciones, notas de operacion o acuerdos."
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-[#B3B3B8]">Pendientes</span>
            <textarea
              value={pendingText}
              onChange={(event) => setPendingText(event.target.value)}
              className="min-h-28 w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              placeholder="Un pendiente por linea. Deja vacio si no hay pendientes."
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Evidencias</h2>
            <p className="mt-1 text-sm text-[#B3B3B8]">Fotos del proyecto entregado.</p>
          </div>
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-sm font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white">
            <Camera size={16} />
            Seleccionar fotos
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(event) => setEvidences(event.target.files)}
            />
          </label>
        </div>
        {evidencePreviewUrls.length === 0 ? (
          <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-[#2A2A30] text-[#77777D]">
            Sin evidencias seleccionadas
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {evidencePreviewUrls.map((url, index) => (
              <img
                key={url}
                src={url}
                alt={`Evidencia ${index + 1}`}
                className="h-56 w-full rounded-xl border border-[#2A2A30] object-cover"
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SignatureBox
          title="Firma cliente"
          canvasRef={clientCanvasRef}
          hasSignature={hasClientSignature}
          onClear={() => clearSignature("client")}
          onPointerDown={startSignature}
          onPointerMove={drawSignature}
          onPointerUp={stopSignature}
        />
        <SignatureBox
          title="Firma ALFA"
          canvasRef={alfaCanvasRef}
          hasSignature={hasAlfaSignature}
          onClear={() => clearSignature("alfa")}
          onPointerDown={startSignature}
          onPointerMove={drawSignature}
          onPointerUp={stopSignature}
        />
      </section>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-4 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
      >
        <Save size={18} />
        {saving ? "Guardando..." : "Guardar entrega de proyecto"}
      </button>
    </form>
  );
}

function SignatureBox({
  title,
  canvasRef,
  hasSignature,
  onClear,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  title: string;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  hasSignature: boolean;
  onClear: () => void;
  onPointerDown: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLCanvasElement>) => void;
}) {
  return (
    <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-[#B3B3B8]">
            {hasSignature ? "Firma capturada" : "Sin firma capturada"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-sm font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
        >
          <Eraser size={16} />
          Limpiar
        </button>
      </div>
      <div className="rounded-xl border border-[#2A2A30] bg-white p-2">
        <canvas
          ref={canvasRef}
          width={900}
          height={320}
          className="h-72 w-full touch-none rounded-lg bg-white"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
      <p className="mt-3 inline-flex items-center gap-2 text-sm text-[#B3B3B8]">
        <PenLine size={16} />
        Firma digital de entrega
      </p>
    </div>
  );
}
