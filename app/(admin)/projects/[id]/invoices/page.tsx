import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { getCurrentUserProfile } from "@/services/profile";
import { canManageUsers } from "@/lib/permissions";
import { formatCurrency } from "@/lib/format";
import {
  getFacturamaEnv,
  getFacturamaProductionEnabled,
  getFacturamaSandboxReceiverNotice,
} from "@/lib/facturama";
import { ClientFiscalDataButton } from "@/components/ClientFiscalDataModal";
import {
  getCfdiUseDisplay,
  getFiscalRegimeDisplay,
  type FiscalCatalogItem,
  type FiscalClientData,
} from "@/lib/fiscalData";
import {
  getInvoiceIva,
  getInvoicePaymentFormLabel,
  getInvoicePaymentMethodLabel,
  getInvoiceSubtotal,
  getInvoiceTotal,
  invoiceStatusClasses,
  invoiceStatusLabels,
  isCollectedStatus,
  isInvoicedStatus,
  isReceivableStatus,
  normalizeInvoiceStatus,
  type ProjectInvoice,
} from "@/lib/invoices";
import {
  getPaymentComplementsConfig,
  type PaymentComplementRecord,
} from "@/lib/paymentComplements";
import InvoiceForm from "@/app/(admin)/invoices/InvoiceForm";
import InvoiceFileLinks from "@/app/(admin)/invoices/InvoiceFileLinks";
import InvoiceStatusSelect from "@/app/(admin)/invoices/InvoiceStatusSelect";
import StampInvoiceButton from "@/app/(admin)/invoices/StampInvoiceButton";
import PaymentComplementPanel from "@/app/(admin)/invoices/PaymentComplementPanel";
import type { PaymentFormCatalogItem } from "@/lib/paymentTerms";

type ClientProject = {
  id: number;
  client_id: number | null;
  name: string | null;
};

type ProjectPaymentForComplement = {
  id: number;
  payment_date: string | null;
  payment_method: string | null;
  payment_form_code?: string | null;
  payment_reference: string | null;
  amount_mxn: number | null;
};

type ComplementIssuerProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX");
}

