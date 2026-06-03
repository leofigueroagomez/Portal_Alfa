"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { supabase } from "@/services/supabase";

type Client = {
  id: number;
  name: string | null;
  tax_rfc?: string | null;
};

type Project = {
  id: number;
  client_id: number | null;
  name: string | null;
};

type Props = {
  clients: Client[];
  projects: Project[];
  defaultProjectId?: number;
  defaultClientId?: number | null;
};

type InvoiceStatus = "draft" | "issued" | "cancelled" | "paid";
type InvoiceCurrency = "MXN" | "USD";

const statusOptions: { value: InvoiceStatus; label: string }[] = [
  { value: "draft", label: "Borrador" },
  { value: "issued", label: "Emitida" },
  { value: "paid", label: "Pagada" },
  { value: "cancelled", label: "Cancelada" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function reportError(step: string, error: unknown) {
  const message =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
      ? ` ${error.message}`
      : "";

  console.error(`Error en ${step}:`, error);
  alert(`Error en ${step}: ${JSON.stringify(error)}${message}`);
}

export default function InvoiceForm({
  clients,
  projects,
  defaultProjectId,
  defaultClientId,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [internalFolio, setInternalFolio] = useState("");
  const [projectId, setProjectId] = useState(String(defaultProjectId || ""));
  const [clientId, setClientId] = useState(String(defaultClientId || ""));
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [subtotal, setSubtotal] = useState("");
  const [iva, setIva] = useState("");
  const [currency, setCurrency] = useState<InvoiceCurrency>("MXN");
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [xmlUrl, setXmlUrl] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [satUuid, setSatUuid] = useState("");

  const availableProjects = useMemo(() => {
    if (!clientId) return projects;
    return projects.filter((project) => String(project.client_id || "") === clientId);
  }, [clientId, projects]);

  const numericSubtotal = Number(subtotal || 0);
  const numericIva = Number(iva || 0);
  const total = numericSubtotal + numericIva;

  function updateProject(nextProjectId: string) {
    setProjectId(nextProjectId);
    const project = projects.find((item) => String(item.id) === nextProjectId);
    if (project?.client_id) {
      setClientId(String(project.client_id));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!internalFolio.trim()) {
      alert("Captura el folio interno.");
      return;
    }

    if (!projectId || !clientId) {
      alert("Selecciona cliente y proyecto.");
      return;
    }

    if (!invoiceDate) {
      alert("Selecciona la fecha de factura.");
      return;
    }

    if (!Number.isFinite(numericSubtotal) || numericSubtotal < 0) {
      alert("Captura un subtotal valido.");
      return;
    }

    if (!Number.isFinite(numericIva) || numericIva < 0) {
      alert("Captura un IVA valido.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setSaving(false);
      reportError("leer usuario actual", userError);
      return;
    }

    const { error } = await supabase.from("project_invoices").insert({
      internal_folio: internalFolio.trim(),
      client_project_id: Number(projectId),
      client_id: Number(clientId),
      invoice_date: invoiceDate,
      subtotal: numericSubtotal,
      iva: numericIva,
      total,
      currency,
      status,
      xml_url: xmlUrl.trim() || null,
      pdf_url: pdfUrl.trim() || null,
      sat_uuid: satUuid.trim() || null,
      created_by_user_id: user?.id || null,
    });

    if (error) {
      setSaving(false);
      reportError("guardar factura", error);
      return;
    }

    setSaving(false);
    setOpen(false);
    setInternalFolio("");
    setProjectId(String(defaultProjectId || ""));
    setClientId(String(defaultClientId || ""));
    setInvoiceDate(today());
    setSubtotal("");
    setIva("");
    setCurrency("MXN");
    setStatus("draft");
    setXmlUrl("");
    setPdfUrl("");
    setSatUuid("");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold text-white hover:bg-[#B91C3C]"
      >
        <Plus size={18} />
        Nueva factura
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 sm:items-center sm:justify-center">
          <form
            onSubmit={handleSubmit}
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 text-white shadow-2xl sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Factura interna</h2>
                <p className="mt-1 text-sm text-[#B3B3B8]">
                  Registro manual preparado para timbrado futuro.
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Folio interno</span>
                <input
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={internalFolio}
                  onChange={(event) => setInternalFolio(event.target.value)}
                  placeholder="FAC-2026-001"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Fecha</span>
                <input
                  type="date"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={invoiceDate}
                  onChange={(event) => setInvoiceDate(event.target.value)}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Cliente</span>
                <select
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={clientId}
                  disabled={Boolean(defaultClientId)}
                  onChange={(event) => {
                    setClientId(event.target.value);
                    setProjectId("");
                  }}
                >
                  <option value="">Seleccionar cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name || `Cliente #${client.id}`}
                      {client.tax_rfc ? ` / ${client.tax_rfc}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Proyecto</span>
                <select
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={projectId}
                  disabled={Boolean(defaultProjectId)}
                  onChange={(event) => updateProject(event.target.value)}
                >
                  <option value="">Seleccionar proyecto</option>
                  {availableProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name || `Proyecto #${project.id}`}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Subtotal</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={subtotal}
                  onChange={(event) => setSubtotal(event.target.value)}
                  placeholder="0.00"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">IVA</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={iva}
                  onChange={(event) => setIva(event.target.value)}
                  placeholder="0.00"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Moneda</span>
                <select
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value as InvoiceCurrency)}
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Estado</span>
                <select
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as InvoiceStatus)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-xl border border-[#2A2A30] bg-[#101114] p-4">
                <p className="text-sm text-[#B3B3B8]">Total</p>
                <p className="mt-2 text-2xl font-semibold">
                  {currency} {total.toFixed(2)}
                </p>
              </div>

              <div className="rounded-xl border border-[#614620] bg-[#322514] p-4 text-sm text-[#F4C66A]">
                Sin timbrado PAC. XML, PDF y UUID son referencias opcionales por ahora.
              </div>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">XML URL</span>
                <input
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={xmlUrl}
                  onChange={(event) => setXmlUrl(event.target.value)}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">PDF URL</span>
                <input
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={pdfUrl}
                  onChange={(event) => setPdfUrl(event.target.value)}
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-[#B3B3B8]">SAT UUID</span>
                <input
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={satUuid}
                  onChange={(event) => setSatUuid(event.target.value)}
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
              >
                {saving ? "Guardando..." : "Guardar factura"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
