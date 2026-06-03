import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { getCurrentUserProfile } from "@/services/profile";
import { canManageUsers } from "@/lib/permissions";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  getFacturamaEnv,
  getFacturamaProductionEnabled,
  getFacturamaSandboxReceiverNotice,
} from "@/lib/facturama";
import {
  getInvoiceIva,
  getInvoicePaymentFormLabel,
  getInvoicePaymentMethodLabel,
  getInvoiceSubtotal,
  getInvoiceTotal,
  invoiceStatusClasses,
  invoiceStatusLabels,
  normalizeInvoiceStatus,
  type ProjectInvoice,
} from "@/lib/invoices";
import { ClientFiscalDataButton } from "@/components/ClientFiscalDataModal";
import type { FiscalClientData } from "@/lib/fiscalData";
import InvoiceFileLinks from "@/app/(admin)/invoices/InvoiceFileLinks";
import InvoiceForm from "@/app/(admin)/invoices/InvoiceForm";
import StampInvoiceButton from "@/app/(admin)/invoices/StampInvoiceButton";
import ProjectPaymentForm from "./ProjectPaymentForm";

type ClientProject = {
  id: number;
  client_id: number | null;
  name: string | null;
};

type Quote = {
  id: number;
  quote_number: string | null;
  equipment_total: number | null;
  labor_total: number | null;
  total_mxn: number | null;
  grand_total: number | null;
  exchange_rate: number | null;
};

type ProjectPayment = {
  id: number;
  payment_date: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_category: string | null;
  currency: string | null;
  amount: number | null;
  exchange_rate: number | null;
  amount_mxn: number | null;
  notes: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX");
}

function getQuoteExchangeRate(quote: Quote) {
  return Number(quote.exchange_rate || 1);
}

function getQuoteTotalMxn(quote: Quote) {
  return (
    Number(quote.total_mxn) ||
    Number(quote.grand_total) ||
    Number(quote.equipment_total || 0) * getQuoteExchangeRate(quote) +
      Number(quote.labor_total || 0)
  );
}

function getCategoryLabel(category: string | null | undefined) {
  return category === "labor" ? "Mano de obra" : "Equipos";
}

function getPaymentAmountMxn(payment: ProjectPayment) {
  if (payment.amount_mxn != null) return Number(payment.amount_mxn || 0);
  if ((payment.currency || "MXN").toUpperCase() === "USD") {
    return Number(payment.amount || 0) * Number(payment.exchange_rate || 0);
  }
  return Number(payment.amount || 0);
}

