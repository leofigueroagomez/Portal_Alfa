"use client";

import { useState, useTransition } from "react";
import { Code2, FileText, History, Mail, Send, X } from "lucide-react";

type InvoiceFileLinksProps = {
  invoiceId?: number;
  folio?: string | null;
  clientName?: string | null;
  billingEmail?: string | null;
  xmlUrl?: string | null;
  pdfUrl?: string | null;
  satUuid?: string | null;
  facturamaId?: string | null;
  status?: string | null;
  emailLogs?: InvoiceEmailLog[];
};

export type InvoiceEmailLog = {
  id: number;
  invoice_id: number;
  to_email: string;
  cc_email: string | null;
  subject: string | null;
  message: string | null;
  status: string;
  resend_email_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string | null;
};

export default function InvoiceFileLinks({
  invoiceId,
  folio,
  clientName,
  billingEmail,
  xmlUrl,
  pdfUrl,
  satUuid,
  facturamaId,
  status,
  emailLogs = [],
}: InvoiceFileLinksProps) {
  const [open, setOpen] = useState(false);
  const [toEmail, setToEmail] = useState(billingEmail || "");
  const [ccEmail, setCcEmail] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [logs, setLogs] = useState(emailLogs);
  const [pending, startTransition] = useTransition();
  const canSend =
    Boolean(invoiceId) &&
    (status === "issued" || status === "paid") &&
    Boolean(pdfUrl) &&
    Boolean(xmlUrl) &&
    Boolean(satUuid) &&
    Boolean(facturamaId);

  if (!xmlUrl && !pdfUrl && !satUuid && !facturamaId) return null;

  function sendEmail() {
    if (!invoiceId) return;

    setResult(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/invoices/${invoiceId}/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: toEmail,
            cc: ccEmail,
            message,
          }),
        });
        const body = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          warning?: string;
          resendEmailId?: string | null;
        };

        if (!response.ok || !body.ok) {
          throw new Error(body.error || "No se pudo enviar la factura.");
        }

        const now = new Date().toISOString();
        setLogs((current) => [
          {
            id: Date.now(),
            invoice_id: invoiceId,
            to_email: toEmail,
            cc_email: ccEmail || null,
            subject: `Factura ${folio || invoiceId} - ALFA IT`,
            message: message || null,
            status: "sent",
            resend_email_id: body.resendEmailId || null,
            error_message: body.warning || null,
            sent_at: now,
            created_at: now,
          },
          ...current,
        ]);
        setResult({
          ok: true,
          message: body.warning || "Factura enviada correctamente.",
        });
      } catch (error) {
        setResult({
          ok: false,
          message:
            error instanceof Error ? error.message : "No se pudo enviar la factura.",
        });
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {pdfUrl ? (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            title={`PDF: ${pdfUrl}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A2A30] text-[#B3B3B8] hover:border-[#9E1B32] hover:text-white"
            aria-label="Abrir PDF"
          >
            <FileText size={17} />
          </a>
        ) : null}
        {xmlUrl ? (
          <a
            href={xmlUrl}
            target="_blank"
            rel="noreferrer"
            title={`XML: ${xmlUrl}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A2A30] text-[#B3B3B8] hover:border-[#9E1B32] hover:text-white"
            aria-label="Abrir XML"
          >
            <Code2 size={16} />
          </a>
        ) : null}
        {satUuid ? (
          <span className="text-xs text-[#77777D]" title={satUuid}>
            UUID
          </span>
        ) : null}
        {facturamaId ? (
          <span className="text-xs text-[#77777D]" title={facturamaId}>
            ID
          </span>
        ) : null}
        {canSend ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#2A2A30] text-[#B3B3B8] hover:border-[#9E1B32] hover:text-white"
            title="Enviar por correo"
            aria-label="Enviar por correo"
          >
            <Mail size={16} />
          </button>
        ) : null}
      </div>
      <div className="max-w-[260px] space-y-1 font-mono text-[10px] leading-snug text-[#77777D]">
        <p className="truncate" title={xmlUrl || "Sin XML"}>
          xml_url: {xmlUrl || "-"}
        </p>
        <p className="truncate" title={pdfUrl || "Sin PDF"}>
          pdf_url: {pdfUrl || "-"}
        </p>
      </div>
      {logs.length > 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-xs text-[#B3B3B8] hover:text-white"
        >
          <History size={13} />
          Historial de envios ({logs.length})
        </button>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 sm:items-center sm:justify-center">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 text-white shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold">Enviar factura</h3>
                <p className="mt-1 text-sm text-[#B3B3B8]">
                  {folio || `Factura #${invoiceId}`} / {clientName || "Cliente"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#2A2A30] bg-[#222228] text-[#B3B3B8] hover:text-white"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
              <ModalMetric label="UUID" value={satUuid || "Pendiente"} />
              <ModalMetric label="PDF" value={pdfUrl ? "Disponible" : "Falta"} />
              <ModalMetric label="XML" value={xmlUrl ? "Disponible" : "Falta"} />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Correo destino</span>
                <input
                  type="email"
                  value={toEmail}
                  onChange={(event) => setToEmail(event.target.value)}
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  placeholder="cliente@correo.com"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">CC opcional</span>
                <input
                  type="email"
                  value={ccEmail}
                  onChange={(event) => setCcEmail(event.target.value)}
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  placeholder="opcional@correo.com"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Mensaje opcional</span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="min-h-24 w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  placeholder="Mensaje adicional para el cliente."
                />
              </label>
            </div>

            <div className="mt-5 rounded-xl border border-[#2A2A30] bg-[#101114] p-4 text-sm text-[#B3B3B8]">
              <p className="font-semibold text-white">Adjuntos</p>
              <p className="mt-2">PDF + XML existentes de la factura timbrada.</p>
            </div>

            {result ? (
              <div
                className={`mt-5 rounded-xl border p-4 text-sm ${
                  result.ok
                    ? "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]"
                    : "border-[#6A2A2A] bg-[#351818] text-[#FFB4B4]"
                }`}
              >
                {result.message}
              </div>
            ) : null}

            {logs.length > 0 ? (
              <section className="mt-5 rounded-xl border border-[#2A2A30] bg-[#101114] p-4">
                <h4 className="mb-3 font-semibold">Historial de envios</h4>
                <div className="space-y-2 text-xs text-[#B3B3B8]">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border border-[#2A2A30] bg-[#151518] p-3"
                    >
                      <p className="font-semibold text-white">
                        {formatDateTime(log.sent_at || log.created_at)} / {log.status}
                      </p>
                      <p>Para: {log.to_email}</p>
                      {log.cc_email ? <p>CC: {log.cc_email}</p> : null}
                      {log.error_message ? (
                        <p className="mt-1 text-[#FFB4B4]">{log.error_message}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={sendEmail}
                disabled={pending || !toEmail}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
              >
                <Send size={16} />
                {pending ? "Enviando..." : "Enviar factura"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ModalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#2A2A30] bg-[#101114] p-3">
      <p className="mb-1 text-xs text-[#B3B3B8]">{label}</p>
      <p className="truncate text-sm font-semibold text-white" title={value}>
        {value}
      </p>
    </div>
  );
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-MX", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
