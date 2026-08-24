"use client";

import { useState } from "react";
import { MessageCircle, Phone } from "lucide-react";

type Props = {
  documentLabel: string;
  folio: string | null | undefined;
  clientName: string | null | undefined;
  totalLabel: string | null | undefined;
  defaultPhone?: string | null;
};

export default function WhatsAppInvoiceButton({
  documentLabel,
  folio,
  clientName,
  totalLabel,
  defaultPhone = "",
}: Props) {
  const [phone, setPhone] = useState(defaultPhone || "");
  const [showModal, setShowModal] = useState(false);

  const cleanPhone = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");

  const messageText = [
    `Hola *${clientName || "Cliente"}*,`,
    `Te compartimos tu ${documentLabel.toLowerCase()} *${folio || ""}*${
      totalLabel ? ` por un total de *${totalLabel}*` : ""
    }.`,
    "Adjuntamos el PDF y el XML en este chat.",
    "",
    "Quedamos a tus ordenes por cualquier duda.",
  ].join("\n");

  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
    : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        title="Enviar por WhatsApp"
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A2A30] text-[#B3B3B8] hover:border-[#25D366] hover:text-[#25D366]"
        aria-label="Enviar por WhatsApp"
      >
        <MessageCircle size={16} />
      </button>

      {showModal ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-lg space-y-5 rounded-2xl border border-[#1F1F24] bg-[#151518] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#9E1B32]">
                WhatsApp
              </p>
              <h3 className="mt-1 text-xl font-bold text-white">
                Enviar {documentLabel.toLowerCase()} {folio || ""}
              </h3>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#B3B3B8]">
                Telefono de WhatsApp del cliente
              </label>
              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#77777D]"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Ej. 5219991234567"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-[#9E1B32]"
                />
              </div>
              <p className="text-[11px] text-[#77777D]">
                Incluye la lada del pais (ej. 52 para Mexico).
              </p>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-medium text-[#B3B3B8]">
                Vista previa del mensaje
              </span>
              <div className="max-h-40 overflow-y-auto whitespace-pre-line rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-3 text-xs leading-relaxed text-[#B3B3B8]">
                {messageText}
              </div>
              <p className="text-[11px] text-[#77777D]">
                Descarga el PDF/XML con los iconos de al lado y adjuntalos en
                WhatsApp una vez abierto el chat — WhatsApp no permite adjuntar
                archivos automaticamente desde un enlace.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
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
      ) : null}
    </>
  );
}