export default async function ProjectAccountStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentUserProfile();
  const allowManualInvoices = canManageUsers(profile?.role);
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
  const { id } = await params;

  const { data: project, error } = await supabase
    .from("client_projects")
    .select("id, client_id, name")
    .eq("id", id)
    .maybeSingle();

  if (error || !project) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <Link
          href="/projects"
          className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]"
        >
          <ArrowLeft size={18} />
          Volver a proyectos
        </Link>
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8">
          Proyecto no encontrado.
        </section>
      </main>
    );
  }

  const projectData = project as ClientProject;
  const [{ data: client }, { data: approvedQuotes }, paymentsResult] = await Promise.all([
    projectData.client_id
      ? supabase
          .from("clients")
          .select("id, name, tax_rfc, tax_business_name, tax_regime, default_cfdi_use, fiscal_regime, cfdi_use, tax_zip_code, billing_email")
          .eq("id", projectData.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("quotes")
      .select("id, quote_number, equipment_total, labor_total, total_mxn, grand_total, exchange_rate")
      .eq("client_project_id", projectData.id)
      .eq("status", "approved")
      .order("created_at", { ascending: true }),
    supabase
      .from("project_payments")
      .select(
        "id, payment_date, payment_method, payment_reference, payment_category, currency, amount, exchange_rate, amount_mxn, notes"
      )
      .eq("client_project_id", projectData.id)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const invoicesResult = await supabase
    .from("project_invoices")
    .select(
      "id, internal_folio, client_project_id, client_id, invoice_date, subtotal_mxn, iva_mxn, total_mxn, subtotal, iva, total, status, facturama_id, xml_url, pdf_url, sat_uuid, payment_method_code, payment_form_code, requires_payment_complement, payment_complement_status, sat_payment_form_catalog(code, name, is_active)"
    )
    .eq("client_project_id", projectData.id)
    .order("invoice_date", { ascending: false })
    .order("created_at", { ascending: false });

  const clientData = client as FiscalClientData | null;
  const quotes = (approvedQuotes || []) as Quote[];
  const payments = paymentsResult.error ? [] : ((paymentsResult.data || []) as ProjectPayment[]);
  const invoices = invoicesResult.error
    ? []
    : ((invoicesResult.data || []) as ProjectInvoice[]);

  const totalEquipmentUsd = quotes.reduce(
    (sum, quote) => sum + Number(quote.equipment_total || 0),
    0
  );
  const totalLaborMxn = quotes.reduce(
    (sum, quote) => sum + Number(quote.labor_total || 0),
    0
  );
  const equipmentTotalMxn = quotes.reduce(
    (sum, quote) =>
      sum + Number(quote.equipment_total || 0) * getQuoteExchangeRate(quote),
    0
  );
  const projectExchangeRate =
    totalEquipmentUsd > 0
      ? equipmentTotalMxn / totalEquipmentUsd
      : quotes.find((quote) => Number(quote.exchange_rate || 0) > 0)?.exchange_rate || 1;
  const approvedTotalMxn = quotes.reduce(
    (sum, quote) => sum + getQuoteTotalMxn(quote),
    0
  );

  const paidEquipmentMxn = payments
    .filter((payment) => payment.payment_category === "equipment")
    .reduce((sum, payment) => sum + getPaymentAmountMxn(payment), 0);
  const paidEquipmentUsd = payments
    .filter((payment) => payment.payment_category === "equipment")
    .reduce((sum, payment) => {
      if ((payment.currency || "MXN").toUpperCase() === "USD") {
        return sum + Number(payment.amount || 0);
      }

      return sum + Number(payment.amount || 0) / Number(projectExchangeRate || 1);
    }, 0);
  const paidLaborMxn = payments
    .filter((payment) => payment.payment_category === "labor")
    .reduce((sum, payment) => sum + getPaymentAmountMxn(payment), 0);
  const totalPaidMxn = paidEquipmentMxn + paidLaborMxn;
  const pendingEquipmentUsd = Math.max(totalEquipmentUsd - paidEquipmentUsd, 0);
  const pendingLaborMxn = Math.max(totalLaborMxn - paidLaborMxn, 0);
  const pendingTotalMxn = Math.max(approvedTotalMxn - totalPaidMxn, 0);
  const paidPercent =
    approvedTotalMxn > 0 ? Math.min((totalPaidMxn / approvedTotalMxn) * 100, 100) : 0;

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link
        href={`/projects/${projectData.id}`}
        className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]"
      >
        <ArrowLeft size={18} />
        Volver al proyecto
      </Link>

      <section className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
            ESTADO DE CUENTA
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            {projectData.name || "Proyecto operativo"}
          </h1>
          <p className="mt-3 text-[#B3B3B8]">
            {clientData?.name || "Sin cliente"} / Control financiero interno
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

        <div className="flex flex-wrap gap-3">
          <Link
            href={`/projects/${projectData.id}/account-statement/print`}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
          >
            <FileText size={18} />
            Imprimir estado
          </Link>
          <ProjectPaymentForm
            projectId={projectData.id}
            defaultExchangeRate={Number(projectExchangeRate || 1)}
          />
        </div>
      </section>

      {paymentsResult.error ? (
        <section className="mb-8 rounded-2xl border border-[#614620] bg-[#322514] p-4 text-sm text-[#F4C66A]">
          Ejecuta el SQL de project_payments para habilitar el estado de cuenta.
        </section>
      ) : null}

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Total proyecto</p>
          <p className="text-2xl font-bold text-[#9E1B32]">
            {formatCurrency(approvedTotalMxn, "MXN")}
          </p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">% cobrado</p>
          <p className="text-2xl font-bold">{formatNumber(paidPercent)}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#222228]">
            <div
              className="h-full rounded-full bg-[#9E1B32]"
              style={{ width: `${paidPercent}%` }}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Cobrado total</p>
          <p className="text-2xl font-bold">{formatCurrency(totalPaidMxn, "MXN")}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Saldo pendiente</p>
          <p className="text-2xl font-bold text-[#F4C66A]">
            {formatCurrency(pendingTotalMxn, "MXN")}
          </p>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Total equipos USD</p>
          <p className="text-xl font-semibold">{formatCurrency(totalEquipmentUsd, "USD")}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Cobrado equipos USD</p>
          <p className="text-xl font-semibold">{formatCurrency(paidEquipmentUsd, "USD")}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Saldo pendiente equipos USD</p>
          <p className="text-xl font-semibold text-[#F4C66A]">
            {formatCurrency(pendingEquipmentUsd, "USD")}
          </p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Total mano obra MXN</p>
          <p className="text-xl font-semibold">{formatCurrency(totalLaborMxn, "MXN")}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Cobrado mano obra MXN</p>
          <p className="text-xl font-semibold">{formatCurrency(paidLaborMxn, "MXN")}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Saldo pendiente mano obra MXN</p>
          <p className="text-xl font-semibold text-[#F4C66A]">
            {formatCurrency(pendingLaborMxn, "MXN")}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Pagos registrados</h2>
            <p className="mt-1 text-sm text-[#B3B3B8]">
              Registro manual interno para cobranza operativa.
            </p>
          </div>
        </div>

        {payments.length === 0 ? (
          <p className="text-[#77777D]">Aun no hay pagos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#2A2A30] text-left text-[#B3B3B8]">
                  <th className="px-3 py-3">Fecha</th>
                  <th className="px-3 py-3">Forma pago</th>
                  <th className="px-3 py-3">Referencia</th>
                  <th className="px-3 py-3">Categoria</th>
                  <th className="px-3 py-3">Moneda</th>
                  <th className="px-3 py-3 text-right">Monto</th>
                  <th className="px-3 py-3 text-right">TC</th>
                  <th className="px-3 py-3 text-right">Monto MXN</th>
                  <th className="px-3 py-3">Notas</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-[#222228]">
                    <td className="px-3 py-3">{formatDate(payment.payment_date)}</td>
                    <td className="px-3 py-3">{payment.payment_method || "-"}</td>
                    <td className="px-3 py-3">{payment.payment_reference || "-"}</td>
                    <td className="px-3 py-3">{getCategoryLabel(payment.payment_category)}</td>
                    <td className="px-3 py-3">{payment.currency || "MXN"}</td>
                    <td className="px-3 py-3 text-right">
                      {formatCurrency(payment.amount, payment.currency)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {payment.exchange_rate ? formatNumber(payment.exchange_rate) : "-"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatCurrency(getPaymentAmountMxn(payment), "MXN")}
                    </td>
                    <td className="max-w-[240px] px-3 py-3 text-[#B3B3B8]">
                      {payment.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Facturas asociadas</h2>
            <p className="mt-1 text-sm text-[#B3B3B8]">
              Registro interno de facturacion vinculado a este proyecto.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <InvoiceForm
              clients={clientData ? [clientData] : []}
              projects={[projectData]}
              defaultProjectId={projectData.id}
              defaultClientId={projectData.client_id}
              allowManual={allowManualInvoices}
            />
            {clientData ? <ClientFiscalDataButton client={clientData} /> : null}
            <Link
              href={`/projects/${projectData.id}/invoices`}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
            >
              <FileText size={18} />
              Ver modulo
            </Link>
          </div>
        </div>

        {invoicesResult.error ? (
          <div className="rounded-xl border border-[#614620] bg-[#322514] p-4 text-sm text-[#F4C66A]">
            Ejecuta el SQL de facturacion interna para mostrar facturas asociadas.
          </div>
        ) : invoices.length === 0 ? (
          <p className="text-[#77777D]">Aun no hay facturas asociadas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#2A2A30] text-left text-[#B3B3B8]">
                  <th className="px-3 py-3">Folio</th>
                  <th className="px-3 py-3">Fecha</th>
                  <th className="px-3 py-3 text-right">Subtotal</th>
                  <th className="px-3 py-3 text-right">IVA</th>
                  <th className="px-3 py-3 text-right">Total</th>
                  <th className="px-3 py-3">Pago CFDI</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3">
                    {facturamaEnv === "production" ? "CFDI" : "Sandbox"}
                  </th>
                  <th className="px-3 py-3">SAT</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const status = normalizeInvoiceStatus(invoice.status);
                  return (
                    <tr key={invoice.id} className="border-b border-[#222228]">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-[#9E1B32]">
                          {invoice.internal_folio || `FAC-${String(invoice.id).padStart(4, "0")}`}
                        </p>
                        <p className="mt-1 text-xs text-[#77777D]">ID #{invoice.id}</p>
                      </td>
                      <td className="px-3 py-3">{formatDate(invoice.invoice_date)}</td>
                      <td className="px-3 py-3 text-right">
                        {formatCurrency(getInvoiceSubtotal(invoice), "MXN")}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {formatCurrency(getInvoiceIva(invoice), "MXN")}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold">
                        {formatCurrency(getInvoiceTotal(invoice), "MXN")}
                      </td>
                      <td className="px-3 py-3 text-xs text-[#B3B3B8]">
                        <p className="font-semibold text-white">
                          {getInvoicePaymentMethodLabel(invoice)}
                        </p>
                        <p className="mt-1">{getInvoicePaymentFormLabel(invoice)}</p>
                        {invoice.requires_payment_complement ? (
                          <span className="mt-2 inline-flex rounded-full border border-[#614620] bg-[#322514] px-2 py-1 text-[#F4C66A]">
                            Requiere complemento de pago
                          </span>
                        ) : null}
                        {invoice.payment_complement_status === "pending" &&
                        normalizeInvoiceStatus(invoice.status) === "issued" ? (
                          <p className="mt-2 text-[#F4C66A]">
                            Complemento de pago pendiente.
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs ${invoiceStatusClasses[status]}`}
                        >
                          {invoiceStatusLabels[status]}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <StampInvoiceButton
                          invoiceId={invoice.id}
                          status={invoice.status}
                          facturamaId={invoice.facturama_id}
                          client={clientData}
                          sandboxNotice={sandboxReceiverNotice}
                          facturamaEnv={facturamaEnv}
                          facturamaProductionEnabled={facturamaProductionEnabled}
                        />
                      </td>
                      <td className="px-3 py-3 text-[#B3B3B8]">
                        {invoice.facturama_id ? (
                          <InvoiceFileLinks
                            xmlUrl={invoice.xml_url}
                            pdfUrl={invoice.pdf_url}
                            satUuid={invoice.sat_uuid}
                            facturamaId={invoice.facturama_id}
                          />
                        ) : (
                          "Sin timbrado"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
