import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  HardHat,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import {
  addMonths,
  findClientPortalContext,
  formatPortalDate,
  getClientPortalContext,
  getPortalAccountSummary,
  getPortalProjectStatusLabel,
  getPortalStatusClasses,
  type ClientPortalInvoice,
  type ClientPortalPayment,
  type ClientPortalProject,
} from "@/lib/clientPortal";
import { getContractorPortalContext } from "@/lib/contractorPortal";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Client = {
  id: number;
  name: string | null;
};

type AccessRow = {
  client_project_id: number;
};

type Delivery = {
  client_project_id: number;
  delivery_date: string | null;
};

type Warranty = {
  client_project_id: number;
  installation_warranty_end_date: string | null;
  equipment_warranty_end_date: string | null;
  preventive_maintenance_frequency_months: number | null;
};

type ServiceReport = {
  id: number;
  service_number: string | null;
  client_project_id: number | null;
  service_date: string | null;
  solution_description: string | null;
  status: string | null;
  labor_sale_mxn: number | null;
};

type ContractorService = {
  id: number;
  service_number: string | null;
  service_date: string | null;
  service_location: string | null;
  google_maps_url: string | null;
  performed_by_name: string | null;
  technician_phone: string | null;
  requester_name: string | null;
  requester_phone: string | null;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  is_remote: boolean | null;
  background: string | null;
  diagnosis: string | null;
  solution_status: string | null;
  solution_description: string | null;
  status: string | null;
  clients: { name: string | null } | null;
  client_projects: { name: string | null } | null;
};

type ContractorWorkOrder = {
  id: number;
  work_order_number: string | null;
  title: string | null;
  status: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  client_projects: { name: string | null } | null;
};

type ServiceInvoice = {
  source_service_report_id: number | null;
  total_mxn: number | null;
  total?: number | null;
  status: string | null;
};

function getLatestByProject<T extends { client_project_id: number }>(
  rows: T[],
  projectId: number
) {
  return rows.find((row) => row.client_project_id === projectId) || null;
}

function serviceStatusLabel(status: string | null | undefined) {
  if (status === "completed") return "Finalizado";
  if (status === "in_progress") return "En proceso";
  if (status === "pending") return "Pendiente";
  return "Borrador";
}

function invoiceTotal(invoice: ServiceInvoice) {
  return Number(invoice.total_mxn ?? invoice.total ?? 0);
}

