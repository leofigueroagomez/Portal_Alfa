"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  Clock,
  Download,
  Eraser,
  Eye,
  FileCheck2,
  FileText,
  HelpCircle,
  IdCard,
  Image as ImageIcon,
  Lock,
  MapPin,
  PenLine,
  RotateCcw,
  Send,
  ShieldCheck,
  UserCheck,
  X,
  ZoomIn,
} from "lucide-react";
import type { DeliverySigningContext } from "@/lib/projectDeliverySignature";

type Props = {
  token: string;
  context: DeliverySigningContext;
};

// Comprime una imagen a Base64 max 1600px para carga rápida y nítida
function fileToResizedDataUrl(file: File, maxSize = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const image = new Image();
      image.onload = () => {
        let width = image.width;
        let height = image.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      image.onerror = (err) => reject(err);
      image.src = readerEvent.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function getGeolocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
} | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString(),
        });
      },
      () => {
        // En caso de que el usuario decline o no responda, resolvemos null
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 7000,
        maximumAge: 0,
      }
    );
  });
}

export default function DeliverySignClient({ token, context }: Props) {
  const { delivery, project, client, systems, pendingItems, evidences, isAlreadySigned } = context;

  // Estado del formulario de firma
  const [signerName, setSignerName] = useState(
    delivery?.clientSignerName || client?.name || ""
  );
  const [signerRole, setSignerRole] = useState(
    delivery?.siteAttendedByRole || "Propietario / Titular"
  );
  const [signerEmail, setSignerEmail] = useState(
    delivery?.clientSignerEmail || client?.email || ""
  );
  const [signerPhone, setSignerPhone] = useState(
    delivery?.clientSignerPhone || client?.phone || ""
  );
  const [privacyConsentAccepted, setPrivacyConsentAccepted] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [signedSuccess, setSignedSuccess] = useState(isAlreadySigned);
  const [signedAtDate, setSignedAtDate] = useState<string | null>(
    delivery?.clientSignedAt || null
  );

  // Fotos de INE
  const [ineFrontDataUrl, setIneFrontDataUrl] = useState<string | null>(null);
  const [ineBackDataUrl, setIneBackDataUrl] = useState<string | null>(null);
  const [processingIne, setProcessingIne] = useState<"front" | "back" | null>(null);

  // Estado del Lightbox de fotos
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);
  const [activePhotoCaption, setActivePhotoCaption] = useState<string | null>(null);

  // Canvas de firma
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // Inicializar dimensiones del canvas para alta resolución en retina / smartphones
  useEffect(() => {
    if (signedSuccess) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.strokeStyle = "#111318";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [signedSuccess]);

  function getCoordinates(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;
    const { x, y } = getCoordinates(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  }

  function stopDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (isDrawingRef.current) {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      isDrawingRef.current = false;
    }
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  async function handleIneUpload(
    event: React.ChangeEvent<HTMLInputElement>,
    side: "front" | "back"
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setProcessingIne(side);
    try {
      const resized = await fileToResizedDataUrl(file);
      if (side === "front") setIneFrontDataUrl(resized);
      else setIneBackDataUrl(resized);
    } catch (err) {
      console.error("Error procesando foto de INE:", err);
      alert("No se pudo cargar la imagen. Intenta de nuevo.");
    } finally {
      setProcessingIne(null);
      event.target.value = "";
    }
  }

  async function handleSignSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    if (!ineFrontDataUrl) {
      setSubmitError("Por favor toma una foto clara de tu identificación oficial (INE Frontal).");
      return;
    }

    if (!signerName.trim()) {
      setSubmitError("Por favor captura tu nombre completo.");
      return;
    }

    if (!signerEmail.trim() || !signerEmail.includes("@")) {
      setSubmitError("Por favor captura un correo electrónico válido para enviarte tu carta de garantía y avisos.");
      return;
    }

    if (!signerPhone.trim() || signerPhone.trim().length < 8) {
      setSubmitError("Por favor captura un teléfono móvil / WhatsApp válido para enviarte tu garantía.");
      return;
    }

    if (!hasDrawn || !canvasRef.current) {
      setSubmitError("Por favor dibuja tu firma en el recuadro.");
      return;
    }

    if (!privacyConsentAccepted) {
      setSubmitError("Debes aceptar el consentimiento de privacidad y tratamiento de datos.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Obtener ubicación GPS en tiempo real
      const geolocation = await getGeolocation();

      // 2. Extraer firma en Base64
      const signatureDataUrl = canvasRef.current.toDataURL("image/png");

      const response = await fetch(`/api/public/deliveries/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureDataUrl,
          signerName: signerName.trim(),
          signerRole: signerRole.trim() || null,
          signerEmail: signerEmail.trim(),
          signerPhone: signerPhone.trim(),
          ineFrontDataUrl,
          ineBackDataUrl,
          geolocation,
          privacyConsentAccepted: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo registrar la firma.");
      }

      setSignedSuccess(true);
      setSignedAtDate(data.signedAt || new Date().toISOString());
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al enviar la firma.");
    } finally {
      setSubmitting(false);
    }
  }

  const pdfDownloadUrl = `/public/documents/${token}/pdf`;

  const mapLink =
    delivery?.signatureLatitude && delivery?.signatureLongitude
      ? `https://www.google.com/maps/search/?api=1&query=${delivery.signatureLatitude},${delivery.signatureLongitude}`
      : null;

  return (
    <div className="min-h-screen bg-[#0B0D0F] text-white">
      {/* Lightbox Modal para fotos */}
      {activePhotoUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          onClick={() => setActivePhotoUrl(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full bg-[#1F1F24] p-3 text-white transition hover:bg-[#2A2A30]"
            onClick={() => setActivePhotoUrl(null)}
          >
            <X size={24} />
          </button>
          <img
            src={activePhotoUrl}
            alt={activePhotoCaption || "Fotografía"}
            className="max-h-[85vh] max-w-[95vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          {activePhotoCaption && (
            <p className="mt-3 text-center text-sm font-medium text-[#B3B3B8]">
              {activePhotoCaption}
            </p>
          )}
        </div>
      )}

      {/* Header Corporativo ALFA */}
      <header className="border-b border-[#1F1F24] bg-[#121316]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#9E1B32] font-black text-white text-sm tracking-wider shadow-lg">
              ALFA
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#9E1B32]">
                Recepción Técnica
              </p>
              <h1 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                {project?.name || "Entrega de Proyecto"}
              </h1>
            </div>
          </div>
          {signedSuccess && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#1F7A4D] bg-[#143D2A] px-3 py-1 text-xs font-semibold text-[#8CE0B6]">
              <CheckCircle2 size={13} />
              Firmado
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 space-y-6">
        {/* Banner de Estado Firmado */}
        {signedSuccess && (
          <section className="rounded-2xl border border-[#1F7A4D]/50 bg-[#12281E]/80 p-5 sm:p-6 text-center space-y-4 shadow-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1F7A4D]/20 text-[#8CE0B6]">
              <FileCheck2 size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Recepción de Proyecto Confirmada
              </h2>
              <p className="mt-1 text-sm text-[#8CE0B6]">
                Este proyecto ha sido revisado y firmado digitalmente de conformidad con respaldo de
                identificación oficial y geolocalización.
              </p>
              {signedAtDate && (
                <p className="mt-2 text-xs text-[#8CE0B6]/80 flex items-center justify-center gap-1.5">
                  <Clock size={13} />
                  Fecha de firma:{" "}
                  {new Date(signedAtDate).toLocaleString("es-MX", {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                </p>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <a
                href={pdfDownloadUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#9E1B32] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#B91C3C] shadow-lg"
              >
                <Download size={16} />
                Descargar Acta de Entrega en PDF
              </a>

              {mapLink && (
                <a
                  href={mapLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#1F7A4D] bg-[#143D2A] px-5 py-3 text-sm font-semibold text-[#8CE0B6] transition hover:bg-[#1A5037]"
                >
                  <MapPin size={16} />
                  Ver ubicación satelital
                </a>
              )}
            </div>
          </section>
        )}

        {/* Resumen del Proyecto */}
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6 space-y-4 shadow-md">
          <div className="border-b border-[#2A2A30] pb-4">
            <p className="text-xs font-semibold tracking-wider text-[#9E1B32] uppercase">
              Datos Generales
            </p>
            <h2 className="mt-1 text-2xl font-bold">{project?.name}</h2>
            {project?.siteAddress && (
              <p className="mt-1 text-xs text-[#B3B3B8]">{project.siteAddress}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-3">
              <span className="text-xs text-[#77777D]">Cliente titular</span>
              <p className="font-semibold text-white">{client?.name || "Cliente"}</p>
              {client?.companyName && (
                <p className="text-xs text-[#B3B3B8]">{client.companyName}</p>
              )}
            </div>
            <div className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-3">
              <span className="text-xs text-[#77777D]">Fecha de entrega</span>
              <p className="font-semibold text-white">
                {delivery?.deliveryDate
                  ? new Date(delivery.deliveryDate + "T12:00:00").toLocaleDateString(
                      "es-MX",
                      { dateStyle: "long" }
                    )
                  : "Por confirmar"}
              </p>
            </div>
          </div>

          {delivery?.siteAttendedByName && (
            <div className="rounded-xl border border-[#322514] bg-[#221A0F] p-3 text-xs text-[#F4C66A] flex items-center gap-2">
              <UserCheck size={16} className="shrink-0" />
              <span>
                Atendió las pruebas en obra:{" "}
                <strong className="text-white">{delivery.siteAttendedByName}</strong>
                {delivery.siteAttendedByRole ? ` (${delivery.siteAttendedByRole})` : ""}.
              </span>
            </div>
          )}
        </section>

        {/* Sistemas Entregados */}
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6 space-y-4 shadow-md">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-[#9E1B32]" />
            <h3 className="text-lg font-bold">Sistemas y Alcances Entregados</h3>
          </div>

          {systems.length === 0 ? (
            <p className="text-sm text-[#77777D]">
              Alcance completo del proyecto entregado conforme a cotización aprobada.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {systems.map((system) => (
                <div
                  key={system.id}
                  className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-3.5 space-y-1"
                >
                  <div className="flex items-center gap-2 font-semibold text-sm text-white">
                    <CheckCircle2 size={16} className="text-[#8CE0B6] shrink-0" />
                    <span>{system.systemName}</span>
                  </div>
                  {system.notes && (
                    <p className="text-xs text-[#B3B3B8] pl-6">{system.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Galería de Evidencias Fotográficas */}
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon size={20} className="text-[#9E1B32]" />
              <h3 className="text-lg font-bold">Evidencias de Instalación</h3>
            </div>
            <span className="text-xs text-[#77777D]">
              {evidences.length} foto{evidences.length !== 1 ? "s" : ""}
            </span>
          </div>

          {evidences.length === 0 ? (
            <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-[#2A2A30] text-sm text-[#77777D]">
              Sin evidencias fotográficas adjuntas
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {evidences.map((evidence, idx) => (
                <button
                  type="button"
                  key={evidence.id || idx}
                  className="group relative aspect-video w-full overflow-hidden rounded-xl border border-[#2A2A30] bg-black text-left transition hover:border-[#9E1B32] focus:outline-none"
                  onClick={() => {
                    setActivePhotoUrl(evidence.displayUrl);
                    setActivePhotoCaption(evidence.caption || `Evidencia ${idx + 1}`);
                  }}
                >
                  <img
                    src={evidence.displayUrl}
                    alt={evidence.caption || `Evidencia ${idx + 1}`}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white gap-1.5 text-xs font-semibold">
                    <ZoomIn size={16} />
                    Ver foto
                  </div>
                  {evidence.caption && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/75 px-2 py-1 text-[11px] text-white truncate">
                      {evidence.caption}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Observaciones y Pendientes */}
        {(delivery?.observations || pendingItems.length > 0) && (
          <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6 space-y-4 shadow-md">
            {delivery?.observations && (
              <div>
                <h4 className="text-sm font-bold text-white mb-2">Observaciones Técnicas</h4>
                <p className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-3.5 text-xs text-[#B3B3B8] leading-relaxed whitespace-pre-line">
                  {delivery.observations}
                </p>
              </div>
            )}

            {pendingItems.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-white mb-2">Puntos de Seguimiento</h4>
                <div className="space-y-2">
                  {pendingItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-[#322514] bg-[#221A0F] p-3 text-xs text-[#F4C66A] flex items-center justify-between"
                    >
                      <span>{item.description}</span>
                      <span className="rounded-full bg-[#322514] px-2 py-0.5 text-[10px] font-semibold uppercase">
                        {item.status === "resolved" ? "Resuelto" : "Pendiente"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Constancia del Instalador ALFA */}
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6 space-y-3 shadow-md">
          <p className="text-xs font-semibold tracking-wider text-[#9E1B32] uppercase">
            Entrega Técnica por ALFA IT
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-4">
            <div>
              <p className="text-xs text-[#77777D]">Responsable ALFA</p>
              <p className="text-base font-bold text-white">
                {delivery?.deliveredByName || "Ingeniería y Operaciones ALFA"}
              </p>
            </div>
            {delivery?.alfaSignatureUrl ? (
              <div className="h-16 w-44 rounded-lg bg-white p-1 shadow-inner flex items-center justify-center">
                <img
                  src={delivery.alfaSignatureUrl}
                  alt="Firma ALFA"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <span className="text-xs text-[#77777D] italic">Firma registrada en acta</span>
            )}
          </div>
        </section>

        {/* Módulo de Identificación Oficial y Firma del Cliente */}
        {!signedSuccess ? (
          <form
            onSubmit={handleSignSubmit}
            className="rounded-2xl border border-[#9E1B32]/40 bg-[#151518] p-5 sm:p-6 space-y-6 shadow-2xl"
          >
            <div className="border-b border-[#2A2A30] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={22} className="text-[#9E1B32]" />
                <h3 className="text-xl font-bold">Verificación y Firma de Conformidad</h3>
              </div>
              <p className="mt-1 text-xs text-[#B3B3B8]">
                Para brindar plena validez contractual, se requiere fotografía de tu identificación
                oficial (INE) y tu firma digital.
              </p>
            </div>

            {submitError && (
              <div className="rounded-xl border border-[#6A2A2A] bg-[#351818] p-3 text-xs font-medium text-[#FFB4B4]">
                {submitError}
              </div>
            )}

            {/* Paso 1: Captura de INE */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <IdCard size={18} className="text-[#9E1B32]" />
                <h4 className="text-sm font-bold text-white">
                  1. Fotografía de Identificación Oficial (INE / Pasaporte) *
                </h4>
              </div>
              <p className="text-xs text-[#B3B3B8]">
                Toma una foto clara y legible con la cámara de tu smartphone.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* INE Frontal */}
                <div className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-3.5 space-y-2 text-center">
                  <span className="text-xs font-semibold text-white">Anverso (Frontal) *</span>
                  {ineFrontDataUrl ? (
                    <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg border border-[#2A2A30] bg-black">
                      <img
                        src={ineFrontDataUrl}
                        alt="INE Frontal"
                        className="h-full w-full object-cover"
                      />
                      <label className="absolute bottom-2 right-2 inline-flex cursor-pointer items-center gap-1 rounded-lg bg-black/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm hover:bg-black">
                        <RotateCcw size={12} />
                        Repetir foto
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="sr-only"
                          onChange={(e) => handleIneUpload(e, "front")}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#2A2A30] bg-[#151518] p-4 text-[#B3B3B8] transition hover:border-[#9E1B32] hover:text-white">
                      <Camera size={24} className="text-[#9E1B32]" />
                      <span className="text-xs font-semibold">
                        {processingIne === "front" ? "Procesando foto..." : "Tomar foto frontal"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="sr-only"
                        onChange={(e) => handleIneUpload(e, "front")}
                      />
                    </label>
                  )}
                </div>

                {/* INE Reverso */}
                <div className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-3.5 space-y-2 text-center">
                  <span className="text-xs font-semibold text-white">Reverso (Opcional)</span>
                  {ineBackDataUrl ? (
                    <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg border border-[#2A2A30] bg-black">
                      <img
                        src={ineBackDataUrl}
                        alt="INE Reverso"
                        className="h-full w-full object-cover"
                      />
                      <label className="absolute bottom-2 right-2 inline-flex cursor-pointer items-center gap-1 rounded-lg bg-black/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm hover:bg-black">
                        <RotateCcw size={12} />
                        Repetir foto
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="sr-only"
                          onChange={(e) => handleIneUpload(e, "back")}
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#2A2A30] bg-[#151518] p-4 text-[#B3B3B8] transition hover:border-[#9E1B32] hover:text-white">
                      <Camera size={24} className="text-[#77777D]" />
                      <span className="text-xs font-semibold">
                        {processingIne === "back" ? "Procesando foto..." : "Tomar foto reverso"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="sr-only"
                        onChange={(e) => handleIneUpload(e, "back")}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* Paso 2: Datos del Firmante */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white">2. Datos de contacto y posventa (para envío de garantía)</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs text-[#B3B3B8]">Nombre completo conforme a INE *</span>
                  <input
                    type="text"
                    required
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    placeholder="Tu nombre y apellidos"
                    className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#9E1B32]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[#B3B3B8]">Cargo o relación con el proyecto</span>
                  <input
                    type="text"
                    value={signerRole}
                    onChange={(e) => setSignerRole(e.target.value)}
                    placeholder="Ej. Propietario, Representante Legal, etc."
                    className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#9E1B32]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[#B3B3B8]">Correo electrónico (para envío de garantía) *</span>
                  <input
                    type="email"
                    required
                    value={signerEmail}
                    onChange={(e) => setSignerEmail(e.target.value)}
                    placeholder="cliente@ejemplo.com"
                    className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#9E1B32]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-[#B3B3B8]">Teléfono celular / WhatsApp *</span>
                  <input
                    type="tel"
                    required
                    value={signerPhone}
                    onChange={(e) => setSignerPhone(e.target.value)}
                    placeholder="10 dígitos (ej. 5512345678)"
                    className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#9E1B32]"
                  />
                </label>
              </div>
            </div>

            {/* Paso 3: Trazo de Firma */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">3. Traza tu firma digital:</span>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#B3B3B8] hover:text-white"
                >
                  <Eraser size={14} />
                  Limpiar
                </button>
              </div>

              <div className="rounded-xl border-2 border-dashed border-[#3A3A42] bg-white p-2 shadow-inner">
                <canvas
                  ref={canvasRef}
                  className="h-44 sm:h-52 w-full touch-none bg-white rounded-lg cursor-crosshair"
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerCancel={stopDrawing}
                />
              </div>
              <p className="text-[11px] text-[#77777D] text-center">
                Desliza tu dedo en el recuadro blanco para firmar.
              </p>
            </div>

            {/* Paso 4: Consentimiento LFPDPPP & Geolocalización */}
            <div className="space-y-2">
              <label className="flex items-start gap-3 rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-3.5 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={privacyConsentAccepted}
                  onChange={(e) => setPrivacyConsentAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-[#9E1B32] shrink-0"
                />
                <span className="text-xs text-[#B3B3B8] leading-relaxed select-none">
                  Consiento expresamente el tratamiento de mis datos personales, fotografía de
                  identificación oficial (INE) y geolocalización satelital en tiempo real,
                  exclusivamente para fines de verificación de identidad, recepción técnica y validez
                  contractual de la entrega del proyecto <strong>{project?.name}</strong>, conforme a la
                  Ley Federal de Protección de Datos Personales en Posesión de los Particulares
                  (LFPDPPP).
                </span>
              </label>
              <p className="text-[10px] text-[#77777D] flex items-center gap-1 px-1">
                <Lock size={12} />
                Tus datos e identificación se almacenan de forma cifrada y confidencial por ALFA IT.
              </p>
            </div>

            {/* Botón de Envío */}
            <button
              type="submit"
              disabled={submitting || !hasDrawn || !privacyConsentAccepted || !ineFrontDataUrl}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#9E1B32] py-4 text-sm font-bold text-white transition hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D] shadow-xl"
            >
              <Send size={16} />
              {submitting
                ? "Validando ubicación y enviando firma..."
                : "Firmar y Recibir Proyecto"}
            </button>
          </form>
        ) : (
          /* Vista de la firma registrada y validaciones */
          <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6 space-y-4 shadow-md">
            <p className="text-xs font-semibold tracking-wider text-[#9E1B32] uppercase">
              Constancia de Firma y Verificación de Identidad
            </p>

            <div className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs text-[#77777D]">Firmado por</p>
                <p className="text-base font-bold text-white">
                  {delivery?.clientSignerName || signerName}
                </p>
                <p className="text-xs text-[#B3B3B8]">
                  {delivery?.siteAttendedByRole || signerRole}
                </p>
                {delivery?.privacyConsentAccepted && (
                  <p className="mt-2 text-[11px] text-[#8CE0B6] flex items-center gap-1">
                    <ShieldCheck size={13} />
                    Consentimiento LFPDPPP registrado
                  </p>
                )}
              </div>
              {delivery?.clientSignatureUrl ? (
                <div className="h-20 w-48 rounded-lg bg-white p-1 shadow-inner flex items-center justify-center">
                  <img
                    src={delivery.clientSignatureUrl}
                    alt="Firma del Cliente"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <span className="text-xs text-[#8CE0B6] font-semibold">Firma digital procesada</span>
              )}
            </div>

            {delivery?.clientIneFrontUrl && (
              <div className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-3 text-xs flex items-center justify-between">
                <span className="text-[#B3B3B8] flex items-center gap-2">
                  <IdCard size={16} className="text-[#8CE0B6]" />
                  Identificación oficial INE cotejada exitosamente
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActivePhotoUrl(delivery.clientIneFrontUrl || null);
                    setActivePhotoCaption("Identificación Oficial Registrada");
                  }}
                  className="font-semibold text-[#9E1B32] hover:underline"
                >
                  Ver foto
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1F1F24] py-8 text-center text-xs text-[#77777D]">
        <p>ALFA IT • Soluciones Tecnológicas de Alto Nivel</p>
        <p className="mt-1">
          Documento firmado digitalmente conforme al Código de Comercio y la LFPDPPP.
        </p>
      </footer>
    </div>
  );
}
