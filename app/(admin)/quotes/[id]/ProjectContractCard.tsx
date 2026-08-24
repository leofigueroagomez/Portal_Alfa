"use client";

import type React from "react";
import { useState, useTransition } from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Edit,
  ExternalLink,
  FileCheck2,
  FileSignature,
  FileText,
  Send,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  User,
} from "lucide-react";
import {
  createOrGetProjectContractAction,
  getContractDispatchContext,
  signContractAsAlfaAction,
  sendContractReminderAction,
} from "@/app/(admin)/projects/[id]/contract/actions";

type Props = {
  quoteId: number;
  initialContract: any | null;
  quoteStatus: string | null;
};

export default function ProjectContractCard({
  quoteId,
  initialContract,
  quoteStatus,
}: Props) {
  const [contract, setContract] = useState<any | null>(initialContract);
  const [copiedLink, setCopiedLink] = useState(false);
  const [dispatchContext, setDispatchContext] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();

  const isApproved = quoteStatus === "approved";
  const isSigned = Boolean(contract?.client_signed_at);
  const isPendingClientData = contract?.status === "pending_client_data";
  const isPendingSignature = contract?.status === "pending_signatures" || (contract && !isSigned);

  function handleCreateContract() {
    startTransition(async () => {
      const res = await createOrGetProjectContractAction(quoteId);
      if (res.ok && res.contractId) {
        const ctx = await getContractDispatchContext(res.contractId);
        setContract(ctx.contract);
        setDispatchContext(ctx);
      } else {
        alert(res.error || "No se pudo generar el contrato.");
      }
    });
  }

  async function loadDispatchContext() {
    if (!contract?.id) return;
    startTransition(async () => {
      const ctx = await getContractDispatchContext(contract.id);
      setDispatchContext(ctx);
    });
  }

  function handleCopy(url: string) {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  }

  const [reminderMsg, setReminderMsg] = useState<string | null>(null);

  function handleSendReminder() {
    if (!contract?.id) return;
    setReminderMsg(null);
    startTransition(async () => {
      const res = await sendContractReminderAction(contract.id);
      if (res.ok) {
        setReminderMsg(res.message || "Recordatorio enviado con éxito.");
      } else {
        alert(res.error || "No se pudo enviar el recordatorio.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 sm:p-6 space-y-4 shadow-xl mb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#2A2A30] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#9E1B32]/20 text-[#9E1B32]">
            <FileSignature size={24} />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E1B32]">
              Formalización Legal de Proyecto
            </span>
            <h3 className="text-lg font-bold text-white">
              {contract
                ? `Contrato de Servicios ${contract.contract_number}`
                : "Contrato Marco de Integración Tecnológica"}
            </h3>
          </div>
        </div>

        <div>
          {contract ? (
            <div className="flex flex-wrap items-center gap-2">
              {!isSigned && (
                <button
                  type="button"
                  onClick={handleSendReminder}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#9E1B32] bg-[#9E1B32]/10 px-3.5 py-2 text-xs font-bold text-white hover:bg-[#9E1B32] transition disabled:opacity-50"
                >
                  <Send size={13} />
                  {isPending ? "Enviando..." : "Disparar Recordatorio Diario"}
                </button>
              )}
              <a
                href={`/api/contracts/${contract.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#9E1B32] px-4 py-2 text-xs font-bold text-white hover:bg-[#B91C3C] transition shadow-lg"
              >
                <Download size={14} />
                Descargar Contrato PDF
              </a>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCreateContract}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#B91C3C] transition shadow-lg disabled:opacity-50"
            >
              <FileCheck2 size={16} />
              {isPending ? "Generando contrato..." : "Generar Contrato Digital"}
            </button>
          )}
        </div>
      </div>

      {reminderMsg && (
        <div className="rounded-xl border border-[#1F7A4D] bg-[#143D2A] p-3 text-xs text-[#8CE0B6] flex items-center justify-between">
          <span>{reminderMsg}</span>
          <button type="button" onClick={() => setReminderMsg(null)} className="text-white hover:opacity-75">✕</button>
        </div>
      )}

      {/* Si no hay contrato aún */}
      {!contract && (
        <div className="rounded-xl border border-dashed border-[#2A2A30] bg-[#1C1D22] p-4 text-xs text-[#B3B3B8] space-y-2">
          <p>
            Al generar el contrato, ALFA OS tomará automáticamente todas las partidas cotizadas, montos con IVA, hitos de pago (60/30/10) y datos del cliente, creando el enlace de <strong>Onboarding</strong> y <strong>Firma Digital</strong> para enviar al cliente por WhatsApp.
          </p>
        </div>
      )}

      {/* Si ya existe el contrato */}
      {contract && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-white/5 bg-black/20 p-3">
              <span className="text-[#8E8E93]">Estado del Contrato:</span>
              <p className="mt-1 font-bold text-white">
                {isSigned ? (
                  <span className="text-[#8CE0B6] flex items-center gap-1">
                    <CheckCircle2 size={13} /> 100% Firmado por el Cliente
                  </span>
                ) : isPendingClientData ? (
                  <span className="text-[#F4C66A] flex items-center gap-1">
                    <Clock size={13} /> Esperando Datos del Cliente
                  </span>
                ) : (
                  <span className="text-[#8AB4F8] flex items-center gap-1">
                    <FileSignature size={13} /> Listo para Firma Digital
                  </span>
                )}
              </p>
            </div>

            <div className="rounded-xl border border-white/5 bg-black/20 p-3">
              <span className="text-[#8E8E93]">Tipo de Relación:</span>
              <p className="mt-1 font-bold text-white">
                {contract.client_type === "b2b" ? "Empresarial (B2B - Moral)" : "Consumidor (B2C - Física)"}
              </p>
            </div>

            <div className="rounded-xl border border-white/5 bg-black/20 p-3">
              <span className="text-[#8E8E93]">Plazo y Garantía:</span>
              <p className="mt-1 font-bold text-white">
                {contract.estimated_weeks} semanas • {contract.warranty_labor_months}m garantía
              </p>
            </div>

            <div className="rounded-xl border border-white/5 bg-black/20 p-3">
              <span className="text-[#8E8E93]">Firmante del Cliente:</span>
              <p className="mt-1 font-bold text-white truncate">
                {contract.client_signer_name || contract.representative_name || "Por registrar"}
              </p>
            </div>
          </div>

          {/* Acciones de Despacho por WhatsApp */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
            {/* Opción 1: Enlace de Onboarding */}
            <div className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Smartphone size={15} className="text-[#25D366]" />
                  1. Enlace de Onboarding (Datos y Documentos)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(`${window.location.origin}/public/contracts/${contract.onboarding_token}/onboarding`)}
                  className="text-[11px] text-[#8E8E93] hover:text-white flex items-center gap-1"
                >
                  <Copy size={12} />
                  {copiedLink ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
              <p className="text-[11px] text-[#8E8E93]">
                Envía este enlace para que el cliente complete su Razón Social, RFC, datos notariales y suba su INE / Constancia Fiscal.
              </p>
              <div className="flex gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Hola, para formalizar el Contrato de Servicios de tu proyecto en ALFA IT, completa tus datos fiscales y del representante legal aquí: ${
                      typeof window !== "undefined" ? window.location.origin : ""
                    }/public/contracts/${contract.onboarding_token}/onboarding`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-xs font-bold text-black hover:bg-[#1EBE5D] transition"
                >
                  <ExternalLink size={13} />
                  Mandar Onboarding por WhatsApp
                </a>
              </div>
            </div>

            {/* Opción 2: Enlace de Firma Digital */}
            <div className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileCheck2 size={15} className="text-[#9E1B32]" />
                  2. Enlace de Firma Digital
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(`${window.location.origin}/public/contracts/${contract.signing_token}/sign`)}
                  className="text-[11px] text-[#8E8E93] hover:text-white flex items-center gap-1"
                >
                  <Copy size={12} />
                  {copiedLink ? "¡Copiado!" : "Copiar"}
                </button>
              </div>
              <p className="text-[11px] text-[#8E8E93]">
                Envía este enlace para que el cliente revise el contrato marco con sus partidas y estampe su firma táctil con validez legal.
              </p>
              <div className="flex gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Estimado cliente, tu Contrato de Servicios e Integración Tecnológica en ALFA IT está listo para firma digital: ${
                      typeof window !== "undefined" ? window.location.origin : ""
                    }/public/contracts/${contract.signing_token}/sign`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#9E1B32] bg-[#9E1B32]/10 py-2.5 text-xs font-bold text-white hover:bg-[#9E1B32] transition"
                >
                  <ExternalLink size={13} />
                  Mandar a Firma por WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
