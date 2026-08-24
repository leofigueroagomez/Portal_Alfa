"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, MessageCircle, Phone, Share2 } from "lucide-react";
import { getAppBaseUrl } from "@/lib/appUrl";

type Props = {
  projectId: number;
  deliveryId: number;
  token: string;
  clientName: string;
  projectName: string;
  defaultPhone?: string | null;
  siteAttendedByName?: string | null;
  isAlreadySigned?: boolean;
};

export default function WhatsAppDeliverySignButton({
  token,
  clientName,
  projectName,
  defaultPhone = "",
  siteAttendedByName,
  isAlreadySigned = false,
}: Props) {
  const [phone, setPhone] = useState(defaultPhone || "");
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const signingUrl = `${baseUrl}/public/delivery-sign/${token}`;
  const cleanPhone = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");

  const siteInfo = siteAttendedByName?.trim()
    ? `\nEn sitio nos atendió: *${siteAttendedByName.trim()}*.`
    : "";

  const messageText = [
    `Hola *${clientName || "Cliente"}*,`,
    `En *ALFA* hemos concluido los trabajos técnicos y pruebas de entrega para el proyecto *${projectName || "Proyecto"}*.${siteInfo}`,
    "",
    "Te compartimos el reporte digital con las evidencias fotográficas, sistemas instalados y notas para tu revisión y firma digital de conformidad:",
    signingUrl,
    "",
    "Agradecemos tu preferencia.",
  ].join("\n");

  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
    : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(signingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      prompt("Copia este enlace de firma:", signingUrl);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={waUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 font-semibold text-black transition hover:bg-[#20bd5a] shadow-lg"
        >
          <MessageCircle size={18} />
          <span>Enviar por WhatsApp</span>
        </a>

        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#2E2E38]"
        >
          {copied ? <Check size={16} className="text-[#8CE0B6]" /> : <Copy size={16} />}
          <span>{copied ? "¡Enlace copiado!" : "Copiar enlace de firma"}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A30] bg-[#151518] px-3.5 py-3 text-xs font-medium text-[#B3B3B8] transition hover:text-white"
        >
          <Share2 size={15} />
          <span>Ajustar teléfono / Mensaje</span>
        </button>
      </div>

      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[#1F1F24] bg-[#151518] p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#9E1B32]">
                WhatsApp • Firma Digital
              </p>
              <h3 className="text-xl font-bold text-white mt-1">
                Enviar Enlace de Recepción
              </h3>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#B3B3B8]">
                Teléfono de WhatsApp del cliente titular
              </label>
              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#77777D]"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. 5219991234567"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-[#9E1B32]"
                />
              </div>
              <p className="text-[11px] text-[#77777D]">
                Incluye la lada del país si es necesario (ej. 52 para México).
              </p>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-medium text-[#B3B3B8]">
                Vista previa del mensaje a enviar
              </span>
              <div className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-3 text-xs text-[#B3B3B8] whitespace-pre-line max-h-40 overflow-y-auto leading-relaxed">
                {messageText}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-bold text-black transition hover:bg-[#20bd5a]"
              >
                <MessageCircle size={16} />
                Abrir WhatsApp
              </a>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 text-sm font-semibold text-[#B3B3B8] transition hover:text-white"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
