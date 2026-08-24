"use client";

import type React from "react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Eraser, MessageCircle, PenLine, Save, Smartphone, UserCheck, Users } from "lucide-react";
import { getMexicoDate } from "@/lib/mexicoDate";
import { supabase } from "@/services/supabase";

type Props = {
  projectId: number;
  systemOptions: string[];
  defaultClientName?: string;
  defaultClientPhone?: string;
  defaultClientEmail?: string;
  defaultSiteContactName?: string;
};

function today() {
  return getMexicoDate();
}

function getExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

const maxEvidenceImageSize = 50 * 1024 * 1024;

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

export default function NewProjectDeliveryForm({
  projectId,
  systemOptions,
  defaultClientName = "",
  defaultClientPhone = "",
  defaultClientEmail = "",
  defaultSiteContactName = "",
}: Props) {
  const router = useRouter();

  // Modalidad de firma: 'remote' (WhatsApp / Enlace) vs 'onsite' (Firma en el mismo dispositivo)
  const [signingMode, setSigningMode] = useState<"remote" | "onsite">("remote");

  // Canvas refs
  const clientCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const alfaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const clientSignedRef = useRef(false);
  const alfaSignedRef = useRef(false);

  // Estados del formulario
  const [saving, setSaving] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(today());
  const [siteAttendedByName, setSiteAttendedByName] = useState(defaultSiteContactName);
  const [siteAttendedByRole, setSiteAttendedByRole] = useState("");
  const [clientSignerName, setClientSignerName] = useState(defaultClientName);
  const [clientSignerPhone, setClientSignerPhone] = useState(defaultClientPhone);
  const [clientSignerEmail, setClientSignerEmail] = useState(defaultClientEmail);
  const [deliveredByName, setDeliveredByName] = useState("");
  const [observations, setObservations] = useState("");
  const [pendingText, setPendingText] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidencePreviewUrls, setEvidencePreviewUrls] = useState<string[]>([]);
  const [hasClientSignature, setHasClientSignature] = useState(false);
  const [hasAlfaSignature, setHasAlfaSignature] = useState(false);
  const [selectedSystems, setSelectedSystems] = useState<string[]>(systemOptions);
  const [systemNotes, setSystemNotes] = useState<Record<string, string>>({});

  function setEvidences(files: FileList | null) {
    const rejected: string[] = [];
    const selected = Array.from(files || []).filter((file) => {
      if (!file.type.startsWith("image/")) {
        rejected.push(`${file.name}: no es imagen`);
        return false;
      }
      if (file.size > maxEvidenceImageSize) {
        rejected.push(`${file.name}: supera 50 MB`);
        return false;
      }
      return true;
    });

    if (selected.length === 0) {
      alert(
        rejected.length > 0
          ? `No se agregaron fotos:\n${rejected.join("\n")}`
          : "Selecciona imágenes válidas para las evidencias."
      );
      return;
    }

    if (rejected.length > 0) {
      alert(`Algunas fotos no se agregaron:\n${rejected.join("\n")}`);
    }

    setEvidenceFiles((current) => [...current, ...selected]);
    setEvidencePreviewUrls((current) => [
      ...current,
      ...selected.map((file) => URL.createObjectURL(file)),
    ]);
  }

  function removeEvidence(index: number) {
    setEvidenceFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
    setEvidencePreviewUrls((current) => {
      const url = current[index];
      if (url) URL.revokeObjectURL(url);
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
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

    if (signingMode === "remote") {
      if (!clientSignerName.trim()) {
        alert("Captura el nombre del cliente titular para el envío de la firma.");
        return;
      }
    } else {
      if (!clientSignerName.trim() && !siteAttendedByName.trim()) {
        alert("Captura quién recibe el proyecto.");
        return;
      }
      if (!hasClientSignature) {
        const shouldContinue = window.confirm(
          "Se recomienda capturar la firma del cliente en modo presencial. ¿Deseas guardar sin firma?"
        );
        if (!shouldContinue) return;
      }
    }

    if (!hasAlfaSignature) {
      alert("Por favor plasma la firma del responsable ALFA.");
      return;
    }

    if (evidenceFiles.length === 0) {
      alert("Agrega al menos una evidencia fotográfica de la entrega.");
      return;
    }

    if (systemOptions.length > 0 && selectedSystems.length === 0) {
      alert("Selecciona al menos un sistema entregado.");
      return;
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

    const deliveryStatus = signingMode === "remote" ? "pending_signature" : "delivered";
    const signatureMethod = signingMode === "remote" ? "whatsapp_link" : "onsite";
    const finalDeliveredToName = clientSignerName.trim() || siteAttendedByName.trim();
    const finalDeliveredToRole = siteAttendedByRole.trim() || "Cliente Titular";

    const { data: delivery, error: deliveryError } = await supabase
      .from("project_deliveries")
      .insert({
        client_project_id: projectId,
        delivery_date: deliveryDate,
        status: deliveryStatus,
        delivered_to_name: finalDeliveredToName,
        delivered_to_role: finalDeliveredToRole || null,
        delivered_by_name: deliveredByName.trim() || null,
        site_attended_by_name: siteAttendedByName.trim() || null,
        site_attended_by_role: siteAttendedByRole.trim() || null,
        client_signer_name: clientSignerName.trim() || null,
        client_signer_phone: clientSignerPhone.trim() || null,
        client_signer_email: clientSignerEmail.trim() || null,
        signature_method: signatureMethod,
        observations: observations.trim() || null,
        created_by_user_id: user?.id || null,
      })
      .select("id")
      .single();

    if (deliveryError || !delivery) {
      setSaving(false);
      reportError("crear entrega de proyecto", deliveryError || "No se recibió entrega");
      return;
    }

    const timestamp = Date.now();
    const deliveryId = Number(delivery.id);

    try {
      // 1. Subir evidencias
      const evidenceRows = [];
      const evidenceUploadErrors = [];
      for (let index = 0; index < evidenceFiles.length; index += 1) {
        const file = evidenceFiles[index];
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `project-deliveries/${projectId}/${deliveryId}/${timestamp}-${index}-${safeName || `evidence.${getExtension(file)}`}`;
        const { error } = await supabase.storage
          .from("project-photos")
          .upload(path, file, {
            cacheControl: "3600",
            contentType: file.type || "image/jpeg",
            upsert: false,
          });

        if (error) {
          evidenceUploadErrors.push(`${file.name}: ${error.message}`);
          continue;
        }
        evidenceRows.push({
          project_delivery_id: deliveryId,
          file_url: path,
          file_path: path,
          file_name: file.name,
          file_type: file.type || null,
          file_size: file.size,
          uploaded_by: user?.id || null,
          caption: `Evidencia ${index + 1}`,
          sort_order: index,
        });
      }

      if (evidenceUploadErrors.length > 0) {
        alert(`Algunas evidencias no se subieron:\n${evidenceUploadErrors.join("\n")}`);
      }

      if (evidenceRows.length === 0) {
        throw new Error("No se pudo subir ninguna evidencia.");
      }

      const evidenceInsertResult = await supabase
        .from("project_delivery_evidences")
        .insert(evidenceRows);
      if (evidenceInsertResult.error) throw evidenceInsertResult.error;

      // 2. Guardar pendientes
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

      // 3. Guardar sistemas
      if (selectedSystems.length > 0) {
        const { error } = await supabase.from("project_delivery_systems").insert(
          selectedSystems.map((systemName) => ({
            project_delivery_id: deliveryId,
            system_name: systemName,
            delivered: true,
            notes: systemNotes[systemName]?.trim() || null,
          }))
        );
        if (error) throw error;
      }

      // 4. Subir firmas
      const [clientSignaturePath, alfaSignaturePath] = await Promise.all([
        signingMode === "onsite"
          ? uploadSignature(
              clientCanvasRef.current,
              `project-deliveries/${projectId}/${deliveryId}/client-signature-${timestamp}.png`,
              clientSignedRef.current
            )
          : Promise.resolve(null),
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

      // Si fue presencial, actualizar etapa del proyecto a delivered
      if (signingMode === "onsite") {
        await supabase
          .from("client_projects")
          .update({ sales_stage: "delivered" })
          .eq("id", projectId);
      }
    } catch (error) {
      await supabase.from("project_deliveries").delete().eq("id", deliveryId);
      setSaving(false);
      reportError("guardar entrega de proyecto", error);
      return;
    }

    router.push(`/projects/${projectId}/deliveries/${deliveryId}`);
    router.refresh();
  }

  function toggleSystem(systemName: string) {
    setSelectedSystems((current) =>
      current.includes(systemName)
        ? current.filter((item) => item !== systemName)
        : [...current, systemName]
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Selector de Modalidad */}
      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6 space-y-4">
        <h2 className="text-xl font-semibold">Modalidad de Firma y Recepción</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setSigningMode("remote")}
            className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition ${
              signingMode === "remote"
                ? "border-[#9E1B32] bg-[#221619] text-white"
                : "border-[#2A2A30] bg-[#1C1D22] text-[#B3B3B8] hover:border-[#3A3A42]"
            }`}
          >
            <Smartphone
              size={22}
              className={signingMode === "remote" ? "text-[#9E1B32]" : "text-[#77777D]"}
            />
            <div>
              <p className="font-semibold text-white">Firma Remota por WhatsApp</p>
              <p className="text-xs text-[#B3B3B8] mt-0.5">
                Recomendado cuando el cliente no está en sitio o atendió un encargado. Podrás enviar
                un enlace por WhatsApp para que firme en su celular.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSigningMode("onsite")}
            className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition ${
              signingMode === "onsite"
                ? "border-[#9E1B32] bg-[#221619] text-white"
                : "border-[#2A2A30] bg-[#1C1D22] text-[#B3B3B8] hover:border-[#3A3A42]"
            }`}
          >
            <PenLine
              size={22}
              className={signingMode === "onsite" ? "text-[#9E1B32]" : "text-[#77777D]"}
            />
            <div>
              <p className="font-semibold text-white">Firma Presencial en Sitio</p>
              <p className="text-xs text-[#B3B3B8] mt-0.5">
                Utilízalo si el cliente titular o representante autorizado está presente en este
                momento y puede firmar en tu pantalla.
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* Datos Generales y Obra */}
      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6 space-y-4">
        <h2 className="text-2xl font-semibold">Datos de Entrega y Obra</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm text-[#B3B3B8]">Fecha de entrega</span>
            <input
              type="date"
              value={deliveryDate}
              onChange={(event) => setDeliveryDate(event.target.value)}
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none focus:border-[#9E1B32]"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm text-[#B3B3B8]">Responsable de entrega ALFA</span>
            <input
              value={deliveredByName}
              onChange={(event) => setDeliveredByName(event.target.value)}
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none focus:border-[#9E1B32]"
              placeholder="Instalador / Project Manager ALFA"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm text-[#B3B3B8]">
              Quién atendió las pruebas en obra (Tercero / Encargado)
            </span>
            <input
              value={siteAttendedByName}
              onChange={(event) => setSiteAttendedByName(event.target.value)}
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none focus:border-[#9E1B32]"
              placeholder="Ej. Ing. Juan Pérez, Residente de obra, Familiar, etc."
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm text-[#B3B3B8]">Cargo de quién atendió en obra</span>
            <input
              value={siteAttendedByRole}
              onChange={(event) => setSiteAttendedByRole(event.target.value)}
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none focus:border-[#9E1B32]"
              placeholder="Ej. Residente de Obra / Encargado"
            />
          </label>
        </div>
      </section>

      {/* Datos del Cliente Titular (Para Firma) */}
      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <UserCheck size={20} className="text-[#9E1B32]" />
          <h2 className="text-2xl font-semibold">
            {signingMode === "remote"
              ? "Destinatario de Firma Digital (Cliente Titular)"
              : "Datos del Cliente Titular"}
          </h2>
        </div>
        <p className="text-xs text-[#B3B3B8]">
          Persona con facultades de decisión que autoriza y firma la entrega técnica.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="space-y-1.5">
            <span className="text-sm text-[#B3B3B8]">Nombre del cliente titular *</span>
            <input
              required={signingMode === "remote"}
              value={clientSignerName}
              onChange={(event) => setClientSignerName(event.target.value)}
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none focus:border-[#9E1B32]"
              placeholder="Nombre y apellidos"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm text-[#B3B3B8]">Teléfono WhatsApp *</span>
            <input
              type="tel"
              value={clientSignerPhone}
              onChange={(event) => setClientSignerPhone(event.target.value)}
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none focus:border-[#9E1B32]"
              placeholder="Ej. 5219991234567"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm text-[#B3B3B8]">Correo electrónico (Opcional)</span>
            <input
              type="email"
              value={clientSignerEmail}
              onChange={(event) => setClientSignerEmail(event.target.value)}
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none focus:border-[#9E1B32]"
              placeholder="cliente@ejemplo.com"
            />
          </label>
        </div>
      </section>

      {/* Observaciones y Pendientes */}
      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6 space-y-4">
        <h2 className="text-2xl font-semibold">Observaciones y Pendientes</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm text-[#B3B3B8]">Observaciones técnicas</span>
            <textarea
              value={observations}
              onChange={(event) => setObservations(event.target.value)}
              className="min-h-28 w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none focus:border-[#9E1B32]"
              placeholder="Alcance entregado, condiciones, notas de operación o acuerdos."
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm text-[#B3B3B8]">Pendientes (un pendiente por línea)</span>
            <textarea
              value={pendingText}
              onChange={(event) => setPendingText(event.target.value)}
              className="min-h-28 w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none focus:border-[#9E1B32]"
              placeholder="Un pendiente por línea. Deja vacío si no hay pendientes."
            />
          </label>
        </div>
      </section>

      {/* Sistemas Entregados */}
      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6 space-y-4">
        <h2 className="text-2xl font-semibold">Sistemas Entregados</h2>
        {systemOptions.length === 0 ? (
          <p className="rounded-xl border border-[#614620] bg-[#322514] p-4 text-sm text-[#F4C66A]">
            No hay sistemas operativos sincronizados. La garantía usará el alcance completo del
            proyecto como fallback.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {systemOptions.map((systemName) => {
              const checked = selectedSystems.includes(systemName);
              return (
                <div
                  key={systemName}
                  className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4"
                >
                  <label className="flex items-center gap-3 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSystem(systemName)}
                      className="h-4 w-4 accent-[#9E1B32]"
                    />
                    {systemName}
                  </label>
                  <input
                    value={systemNotes[systemName] || ""}
                    onChange={(event) =>
                      setSystemNotes((current) => ({
                        ...current,
                        [systemName]: event.target.value,
                      }))
                    }
                    disabled={!checked}
                    className="mt-3 w-full rounded-lg border border-[#2A2A30] bg-[#151518] px-3 py-2 text-sm outline-none disabled:opacity-50 focus:border-[#9E1B32]"
                    placeholder="Notas opcionales del sistema"
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Evidencias Fotográficas */}
      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Evidencias Fotográficas</h2>
            <p className="mt-1 text-sm text-[#B3B3B8]">
              Agrega fotos claras de la instalación y equipos funcionando.
            </p>
          </div>
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-sm font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white">
            <Camera size={16} />
            {evidencePreviewUrls.length > 0 ? "Agregar más fotos" : "Seleccionar fotos"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(event) => {
                setEvidences(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
        {evidencePreviewUrls.length === 0 ? (
          <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-[#2A2A30] text-[#77777D]">
            Sin evidencias seleccionadas
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {evidencePreviewUrls.map((url, index) => (
              <figure
                key={url}
                className="overflow-hidden rounded-xl border border-[#2A2A30] bg-[#101114]"
              >
                <a href={url} target="_blank" rel="noreferrer">
                  <img
                    src={url}
                    alt={`Evidencia ${index + 1}`}
                    className="h-48 w-full object-cover"
                  />
                </a>
                <figcaption className="flex items-center justify-between gap-3 p-3 text-xs text-[#B3B3B8]">
                  <span className="truncate">
                    {evidenceFiles[index]?.name || `Evidencia ${index + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeEvidence(index)}
                    className="rounded-lg border border-[#6A2A2A] px-2 py-1 text-[#FFB4B4] hover:bg-[#351818]"
                  >
                    Eliminar
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      {/* Firmas */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SignatureBox
          title="Firma Instalador / Responsable ALFA *"
          subtitle="Firma quién entrega la obra por parte de ALFA IT"
          canvasRef={alfaCanvasRef}
          hasSignature={hasAlfaSignature}
          onClear={() => clearSignature("alfa")}
          onPointerDown={startSignature}
          onPointerMove={drawSignature}
          onPointerUp={stopSignature}
        />

        {signingMode === "onsite" ? (
          <SignatureBox
            title="Firma Cliente (Presencial)"
            subtitle="Firma el cliente en este dispositivo"
            canvasRef={clientCanvasRef}
            hasSignature={hasClientSignature}
            onClear={() => clearSignature("client")}
            onPointerDown={startSignature}
            onPointerMove={drawSignature}
            onPointerUp={stopSignature}
          />
        ) : (
          <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6 flex flex-col justify-center space-y-3">
            <div className="flex items-center gap-2 text-[#9E1B32]">
              <MessageCircle size={24} />
              <h3 className="text-xl font-bold text-white">Firma Remota de Cliente</h3>
            </div>
            <p className="text-xs text-[#B3B3B8] leading-relaxed">
              Al guardar, se creará el reporte con tus fotos y tu firma de ALFA. En la siguiente
              pantalla podrás abrir WhatsApp con un solo clic para enviarle el enlace al cliente:
            </p>
            <div className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-3 text-xs text-[#8CE0B6]">
              Destinatario: <strong>{clientSignerName || "Cliente"}</strong>
              {clientSignerPhone ? ` • WhatsApp: ${clientSignerPhone}` : ""}
            </div>
          </div>
        )}
      </section>

      {/* Botón Principal */}
      <button
        type="submit"
        disabled={saving}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl py-4 font-bold text-white shadow-xl transition disabled:bg-[#222228] disabled:text-[#77777D] ${
          signingMode === "remote"
            ? "bg-[#25D366] text-black hover:bg-[#20bd5a]"
            : "bg-[#9E1B32] hover:bg-[#B91C3C]"
        }`}
      >
        {signingMode === "remote" ? <MessageCircle size={18} /> : <Save size={18} />}
        {saving
          ? "Guardando entrega..."
          : signingMode === "remote"
            ? "Guardar y Enviar Enlace por WhatsApp"
            : "Guardar Entrega Firmada en Sitio"}
      </button>
    </form>
  );
}

function SignatureBox({
  title,
  subtitle,
  canvasRef,
  hasSignature,
  onClear,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  title: string;
  subtitle?: string;
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
          <h2 className="text-xl font-semibold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-[#77777D]">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-[#2A2A30] bg-[#222228] px-3.5 py-2 text-xs font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
        >
          <Eraser size={14} />
          Limpiar
        </button>
      </div>
      <div className="rounded-xl border border-[#2A2A30] bg-white p-2">
        <canvas
          ref={canvasRef}
          width={900}
          height={300}
          className="h-56 w-full touch-none rounded-lg bg-white"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
      <p className="mt-2 text-xs text-[#77777D]">
        {hasSignature ? "Firma capturada correctamente" : "Pendiente de trazar firma"}
      </p>
    </div>
  );
}
