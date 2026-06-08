import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, WalletCards, Wrench, type LucideIcon } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import {
  formatPortalDate,
  getClientPortalContext,
  type ClientPortalInvoice,
} from "@/lib/clientPortal";
import { resolveServicePhotoUrl } from "@/lib/serviceReports";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AccessRow = {
  client_project_id: number;
};

type ServiceReport = {
  id: number;
  service_number: string | null;
  client_id: number | null;
  client_project_id: number | null;
  service_date: string | null;
  performed_by_name: string | null;
  solution_description: string | null;
  recommendations: string | null;
  required_parts_notes: string | null;
  status: string | null;
  labor_sale_mxn: number | null;
  client_projects: { name: string | null } | null;
};

type ServicePhoto = {
  id: number;
  image_url: string | null;
  caption: string | null;
  sort_order: number | null;
  displayUrl: string;
};

type ServiceInvoice = ClientPortalInvoice & {
  source_service_report_id: number | null;
};

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <Icon size={20} className="text-[#9E1B32]" />
      <h2 className="text-2xl font-semibold">{title}</h2>
    </div>
  );
}

function serviceStatusLabel(status: string | null | undefined) {
  if (status === "completed") return "Finalizado";
  if (status === "in_progress") return "En proceso";
  if (status === "pending") return "Pendiente";
  return "Borrador";
}

function invoiceStatusLabel(status: string | null | undefined) {
  if (status === "issued") return "Emitida";
  if (status === "paid") return "Pagada";
  if (status === "cancelled") return "Cancelada";
  return "Borrador";
}

function invoiceTotal(invoice: ServiceInvoice) {
  return Number(invoice.total_mxn ?? invoice.total ?? 0);
}

