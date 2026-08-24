import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, WalletCards, Wrench, type LucideIcon } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import {
  findClientPortalContext,
  formatPortalDate,
  getClientPortalContext,
  type ClientPortalInvoice,
} from "@/lib/clientPortal";
import {
  getContractorPortalContext,
  getAccessibleContractorService,
} from "@/lib/contractorPortal";
import { resolveServicePhotoUrl } from "@/lib/serviceReports";
import ContractorServiceView from "./ContractorServiceView";

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

  // 1. Check if logged-in user is a Contractor
  const contractorCtx = await getContractorPortalContext();
  if (contractorCtx) {
    const { service, photos: rawPhotos } = await getAccessibleContractorService(
      contractorCtx.supabase,
      contractorCtx.portalUser.contractor_id,
      serviceId
    );

    const photos = await Promise.all(
      rawPhotos.map(async (photo) => ({
        ...photo,
        displayUrl: await resolveServicePhotoUrl(
          contractorCtx.supabase.storage,
          photo.image_url
        ),
      }))
    );

    return (
      <ContractorServiceView
        service={service as any}
        photos={photos}
        contractorName={contractorCtx.contractor?.name || "Subcontratista ALFA"}
      />
    );
  }

  // 2. Check if logged-in user is a Client
  const clientCtx = await findClientPortalContext();
  if (!clientCtx) {
    notFound();
  }

  const { supabase, portalUser } = clientCtx;
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
      <section className="mx-auto max-w-5xl px-5 py-12 md:py-16">
        <Link
          href="/portal"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-[#5F626A] transition hover:text-[#111111]"
        >
          <ArrowLeft size={16} />
          Volver al portal
        </Link>

        <header className="mb-10 rounded-2xl border border-[#E5E3DD] bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#9E1B32]">
                Detalle del servicio
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                {serviceData.service_number || `Servicio #${serviceData.id}`}
              </h1>
              <p className="mt-2 text-sm text-[#5F626A]">
                Proyecto: {serviceData.client_projects?.name || "Sin proyecto asignado"}
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 md:items-end">
              <span className="rounded-full bg-[#E5E3DD] px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#111111]">
                {serviceStatusLabel(serviceData.status)}
              </span>
              <p className="text-xs text-[#5F626A]">
                Fecha: {formatPortalDate(serviceData.service_date)}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-[#E5E3DD] pt-6 sm:grid-cols-3">
            <div>
              <p className="text-xs text-[#5F626A]">Atendido por</p>
              <p className="mt-1 text-base font-semibold">
                {serviceData.performed_by_name || "Equipo ALFA"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#5F626A]">Monto del servicio</p>
              <p className="mt-1 text-base font-semibold">
                {formatCurrency(serviceData.labor_sale_mxn || 0, "MXN")}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#5F626A]">Saldo pendiente</p>
              <p
                className={`mt-1 text-base font-semibold ${
                  pendingBalance > 0 ? "text-[#9E1B32]" : "text-[#111111]"
                }`}
              >
                {formatCurrency(pendingBalance, "MXN")}
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-10">
          <section className="rounded-2xl border border-[#E5E3DD] bg-white p-6 shadow-sm md:p-8">
            <SectionTitle icon={Wrench} title="Informe técnico" />
            <div className="space-y-6 text-sm">
              <div>
                <p className="font-semibold text-[#111111]">Solución / Trabajo realizado</p>
                <p className="mt-1.5 whitespace-pre-wrap text-[#5F626A]">
                  {serviceData.solution_description || "Sin descripción registrada."}
                </p>
              </div>

              {serviceData.recommendations && (
                <div className="border-t border-[#E5E3DD] pt-4">
                  <p className="font-semibold text-[#111111]">Recomendaciones</p>
                  <p className="mt-1.5 whitespace-pre-wrap text-[#5F626A]">
                    {serviceData.recommendations}
                  </p>
                </div>
              )}

              {serviceData.required_parts_notes && (
                <div className="border-t border-[#E5E3DD] pt-4">
                  <p className="font-semibold text-[#111111]">Refacciones necesarias</p>
                  <p className="mt-1.5 whitespace-pre-wrap text-[#5F626A]">
                    {serviceData.required_parts_notes}
                  </p>
                </div>
              )}
            </div>
          </section>

          {photos.length > 0 && (
            <section className="rounded-2xl border border-[#E5E3DD] bg-white p-6 shadow-sm md:p-8">
              <SectionTitle icon={FileText} title="Fotografías de evidencia" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="overflow-hidden rounded-xl border border-[#E5E3DD] bg-[#F7F6F3]"
                  >
                    <img
                      src={photo.displayUrl}
                      alt={photo.caption || "Fotografía de servicio"}
                      className="h-48 w-full object-cover"
                    />
                    {photo.caption && (
                      <p className="p-3 text-xs text-[#5F626A]">{photo.caption}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-[#E5E3DD] bg-white p-6 shadow-sm md:p-8">
            <SectionTitle icon={WalletCards} title="Facturación y cobranza" />
            {invoiceList.length === 0 ? (
              <p className="text-sm text-[#5F626A]">
                No hay facturas registradas para este servicio.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E3DD] text-xs font-semibold uppercase tracking-wider text-[#5F626A]">
                      <th className="pb-3">Folio</th>
                      <th className="pb-3">Fecha</th>
                      <th className="pb-3">Total</th>
                      <th className="pb-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E3DD]">
                    {invoiceList.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="py-3 font-semibold text-[#111111]">
                          {invoice.internal_folio || "Sin folio"}
                        </td>
                        <td className="py-3 text-[#5F626A]">
                          {formatPortalDate(invoice.invoice_date)}
                        </td>
                        <td className="py-3 font-semibold text-[#111111]">
                          {formatCurrency(invoiceTotal(invoice), "MXN")}
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                              invoice.status === "paid"
                                ? "bg-[#8CE0B6]/20 text-[#0F6B43]"
                                : invoice.status === "issued"
                                ? "bg-[#9E1B32]/10 text-[#9E1B32]"
                                : "bg-[#E5E3DD] text-[#5F626A]"
                            }`}
                          >
                            {invoiceStatusLabel(invoice.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
