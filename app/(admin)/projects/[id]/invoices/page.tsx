import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency } from "@/lib/format";
import {
  getInvoiceTotal,
  invoiceStatusClasses,
  invoiceStatusLabels,
  isCollectedStatus,
  isInvoicedStatus,
  isReceivableStatus,
  normalizeInvoiceStatus,
  type ProjectInvoice,
} from "@/lib/invoices";
import InvoiceForm from "@/app/(admin)/invoices/InvoiceForm";
import InvoiceStatusSelect from "@/app/(admin)/invoices/InvoiceStatusSelect";

type ClientProject = {
  id: number;
  client_id: number | null;
  name: string | null;
};

type Client = {
  id: number;
  name: string | null;
  tax_rfc?: string | null;
  tax_business_name?: string | null;
  tax_regime?: string | null;
  default_cfdi_use?: string | null;
  tax_zip_code?: string | null;
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
  const [clientResult, invoicesResult] = await Promise.all([
    projectData.client_id
      ? supabase
          .from("clients")
          .select("id, name, tax_rfc, tax_business_name, tax_regime, default_cfdi_use, tax_zip_code")
          .eq("id", projectData.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("project_invoices")
      .select(
        "id, internal_folio, client_project_id, client_id, invoice_date, subtotal, iva, total, currency, status, xml_url, pdf_url, sat_uuid"
      )
      .eq("client_project_id", projectData.id)
      .order("invoice_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const client = clientResult.error ? null : (clientResult.data as Client | null);
  const invoices = invoicesResult.error ? [] : ((invoicesResult.data || []) as ProjectInvoice[]);
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
        </div>
        <InvoiceForm
          clients={client ? [client] : []}
          projects={[projectData]}
          defaultProjectId={projectData.id}
          defaultClientId={projectData.client_id}
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

      <section className="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-5">
        <FiscalField label="RFC" value={client?.tax_rfc} />
        <FiscalField label="Razon social" value={client?.tax_business_name} />
        <FiscalField label="Regimen fiscal" value={client?.tax_regime} />
        <FiscalField label="Uso CFDI" value={client?.default_cfdi_use} />
        <FiscalField label="CP fiscal" value={client?.tax_zip_code} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#1F1F24] bg-[#151518]">
        <div className="overflow-x-auto">
          <div className="grid min-w-[980px] grid-cols-[150px_140px_130px_130px_130px_140px_150px_110px] gap-4 border-b border-[#2A2A30] px-5 py-4 text-sm font-semibold text-[#B3B3B8]">
            <p>Folio</p>
            <p>Fecha</p>
            <p>Subtotal</p>
            <p>IVA</p>
            <p>Total</p>
            <p>Estado</p>
            <p>Actualizar</p>
            <p>Archivos</p>
          </div>

          {invoices.length === 0 ? (
            <div className="p-8 text-[#77777D]">No hay facturas asociadas.</div>
          ) : (
            <div className="min-w-[980px] divide-y divide-[#2A2A30]">
              {invoices.map((invoice) => {
                const status = normalizeInvoiceStatus(invoice.status);
                return (
                  <div
                    key={invoice.id}
                    className="grid grid-cols-[150px_140px_130px_130px_130px_140px_150px_110px] gap-4 px-5 py-4 text-sm"
                  >
                    <p className="font-semibold text-[#9E1B32]">
                      {invoice.internal_folio || `#${invoice.id}`}
                    </p>
                    <p>{formatDate(invoice.invoice_date)}</p>
                    <p>{formatCurrency(invoice.subtotal, invoice.currency)}</p>
                    <p>{formatCurrency(invoice.iva, invoice.currency)}</p>
                    <p className="font-semibold">
                      {formatCurrency(invoice.total, invoice.currency)}
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
                    <div className="flex items-center gap-2">
                      {invoice.pdf_url ? (
                        <a href={invoice.pdf_url} target="_blank" rel="noreferrer">
                          <FileText size={17} />
                        </a>
                      ) : null}
                      {invoice.xml_url ? (
                        <a href={invoice.xml_url} target="_blank" rel="noreferrer">
                          XML
                        </a>
                      ) : null}
                      {invoice.sat_uuid ? <span title={invoice.sat_uuid}>UUID</span> : null}
                    </div>
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
