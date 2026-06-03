"use client";

import type React from "react";
import { useState, useTransition } from "react";
import { FileText, Mail, X } from "lucide-react";
import { previewProjectDeliveryEmail, sendProjectDeliveryEmail } from "./actions";

type Draft = {
  to: string;
  cc: string;
  subject: string;
  html: string;
  attachmentNames: string[];
  pendingBalanceMxn: number;
  deliveryUrl: string;
  warrantyUrl: string | null;
  warrantyEndDate: string | null;
  nextMaintenanceDate: string | null;
};

type Props = {
  projectId: number;
  deliveryId: number;
  recipient: string;
  pendingBalanceMxn: number;
  deliveryLink: string;
  warrantyLink: string | null;
  alreadySentAt?: string | null;
  lastStatus?: string | null;
  lastError?: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(value || 0));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX");
}

export default function SendDeliveryEmailButton({
  projectId,
  deliveryId,
  recipient,
  pendingBalanceMxn,
  deliveryLink,
  warrantyLink,
  alreadySentAt,
  lastStatus,
  lastError,
}: Props) {
  const [message, setMessage] = useState(lastError || "");
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isPending, startTransition] = useTransition();

  function openPreview() {
    setMessage("");
    setIsOpen(true);
    startTransition(async () => {
      const result = await previewProjectDeliveryEmail(projectId, deliveryId);
      if (!result.ok || !result.draft) {
        setMessage(result.message || "No se pudo generar la vista previa.");
        setIsOpen(false);
        return;
      }
      setDraft(result.draft);
    });
  }

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function confirmSend() {
    if (!draft) return;
    if (!window.confirm("Vas a enviar el correo de entrega y garantia con los PDFs adjuntos. Deseas continuar?")) {
      return;
    }

    setMessage("");
    startTransition(async () => {
      const result = await sendProjectDeliveryEmail(projectId, deliveryId, {
        to: draft.to,
        cc: draft.cc,
        subject: draft.subject,
        html: draft.html,
      });
      setMessage(result.message);
      if (result.ok) setIsOpen(false);
    });
  }

  return (
    <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Correo de entrega y garantia</h2>
          <p className="mt-2 text-sm text-[#B3B3B8]">
            Destinatario sugerido: {recipient || "Sin correo disponible"}
          </p>
          <p className="mt-1 text-sm text-[#B3B3B8]">
            Saldo pendiente: {formatCurrency(pendingBalanceMxn)}
          </p>
          <p className="mt-1 text-xs text-[#77777D]">
            Adjunta PDFs de acta de entrega{warrantyLink ? " y carta de garantia" : ""}.
            Links internos: {deliveryLink}{warrantyLink ? `, ${warrantyLink}` : ""}.
          </p>
          {alreadySentAt ? (
            <p className="mt-2 text-xs text-[#8CE0B6]">
              Ultimo envio: {new Date(alreadySentAt).toLocaleString("es-MX")}
            </p>
          ) : null}
          {lastStatus === "error" || message ? (
            <p className={`mt-2 text-sm ${lastStatus === "error" ? "text-[#FFB4B4]" : "text-[#B3B3B8]"}`}>
              {message}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={openPreview}
          disabled={isPending}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Mail size={18} />
          {isPending && !isOpen
            ? "Preparando..."
            : alreadySentAt
              ? "Previsualizar reenvio"
              : "Previsualizar correo"}
        </button>
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
          <div className="mt-8 w-full max-w-5xl rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 text-white shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm tracking-[0.3em] text-[#9E1B32]">
                  PREVIEW
                </p>
                <h3 className="text-2xl font-semibold">Correo de entrega y garantia</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-[#2A2A30] p-2 text-[#B3B3B8] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {!draft ? (
              <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-6 text-[#B3B3B8]">
                Generando vista previa...
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4">
                  <Field label="Destinatario">
                    <input
                      value={draft.to}
                      onChange={(event) => updateDraft("to", event.target.value)}
                      className="field"
                    />
                  </Field>
                  <Field label="CC automatico / editable">
                    <input
                      value={draft.cc}
                      onChange={(event) => updateDraft("cc", event.target.value)}
                      className="field"
                      placeholder="correo1@dominio.com, correo2@dominio.com"
                    />
                  </Field>
                  <Field label="Asunto">
                    <input
                      value={draft.subject}
                      onChange={(event) => updateDraft("subject", event.target.value)}
                      className="field"
                    />
                  </Field>

                  <section className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
                    <h4 className="mb-3 font-semibold">Adjuntos PDF</h4>
                    <div className="space-y-2">
                      {draft.attachmentNames.map((name) => (
                        <div key={name} className="flex items-center gap-2 text-sm text-[#B3B3B8]">
                          <FileText size={16} className="text-[#9E1B32]" />
                          {name}
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4 text-sm text-[#B3B3B8]">
                    <p>Saldo pendiente: {formatCurrency(draft.pendingBalanceMxn)}</p>
                    <p>Vence garantia: {formatDate(draft.warrantyEndDate)}</p>
                    <p>Proximo mantenimiento: {formatDate(draft.nextMaintenanceDate)}</p>
                  </section>
                </div>

                <div className="space-y-4">
                  <Field label="Cuerpo HTML">
                    <textarea
                      value={draft.html}
                      onChange={(event) => updateDraft("html", event.target.value)}
                      className="field min-h-64 font-mono text-xs"
                    />
                  </Field>
                  <section className="rounded-xl border border-[#2A2A30] bg-white p-4 text-[#111318]">
                    <div dangerouslySetInnerHTML={{ __html: draft.html }} />
                  </section>
                </div>

                <div className="flex justify-end gap-3 xl:col-span-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl border border-[#2A2A30] px-5 py-3 font-semibold text-[#B3B3B8] hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirmSend}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Mail size={18} />
                    {isPending ? "Enviando..." : "Confirmar envio"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .field {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #2A2A30;
          background: #222228;
          padding: 0.75rem 1rem;
          color: white;
          outline: none;
        }

        .field:focus {
          border-color: #9E1B32;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#B3B3B8]">{label}</span>
      {children}
    </label>
  );
}
