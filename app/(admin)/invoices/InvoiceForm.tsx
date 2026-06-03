"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import ClientFiscalDataModal from "@/components/ClientFiscalDataModal";
import {
  formatMissingFiscalFields,
  getMissingFiscalFields,
  type FiscalCatalogItem,
  type FiscalClientData,
} from "@/lib/fiscalData";
import { supabase } from "@/services/supabase";

type Project = {
  id: number;
  client_id: number | null;
  name: string | null;
};

type Props = {
  clients: FiscalClientData[];
  projects: Project[];
  defaultProjectId?: number;
  defaultClientId?: number | null;
};

function today() {
  return new Date().toISOString().slice(0, 10);
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
  const [clientList, setClientList] = useState(clients);
  const [projectId, setProjectId] = useState(String(defaultProjectId || ""));
  const [clientId, setClientId] = useState(String(defaultClientId || ""));
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [subtotal, setSubtotal] = useState("");
  const [iva, setIva] = useState("");
  const [fiscalRegimes, setFiscalRegimes] = useState<FiscalCatalogItem[]>([]);
  const [cfdiUses, setCfdiUses] = useState<FiscalCatalogItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fiscalModalOpen, setFiscalModalOpen] = useState(false);
  const [fiscalModalIntro, setFiscalModalIntro] = useState<string | null>(null);

  const availableProjects = useMemo(() => {
    if (!clientId) return projects;
    return projects.filter((project) => String(project.client_id || "") === clientId);
  }, [clientId, projects]);
  const selectedClient =
    clientList.find((client) => String(client.id) === clientId) || null;
  const missingFiscalFields = clientId
    ? getMissingFiscalFields(
        selectedClient,
        fiscalRegimes.length > 0 && cfdiUses.length > 0
          ? { fiscalRegimes, cfdiUses }
          : undefined
      )
    : [];

  const numericSubtotal = Number(subtotal || 0);
  const numericIva = Number(iva || 0);
  const total = numericSubtotal + numericIva;

  useEffect(() => {
    setClientList(clients);
  }, [clients]);

  useEffect(() => {
    if (!open) return;

    async function loadCatalogs() {
      const [regimesResult, cfdiUsesResult] = await Promise.all([
        supabase
          .from("fiscal_regime_catalog")
          .select("code, name, applies_to_person_type, is_active"),
        supabase
          .from("cfdi_use_catalog")
          .select("code, name, applies_to_person_type, is_active"),
      ]);

      if (!regimesResult.error) {
        setFiscalRegimes((regimesResult.data || []) as FiscalCatalogItem[]);
      }

      if (!cfdiUsesResult.error) {
        setCfdiUses((cfdiUsesResult.data || []) as FiscalCatalogItem[]);
      }
    }

    loadCatalogs();
  }, [open]);

  function updateSubtotal(value: string) {
    setSubtotal(value);
    const nextSubtotal = Number(value || 0);

    if (Number.isFinite(nextSubtotal) && nextSubtotal >= 0) {
      setIva((nextSubtotal * 0.16).toFixed(2));
    }
  }

  function updateProject(nextProjectId: string) {
    setProjectId(nextProjectId);
    const project = projects.find((item) => String(item.id) === nextProjectId);
    if (project?.client_id) {
      setClientId(String(project.client_id));
      setErrorMessage(null);
    }
  }

  function openFiscalModalForMissing() {
    setFiscalModalIntro(
      missingFiscalFields.length > 0
        ? `Faltan datos fiscales: ${formatMissingFiscalFields(missingFiscalFields)}`
        : null
    );
    setFiscalModalOpen(true);
  }

  function handleFiscalSaved(nextClient: FiscalClientData) {
    setClientList((current) =>
      current.map((client) => (client.id === nextClient.id ? { ...client, ...nextClient } : client))
    );
    setErrorMessage(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (!projectId || !clientId) {
      setErrorMessage("Selecciona cliente y proyecto.");
      return;
    }

    if (missingFiscalFields.length > 0) {
      setErrorMessage(`Faltan datos fiscales: ${formatMissingFiscalFields(missingFiscalFields)}`);
      openFiscalModalForMissing();
      return;
    }

    if (!invoiceDate) {
      setErrorMessage("Selecciona la fecha de factura.");
      return;
    }

    if (!Number.isFinite(numericSubtotal) || numericSubtotal < 0) {
      setErrorMessage("Captura un subtotal valido.");
      return;
    }

    if (!Number.isFinite(numericIva) || numericIva < 0) {
      setErrorMessage("Captura un IVA valido.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("project_invoices").insert({
      client_project_id: Number(projectId),
      client_id: Number(clientId),
      invoice_date: invoiceDate,
      subtotal_mxn: numericSubtotal,
      iva_mxn: numericIva,
      total_mxn: total,
      status: "draft",
    });

    if (error) {
      setSaving(false);
      setErrorMessage(`Error al guardar factura: ${error.message}`);
      return;
    }

    setSaving(false);
    setOpen(false);
    setProjectId(String(defaultProjectId || ""));
    setClientId(String(defaultClientId || ""));
    setInvoiceDate(today());
    setSubtotal("");
    setIva("");
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
                  Crea un borrador interno antes de timbrar en Facturama Sandbox.
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

            {errorMessage ? (
              <div className="mb-5 rounded-xl border border-[#6A2A2A] bg-[#351818] p-4 text-sm text-[#FFB4B4]">
                {errorMessage}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                    setErrorMessage(null);
                  }}
                >
                  <option value="">Seleccionar cliente</option>
                  {clientList.map((client) => (
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
                  onChange={(event) => updateSubtotal(event.target.value)}
                  placeholder="0.00"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">IVA MXN</span>
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

              <div className="rounded-xl border border-[#2A2A30] bg-[#101114] p-4">
                <p className="text-sm text-[#B3B3B8]">Total</p>
                <p className="mt-2 text-2xl font-semibold">
                  MXN {total.toFixed(2)}
                </p>
              </div>

              <div className="rounded-xl border border-[#614620] bg-[#322514] p-4 text-sm text-[#F4C66A]">
                Se guardara como borrador. El timbrado genera Facturama ID, UUID, PDF y XML.
              </div>

              {selectedClient ? (
                <div
                  className={`rounded-xl border p-4 text-sm md:col-span-2 ${
                    missingFiscalFields.length > 0
                      ? "border-[#614620] bg-[#322514] text-[#F4C66A]"
                      : "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p>
                      {missingFiscalFields.length > 0
                        ? `Faltan datos fiscales: ${formatMissingFiscalFields(missingFiscalFields)}`
                        : "Datos fiscales completos para facturacion."}
                    </p>
                    <button
                      type="button"
                      onClick={openFiscalModalForMissing}
                      className="w-fit rounded-xl border border-white/15 bg-white/10 px-4 py-2 font-semibold text-white hover:bg-white/15"
                    >
                      {missingFiscalFields.length > 0
                        ? "Completar datos fiscales"
                        : "Editar datos fiscales"}
                    </button>
                  </div>
                </div>
              ) : null}
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
                {saving ? "Guardando..." : "Crear borrador"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <ClientFiscalDataModal
        client={selectedClient}
        open={fiscalModalOpen}
        intro={fiscalModalIntro}
        onClose={() => setFiscalModalOpen(false)}
        onSaved={handleFiscalSaved}
      />
    </>
  );
}
