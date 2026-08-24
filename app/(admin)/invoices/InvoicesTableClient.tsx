"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import {
  getInvoiceRelation,
  getInvoicePaymentFormLabel,
  getInvoicePaymentMethodLabel,
  getInvoiceTotal,
  invoiceStatusClasses,
  invoiceStatusLabels,
  invoiceStatuses,
  normalizeInvoiceStatus,
  type ProjectInvoice,
} from "@/lib/invoices";
import InvoiceFileLinks, { type FiscalDocumentEmailLog } from "./InvoiceFileLinks";
import InvoiceStatusSelect from "./InvoiceStatusSelect";
import StampInvoiceButton from "./StampInvoiceButton";
import DeleteDraftInvoiceButton from "./DeleteDraftInvoiceButton";
import CancelInvoiceButton from "./CancelInvoiceButton";

type Props = {
  invoices: ProjectInvoice[];
  emailLogsByInvoice: Record<number, FiscalDocumentEmailLog[]>;
  facturamaEnv: "sandbox" | "production";
  sandboxReceiverNotice: string | null;
  facturamaProductionEnabled: boolean;
  canCancel: boolean;
};

type SortKey = "date_desc" | "date_asc" | "client_asc" | "total_desc" | "total_asc" | "folio_asc";

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX");
}

function includesSearch(value: string | null | undefined, search: string) {
  return (value || "").toLowerCase().includes(search);
}

