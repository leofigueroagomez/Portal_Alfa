"use client";

import type React from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  Eraser,
  ExternalLink,
  FileCheck2,
  FileText,
  Lock,
  MapPin,
  RotateCcw,
  Shield,
  ShieldCheck,
  User,
} from "lucide-react";
import { submitClientContractSignatureAction } from "./actions";
import type { PaymentMilestone } from "@/lib/contracts";

type Props = {
  token: string;
  contract: any;
  quoteItems: Array<{
    id: number;
    title?: string | null;
    description: string | null;
    brand: string | null;
    model: string | null;
    quantity: number;
    unit_price: number;
    subtotal: number;
    area?: string | null;
  }>;
};

export default function ClientContractSignCanvas({ token, contract, quoteItems }: Props) {
  const isAlreadySigned = Boolean(contract.client_signed_at);
  const [isSignedState, setIsSignedState] = useState(isAlreadySigned);
  const [signerName, setSignerName] = useState(
    contract.client_signer_name || contract.representative_name || contract.legal_business_name || ""
  );
  const [hasConsent, setHasConsent] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const quoteNumber = contract.quotes?.quote_number || "COT-0000";
  const projectName = contract.client_projects?.name || "Proyecto ALFA IT";
  const siteAddress = contract.client_projects?.site_address || contract.legal_fiscal_address || "Instalaciones del cliente";
  const totalAmountMxn = Number(contract.total_amount_mxn) || 0;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: contract.currency || "MXN" }).format(val);

  useEffect(() => {
    // Intentar capturar coordenadas
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { timeout: 5000 }
      );
    }
  }, []);

  // Inicializar canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set resolution
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2.5;
  }, [isSignedState]);

  function getCanvasPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (isSignedState) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing || isSignedState) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDraw() {
    setIsDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  function handleSubmitSignature() {
    if (!signerName.trim()) {
      setErrorMessage("Por favor ingresa el nombre completo del firmante.");
      return;
    }
    if (!hasDrawn) {
      setErrorMessage("Por favor dibuja tu firma en el recuadro.");
      return;
    }
    if (!hasConsent) {
      setErrorMessage("Debes aceptar la declaración de conformidad y validez legal.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureDataUrl = canvas.toDataURL("image/png");

    setErrorMessage(null);
    startTransition(async () => {
      const res = await submitClientContractSignatureAction(token, {
        signerName,
        signatureDataUrl,
        latitude: coords?.lat,
        longitude: coords?.lng,
      });

      if (res.ok) {
        setIsSignedState(true);
      } else {
        setErrorMessage(res.error || "No se pudo guardar la firma.");
      }
    });
  }

  return (
    <main className="min-h-screen bg-[#0B0D0F] py-8 px-4 text-white">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-[#2A2A30] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#9E1B32] text-white font-bold">
              A
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9E1B32]">
                ALFA IT SOLUCIONES
              </p>
              <h1 className="text-base font-bold text-white">Firma de Contrato de Proyecto</h1>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-[#8E8E93] bg-[#151518] px-2.5 py-1 rounded-lg border border-[#2A2A30]">
            {contract.contract_number}
          </span>
        </div>

        {/* Resumen del Contrato */}
        <div className="rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#2A2A30] pb-3">
            <div>
              <span className="text-xs font-semibold text-[#9E1B32] uppercase">
                {contract.client_type === "b2b" ? "Contrato B2B (Persona Moral)" : "Contrato B2C (Persona Física)"}
              </span>
              <h2 className="text-lg font-bold text-white">{projectName}</h2>
              <p className="text-xs text-[#8E8E93]">Cliente: {contract.legal_business_name || "Cliente"}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-[#8E8E93]">Monto Total:</span>
              <p className="text-xl font-bold text-[#9E1B32]">{formatCurrency(totalAmountMxn)}</p>
              <span className="text-[10px] text-[#8E8E93]">IVA 16% Incluido</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border border-white/5 bg-black/20 p-3">
              <span className="text-[#8E8E93]">Sitio de Obra:</span>
              <p className="font-semibold text-white mt-1 truncate">{siteAddress}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/20 p-3">
              <span className="text-[#8E8E93]">Plazo Estimado:</span>
              <p className="font-semibold text-white mt-1">{contract.estimated_weeks} semanas</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-black/20 p-3">
              <span className="text-[#8E8E93]">Garantía Mano de Obra:</span>
              <p className="font-semibold text-[#8CE0B6] mt-1">{contract.warranty_labor_months} meses</p>
            </div>
          </div>
        </div>

        {/* Hitos de Pago */}
        <div className="rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 space-y-3 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText size={16} className="text-[#9E1B32]" />
            Hitos y Condiciones de Pago
          </h3>
          <div className="space-y-2 text-xs">
            {contract.payment_milestones?.map((m: PaymentMilestone, idx: number) => {
              const amount = (totalAmountMxn * m.percentage) / 100;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl border border-[#2A2A30] bg-[#1C1D22]"
                >
                  <div>
                    <span className="font-bold text-[#9E1B32] mr-2">{m.percentage}%</span>
                    <span className="text-white font-medium">{m.concept}</span>
                  </div>
                  <span className="font-bold text-white">{formatCurrency(amount)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Partidas y Alcance (Resumen) */}
        {quoteItems.length > 0 && (
          <div className="rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileCheck2 size={16} className="text-[#9E1B32]" />
                Anexo A: Entregables y Equipamiento ({quoteItems.length} partidas)
              </h3>
              <a
                href={`/api/public/contracts/${token}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#9E1B32] hover:text-[#B91C3C] font-semibold"
              >
                <Download size={13} />
                Descargar Contrato Completo en PDF
              </a>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs pr-1">
              {quoteItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[#222228]/50 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#9E1B32]">{item.quantity}x</span>
                    <span className="text-[#B3B3B8]">{item.brand} {item.model}</span>
                    <span className="text-white truncate max-w-xs">{item.title || item.description}</span>
                  </div>
                  <span className="font-medium text-white">{formatCurrency(item.subtotal || item.quantity * item.unit_price)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sección de Firma Digital */}
        <div className="rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 sm:p-6 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#2A2A30] pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#9E1B32]" />
              Firma Digital de Conformidad
            </h3>
            {isSignedState ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#143D2A] px-3 py-1 text-xs font-bold text-[#8CE0B6]">
                <CheckCircle2 size={13} />
                Contrato Firmado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#322514] px-3 py-1 text-xs font-bold text-[#F4C66A]">
                Pendiente de Firma
              </span>
            )}
          </div>

          {isSignedState ? (
            <div className="space-y-4 text-center py-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#143D2A] text-[#8CE0B6]">
                <CheckCircle2 size={28} />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-white">Contrato Formalizado Exitosamente</h4>
                <p className="text-xs text-[#8E8E93]">
                  Firmado digitalmente por <strong>{contract.client_signer_name || signerName}</strong> con fecha {new Date().toLocaleDateString("es-MX")}.
                </p>
              </div>

              {contract.client_signature_image_url && (
                <div className="mx-auto max-w-xs bg-black/40 p-3 rounded-xl border border-white/10">
                  <img
                    src={contract.client_signature_image_url}
                    alt="Firma Digital"
                    className="h-20 object-contain mx-auto"
                  />
                </div>
              )}

              <div className="pt-2">
                <a
                  href={`/api/public/contracts/${token}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#9E1B32] px-6 py-3 text-xs font-bold text-white hover:bg-[#B91C3C] transition shadow-lg"
                >
                  <Download size={15} />
                  Descargar Contrato Oficial Firmado (PDF)
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block space-y-1 text-xs">
                <span className="text-[#B3B3B8] font-semibold">Nombre Completo del Firmante:</span>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Ej. Lic. Fernando Sánchez Ruiz"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-sm font-semibold text-white outline-none focus:border-[#9E1B32]"
                  required
                />
              </label>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#B3B3B8] font-semibold">Dibuja tu firma en el recuadro:</span>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-[#9E1B32] hover:text-[#B91C3C] text-[11px] flex items-center gap-1 font-semibold"
                  >
                    <Eraser size={12} />
                    Limpiar
                  </button>
                </div>

                <div className="rounded-xl border-2 border-dashed border-[#2A2A30] bg-[#111215] overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                    className="w-full h-40 cursor-crosshair touch-none"
                  />
                </div>
              </div>

              {/* Consentimiento Legal */}
              <label className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/20 p-3.5 text-xs text-[#B3B3B8] cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasConsent}
                  onChange={(e) => setHasConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded accent-[#9E1B32]"
                />
                <span className="leading-relaxed">
                  Manifiesto que he leído y acepto el Contrato Marco, las condiciones de la cotización {quoteNumber} y los hitos de pago, reconociendo la plena validez de esta firma electrónica conforme al Código de Comercio y la NOM-151.
                </span>
              </label>

              {errorMessage && (
                <div className="rounded-xl border border-[#6A2A2A] bg-[#351818] p-3 text-xs text-[#FFB4B4]">
                  {errorMessage}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmitSignature}
                disabled={isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#9E1B32] py-4 text-sm font-bold text-white transition hover:bg-[#B91C3C] disabled:opacity-50 shadow-xl"
              >
                <FileCheck2 size={16} />
                {isPending ? "Registrando firma digital..." : "Firmar Contrato Oficialmente"}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
