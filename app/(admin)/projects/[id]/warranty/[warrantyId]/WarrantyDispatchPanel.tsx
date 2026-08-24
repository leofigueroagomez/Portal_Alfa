"use client";

import type React from "react";
import { useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Mail,
  Send,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { sendProjectWarrantyEmailAction } from "./actions";

type Props = {
  projectId: number;
  warrantyId: number;
  clientName: string;
  projectName: string;
  defaultEmail: string;
  defaultPhone: string;
  directPdfUrl: string;
  waUrl: string;
  waText: string;
  financialSummary: {
    approvedTotalMxn: number;
    paidTotalMxn: number;
    pendingTotalMxn: number;
  };
  isIssued: boolean;
};

export default function WarrantyDispatchPanel({
  projectId,
  warrantyId,
  clientName,
  projectName,
  defaultEmail,
  defaultPhone,
  directPdfUrl,
  waUrl,
  waText,
  financialSummary,
  isIssued,
}: Props) {
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState(defaultPhone);
  const [customMsg, setCustomMsg] = useState("");
  const [copiedWa, setCopiedWa] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isPendingDebt = financialSummary.pendingTotalMxn > 1;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val);

  function copyWaText() {
    navigator.clipboard.writeText(waText);
    setCopiedWa(true);
    setTimeout(() => setCopiedWa(false), 2500);
  }

  function handleSendEmail() {
    if (!email.trim() || !email.includes("@")) {
      alert("Por favor ingresa un correo electrónico válido.");
      return;
    }

    setEmailStatus("sending");
    setEmailError(null);

    startTransition(async () => {
      const res = await sendProjectWarrantyEmailAction({
        projectId,
        warrantyId,
        recipientEmail: email.trim(),
        customMessage: customMsg.trim() || undefined,
      });

      if (res.ok) {
        setEmailStatus("sent");
      } else {
        setEmailStatus("error");
        setEmailError(res.error || "Error al enviar el correo.");
      }
    });
  }

  return (
    <section className="space-y-6">
      {/* 1. Semáforo de Estado de Cuenta Financiero */}
      <div
        className={`rounded-2xl border p-5 sm:p-6 shadow-xl ${
          isPendingDebt
            ? "border-[#614620] bg-[#22180C]"
            : "border-[#1F7A4D]/40 bg-[#12221A]"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            {isPendingDebt ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#322514] text-[#F4C66A]">
                <AlertTriangle size={22} />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#143D2A] text-[#8CE0B6]">
                <ShieldCheck size={22} />
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#9E1B32]">
                Revisión de Estado de Cuenta
              </p>
              <h3 className="text-lg font-bold text-white">
                {isPendingDebt
                  ? "Atención: Proyecto con Saldo Pendiente de Cobro"
                  : "Estado Financiero al Corriente (Garantía Autorizada)"}
              </h3>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold self-start sm:self-auto ${
              isPendingDebt
                ? "border-[#614620] bg-[#322514] text-[#F4C66A]"
                : "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]"
            }`}
          >
            {isPendingDebt ? "Cobro Pendiente" : "100% Liquidado"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <span className="text-[#8E8E93]">Total Aprobado / Cotizado</span>
            <p className="mt-1 text-base font-bold text-white">
              {formatCurrency(financialSummary.approvedTotalMxn)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <span className="text-[#8E8E93]">Total Cobrado / Pagado</span>
            <p className="mt-1 text-base font-bold text-[#8CE0B6]">
              {formatCurrency(financialSummary.paidTotalMxn)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <span className="text-[#8E8E93]">Saldo Pendiente</span>
            <p
              className={`mt-1 text-base font-bold ${
                isPendingDebt ? "text-[#FFB4B4]" : "text-[#8CE0B6]"
              }`}
            >
              {formatCurrency(financialSummary.pendingTotalMxn)}
            </p>
          </div>
        </div>

        {isPendingDebt && (
          <p className="mt-3 text-xs text-[#F4C66A] flex items-center gap-1.5">
            <ShieldAlert size={14} className="shrink-0" />
            Por política comercial, verifique el cobro de facturas pendientes con Dirección antes de remitir la carta de garantía al cliente.
          </p>
        )}
      </div>

      {/* 2. Despacho Multicanal: PDF, WhatsApp y Correo */}
      <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#2A2A30] pb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Despacho Oficial de Carta de Garantía</h3>
            <p className="text-xs text-[#B3B3B8]">
              Remite la póliza oficial en PDF con 1 año de cobertura y cláusula semestral.
            </p>
          </div>
          <a
            href={directPdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#B91C3C] shadow-lg self-start sm:self-auto"
          >
            <Download size={15} />
            Descargar PDF Oficial
          </a>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Opción A: Despacho por Correo Electrónico con PDF Adjunto */}
          <div className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Mail size={18} className="text-[#9E1B32]" />
              <h4 className="text-sm font-bold text-white">Enviar por Correo (PDF Adjunto)</h4>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block space-y-1">
                <span className="text-[#B3B3B8]">Destinatario (Correo del cliente):</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@ejemplo.com"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-2 text-white outline-none focus:border-[#9E1B32]"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[#B3B3B8]">Mensaje personalizado adicional (opcional):</span>
                <textarea
                  rows={2}
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  placeholder="Comentarios adicionales para el cliente..."
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-2 text-white outline-none focus:border-[#9E1B32]"
                />
              </label>

              {emailError && (
                <p className="rounded-lg border border-[#6A2A2A] bg-[#351818] p-2 text-[#FFB4B4]">
                  {emailError}
                </p>
              )}

              {emailStatus === "sent" && (
                <p className="rounded-lg border border-[#1F7A4D] bg-[#143D2A] p-2 text-[#8CE0B6] flex items-center gap-1.5">
                  <CheckCircle2 size={14} />
                  ¡Correo enviado con éxito con la Carta de Garantía en PDF adjunta!
                </p>
              )}

              <button
                type="button"
                onClick={handleSendEmail}
                disabled={isPending || emailStatus === "sending"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#9E1B32] py-3 text-xs font-bold text-white transition hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
              >
                <Send size={14} />
                {emailStatus === "sending" ? "Generando y enviando PDF..." : "Enviar Correo con PDF Adjunto"}
              </button>
            </div>
          </div>

          {/* Opción B: Despacho por WhatsApp */}
          <div className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Smartphone size={18} className="text-[#25D366]" />
              <h4 className="text-sm font-bold text-white">Enviar por WhatsApp</h4>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block space-y-1">
                <span className="text-[#B3B3B8]">Teléfono WhatsApp del cliente:</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="5512345678"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-2 text-white outline-none focus:border-[#25D366]"
                />
              </label>

              <div className="rounded-xl border border-[#2A2A30] bg-[#151518] p-3 text-[11px] text-[#B3B3B8] font-mono leading-relaxed max-h-24 overflow-y-auto whitespace-pre-wrap">
                {waText}
              </div>

              <div className="flex gap-2">
                <a
                  href={
                    phone.trim()
                      ? `https://wa.me/${phone.replace(/[^\d+]/g, "").replace(/^\+/, "")}?text=${encodeURIComponent(waText)}`
                      : waUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-xs font-bold text-black transition hover:bg-[#1EBE5D]"
                >
                  <ExternalLink size={14} />
                  Abrir WhatsApp
                </a>
                <button
                  type="button"
                  onClick={copyWaText}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-xs font-semibold text-white hover:border-[#25D366]"
                >
                  <Copy size={14} />
                  {copiedWa ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
