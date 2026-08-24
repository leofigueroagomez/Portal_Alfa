"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  Eraser,
  ExternalLink,
  Lock,
  MapPin,
  RotateCcw,
  ShieldCheck,
  User,
  Wrench,
  X,
  ZoomIn,
} from "lucide-react";
import type { ServiceSigningContext } from "@/lib/serviceSignature";

type Props = {
  token: string;
  context: ServiceSigningContext;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "Sin fecha";
  return new Date(dateStr + (dateStr.includes("T") ? "" : "T12:00:00")).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function fileToResizedDataUrl(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getGeolocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number | null;
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

export default function ServiceSignClient({ token, context }: Props) {
  const { serviceReport, client, project, photos, financials, bankAccounts, isAlreadySigned } = context;

  const [signerName, setSignerName] = useState(
    serviceReport.client_signer_name || client?.name || ""
  );
  const [signerEmail, setSignerEmail] = useState(
    serviceReport.client_signer_email || client?.email || ""
  );
  const [signerPhone, setSignerPhone] = useState(
    serviceReport.client_signer_phone || client?.phone || ""
  );
  const [privacyConsentAccepted, setPrivacyConsentAccepted] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [signedSuccess, setSignedSuccess] = useState(isAlreadySigned);
  const [signedAtDate, setSignedAtDate] = useState<string | null>(
    serviceReport.client_signed_at || null
  );

  // Fotos de INE
  const [ineFrontDataUrl, setIneFrontDataUrl] = useState<string | null>(null);
  const [ineBackDataUrl, setIneBackDataUrl] = useState<string | null>(null);
  const [processingIne, setProcessingIne] = useState<"front" | "back" | null>(null);

  // Lightbox de fotos
  const [activePhotoUrl, setActivePhotoUrl] = useState<string | null>(null);
  const [activePhotoCaption, setActivePhotoCaption] = useState<string | null>(null);

  // Copiado de CLABE
  const [copiedClabe, setCopiedClabe] = useState(false);

  // Canvas de firma
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2.5;
  }, [signedSuccess]);

  function getCanvasCoords(event: React.PointerEvent<HTMLCanvasElement>) {
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
    setHasDrawn(true);

    const { x, y } = getCanvasCoords(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoords(event);
    ctx.lineTo(x, y);
    ctx.stroke();
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

  function copyClabeToClipboard() {
    navigator.clipboard.writeText(bankAccounts.clabe);
    setCopiedClabe(true);
    setTimeout(() => setCopiedClabe(false), 2500);
  }

  async function handleSignSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    if (!signerName.trim()) {
      setSubmitError("Por favor captura tu nombre completo.");
      return;
    }

    if (!signerEmail.trim() || !signerEmail.includes("@")) {
      setSubmitError("Por favor captura un correo electrónico válido para enviarte tu comprobante y reporte.");
      return;
    }

    if (!signerPhone.trim() || signerPhone.trim().length < 8) {
      setSubmitError("Por favor captura un teléfono móvil / WhatsApp válido.");
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
      const geolocation = await getGeolocation();
      const signatureDataUrl = canvasRef.current.toDataURL("image/png");

      const response = await fetch(`/api/public/services/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureDataUrl,
          signerName: signerName.trim(),
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al registrar firma.");
    } finally {
      setSubmitting(false);
    }
  }

  const clientName = client?.company_name || client?.name || "Cliente";
  const serviceNumber = serviceReport.service_number || `SERV-${String(serviceReport.id).padStart(4, "0")}`;

  return (
    <main className="min-h-screen bg-[#0B0D0F] text-white selection:bg-[#9E1B32] selection:text-white pb-16">
      {/* Barra superior de marca ALFA */}
      <header className="sticky top-0 z-40 border-b border-[#1F1F24] bg-[#0B0D0F]/90 backdrop-blur-md px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-1.5 rounded-full bg-[#9E1B32]" />
            <span className="font-mono text-xs font-black tracking-widest text-white">
              ALFA IT
            </span>
            <span className="hidden sm:inline text-xs text-[#77777D]">
              • Soluciones de Alta Gama
            </span>
          </div>
          <span className="rounded-full border border-[#2A2A30] bg-[#151518] px-3 py-1 text-[11px] font-mono text-[#B3B3B8]">
            {serviceNumber}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-8 space-y-6">
        {/* Banner de Estado de Firma y Cobro */}
        {signedSuccess ? (
          <div className="rounded-2xl border border-[#1F7A4D]/40 bg-[#12221A] p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#143D2A] text-[#8CE0B6]">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Servicio Firmado de Conformidad
                </h2>
                <p className="text-xs text-[#8CE0B6]">
                  Recepción confirmada el {formatDate(signedAtDate)} por {signerName}.
                </p>
              </div>
            </div>

            {/* Módulo de Cuentas Bancarias para Pago SPEI */}
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#F4C66A] flex items-center gap-1.5">
                  <CreditCard size={14} />
                  Información para Pago / Transferencia SPEI
                </span>
                <span className="text-xs font-bold text-white">
                  Total: {formatCurrency(financials.totalMxn)}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-[#8E8E93]">Banco Receptor:</span>
                  <p className="font-semibold text-white">{bankAccounts.bankName}</p>
                </div>
                <div>
                  <span className="text-[#8E8E93]">Beneficiario:</span>
                  <p className="font-semibold text-white">{bankAccounts.beneficiary}</p>
                </div>
                <div className="sm:col-span-2 rounded-lg border border-[#322514] bg-[#221A0F] p-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#F4C66A] uppercase font-semibold">CLABE Interbancaria:</span>
                    <p className="font-mono text-sm font-bold text-white tracking-wider">
                      {bankAccounts.clabe}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={copyClabeToClipboard}
                    className="inline-flex items-center gap-1 rounded-md bg-[#9E1B32] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#B91C3C] transition"
                  >
                    <Copy size={12} />
                    {copiedClabe ? "¡Copiada!" : "Copiar CLABE"}
                  </button>
                </div>
                <div>
                  <span className="text-[#8E8E93]">Concepto / Referencia:</span>
                  <p className="font-semibold text-[#8CE0B6]">{serviceNumber}</p>
                </div>
                <div>
                  <span className="text-[#8E8E93]">Comprobantes a:</span>
                  <p className="font-semibold text-white">direccion@alfait.com.mx</p>
                </div>
              </div>

              {serviceReport.payment_link_url && (
                <div className="pt-2">
                  <a
                    href={serviceReport.payment_link_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-xs font-bold text-black hover:bg-[#1EBE5D] transition"
                  >
                    <ExternalLink size={14} />
                    Pagar en Línea con Tarjeta de Crédito / Débito
                  </a>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#9E1B32]/40 bg-[#1A1013] p-4 text-xs text-[#FFD0D8] flex items-center gap-3">
            <Lock size={18} className="text-[#9E1B32] shrink-0" />
            <p>
              Portal seguro de recepción técnica. Por favor revisa los trabajos realizados, evidencias y costos antes de firmar de conformidad.
            </p>
          </div>
        )}

        {/* Encabezado del Servicio */}
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#2A2A30] pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#9E1B32]">
                Reporte de Servicio Técnico Oficial
              </span>
              <h1 className="text-2xl font-bold text-white sm:text-3xl mt-0.5">
                {serviceNumber}
              </h1>
            </div>
            <div className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-[#1C1D22] border border-[#2A2A30] px-3 py-1 text-xs text-[#B3B3B8]">
              <Calendar size={13} className="text-[#9E1B32]" />
              {formatDate(serviceReport.service_date)}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
            <div className="flex items-start gap-2.5">
              <Building2 size={16} className="text-[#77777D] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#77777D]">Cliente:</span>
                <p className="font-semibold text-white">{clientName}</p>
                {project?.name && (
                  <p className="text-[11px] text-[#B3B3B8]">Proyecto: {project.name}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin size={16} className="text-[#77777D] shrink-0 mt-0.5" />
              <div>
                <span className="text-[#77777D]">Ubicación del Servicio:</span>
                <p className="font-semibold text-white">
                  {serviceReport.service_location || project?.site_address || "En sitio del cliente"}
                </p>
                {serviceReport.google_maps_url && (
                  <a
                    href={serviceReport.google_maps_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-[#9E1B32] hover:underline mt-0.5"
                  >
                    Ver en Google Maps
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Diagnóstico y Solución Técnica */}
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6 space-y-4 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-[#2A2A30] pb-3">
            <Wrench size={18} className="text-[#9E1B32]" />
            Detalle de Trabajos y Diagnóstico Técnico
          </h3>

          {serviceReport.background && (
            <div>
              <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">
                Antecedentes / Reporte Inicial:
              </span>
              <p className="mt-1 rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-3.5 text-xs text-[#D1D1D6] leading-relaxed whitespace-pre-line">
                {serviceReport.background}
              </p>
            </div>
          )}

          {serviceReport.diagnosis && (
            <div>
              <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">
                Diagnóstico Técnico:
              </span>
              <p className="mt-1 rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-3.5 text-xs text-[#D1D1D6] leading-relaxed whitespace-pre-line">
                {serviceReport.diagnosis}
              </p>
            </div>
          )}

          {serviceReport.solution_description && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">
                  Solución y Trabajos Ejecutados:
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    serviceReport.solution_status === "solved"
                      ? "bg-[#143D2A] text-[#8CE0B6] border border-[#1F7A4D]"
                      : "bg-[#322514] text-[#F4C66A] border border-[#614620]"
                  }`}
                >
                  {serviceReport.solution_status === "solved" ? "Solucionado" : "En Proceso / Pendiente"}
                </span>
              </div>
              <p className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-3.5 text-xs text-[#D1D1D6] leading-relaxed whitespace-pre-line">
                {serviceReport.solution_description}
              </p>
            </div>
          )}

          {serviceReport.recommendations && (
            <div>
              <span className="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider">
                Recomendaciones de Mantenimiento / Preventivas:
              </span>
              <p className="mt-1 rounded-xl border border-[#322514] bg-[#221A0F] p-3.5 text-xs text-[#F4C66A] leading-relaxed whitespace-pre-line">
                {serviceReport.recommendations}
              </p>
            </div>
          )}
        </section>

        {/* Galería de Evidencias Fotográficas */}
        {photos.length > 0 && (
          <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-[#2A2A30] pb-3">
              <Camera size={18} className="text-[#9E1B32]" />
              Evidencias Fotográficas del Servicio ({photos.length})
            </h3>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {photos.map((photo, idx) => (
                <button
                  type="button"
                  key={photo.id}
                  className="group relative aspect-square w-full overflow-hidden rounded-xl border border-[#2A2A30] bg-black text-left focus:outline-none focus:ring-2 focus:ring-[#9E1B32]"
                  onClick={() => {
                    setActivePhotoUrl(photo.displayUrl);
                    setActivePhotoCaption(photo.caption || `Evidencia ${idx + 1}`);
                  }}
                >
                  <img
                    src={photo.displayUrl}
                    alt={photo.caption || `Evidencia ${idx + 1}`}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white gap-1.5 text-xs font-semibold">
                    <ZoomIn size={16} />
                    Ver foto
                  </div>
                  {photo.caption && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/75 px-2 py-1 text-[11px] text-white truncate">
                      {photo.caption}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Constancia del Técnico Responsable ALFA */}
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6 space-y-3 shadow-xl">
          <span className="text-xs font-semibold tracking-wider text-[#9E1B32] uppercase">
            Atención Técnica por ALFA IT
          </span>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1C1D22] text-[#9E1B32] border border-[#2A2A30]">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {serviceReport.performed_by_name || "Ingeniería y Soporte Técnico ALFA IT"}
              </p>
              <p className="text-xs text-[#77777D]">
                Técnico Certificado • ALFA IT Soluciones
              </p>
            </div>
          </div>
        </section>

        {/* Resumen Financiero y Desglose de Cobro */}
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6 space-y-4 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-[#2A2A30] pb-3">
            <CreditCard size={18} className="text-[#9E1B32]" />
            Desglose de Cobro por Servicio Técnico
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-[#B3B3B8]">
              <span>Mano de Obra y Revisión Técnica:</span>
              <span className="font-semibold text-white">{formatCurrency(financials.laborMxn)}</span>
            </div>
            {financials.partsMxn > 0 && (
              <div className="flex justify-between text-[#B3B3B8]">
                <span>Refacciones y Materiales Suministrados:</span>
                <span className="font-semibold text-white">{formatCurrency(financials.partsMxn)}</span>
              </div>
            )}
            {financials.discountMxn > 0 && (
              <div className="flex justify-between text-[#8CE0B6]">
                <span>Descuento Aplicado:</span>
                <span>-{formatCurrency(financials.discountMxn)}</span>
              </div>
            )}
            <div className="border-t border-[#2A2A30] pt-2 flex justify-between text-sm font-bold text-white">
              <span>Total a Liquidar:</span>
              <span className="text-base text-[#F4C66A]">{formatCurrency(financials.totalMxn)} <span className="text-[10px] text-[#77777D] font-normal">(+ IVA si aplica)</span></span>
            </div>
          </div>
        </section>

        {/* Sección de Firma Digital */}
        {signedSuccess ? (
          <section className="rounded-2xl border border-[#1F7A4D]/40 bg-[#12221A] p-5 sm:p-6 text-center space-y-4 shadow-xl">
            <ShieldCheck size={32} className="text-[#8CE0B6] mx-auto" />
            <h3 className="text-lg font-bold text-white">
              Constancia de Recepción Registrada
            </h3>
            <p className="text-xs text-[#8CE0B6] max-w-lg mx-auto leading-relaxed">
              El reporte de servicio técnico y la firma digital han sido debidamente almacenados con sello de trazabilidad.
            </p>
          </section>
        ) : (
          <form
            onSubmit={handleSignSubmit}
            className="rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 sm:p-6 space-y-6 shadow-2xl"
          >
            <div className="border-b border-[#2A2A30] pb-3">
              <h3 className="text-lg font-bold text-white">
                Firma Digital de Conformidad
              </h3>
              <p className="text-xs text-[#B3B3B8]">
                Para concluir el servicio y recibir su comprobante, complete sus datos y trace su firma en el recuadro.
              </p>
            </div>

            {submitError && (
              <div className="rounded-xl border border-[#6A2A2A] bg-[#351818] p-3 text-xs text-[#FFB4B4] flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Paso 1: Foto de INE (Opcional) */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white">1. Identificación Oficial (INE / IFE)</h4>
              <p className="text-xs text-[#77777D]">
                Adjunte una foto clara de su identificación oficial para constancia de recepción.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* INE Frontal */}
                <div className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-3.5 space-y-2 text-center">
                  <span className="text-xs font-semibold text-white">Frente de Identificación</span>
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
                    <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[#2A2A30] bg-[#151518] p-3 text-[#B3B3B8] transition hover:border-[#9E1B32] hover:text-white">
                      <Camera size={20} className="text-[#9E1B32]" />
                      <span className="text-xs font-semibold">
                        {processingIne === "front" ? "Procesando..." : "Tomar foto frontal"}
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
                    <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[#2A2A30] bg-[#151518] p-3 text-[#B3B3B8] transition hover:border-[#9E1B32] hover:text-white">
                      <Camera size={20} className="text-[#77777D]" />
                      <span className="text-xs font-semibold">
                        {processingIne === "back" ? "Procesando..." : "Tomar foto reverso"}
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

            {/* Paso 2: Datos de Contacto y Cobranza */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white">2. Datos de quien recibe y autoriza</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-xs text-[#B3B3B8]">Nombre completo *</span>
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
                  <span className="text-xs text-[#B3B3B8]">Correo electrónico *</span>
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
                  <span className="text-xs text-[#B3B3B8]">Teléfono / WhatsApp *</span>
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
              <div className="relative touch-none rounded-xl border-2 border-dashed border-[#2A2A30] bg-[#1C1D22] overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="h-44 w-full cursor-crosshair block"
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerLeave={stopDrawing}
                />
                {!hasDrawn && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-[#77777D]">
                    Dibuja tu firma aquí con el dedo o mouse
                  </div>
                )}
              </div>
            </div>

            {/* Paso 4: Consentimiento LFPDPPP */}
            <div className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-3.5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={privacyConsentAccepted}
                  onChange={(e) => setPrivacyConsentAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#2A2A30] text-[#9E1B32] focus:ring-[#9E1B32]"
                />
                <span className="text-[11px] text-[#B3B3B8] leading-relaxed">
                  Doy mi conformidad por los servicios y diagnósticos técnicos realizados. Acepto el tratamiento de mis datos personales y firma digital para fines de recepción técnica y cobranza conforme a la Ley Federal de Protección de Datos Personales (LFPDPPP).
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#9E1B32] py-3.5 text-sm font-bold text-white transition hover:bg-[#B91C3C] disabled:bg-[#2A2A30] disabled:text-[#77777D] shadow-xl"
            >
              <ShieldCheck size={18} />
              {submitting ? "Registrando firma..." : "Confirmar y Firmar Servicio"}
            </button>
          </form>
        )}
      </div>

      {/* Lightbox de fotos */}
      {activePhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={() => setActivePhotoUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#151518]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActivePhotoUrl(null)}
              className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
            >
              <X size={18} />
            </button>
            <img
              src={activePhotoUrl}
              alt={activePhotoCaption || "Evidencia"}
              className="max-h-[75vh] w-auto object-contain mx-auto"
            />
            {activePhotoCaption && (
              <div className="p-3 text-center text-xs text-white bg-[#1C1D22]">
                {activePhotoCaption}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
