"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";
import {
  getInvoiceIva,
  getInvoicePaymentFormLabel,
  getInvoicePaymentMethodLabel,
  getInvoiceSubtotal,
  getInvoiceTotal,
  invoiceStatusClasses,
  invoiceStatusLabels,
  invoiceStatuses,
  normalizeInvoiceStatus,
  type ProjectInvoice,
} from "@/lib/invoices";
import { getCfdiUseCode, type FiscalClientData } from "@/lib/fiscalData";
import InvoiceFileLinks, {
  type FiscalDocumentEmailLog,
} from "@/app/(admin)/invoices/InvoiceFileLinks";
import InvoiceStatusSelect from "@/app/(admin)/invoices/InvoiceStatusSelect";
import InvoiceCfdiUseSelect from "@/app/(admin)/invoices/InvoiceCfdiUseSelect";
import StampInvoiceButton from "@/app/(admin)/invoices/StampInvoiceButton";
import DeleteDraftInvoiceButton from "@/app/(admin)/invoices/DeleteDraftInvoiceButton";
import CancelInvoiceButton from "@/app/(admin)/invoices/CancelInvoiceButton";
import ReplaceInvoiceButton from "@/app/(admin)/invoices/ReplaceInvoiceButton";
import PaymentComplementPanel from "@/app/(admin)/invoices/PaymentComplementPanel";
import type { PaymentFormCatalogItem } from "@/lib/paymentTerms";

type ProjectPaymentForComplement = {
  id: number;
  payment_date: string | null;
  payment_method: string | null;
  payment_form_code?: string | null;
  payment_reference: string | null;
  amount_mxn: number | null;
};

type PaymentComplementForPanel = {
  id: number;
  project_invoice_id?: number | null;
  status: string | null;
  partiality_number: number | null;
  previous_balance_mxn: number | null;
  amount_paid_mxn: number | null;
  paid_amount_mxn?: number | null;
  source_payment_amount_mxn?: number | null;
  manual_amount_override?: boolean | null;
  manual_override_reason?: string | null;
  outstanding_balance_mxn: number | null;
  payment_date: string | null;
  payment_form_code: string | null;
  payload_preview: unknown;
  facturama_id?: string | null;
  sat_uuid?: string | null;
  pdf_url?: string | null;
  xml_url?: string | null;
  last_error?: string | null;
  facturama_response?: unknown;
  issued_by_user_id?: string | null;
  issued_by_name?: string | null;
  issued_at?: string | null;
  created_at?: string | null;
  cancellation_status?: string | null;
  cancellation_motive?: string | null;
  cancelled_at?: string | null;
  cancellation_acuse_xml?: string | null;
};

type SortKey = "date_desc" | "date_asc" | "total_desc" | "total_asc" | "folio_asc";

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX");
}

function includesSearch(value: string | null | undefined, search: string) {
  return (value || "").toLowerCase().includes(search);
}

type TableInvoice = ProjectInvoice & {
  hasAcuse?: boolean;
  hasLiveReplacement?: boolean;
};

type Props = {
  invoices: TableInvoice[];
  client: FiscalClientData | null;
  paymentComplementsEnabled: boolean;
  paymentComplementsStampingEnabled: boolean;
  complementEnv: "sandbox" | "production";
  paymentComplementsWithIssuers: PaymentComplementForPanel[];
  projectPayments: ProjectPaymentForComplement[];
  paymentForms: PaymentFormCatalogItem[];
  emailLogsByInvoice: Map<number, FiscalDocumentEmailLog[]>;
  emailLogsByPaymentComplement: Map<number, FiscalDocumentEmailLog[]>;
  facturamaEnv: "sandbox" | "production";
  sandboxReceiverNotice: string | null;
  facturamaProductionEnabled: boolean;
  canCancel: boolean;
  canReplace: boolean;
};

