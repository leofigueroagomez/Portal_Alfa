import Link from "next/link";
import { Landmark, ReceiptText } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { getCurrentUserProfile } from "@/services/profile";
import { canManageUsers } from "@/lib/permissions";
import { formatCurrency } from "@/lib/format";
import { getFacturamaSandboxReceiverNotice } from "@/lib/facturama";
import {
  getCurrentMonthRange,
  getInvoiceRelation,
  getInvoiceTotal,
  invoiceStatusClasses,
  invoiceStatusLabels,
  isCollectedStatus,
  isInvoicedStatus,
  isReceivableStatus,
  normalizeInvoiceStatus,
  type ProjectInvoice,
} from "@/lib/invoices";
import type { FiscalClientData } from "@/lib/fiscalData";
import { satBillingProviders } from "@/lib/satBillingProviders";
import InvoiceForm from "./InvoiceForm";
import InvoiceFileLinks from "./InvoiceFileLinks";
import InvoiceStatusSelect from "./InvoiceStatusSelect";
import StampInvoiceButton from "./StampInvoiceButton";

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

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX");
}

function getQuoteTotal(quote: Quote) {
  return Number(quote.total_mxn ?? quote.grand_total ?? 0);
}

export default async function InvoicesPage() {
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentUserProfile();
  const allowManualInvoices = canManageUsers(profile?.role);
  const sandboxReceiverNotice = getFacturamaSandboxReceiverNotice();

  const [invoicesResult, clientsResult, projectsResult, quotesResult] = await Promise.all([
    supabase
      .from("project_invoices")
      .select(
        "id, internal_folio, client_project_id, client_id, invoice_date, subtotal_mxn, iva_mxn, total_mxn, subtotal, iva, total, status, facturama_id, xml_url, pdf_url, sat_uuid, clients(id, name, tax_rfc, tax_business_name, tax_regime, default_cfdi_use, fiscal_regime, cfdi_use, tax_zip_code, billing_email), client_projects(name)"
      )
      .order("invoice_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("clients")
      .select("id, name, tax_rfc, tax_business_name, tax_regime, default_cfdi_use, fiscal_regime, cfdi_use, tax_zip_code, billing_email")
      .order("name"),
    supabase.from("client_projects").select("id, client_id, name, estimated_value_mxn"),
    supabase
      .from("quotes")
      .select("id, client_project_id, total_mxn, grand_total")
      .eq("status", "approved"),
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

  const invoices = (invoicesResult.data || []) as ProjectInvoice[];
  const clients = clientsResult.error ? [] : ((clientsResult.data || []) as FiscalClientData[]);
  const projects = projectsResult.error ? [] : ((projectsResult.data || []) as Project[]);
  const quotes = quotesResult.error ? [] : ((quotesResult.data || []) as Quote[]);
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
            Facturama esta conectado en modo sandbox. Produccion queda bloqueada desde servidor.
          </p>
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
                    ? "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]"
                    : "border-[#2A2A30] bg-[#222228] text-[#B3B3B8]"
                }`}
              >
                {provider.name} - {provider.mode === "sandbox" ? "Activo" : "Planeado"}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#1F1F24] bg-[#151518]">
        <div className="overflow-x-auto">
          <div className="grid min-w-[1360px] grid-cols-[130px_130px_1fr_1fr_130px_140px_150px_170px_130px] gap-4 border-b border-[#2A2A30] px-5 py-4 text-sm font-semibold text-[#B3B3B8]">
            <p>Folio</p>
            <p>Fecha</p>
            <p>Cliente</p>
            <p>Proyecto</p>
            <p>Total</p>
            <p>Estado</p>
            <p>Actualizar</p>
            <p>Sandbox</p>
            <p>Archivos</p>
          </div>

          {invoices.length === 0 ? (
            <div className="p-8 text-[#77777D]">Aun no hay facturas internas.</div>
          ) : (
            <div className="min-w-[1360px] divide-y divide-[#2A2A30]">
              {invoices.map((invoice) => {
                const status = normalizeInvoiceStatus(invoice.status);
                const client = getInvoiceRelation(invoice.clients);
                const project = getInvoiceRelation(invoice.client_projects);
                return (
                  <div
                    key={invoice.id}
                    className="grid grid-cols-[130px_130px_1fr_1fr_130px_140px_150px_170px_130px] gap-4 px-5 py-4 text-sm"
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
                        <span className="mt-1 block text-xs text-[#77777D]">
                          {client.tax_rfc}
                        </span>
                      ) : null}
                    </p>
                    <Link
                      href={`/projects/${invoice.client_project_id}/invoices`}
                      className="text-[#D7A8FF] hover:text-white"
                    >
                      {project?.name || "Sin proyecto"}
                    </Link>
                    <p className="font-semibold">
                      {formatCurrency(getInvoiceTotal(invoice), "MXN")}
                    </p>
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
                    />
                    <InvoiceFileLinks
                      xmlUrl={invoice.xml_url}
                      pdfUrl={invoice.pdf_url}
                      satUuid={invoice.sat_uuid}
                      facturamaId={invoice.facturama_id}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
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