export default async function PortalPage() {
  // 1. Check if logged in as a Subcontractor
  const contractorCtx = await getContractorPortalContext();
  if (contractorCtx) {
    const { supabase, portalUser, contractor } = contractorCtx;

    const [{ data: services }, { data: workOrders }] = await Promise.all([
      supabase
        .from("service_reports")
        .select(
          `
          id,
          service_number,
          service_date,
          service_location,
          google_maps_url,
          performed_by_name,
          technician_phone,
          requester_name,
          requester_phone,
          scheduled_time_start,
          scheduled_time_end,
          is_remote,
          background,
          diagnosis,
          solution_status,
          solution_description,
          status,
          clients (name),
          client_projects (name)
        `
        )
        .eq("contractor_id", portalUser.contractor_id)
        .order("service_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("work_orders")
        .select(
          `
          id,
          work_order_number,
          title,
          status,
          scheduled_start,
          scheduled_end,
          client_projects (name)
        `
        )
        .eq("contractor_id", portalUser.contractor_id)
        .order("created_at", { ascending: false }),
    ]);

    const serviceList = (services || []) as unknown as ContractorService[];
    const workOrderList = (workOrders || []) as unknown as ContractorWorkOrder[];

    const pendingServices = serviceList.filter((s) => s.status === "pending");
    const inProgressServices = serviceList.filter((s) => s.status === "in_progress");
    const completedServices = serviceList.filter((s) => s.status === "completed");

    return (
      <main className="min-h-screen bg-[#0B0D0F] text-white">
        {/* Header */}
        <header className="border-b border-[#1F1F24] bg-[#121215]/80 backdrop-blur px-5 py-6 md:px-10">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#B84A5A]">
                  ALFA OS
                </span>
                <span className="text-zinc-600">·</span>
                <span className="text-xs text-zinc-400">Portal de Subcontratistas</span>
              </div>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl text-white">
                {contractor?.name || "Panel de Técnico"}
              </h1>
              <p className="mt-0.5 text-xs text-[#8A8A93]">
                {contractor?.specialty || "Técnico / Integrador Especialista"} · Servicios y Órdenes Asignadas
              </p>
            </div>

            <div className="flex items-center gap-3">
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-xl border border-[#2A2B32] bg-[#1A1B20] px-4 py-2 text-xs font-medium text-zinc-300 transition hover:bg-[#25262D] hover:text-white"
                >
                  Cerrar Sesión
                </button>
              </form>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-5 py-8 md:px-10 space-y-8">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-5">
              <p className="text-xs font-medium text-[#8A8A93]">Total Asignados</p>
              <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                {serviceList.length}
              </p>
            </div>
            <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-5">
              <p className="text-xs font-medium text-[#8A8A93]">Por Atender</p>
              <p className="mt-2 text-2xl font-bold text-zinc-300 sm:text-3xl">
                {pendingServices.length}
              </p>
            </div>
            <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-5">
              <p className="text-xs font-medium text-amber-400">En Proceso (En sitio)</p>
              <p className="mt-2 text-2xl font-bold text-amber-400 sm:text-3xl">
                {inProgressServices.length}
              </p>
            </div>
            <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-5">
              <p className="text-xs font-medium text-emerald-400">Finalizados</p>
              <p className="mt-2 text-2xl font-bold text-emerald-400 sm:text-3xl">
                {completedServices.length}
              </p>
            </div>
          </div>

          {/* Assigned Services List */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Wrench className="h-5 w-5 text-[#B84A5A]" />
                Mis Servicios Asignados ({serviceList.length})
              </h2>
            </div>

            {serviceList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#2A2B32] bg-[#151518]/50 p-12 text-center text-sm text-[#8A8A93]">
                No tienes servicios técnicos asignados por el momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {serviceList.map((service) => {
                  const folio = service.service_number || `SERV-${service.id}`;
                  const clientName = service.clients?.name || "Cliente ALFA";
                  const projectName = service.client_projects?.name || "Proyecto";

                  return (
                    <div
                      key={service.id}
                      className="group rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 transition duration-200 hover:border-[#3A3B44] flex flex-col justify-between shadow-lg space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold tracking-wider text-[#F0B8C0]">
                              {folio}
                            </span>
                            <h3 className="mt-0.5 text-base font-semibold text-white">
                              {clientName}
                            </h3>
                            <p className="text-xs text-[#8A8A93]">{projectName}</p>
                          </div>

                          <div>
                            {service.status === "completed" ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                                Finalizado
                              </span>
                            ) : service.status === "in_progress" ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                                En proceso
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
                                Pendiente
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Date & Schedule */}
                        <div className="flex flex-wrap gap-2 text-xs text-zinc-300">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#0E0F12] border border-[#222228] px-2.5 py-1">
                            <Calendar className="h-3.5 w-3.5 text-[#B84A5A]" />
                            {service.service_date || "Fecha pendiente"}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#0E0F12] border border-[#222228] px-2.5 py-1">
                            <Clock className="h-3.5 w-3.5 text-amber-400" />
                            {service.scheduled_time_start || "10:00"} - {service.scheduled_time_end || "12:00"}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-[#0E0F12] border border-[#222228] px-2.5 py-1 text-zinc-400">
                            {service.is_remote ? "💻 Remoto" : "📍 En Sitio"}
                          </span>
                        </div>

                        {/* Location */}
                        {service.service_location ? (
                          <p className="text-xs text-[#A1A1AA] flex items-center gap-1.5 truncate">
                            <MapPin className="h-3.5 w-3.5 text-[#B84A5A] shrink-0" />
                            {service.service_location}
                          </p>
                        ) : null}

                        {/* Background / Issue snippet */}
                        {service.background ? (
                          <div className="rounded-lg bg-[#0E0F12] border border-[#222228] p-3 text-xs text-zinc-300 line-clamp-2">
                            {service.background}
                          </div>
                        ) : null}
                      </div>

                      {/* Action Button */}
                      <div className="pt-3 border-t border-[#222228]">
                        <Link
                          href={`/portal/services/${service.id}`}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7A1F2B] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#5A1320]"
                        >
                          Ver Detalles y Subir Evidencia
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Assigned Work Orders if any */}
          {workOrderList.length > 0 && (
            <section className="space-y-4 pt-6 border-t border-[#1F1F24]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-[#B84A5A]" />
                Órdenes de Trabajo Asignadas ({workOrderList.length})
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {workOrderList.map((wo) => (
                  <div
                    key={wo.id}
                    className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#F0B8C0]">
                        {wo.work_order_number || `OT-${wo.id}`}
                      </span>
                      <span className="text-xs text-zinc-400 capitalize">{wo.status}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-white">{wo.title}</h3>
                    <p className="text-xs text-[#8A8A93]">
                      Proyecto: {wo.client_projects?.name || "-"}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    );
  }

  // 2. Client Portal Experience
  const clientCtx = await findClientPortalContext();
  if (!clientCtx) {
    return (
      <main className="min-h-screen bg-[#F7F6F3] text-[#111111]">
        <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-5 py-12">
          <p className="mb-3 text-sm font-semibold tracking-[0.28em] text-[#9E1B32]">
            PORTAL ALFA
          </p>
          <h1 className="text-4xl font-semibold">Acceso no disponible</h1>
          <p className="mt-4 max-w-2xl text-[#5F626A]">
            No se encontró un usuario activo para este portal. Contacta al equipo de ALFA si consideras que se trata de un error.
          </p>
        </section>
      </main>
    );
  }

  const { supabase, portalUser } = clientCtx;

  const [{ data: client }, { data: accessRows, error: accessError }] =
    await Promise.all([
      supabase
        .from("clients")
        .select("id, name")
        .eq("id", portalUser.client_id)
        .maybeSingle(),
      supabase
        .from("client_portal_project_access")
        .select("client_project_id")
        .eq("client_portal_user_id", portalUser.id)
        .eq("is_active", true),
    ]);

  const clientData = client as Client | null;
  const projectIds = ((accessRows || []) as AccessRow[]).map(
    (row) => row.client_project_id
  );

  if (accessError) {
    return (
      <main className="min-h-screen bg-[#F7F6F3] text-[#111111]">
        <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-5 py-12">
          <p className="mb-3 text-sm font-semibold tracking-[0.28em] text-[#9E1B32]">
            PORTAL ALFA
          </p>
          <h1 className="text-4xl font-semibold">Acceso no disponible</h1>
          <p className="mt-4 max-w-2xl text-[#5F626A]">
            No se pudo validar tu acceso al portal cliente.
          </p>
        </section>
      </main>
    );
  }

  const [
    { data: projects },
    { data: deliveries },
    { data: warranties },
    { data: invoices },
    { data: payments },
    { data: services },
  ] = await Promise.all([
    projectIds.length
      ? supabase
          .from("client_projects")
          .select("id, client_id, name, sales_stage, estimated_value_mxn, expected_close_date")
          .eq("client_id", portalUser.client_id)
          .in("id", projectIds)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    projectIds.length
      ? supabase
          .from("project_deliveries")
          .select("client_project_id, delivery_date")
          .in("client_project_id", projectIds)
          .in("status", ["delivered", "accepted"])
          .order("delivery_date", { ascending: false })
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    projectIds.length
      ? supabase
          .from("project_warranties")
          .select(
            "client_project_id, installation_warranty_end_date, equipment_warranty_end_date, preventive_maintenance_frequency_months"
          )
          .in("client_project_id", projectIds)
          .eq("status", "issued")
          .order("warranty_date", { ascending: false })
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    projectIds.length
      ? supabase
          .from("project_invoices")
          .select("id, internal_folio, invoice_date, total_mxn, total, status, sat_uuid, client_project_id")
          .in("client_project_id", projectIds)
          .in("status", ["issued", "paid"])
      : Promise.resolve({ data: [] }),
    projectIds.length
      ? supabase
          .from("project_payments")
          .select(
            "id, payment_date, payment_method, payment_reference, currency, amount, amount_mxn, exchange_rate, notes, client_project_id"
          )
          .in("client_project_id", projectIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("service_reports")
      .select("id, service_number, client_project_id, service_date, solution_description, status, labor_sale_mxn")
      .eq("client_id", portalUser.client_id)
      .in("status", ["pending", "in_progress", "completed"])
      .order("service_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const projectList = (projects || []) as ClientPortalProject[];
  const deliveryList = (deliveries || []) as Delivery[];
  const warrantyList = (warranties || []) as Warranty[];
  const invoiceList = (invoices || []) as (ClientPortalInvoice & {
    client_project_id: number;
  })[];
  const paymentList = (payments || []) as (ClientPortalPayment & {
    client_project_id: number;
  })[];
  const serviceList = ((services || []) as ServiceReport[]).filter(
    (service) => !service.client_project_id || projectIds.includes(service.client_project_id)
  );
  const { data: serviceInvoices } = serviceList.length
    ? await supabase
        .from("project_invoices")
        .select("source_service_report_id, total_mxn, total, status")
        .in(
          "source_service_report_id",
          serviceList.map((service) => service.id)
        )
        .in("status", ["issued", "paid"])
    : { data: [] };
  const serviceInvoiceList = (serviceInvoices || []) as ServiceInvoice[];

  function getServiceBalance(serviceId: number) {
    return serviceInvoiceList
      .filter(
        (invoice) =>
          invoice.source_service_report_id === serviceId &&
          invoice.status === "issued"
      )
      .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0);
  }

  const latestDelivery = deliveryList[0] || null;
  const activeWarranty = warrantyList[0] || null;
  const latestService = serviceList[0] || null;

  const nextMaintenanceDate =
    activeWarranty?.preventive_maintenance_frequency_months &&
    activeWarranty?.installation_warranty_end_date
      ? addMonths(
          activeWarranty.installation_warranty_end_date,
          activeWarranty.preventive_maintenance_frequency_months
        )
      : null;

  const summary = getPortalAccountSummary(invoiceList, paymentList);

  return (
    <main className="min-h-screen bg-[#F7F6F3] text-[#111111]">
      <section className="mx-auto max-w-5xl px-5 py-12 md:py-16">
        <header className="mb-12 rounded-2xl border border-[#E5E3DD] bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#9E1B32]">
                Portal Cliente
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
                {clientData?.name || "Bienvenido a tu portal"}
              </h1>
              <p className="mt-2 text-sm text-[#5F626A]">
                Consulta tus proyectos, facturación, garantías y reportes de servicio.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#E5E3DD] bg-[#F7F6F3] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#5F626A]">
                <ShieldCheck size={16} className="text-[#9E1B32]" />
                Acceso Verificado
              </span>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 border-t border-[#E5E3DD] pt-6 sm:grid-cols-3">
            <div>
              <p className="text-xs text-[#5F626A]">Total Facturado</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatCurrency(summary.invoicedTotalMxn, "MXN")}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#5F626A]">Total Pagado</p>
              <p className="mt-1 text-2xl font-semibold text-[#0F6B43]">
                {formatCurrency(summary.paidTotalMxn, "MXN")}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#5F626A]">Saldo Pendiente</p>
              <p
                className={`mt-1 text-2xl font-semibold ${
                  summary.pendingTotalMxn > 0 ? "text-[#9E1B32]" : "text-[#111111]"
                }`}
              >
                {formatCurrency(summary.pendingTotalMxn, "MXN")}
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-12">
          {/* Proyectos */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Tus Proyectos</h2>
            {projectList.length === 0 ? (
              <p className="text-sm text-[#5F626A]">No tienes proyectos asignados.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {projectList.map((project) => (
                  <Link
                    key={project.id}
                    href={`/portal/projects/${project.id}`}
                    className="group rounded-2xl border border-[#E5E3DD] bg-white p-6 shadow-sm transition hover:border-[#9E1B32]"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${getPortalStatusClasses(
                          project.sales_stage
                        )}`}
                      >
                        {getPortalProjectStatusLabel(project.sales_stage)}
                      </span>
                      <ArrowRight
                        size={18}
                        className="text-[#5F626A] transition group-hover:translate-x-1 group-hover:text-[#9E1B32]"
                      />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold">{project.name}</h3>
                    <p className="mt-2 text-xs text-[#5F626A]">
                      Fecha estimada: {formatPortalDate(project.expected_close_date)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Servicios y Mantenimiento */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Servicios y Mantenimientos</h2>
            {serviceList.length === 0 ? (
              <p className="text-sm text-[#5F626A]">No hay reportes de servicio registrados.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {serviceList.map((service) => (
                  <Link
                    key={service.id}
                    href={`/portal/services/${service.id}`}
                    className="group rounded-2xl border border-[#E5E3DD] bg-white p-6 shadow-sm transition hover:border-[#9E1B32]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-[#E5E3DD] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#111111]">
                        {serviceStatusLabel(service.status)}
                      </span>
                      <ArrowRight
                        size={18}
                        className="text-[#5F626A] transition group-hover:translate-x-1 group-hover:text-[#9E1B32]"
                      />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">
                      {service.service_number || `Servicio #${service.id}`}
                    </h3>
                    <p className="mt-1 text-xs text-[#5F626A]">
                      Fecha: {formatPortalDate(service.service_date)}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs text-[#5F626A]">
                      {service.solution_description || "Sin descripción disponible."}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
