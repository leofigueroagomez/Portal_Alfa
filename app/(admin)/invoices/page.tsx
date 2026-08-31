import { Landmark, ReceiptText } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { getCurrentUserProfile } from "@/services/profile";
import { canCancelInvoices, canManageUsers, canViewFinancials } from "@/lib/permissions";
import { formatCurrency } from "@/lib/format";
import {
  getFacturamaEnv,
  getFacturamaProductionEnabled,
  getFacturamaSandboxReceiverNotice,
} from "@/lib/facturama";
import {
  getCurrentMonthRange,
  getInvoiceTotal,
  isCollectedStatus,
  isInvoicedStatus,
  isReceivableStatus,
  type ProjectInvoice,
} from "@/lib/invoices";
import type { FiscalClientData } from "@/lib/fiscalData";
import { satBillingProviders } from "@/lib/satBillingProviders";
import InvoiceForm from "./InvoiceForm";
import { type FiscalDocumentEmailLog } from "./InvoiceFileLinks";
import InvoicesTableClient from "./InvoicesTableClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Project = {
  id: number;
  client_id: number | null;
  name: string | null;
  estimated_value_mxn?: number | null;
};

type Quote = {
  id: number;
  client_project_id: number | null;
  total_mxn: number | null;
  grand_total: number | null;
};

function getQuoteTotal(quote: Quote) {
  return Number(quote.total_mxn ?? quote.grand_total ?? 0);
}

