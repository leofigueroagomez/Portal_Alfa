"use client";

import { useState } from "react";
import { Eye, Mail, X } from "lucide-react";

type Props = {
  serviceId: number;
  alreadySentAt?: string | null;
};

export default function SendServiceCompletedEmailButton({
  serviceId,
  alreadySentAt,
}: Props) {
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<{
    to: string;
    cc: string;
    subject: string;
    html: string;
    attachmentNames: string[];
  } | null>(null);

  async function loadPreview() {
    setPreviewing(true);
    const response = await fetch(`/api/services/${serviceId}/completed-email`, {
      method: "GET",
    });
    const result = await response.json().catch(() => null);
    setPreviewing(false);

    if (!response.ok || result?.ok === false) {
      alert(result?.message || "No se pudo generar la previsualizacion.");
      return;
    }

    setPreview(result.draft);
  }

  async function handleSend() {
    const confirmed = window.confirm(
      alreadySentAt
        ? "Este correo ya fue enviado. Deseas reenviarlo?"
        : "Enviar correo de servicio realizado al cliente?"
    );
    if (!confirmed) return;

    setSending(true);
    const response = await fetch(`/api/services/${serviceId}/completed-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force: Boolean(alreadySentAt) }),
    });
    const result = await response.json().catch(() => null);
    setSending(false);

    if (!response.ok || result?.ok === false) {
      alert(result?.message || "No se pudo enviar el correo.");
      return;
    }

    alert(result?.message || "Correo enviado correctamente.");
    window.location.reload();
  }

  return (
    <>
      <button
        type="button"
        onClick={loadPreview}
        disabled={previewing || sending}
        className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:text-white disabled:text-[#77777D]"
      >
        <Eye size={18} />
        {previewing ? "Cargando..." : "Previsualizar correo"}
      </button>

      {preview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <section className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-[#2A2A30] bg-[#151518] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#2A2A30] p-5">
              <div>
                <h3 className="text-2xl font-semibold">Previsualizacion del correo</h3>
                <p className="mt-2 text-sm text-[#B3B3B8]">Para: {preview.to}</p>
                {preview.cc ? <p className="text-sm text-[#77777D]">CC: {preview.cc}</p> : null}
                <p className="mt-2 text-sm font-semibold">{preview.subject}</p>
                <p className="mt-2 text-sm text-[#8CE0B6]">
                  Adjunto: {preview.attachmentNames.join(", ") || "Reporte de servicio PDF"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-lg border border-[#2A2A30] p-2 text-[#B3B3B8] hover:text-white"
                aria-label="Cerrar previsualizacion"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[58vh] overflow-auto bg-white p-6 text-[#111318]">
              <div dangerouslySetInnerHTML={{ __html: preview.html }} />
            </div>
            <div className="flex flex-wrap justify-end gap-3 border-t border-[#2A2A30] p-5">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-xl border border-[#2A2A30] px-5 py-3 font-semibold text-[#B3B3B8] hover:text-white"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="inline-flex items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold text-white hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
              >
                <Mail size={18} />
                {sending ? "Enviando..." : alreadySentAt ? "Reenviar correo" : "Enviar correo"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