export default async function PortalServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const serviceId = Number(id);
  if (!Number.isFinite(serviceId) || serviceId <= 0) notFound();

  const { supabase, portalUser } = await getClientPortalContext();
  const [{ data: service }, { data: accessRows }] = await Promise.all([
    supabase
      .from("service_reports")
      .select(
        "id, service_number, client_id, client_project_id, service_date, performed_by_name, solution_description, recommendations, required_parts_notes, status, labor_sale_mxn, client_projects(name)"
      )
      .eq("id", serviceId)
      .eq("client_id", portalUser.client_id)
      .maybeSingle(),
    supabase
      .from("client_portal_project_access")
      .select("client_project_id")
      .eq("client_portal_user_id", portalUser.id)
      .eq("is_active", true),
  ]);

  if (!service) notFound();

  const serviceData = service as unknown as ServiceReport;
  const projectIds = ((accessRows || []) as AccessRow[]).map(
    (row) => row.client_project_id
  );

  if (
    serviceData.client_project_id &&
    !projectIds.includes(serviceData.client_project_id)
  ) {
    notFound();
  }

  const [{ data: invoices }, { data: rawPhotos }] = await Promise.all([
    supabase
      .from("project_invoices")
      .select("id, internal_folio, invoice_date, total_mxn, total, status, sat_uuid, source_service_report_id")
      .eq("source_service_report_id", serviceId)
      .in("status", ["issued", "paid"])
      .order("invoice_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("service_report_photos")
      .select("id, image_url, caption, sort_order")
      .eq("service_report_id", serviceId)
      .order("sort_order", { ascending: true }),
  ]);

  const invoiceList = (invoices || []) as ServiceInvoice[];
  const pendingBalance = invoiceList
    .filter((invoice) => invoice.status === "issued")
    .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0);
  const photos = await Promise.all(
    ((rawPhotos || []) as Omit<ServicePhoto, "displayUrl">[]).map(async (photo) => ({
      ...photo,
      displayUrl: await resolveServicePhotoUrl(supabase.storage, photo.image_url),
    }))
  );

  return (
    <main className="min-h-screen bg-[#F7F6F3] text-[#111111]">
      <section className="mx-auto max-w-6xl px-5 py-8 md:py-12">
        <Link
          href="/portal"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#5F626A] transition hover:text-[#111111]"
        >
          <ArrowLeft size={17} />
          Volver al portal
        </Link>

        <section className="mb-8 grid gap-6 border-b border-black/10 pb-8 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div>
            <p className="mb-3 text-sm font-semibold tracking-[0.28em] text-[#9E1B32]">
              {serviceData.service_number || `SERV-${String(serviceData.id).padStart(4, "0")}`}
            </p>
            <h1 className="text-4xl font-semibold md:text-5xl">Servicio Realizado</h1>
            <p className="mt-4 text-[#5F626A]">
              {serviceData.client_projects?.name || "Servicio sin proyecto relacionado"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <span className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-sm font-semibold text-[#5F626A]">
              {serviceStatusLabel(serviceData.status)}
            </span>
            <span className="inline-flex rounded-full border border-black/10 bg-white px-3 py-1 text-sm text-[#5F626A]">
              {formatPortalDate(serviceData.service_date)}
            </span>
          </div>
        </section>

        <section className="mb-10 grid gap-4 md:grid-cols-3">
          <div className="rounded border border-black/10 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#77777D]">
              Responsable
            </p>
            <p className="mt-3 text-xl font-semibold">
              {serviceData.performed_by_name || "ALFA"}
            </p>
          </div>
          <div className="rounded border border-black/10 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#77777D]">
              Cargo relacionado
            </p>
            <p className="mt-3 text-xl font-semibold">
              {formatCurrency(serviceData.labor_sale_mxn, "MXN")}
            </p>
          </div>
          <div className="rounded border border-black/10 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#77777D]">
              Saldo pendiente
            </p>
            <p className="mt-3 text-xl font-semibold text-[#9E1B32]">
              {formatCurrency(pendingBalance, "MXN")}
            </p>
          </div>
        </section>

        <section className="grid gap-8">
          <div>
            <SectionTitle icon={Wrench} title="Trabajo realizado" />
            <div className="rounded border border-black/10 bg-white p-5">
              <p className="whitespace-pre-line text-[#3A3A42]">
                {serviceData.solution_description || "Servicio registrado por ALFA."}
              </p>
              <h3 className="mb-3 mt-6 text-lg font-semibold">Recomendaciones</h3>
              <p className="whitespace-pre-line text-[#5F626A]">
                {serviceData.recommendations ||
                  serviceData.required_parts_notes ||
                  "Sin recomendaciones adicionales."}
              </p>
            </div>
          </div>

          <div>
            <SectionTitle icon={FileText} title="Evidencias" />
            {photos.length === 0 ? (
              <div className="rounded border border-black/10 bg-white p-6 text-sm text-[#5F626A]">
                Sin evidencias disponibles.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                {photos.map((photo) => (
                  <figure key={photo.id} className="overflow-hidden rounded border border-black/10 bg-white">
                    <img
                      src={photo.displayUrl}
                      alt={photo.caption || "Evidencia"}
                      className="h-56 w-full object-cover"
                    />
                    {photo.caption ? (
                      <figcaption className="p-3 text-sm text-[#5F626A]">
                        {photo.caption}
                      </figcaption>
                    ) : null}
                  </figure>
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionTitle icon={WalletCards} title="Factura y saldo" />
            {invoiceList.length === 0 ? (
              <div className="rounded border border-black/10 bg-white p-6 text-sm text-[#5F626A]">
                No hay factura relacionada con este servicio.
              </div>
            ) : (
              <div className="overflow-hidden rounded border border-black/10 bg-white">
                {invoiceList.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="grid gap-3 border-b border-black/10 p-4 text-sm last:border-b-0 md:grid-cols-[1fr_0.8fr_0.8fr_1fr]"
                  >
                    <div>
                      <p className="font-semibold">
                        {invoice.internal_folio || `Factura #${invoice.id}`}
                      </p>
                      <p className="text-[#77777D]">
                        {formatPortalDate(invoice.invoice_date)}
                      </p>
                    </div>
                    <p>{invoiceStatusLabel(invoice.status)}</p>
                    <p className="font-semibold">
                      {formatCurrency(invoiceTotal(invoice), "MXN")}
                    </p>
                    <p className="truncate text-[#77777D]">
                      UUID: {invoice.sat_uuid || "Pendiente"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
