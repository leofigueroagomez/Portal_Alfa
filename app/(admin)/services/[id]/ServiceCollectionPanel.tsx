"use client";

import type React from "react";
import { useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Mail,
  Send,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { markServiceAsPaidAction, sendServicePaymentReminderEmailAction } from "./actions";

type Props = {
  serviceId: number;
  serviceNumber: string;
  clientName: string;
  totalMxn: number;
  paymentStatus: string;
  paidAt: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  isSigned: boolean;
  signerName: string | null;
  signedAt: string | null;
  recipientEmail: string;
  recipientPhone: string;
  publicUrl: string;
  waSignUrl: string;
  waSignText: string;
  waCollectUrl: string;
  waCollectText: string;
  remindersCount: number;
  lastReminderSentAt: string | null;
};

export default function ServiceCollectionPanel({
  serviceId,
  serviceNumber,
  clientName,
  totalMxn,
  paymentStatus,
  paidAt,
  paymentMethod,
  paymentReference,
  isSigned,
  signerName,
  signedAt,
  recipientEmail,
  recipientPhone,
  publicUrl,
  waSignUrl,
  waSignText,
  waCollectUrl,
  waCollectText,
  remindersCount,
  lastReminderSentAt,
}: Props) {
  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState("transfer");
  const [payRef, setPayRef] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [customMsg, setCustomMsg] = useState("");

  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const isPaid = paymentStatus === "paid";
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(val);

  function copyPublicLink() {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }

  function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await markServiceAsPaidAction(serviceId, {
        paymentMethod: payMethod,
        paymentReference: payRef,
      });
      if (res.ok) {
        setShowPayModal(false);
      } else {
        alert(res.error || "No se pudo registrar el pago.");
      }
    });
  }

  function handleSendEmailReminder() {
    setEmailStatus("sending");
    setEmailMsg(null);

    startTransition(async () => {
      const res = await sendServicePaymentReminderEmailAction(serviceId, customMsg || undefined);
      if (res.ok) {
        setEmailStatus("sent");
        setEmailMsg(res.message || "Recordatorio enviado con éxito.");
      } else {
        setEmailStatus("error");
        setEmailMsg(res.error || "Error al enviar recordatorio.");
      }
    });
  }

  return (
    <section className="space-y-6">
      {/* 1. Semáforo de Estado de Pago y Recepción */}
      <div
        className={`rounded-2xl border p-5 sm:p-6 shadow-xl ${
          isPaid
            ? "border-[#1F7A4D]/40 bg-[#12221A]"
            : isSigned
              ? "border-[#614620] bg-[#22180C]"
              : "border-[#2A2A30] bg-[#151518]"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            {isPaid ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#143D2A] text-[#8CE0B6]">
                <CheckCircle2 size={22} />
              </div>
            ) : isSigned ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#322514] text-[#F4C66A]">
                <AlertTriangle size={22} />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1C1D22] text-[#B3B3B8]">
                <Clock size={22} />
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#9E1B32]">
                Control de Cobranza y Recepción
              </p>
              <h3 className="text-lg font-bold text-white">
                {isPaid
                  ? "Servicio 100% Pagado y Liquidado"
                  : isSigned
                    ? "Servicio Firmado: Pendiente de Cobro"
                    : "Servicio Pendiente de Revisión y Firma"}
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                isPaid
                  ? "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]"
                  : isSigned
                    ? "border-[#614620] bg-[#322514] text-[#F4C66A]"
                    : "border-[#2A2A30] bg-[#1C1D22] text-[#B3B3B8]"
              }`}
            >
              {isPaid ? "Liquidado" : isSigned ? "Pendiente de Pago" : "Sin Firma"}
            </span>

            {!isPaid && (
              <button
                type="button"
                onClick={() => setShowPayModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1F7A4D] px-4 py-2 text-xs font-bold text-white hover:bg-[#289B63] transition shadow-lg"
              >
                <CreditCard size={14} />
                Reportar Pago Recibido
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4 text-xs">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <span className="text-[#8E8E93]">Monto del Servicio</span>
            <p className="mt-1 text-base font-bold text-white">
              {formatCurrency(totalMxn)} <span className="text-[10px] text-[#77777D]">(+ IVA)</span>
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <span className="text-[#8E8E93]">Estado de Firma</span>
            <p className="mt-1 text-xs font-bold text-white">
              {isSigned ? `Firmado por ${signerName || "Cliente"}` : "Pendiente de firma"}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <span className="text-[#8E8E93]">Recordatorios de Cobro</span>
            <p className="mt-1 text-xs font-bold text-[#F4C66A]">
              {remindersCount > 0 ? `${remindersCount} enviados` : "Ninguno enviado"}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <span className="text-[#8E8E93]">Último Registro</span>
            <p className="mt-1 text-xs font-bold text-white truncate">
              {isPaid && paidAt
                ? `Pagado: ${new Date(paidAt).toLocaleDateString("es-MX")}`
                : isSigned && signedAt
                  ? `Firmado: ${new Date(signedAt).toLocaleDateString("es-MX")}`
                  : "En curso"}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Acciones de Despacho por WhatsApp y Recordatorios de Cobranza */}
      <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#2A2A30] pb-4">
          <div>
            <h3 className="text-xl font-bold text-white">Despacho y Seguimiento Multicanal</h3>
            <p className="text-xs text-[#B3B3B8]">
              {isSigned
                ? "Envía recordatorios de pago con las cuentas bancarias de ALFA IT y el PDF oficial adjunto."
                : "Envía el enlace al cliente para que revise el diagnóstico, fotos y firme desde su celular."}
            </p>
          </div>
          <a
            href={`/api/services/${serviceId}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#B91C3C] shadow-lg self-start sm:self-auto"
          >
            <Download size={15} />
            Descargar PDF Oficial
          </a>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Opción A: WhatsApp (Firma o Cobranza) */}
          <div className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Smartphone size={18} className="text-[#25D366]" />
              <h4 className="text-sm font-bold text-white">
                {isSigned ? "Recordatorio por WhatsApp" : "Enviar a Firma por WhatsApp"}
              </h4>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-[#B3B3B8]">
                <span>Destinatario:</span>
                <span className="font-semibold text-white">{recipientPhone || "Sin teléfono"}</span>
              </div>

              <div className="rounded-xl border border-[#2A2A30] bg-[#151518] p-3 text-[11px] text-[#B3B3B8] font-mono leading-relaxed max-h-28 overflow-y-auto whitespace-pre-wrap">
                {isSigned ? waCollectText : waSignText}
              </div>

              <div className="flex gap-2">
                <a
                  href={isSigned ? waCollectUrl : waSignUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-xs font-bold text-black transition hover:bg-[#1EBE5D]"
                >
                  <ExternalLink size={14} />
                  Abrir WhatsApp
                </a>
                <button
                  type="button"
                  onClick={copyPublicLink}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-xs font-semibold text-white hover:border-[#25D366]"
                >
                  <Copy size={14} />
                  {copiedLink ? "¡Copiado!" : "Copiar Enlace"}
                </button>
              </div>
            </div>
          </div>

          {/* Opción B: Correo Electrónico con Cuentas Bancarias y PDF Adjunto */}
          <div className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Mail size={18} className="text-[#9E1B32]" />
              <h4 className="text-sm font-bold text-white">Recordatorio por Correo (PDF Adjunto)</h4>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-[#B3B3B8]">
                <span>Destinatario:</span>
                <span className="font-semibold text-white">{recipientEmail || "Sin correo"}</span>
              </div>

              <label className="block space-y-1">
                <span className="text-[#B3B3B8]">Nota personalizada adicional:</span>
                <textarea
                  rows={2}
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  placeholder="Mensaje de seguimiento adicional..."
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-2 text-white outline-none focus:border-[#9E1B32]"
                />
              </label>

              {emailMsg && (
                <p
                  className={`rounded-lg p-2 ${
                    emailStatus === "sent"
                      ? "border border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]"
                      : "border border-[#6A2A2A] bg-[#351818] text-[#FFB4B4]"
                  }`}
                >
                  {emailMsg}
                </p>
              )}

              <button
                type="button"
                onClick={handleSendEmailReminder}
                disabled={isPending || emailStatus === "sending"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#9E1B32] py-3 text-xs font-bold text-white transition hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
              >
                <Send size={14} />
                {emailStatus === "sending" ? "Enviando recordatorio y PDF..." : "Enviar Recordatorio con PDF Adjunto"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para Reportar Pago Recibido */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#2A2A30] bg-[#151518] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2A2A30] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard size={18} className="text-[#1F7A4D]" />
                Registrar Pago de Servicio
              </h3>
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="text-[#77777D] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <p className="text-[#B3B3B8]">
                Al registrar el pago de <strong>{formatCurrency(totalMxn)}</strong> para el servicio <strong>{serviceNumber}</strong>, se detendrán los recordatorios automáticos de cobranza.
              </p>

              <label className="block space-y-1">
                <span className="text-[#B3B3B8]">Método de Pago:</span>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-2.5 text-white outline-none focus:border-[#1F7A4D]"
                >
                  <option value="transfer">Transferencia Electrónica (SPEI)</option>
                  <option value="card">Tarjeta de Crédito / Débito</option>
                  <option value="cash">Efectivo en Sitio</option>
                  <option value="link">Link de Pago / Pasarela</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-[#B3B3B8]">Referencia / Folio Bancario (opcional):</span>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="Ej. Rastreoxxx / Autorización 123456"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-2.5 text-white outline-none focus:border-[#1F7A4D]"
                />
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 rounded-xl border border-[#2A2A30] bg-[#222228] py-2.5 font-semibold text-white hover:bg-[#2A2A30]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-[#1F7A4D] py-2.5 font-bold text-white hover:bg-[#289B63] disabled:opacity-50"
                >
                  {isPending ? "Registrando..." : "Confirmar Pago"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