export default async function ProjectInvoicesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const profile = await getCurrentUserProfile();
  const allowManualInvoices = canManageUsers(profile?.role);
  const facturamaEnv = getFacturamaEnv();
  const facturamaProductionEnabled = getFacturamaProductionEnabled();
  const paymentComplementsConfig = getPaymentComplementsConfig();
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
        <Link href="/projects" className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
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
  const [
    clientResult,
    invoicesResult,
    regimesResult,
    cfdiUsesResult,
    projectPaymentsResult,
    paymentComplementsResult,
    paymentFormsResult,
  ] = await Promise.all([
    projectData.client_id
      ? supabase
          .from("clients")
          .select("id, name, tax_rfc, tax_business_name, tax_regime, default_cfdi_use, fiscal_regime, cfdi_use, tax_zip_code, billing_email")
          .eq("id", projectData.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("project_invoices")
      .select(
        "id, internal_folio, client_project_id, client_id, invoice_date, subtotal_mxn, iva_mxn, total_mxn, subtotal, iva, total, status, facturama_id, xml_url, pdf_url, sat_uuid, payment_method_code, payment_form_code, requires_payment_complement, payment_complement_status, sat_payment_form_catalog(code, name, is_active)"
      )
      .eq("client_project_id", projectData.id)
      .order("invoice_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("fiscal_regime_catalog")
      .select("code, name, applies_to_person_type, is_active")
      .order("code"),
    supabase
      .from("cfdi_use_catalog")
      .select("code, name, applies_to_person_type, is_active")
      .order("code"),
    paymentComplementsConfig.enabled
      ? supabase
          .from("project_payments")
          .select("id, payment_date, payment_method, payment_form_code, payment_reference, amount_mxn")
          .eq("client_project_id", projectData.id)
          .order("payment_date", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    paymentComplementsConfig.enabled
      ? supabase
          .from("project_payment_complements")
          .select(
            "id, project_invoice_id, project_payment_id, client_project_id, client_id, status, complement_env, partiality_number, previous_balance_mxn, amount_paid_mxn, paid_amount_mxn, source_payment_amount_mxn, manual_amount_override, manual_override_reason, outstanding_balance_mxn, payment_date, payment_form_code, currency, exchange_rate, payment_reference, payload_preview, facturama_id, sat_uuid, pdf_url, xml_url, last_error, facturama_response, issued_by_user_id, issued_at, created_at"
          )
          .eq("client_project_id", projectData.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    paymentComplementsConfig.enabled
      ? supabase
          .from("sat_payment_form_catalog")
          .select("code, name, is_active")
          .order("code")
      : Promise.resolve({ data: [], error: null }),
  ]);

  const client = clientResult.error ? null : (clientResult.data as FiscalClientData | null);
  const invoices = invoicesResult.error ? [] : ((invoicesResult.data || []) as ProjectInvoice[]);
  const fiscalRegimes = regimesResult.error
    ? []
    : ((regimesResult.data || []) as FiscalCatalogItem[]);
  const cfdiUses = cfdiUsesResult.error
    ? []
    : ((cfdiUsesResult.data || []) as FiscalCatalogItem[]);
  const projectPayments = projectPaymentsResult.error
    ? []
    : ((projectPaymentsResult.data || []) as ProjectPaymentForComplement[]);
  const paymentComplements = paymentComplementsResult.error
    ? []
    : ((paymentComplementsResult.data || []) as PaymentComplementRecord[]);
  const complementIssuerIds = Array.from(
    new Set(
      paymentComplements
        .map((complement) => complement.issued_by_user_id)
        .filter((userId): userId is string => Boolean(userId))
    )
  );
  const issuerProfilesResult =
    complementIssuerIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, email, full_name")
          .in("id", complementIssuerIds)
      : { data: [], error: null };
  const issuerProfiles = issuerProfilesResult.error
    ? []
    : ((issuerProfilesResult.data || []) as ComplementIssuerProfile[]);
  const issuerNameById = new Map(
    issuerProfiles.map((issuer) => [
      issuer.id,
      issuer.full_name || issuer.email || "Usuario ALFA",
    ])
  );
  const paymentComplementsWithIssuers = paymentComplements.map((complement) => ({
    ...complement,
    issued_by_name: complement.issued_by_user_id
      ? issuerNameById.get(complement.issued_by_user_id) || "Usuario ALFA"
      : null,
  }));
  const paymentForms = paymentFormsResult.error
    ? []
    : ((paymentFormsResult.data || []) as PaymentFormCatalogItem[]);
  const billed = invoices
    .filter((invoice) => isInvoicedStatus(invoice.status))
    .reduce((sum, invoice) => sum + getInvoiceTotal(invoice), 0);
  const collected = invoices
    .filter((invoice) => isCollectedStatus(invoice.status))
    .reduce((sum, invoice) => sum + getInvoiceTotal(invoice), 0);
  const pendingCollection = invoices
    .filter((invoice) => isReceivableStatus(invoice.status))
    .reduce((sum, invoice) => sum + getInvoiceTotal(invoice), 0);

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
            FACTURACION
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            {projectData.name || "Proyecto operativo"}
          </h1>
          <p className="mt-3 text-[#B3B3B8]">
            {client?.name || "Sin cliente"} / Facturas internas asociadas.
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
          clients={client ? [client] : []}
          projects={[projectData]}
          defaultProjectId={projectData.id}
          defaultClientId={projectData.client_id}
          allowManual={allowManualInvoices}
        />
      </section>

      {invoicesResult.error ? (
        <section className="mb-8 rounded-2xl border border-[#614620] bg-[#322514] p-4 text-sm text-[#F4C66A]">
          Ejecuta `sql/20260602_internal_invoicing.sql` para habilitar facturas por proyecto.
        </section>
      ) : null}

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Facturado" value={formatCurrency(billed, "MXN")} />
        <MetricCard label="Cobrado" value={formatCurrency(collected, "MXN")} />
        <MetricCard label="Pendiente cobrar" value={formatCurrency(pendingCollection, "MXN")} />
      </section>

      <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Datos fiscales</h2>
            <p className="mt-1 text-sm text-[#B3B3B8]">
              Estos datos se usan para futuros borradores y timbrados.
            </p>
          </div>
          {client ? <ClientFiscalDataButton client={client} /> : null}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <FiscalField label="RFC" value={client?.tax_rfc} />
          <FiscalField label="Razon social" value={client?.tax_business_name} />
          <FiscalField
            label="Regimen fiscal"
            value={client ? getFiscalRegimeDisplay(client, fiscalRegimes) : null}
          />
          <FiscalField
            label="Uso CFDI"
            value={client ? getCfdiUseDisplay(client, cfdiUses) : null}
          />
          <FiscalField label="CP fiscal" value={client?.tax_zip_code} />
          <FiscalField label="Correo facturacion" value={client?.billing_email} />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#1F1F24] bg-[#151518]">
        <div className="overflow-x-auto">
          <div className="grid min-w-[1320px] grid-cols-[130px_130px_130px_130px_130px_150px_140px_150px_170px_110px] gap-4 border-b border-[#2A2A30] px-5 py-4 text-sm font-semibold text-[#B3B3B8]">
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
          </div>

          {invoices.length === 0 ? (
            <div className="p-8 text-[#77777D]">No hay facturas asociadas.</div>
          ) : (
            <div className="min-w-[1320px] divide-y divide-[#2A2A30]">
              {invoices.map((invoice) => {
                const status = normalizeInvoiceStatus(invoice.status);
                const invoiceComplements = paymentComplementsWithIssuers.filter(
                  (complement) => Number(complement.project_invoice_id) === Number(invoice.id)
                );
                return (
                  <div key={invoice.id}>
                    <div className="grid grid-cols-[130px_130px_130px_130px_130px_150px_140px_150px_170px_110px] gap-4 px-5 py-4 text-sm">
                      <div>
                        <p className="font-semibold text-[#9E1B32]">
                          {invoice.internal_folio || `FAC-${String(invoice.id).padStart(4, "0")}`}
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
                        xmlUrl={invoice.xml_url}
                        pdfUrl={invoice.pdf_url}
                        satUuid={invoice.sat_uuid}
                      />
                    </div>
                    {paymentComplementsConfig.enabled ? (
                      <div className="px-5 pb-5">
                        <PaymentComplementPanel
                          invoice={invoice}
                          payments={projectPayments}
                          complements={invoiceComplements}
                          paymentForms={paymentForms}
                          stampingEnabled={paymentComplementsConfig.stampingEnabled}
                          complementEnv={paymentComplementsConfig.env}
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
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
      <p className="mb-2 text-sm text-[#B3B3B8]">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function FiscalField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
      <p className="mb-2 text-sm text-[#B3B3B8]">{label}</p>
      <p className="font-semibold">{value || "Pendiente"}</p>
    </div>
  );
}