export default async function InvoicesPage() {
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentUserProfile();
  const allowManualInvoices = canManageUsers(profile?.role);
  const canCancel = canCancelInvoices(profile?.role);
  const canReplace = canViewFinancials(profile?.role);
  const facturamaEnv = getFacturamaEnv();
  const facturamaProductionEnabled = getFacturamaProductionEnabled();
  const sandboxReceiverNotice = getFacturamaSandboxReceiverNotice();
  const facturamaEnvLabel =
    facturamaEnv === "production" ? "Facturama Producción" : "Facturama Sandbox";
  const facturamaEnvBadgeClasses =
    facturamaEnv === "production"
      ? facturamaProductionEnabled
        ? "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]"
        : "border-[#6A2A2A] bg-[#351818] text-[#FFB4B4]"
      : "border-[#614620] bg-[#322514] text-[#F4C66A]";
  const productionStatusLabel = facturamaProductionEnabled
    ? "Producción habilitada"
    : "Producción bloqueada";
  const productionStatusClasses = facturamaProductionEnabled
    ? "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]"
    : "border-[#6A2A2A] bg-[#351818] text-[#FFB4B4]";

  const [
    invoicesResult,
    clientsResult,
    projectsResult,
    quotesResult,
    invoiceEmailLogsResult,
  ] = await Promise.all([
    supabase
      .from("project_invoices")
      .select(
        "id, internal_folio, client_project_id, client_id, invoice_date, subtotal_mxn, iva_mxn, total_mxn, subtotal, iva, total, status, facturama_id, xml_url, pdf_url, sat_uuid, cfdi_use, replaces_invoice_id, cancellation_status, cancellation_motive, cancelled_at, cancellation_acuse_xml, payment_method_code, payment_form_code, requires_payment_complement, payment_complement_status, sat_payment_form_catalog(code, name, is_active), clients(id, name, tax_rfc, tax_business_name, tax_regime, default_cfdi_use, fiscal_regime, cfdi_use, tax_zip_code, billing_email, phone), client_projects(name)"
      )
      .order("invoice_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("clients")
      .select("id, name, tax_rfc, tax_business_name, tax_regime, default_cfdi_use, fiscal_regime, cfdi_use, tax_zip_code, billing_email, phone")
      .order("name"),
    supabase.from("client_projects").select("id, client_id, name, estimated_value_mxn"),
    supabase
      .from("quotes")
      .select("id, client_project_id, total_mxn, grand_total")
      .eq("status", "approved")
      .eq("is_latest", true),
    supabase
      .from("fiscal_document_email_logs")
      .select("id, document_type, document_id, document_uuid, to_email, cc_email, subject, message, status, resend_email_id, error_message, sent_at, created_at")
      .eq("document_type", "invoice")
      .order("created_at", { ascending: false }),
  ]);

  if (invoicesResult.error) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <section className="rounded-2xl border border-[#614620] bg-[#322514] p-6 text-[#F4C66A]">
          Ejecuta `sql/20260602_internal_invoicing.sql` para habilitar facturacion interna.
        </section>
      </main>
    );
  }

  const rawInvoices = (invoicesResult.data || []) as (ProjectInvoice & {
    cancellation_acuse_xml?: string | null;
  })[];
  // Facturas vivas (no canceladas) que declaran sustituir a otra.
  const liveReplacementOriginals = new Set<number>();
  for (const invoice of rawInvoices) {
    if (invoice.replaces_invoice_id && String(invoice.status) !== "cancelled") {
      liveReplacementOriginals.add(Number(invoice.replaces_invoice_id));
    }
  }
  const invoices: (ProjectInvoice & {
    hasAcuse: boolean;
    hasLiveReplacement: boolean;
  })[] = rawInvoices.map(({ cancellation_acuse_xml, ...invoice }) => ({
    ...invoice,
    hasAcuse: Boolean(cancellation_acuse_xml),
    hasLiveReplacement: liveReplacementOriginals.has(Number(invoice.id)),
  }));
  const clients = clientsResult.error ? [] : ((clientsResult.data || []) as FiscalClientData[]);
  const projects = projectsResult.error ? [] : ((projectsResult.data || []) as Project[]);
  const quotes = quotesResult.error ? [] : ((quotesResult.data || []) as Quote[]);
  const invoiceEmailLogs = invoiceEmailLogsResult.error
    ? []
    : ((invoiceEmailLogsResult.data || []) as FiscalDocumentEmailLog[]);
  const emailLogsByInvoice: Record<number, FiscalDocumentEmailLog[]> = {};
  for (const log of invoiceEmailLogs) {
    const key = Number(log.document_id);
    emailLogsByInvoice[key] = [...(emailLogsByInvoice[key] || []), log];
  }
  const { start, end } = getCurrentMonthRange();

  const approvedTotalsByProject = new Map<number, number>();
  for (const project of projects) {
    approvedTotalsByProject.set(project.id, Number(project.estimated_value_mxn || 0));
  }
  for (const quote of quotes) {
    if (!quote.client_project_id) continue;
    approvedTotalsByProject.set(
      quote.client_project_id,
      (approvedTotalsByProject.get(quote.client_project_id) || 0) + getQuoteTotal(quote)
    );
  }

  const invoicedByProject = new Map<number, number>();
  for (const invoice of invoices) {
    if (!invoice.client_project_id || !isInvoicedStatus(invoice.status)) continue;
    invoicedByProject.set(
      invoice.client_project_id,
      (invoicedByProject.get(invoice.client_project_id) || 0) + getInvoiceTotal(invoice)
    );
  }

  const billedThisMonth = invoices
    .filter((invoice) => {
      const date = invoice.invoice_date || "";
      return date >= start && date < end && isInvoicedStatus(invoice.status);
    })
    .reduce((sum, invoice) => sum + getInvoiceTotal(invoice), 0);
  const collected = invoices
    .filter((invoice) => isCollectedStatus(invoice.status))
    .reduce((sum, invoice) => sum + getInvoiceTotal(invoice), 0);
  const pendingCollection = invoices
    .filter((invoice) => isReceivableStatus(invoice.status))
    .reduce((sum, invoice) => sum + getInvoiceTotal(invoice), 0);
  const pendingBilling = [...approvedTotalsByProject.entries()].reduce((sum, [projectId, total]) => {
    return sum + Math.max(total - (invoicedByProject.get(projectId) || 0), 0);
  }, 0);

  const providers = Object.values(satBillingProviders);

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <section className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
            ALFA OS
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Facturacion interna</h1>
          <p className="mt-3 max-w-3xl text-[#B3B3B8]">
            Control manual de facturas por proyecto, preparado para futura integracion SAT.
          </p>
          <span className={`mt-4 inline-flex rounded-full border px-3 py-1 text-sm ${facturamaEnvBadgeClasses}`}>
            {facturamaEnvLabel}
          </span>
          {facturamaEnv === "production" ? (
            <span className={`ml-2 mt-4 inline-flex rounded-full border px-3 py-1 text-sm ${productionStatusClasses}`}>
              {productionStatusLabel}
            </span>
          ) : null}
        </div>
        <InvoiceForm
          clients={clients}
          projects={projects}
          allowManual={allowManualInvoices}
        />
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Facturado mes" value={formatCurrency(billedThisMonth, "MXN")} />
        <MetricCard label="Pendiente facturar" value={formatCurrency(pendingBilling, "MXN")} />
        <MetricCard label="Cobrado" value={formatCurrency(collected, "MXN")} />
        <MetricCard label="Pendiente cobrar" value={formatCurrency(pendingCollection, "MXN")} />
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 xl:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <ReceiptText size={20} className="text-[#9E1B32]" />
            <h2 className="text-xl font-semibold">Estado SAT</h2>
          </div>
          <p className="text-sm text-[#B3B3B8]">
            Ambiente detectado desde servidor: {facturamaEnvLabel}.
          </p>
          {facturamaEnv === "production" ? (
            <p className={`mt-3 rounded-xl border p-3 text-sm ${productionStatusClasses}`}>
              {productionStatusLabel}
            </p>
          ) : null}
          {sandboxReceiverNotice ? (
            <p className="mt-3 rounded-xl border border-[#614620] bg-[#322514] p-3 text-sm text-[#F4C66A]">
              {sandboxReceiverNotice}
            </p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Landmark size={20} className="text-[#9E1B32]" />
            <h2 className="text-xl font-semibold">PACs</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {providers.map((provider) => (
              <span
                key={provider.id}
                className={`rounded-full border px-3 py-1 text-sm ${
                  provider.active
                    ? facturamaEnvBadgeClasses
                    : "border-[#2A2A30] bg-[#222228] text-[#B3B3B8]"
                }`}
              >
                {provider.id === "facturama" ? facturamaEnvLabel : provider.name} -{" "}
                {provider.active ? "Activo" : "Planeado"}
              </span>
            ))}
          </div>
        </div>
      </section>

      <InvoicesTableClient
        invoices={invoices}
        emailLogsByInvoice={emailLogsByInvoice}
        facturamaEnv={facturamaEnv}
        sandboxReceiverNotice={sandboxReceiverNotice}
        facturamaProductionEnabled={facturamaProductionEnabled}
        canCancel={canCancel}
        canReplace={canReplace}
      />
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
      <p className="mb-2 text-sm text-[#B3B3B8]">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