export default function ProjectInvoicesTableClient({
  invoices,
  client,
  paymentComplementsEnabled,
  paymentComplementsStampingEnabled,
  complementEnv,
  paymentComplementsWithIssuers,
  projectPayments,
  paymentForms,
  emailLogsByInvoice,
  emailLogsByPaymentComplement,
  facturamaEnv,
  sandboxReceiverNotice,
  facturamaProductionEnabled,
  canCancel,
  canReplace,
}: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date_desc");

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = invoices.filter((invoice) => {
      const status = normalizeInvoiceStatus(invoice.status);

      const matchesSearch =
        !normalizedSearch ||
        includesSearch(invoice.internal_folio, normalizedSearch) ||
        includesSearch(invoice.sat_uuid, normalizedSearch);

      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const invoiceDate = invoice.invoice_date || "";
      const matchesDateFrom = !dateFrom || invoiceDate >= dateFrom;
      const matchesDateTo = !dateTo || invoiceDate <= dateTo;

      return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
    });

    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "date_asc":
          return (a.invoice_date || "").localeCompare(b.invoice_date || "");
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
  }, [invoices, search, statusFilter, dateFrom, dateTo, sortKey]);

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setSortKey("date_desc");
  }

  return (
    <>
      <section className="mb-6 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_1fr_130px_130px_1fr]">
          <input
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            placeholder="Buscar por folio o UUID..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

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
            <option value="total_desc">Total: mayor a menor</option>
            <option value="total_asc">Total: menor a mayor</option>
            <option value="folio_asc">Folio</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
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
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#1F1F24] bg-[#151518]">
        <div className="overflow-x-auto">
          <div className="grid min-w-[1420px] grid-cols-[130px_130px_130px_130px_130px_150px_140px_150px_170px_110px_100px] gap-4 border-b border-[#2A2A30] px-5 py-4 text-sm font-semibold text-[#B3B3B8]">
            <p>Folio</p>
            <p>Fecha</p>
            <p>Subtotal</p>
            <p>IVA</p>
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
                ? "No hay facturas asociadas."
                : "Ninguna factura coincide con los filtros."}
            </div>
          ) : (
            <div className="min-w-[1420px] divide-y divide-[#2A2A30]">
              {filteredInvoices.map((invoice) => {
                const status = normalizeInvoiceStatus(invoice.status);
                const invoiceComplements = paymentComplementsWithIssuers.filter(
                  (complement) =>
                    Number(complement.project_invoice_id) === Number(invoice.id)
                );
                return (
                  <div key={invoice.id}>
                    <div className="grid grid-cols-[130px_130px_130px_130px_130px_150px_140px_150px_170px_110px_100px] gap-4 px-5 py-4 text-sm">
                      <div>
                        <p className="font-semibold text-[#9E1B32]">
                          {invoice.internal_folio ||
                            `FAC-${String(invoice.id).padStart(4, "0")}`}
                        </p>
                        <p className="mt-1 text-xs text-[#77777D]">ID #{invoice.id}</p>
                      </div>
                      <p>{formatDate(invoice.invoice_date)}</p>
                      <p>{formatCurrency(getInvoiceSubtotal(invoice), "MXN")}</p>
                      <p>{formatCurrency(getInvoiceIva(invoice), "MXN")}</p>
                      <p className="font-semibold">
                        {formatCurrency(getInvoiceTotal(invoice), "MXN")}
                      </p>
                      <div className="space-y-1 text-xs text-[#B3B3B8]">
                        <p className="font-semibold text-white">
                          {getInvoicePaymentMethodLabel(invoice)}
                        </p>
                        <p>{getInvoicePaymentFormLabel(invoice)}</p>
                        {invoice.requires_payment_complement ? (
                          <span className="inline-flex rounded-full border border-[#614620] bg-[#322514] px-2 py-1 text-[#F4C66A]">
                            Requiere complemento de pago
                          </span>
                        ) : null}
                        {invoice.payment_complement_status === "pending" &&
                        normalizeInvoiceStatus(invoice.status) === "issued" ? (
                          <p className="text-[#F4C66A]">
                            Complemento de pago pendiente.
                          </p>
                        ) : null}
                        <InvoiceCfdiUseSelect
                          invoiceId={invoice.id}
                          status={invoice.status}
                          invoiceCfdiUse={invoice.cfdi_use}
                          clientCfdiUse={getCfdiUseCode(client)}
                          canEdit={canReplace}
                        />
                        {invoice.replaces_invoice_id ? (
                          <span className="inline-flex rounded-full border border-[#3A3A42] bg-[#222228] px-2 py-1 text-[10px] text-[#B3B3B8]">
                            Sustituye a #{invoice.replaces_invoice_id}
                          </span>
                        ) : null}
                      </div>
                      <span
                        className={`inline-flex h-fit w-fit rounded-full border px-3 py-1 text-xs ${invoiceStatusClasses[status]}`}
                      >
                        {invoiceStatusLabels[status]}
                      </span>
                      <InvoiceStatusSelect
                        invoiceId={invoice.id}
                        currentStatus={invoice.status}
                      />
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
                        emailLogs={emailLogsByInvoice.get(invoice.id) || []}
                      />
                      <div className="flex flex-col items-start gap-2">
                        <DeleteDraftInvoiceButton
                          invoiceId={invoice.id}
                          status={invoice.status}
                          facturamaId={invoice.facturama_id}
                          internalFolio={invoice.internal_folio}
                        />
                        <ReplaceInvoiceButton
                          invoiceId={invoice.id}
                          status={invoice.status}
                          facturamaId={invoice.facturama_id}
                          satUuid={invoice.sat_uuid}
                          internalFolio={invoice.internal_folio}
                          hasLiveReplacement={invoice.hasLiveReplacement}
                          canReplace={canReplace}
                        />
                        <CancelInvoiceButton
                          invoiceId={invoice.id}
                          status={invoice.status}
                          facturamaId={invoice.facturama_id}
                          satUuid={invoice.sat_uuid}
                          internalFolio={invoice.internal_folio}
                          canCancel={canCancel}
                          cancellationStatus={invoice.cancellation_status}
                          cancellationMotive={invoice.cancellation_motive}
                          hasAcuse={invoice.hasAcuse}
                        />
                      </div>
                    </div>
                    {paymentComplementsEnabled ? (
                      <div className="px-5 pb-5">
                        <PaymentComplementPanel
                          invoice={invoice}
                          clientName={client?.name || client?.tax_business_name || null}
                          billingEmail={client?.billing_email || null}
                          clientPhone={client?.phone || null}
                          payments={projectPayments}
                          complements={invoiceComplements}
                          emailLogsByComplementId={emailLogsByPaymentComplement}
                          paymentForms={paymentForms}
                          stampingEnabled={paymentComplementsStampingEnabled}
                          complementEnv={complementEnv}
                          canCancel={canCancel}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