export default function InvoicesTableClient({
  invoices,
  emailLogsByInvoice,
  facturamaEnv,
  sandboxReceiverNotice,
  facturamaProductionEnabled,
  canCancel,
}: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date_desc");
  const [groupByClient, setGroupByClient] = useState(false);

  const clientOptions = useMemo(() => {
    const byId = new Map<number, string>();
    for (const invoice of invoices) {
      const client = getInvoiceRelation(invoice.clients);
      if (invoice.client_id && client?.name) {
        byId.set(invoice.client_id, client.name);
      }
    }
    return Array.from(byId.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = invoices.filter((invoice) => {
      const client = getInvoiceRelation(invoice.clients);
      const project = getInvoiceRelation(invoice.client_projects);
      const status = normalizeInvoiceStatus(invoice.status);

      const matchesSearch =
        !normalizedSearch ||
        includesSearch(invoice.internal_folio, normalizedSearch) ||
        includesSearch(client?.name, normalizedSearch) ||
        includesSearch(client?.tax_rfc, normalizedSearch) ||
        includesSearch(project?.name, normalizedSearch) ||
        includesSearch(invoice.sat_uuid, normalizedSearch);

      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const matchesClient =
        !clientFilter || String(invoice.client_id || "") === clientFilter;
      const invoiceDate = invoice.invoice_date || "";
      const matchesDateFrom = !dateFrom || invoiceDate >= dateFrom;
      const matchesDateTo = !dateTo || invoiceDate <= dateTo;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesClient &&
        matchesDateFrom &&
        matchesDateTo
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "date_asc":
          return (a.invoice_date || "").localeCompare(b.invoice_date || "");
        case "client_asc":
          return (getInvoiceRelation(a.clients)?.name || "").localeCompare(
            getInvoiceRelation(b.clients)?.name || ""
          );
        case "total_desc":
          return getInvoiceTotal(b) - getInvoiceTotal(a);
        case "total_asc":
          return getInvoiceTotal(a) - getInvoiceTotal(b);
        case "folio_asc":
          return (a.internal_folio || "").localeCompare(b.internal_folio || "");
        case "date_desc":
        default:
          return (b.invoice_date || "").localeCompare(a.invoice_date || "");
      }
    });

    return sorted;
  }, [invoices, search, statusFilter, clientFilter, dateFrom, dateTo, sortKey]);

  const groups = useMemo(() => {
    if (!groupByClient) {
      return [{ label: null as string | null, items: filteredInvoices }];
    }

    const byClient = new Map<string, ProjectInvoice[]>();
    for (const invoice of filteredInvoices) {
      const client = getInvoiceRelation(invoice.clients);
      const label = client?.name || "Sin cliente";
      const current = byClient.get(label) || [];
      current.push(invoice);
      byClient.set(label, current);
    }

    return Array.from(byClient.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, items]) => ({ label, items }));
  }, [filteredInvoices, groupByClient]);

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setClientFilter("");
    setDateFrom("");
    setDateTo("");
    setSortKey("date_desc");
  }

  function renderRow(invoice: ProjectInvoice) {
    const status = normalizeInvoiceStatus(invoice.status);
    const client = getInvoiceRelation(invoice.clients);
    const project = getInvoiceRelation(invoice.client_projects);

    return (
      <div
        key={invoice.id}
        className="grid grid-cols-[130px_130px_1fr_1fr_130px_150px_140px_150px_170px_130px_100px] gap-4 px-5 py-4 text-sm"
      >
        <div>
          <p className="font-semibold text-[#9E1B32]">
            {invoice.internal_folio || `FAC-${String(invoice.id).padStart(4, "0")}`}
          </p>
          <p className="mt-1 text-xs text-[#77777D]">ID #{invoice.id}</p>
        </div>
        <p>{formatDate(invoice.invoice_date)}</p>
        <p>
          {client?.name || "Sin cliente"}
          {client?.tax_rfc ? (
            <span className="mt-1 block text-xs text-[#77777D]">{client.tax_rfc}</span>
          ) : null}
        </p>
        <Link
          href={`/projects/${invoice.client_project_id}/invoices`}
          className="text-[#D7A8FF] hover:text-white"
        >
          {project?.name || "Sin proyecto"}
        </Link>
        <p className="font-semibold">{formatCurrency(getInvoiceTotal(invoice), "MXN")}</p>
        <div className="space-y-1 text-xs text-[#B3B3B8]">
          <p className="font-semibold text-white">{getInvoicePaymentMethodLabel(invoice)}</p>
          <p>{getInvoicePaymentFormLabel(invoice)}</p>
          {invoice.requires_payment_complement ? (
            <span className="inline-flex rounded-full border border-[#614620] bg-[#322514] px-2 py-1 text-[#F4C66A]">
              Requiere complemento de pago
            </span>
          ) : null}
          {invoice.payment_complement_status === "pending" &&
          normalizeInvoiceStatus(invoice.status) === "issued" ? (
            <p className="text-[#F4C66A]">Complemento de pago pendiente.</p>
          ) : null}
        </div>
        <span
          className={`inline-flex h-fit w-fit rounded-full border px-3 py-1 text-xs ${invoiceStatusClasses[status]}`}
        >
          {invoiceStatusLabels[status]}
        </span>
        <InvoiceStatusSelect invoiceId={invoice.id} currentStatus={invoice.status} />
        <StampInvoiceButton
          invoiceId={invoice.id}
          status={invoice.status}
          facturamaId={invoice.facturama_id}
          client={client}
          sandboxNotice={sandboxReceiverNotice}
          facturamaEnv={facturamaEnv}
          facturamaProductionEnabled={facturamaProductionEnabled}
        />
        <InvoiceFileLinks
          invoiceId={invoice.id}
          documentType="invoice"
          documentId={invoice.id}
          documentLabel="Factura"
          folio={invoice.internal_folio}
          clientName={client?.name || client?.tax_business_name || null}
          billingEmail={client?.billing_email || null}
          clientPhone={client?.phone || null}
          totalLabel={formatCurrency(getInvoiceTotal(invoice), "MXN")}
          xmlUrl={invoice.xml_url}
          pdfUrl={invoice.pdf_url}
          satUuid={invoice.sat_uuid}
          facturamaId={invoice.facturama_id}
          status={invoice.status}
          emailLogs={emailLogsByInvoice[invoice.id] || []}
        />
        <div className="flex flex-col items-start gap-2">
          <DeleteDraftInvoiceButton
            invoiceId={invoice.id}
            status={invoice.status}
            facturamaId={invoice.facturama_id}
            internalFolio={invoice.internal_folio}
          />
          <CancelInvoiceButton
            invoiceId={invoice.id}
            status={invoice.status}
            facturamaId={invoice.facturama_id}
            satUuid={invoice.sat_uuid}
            internalFolio={invoice.internal_folio}
            canCancel={canCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="mb-6 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr_1fr_130px_130px_1fr]">
          <input
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            placeholder="Buscar por folio, cliente, RFC, proyecto o UUID..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            value={clientFilter}
            onChange={(event) => setClientFilter(event.target.value)}
          >
            <option value="">Todos los clientes</option>
            {clientOptions.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Todos los estados</option>
            {invoiceStatuses.map((status) => (
              <option key={status} value={status}>
                {invoiceStatusLabels[status]}
              </option>
            ))}
          </select>

          <input
            type="date"
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-3 outline-none"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />

          <input
            type="date"
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-3 outline-none"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />

          <select
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
          >
            <option value="date_desc">Fecha: mas reciente</option>
            <option value="date_asc">Fecha: mas antigua</option>
            <option value="client_asc">Cliente: A-Z</option>
            <option value="total_desc">Total: mayor a menor</option>
            <option value="total_asc">Total: menor a mayor</option>
            <option value="folio_asc">Folio</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-[#B3B3B8]">
            <input
              type="checkbox"
              checked={groupByClient}
              onChange={(event) => setGroupByClient(event.target.checked)}
            />
            Agrupar por cliente
          </label>

          <div className="flex items-center gap-4">
            <p className="text-sm text-[#77777D]">
              Mostrando {filteredInvoices.length} de {invoices.length} facturas.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2 text-sm font-semibold text-[#B3B3B8] hover:bg-[#2A2A30]"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#1F1F24] bg-[#151518]">
        <div className="overflow-x-auto">
          <div className="grid min-w-[1600px] grid-cols-[130px_130px_1fr_1fr_130px_150px_140px_150px_170px_130px_100px] gap-4 border-b border-[#2A2A30] px-5 py-4 text-sm font-semibold text-[#B3B3B8]">
            <p>Folio</p>
            <p>Fecha</p>
            <p>Cliente</p>
            <p>Proyecto</p>
            <p>Total</p>
            <p>Pago CFDI</p>
            <p>Estado</p>
            <p>Actualizar</p>
            <p>{facturamaEnv === "production" ? "CFDI" : "Sandbox"}</p>
            <p>Archivos</p>
            <p>Acciones</p>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-[#77777D]">
              {invoices.length === 0
                ? "Aun no hay facturas internas."
                : "Ninguna factura coincide con los filtros."}
            </div>
          ) : (
            <div className="min-w-[1600px] divide-y divide-[#2A2A30]">
              {groups.map((group) => (
                <div key={group.label || "__all__"}>
                  {group.label ? (
                    <div className="bg-[#1A1A1F] px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#B3B3B8]">
                      {group.label} ({group.items.length})
                    </div>
                  ) : null}
                  <div className="divide-y divide-[#2A2A30]">
                    {group.items.map((invoice) => renderRow(invoice))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
