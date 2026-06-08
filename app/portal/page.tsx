import Link from "next/link";
import { ArrowRight, ShieldCheck, Wrench } from "lucide-react";
import {
  addMonths,
  formatPortalDate,
  getClientPortalContext,
  getPortalAccountSummary,
  getPortalProjectStatusLabel,
  getPortalStatusClasses,
  type ClientPortalInvoice,
  type ClientPortalPayment,
  type ClientPortalProject,
} from "@/lib/clientPortal";
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

export default async function ClientPortalPage() {
  const { supabase, portalUser } = await getClientPortalContext();

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
          invoice.source_service_report_id === serviceId && invoice.status === "issued"
      )
      .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0);
  }

  return (
    <main className="min-h-screen bg-[#F7F6F3] text-[#111111]">
      <section className="mx-auto max-w-6xl px-5 py-10 md:py-14">
        <div className="mb-10">
          <p className="mb-3 text-sm font-semibold tracking-[0.28em] text-[#9E1B32]">
            PORTAL ALFA
          </p>
          <h1 className="text-4xl font-semibold md:text-5xl">
            {clientData?.name || "Cliente ALFA"}
          </h1>
          <p className="mt-4 max-w-2xl text-[#5F626A]">
            Proyectos, documentos de entrega, garantias y estado de cuenta.
          </p>
        </div>

        <section className="grid gap-4">
          {projectList.length === 0 ? (
            <div className="rounded border border-black/10 bg-white p-6 text-sm text-[#5F626A]">
              Aun no hay proyectos activos asignados a tu usuario.
            </div>
          ) : null}
          {projectList.map((project) => {
            const projectInvoices = invoiceList.filter(
              (invoice) => invoice.client_project_id === project.id
            );
            const projectPayments = paymentList.filter(
              (payment) => payment.client_project_id === project.id
            );
            const account = getPortalAccountSummary(projectInvoices, projectPayments);
            const delivery = getLatestByProject(deliveryList, project.id);
            const warranty = getLatestByProject(warrantyList, project.id);
            const warrantyEnd =
              warranty?.installation_warranty_end_date ||
              warranty?.equipment_warranty_end_date ||
              null;
            const nextMaintenance = addMonths(
              delivery?.delivery_date,
              warranty?.preventive_maintenance_frequency_months
            );

            return (
              <Link
                key={project.id}
                href={`/portal/projects/${project.id}`}
                className="grid gap-5 rounded border border-black/10 bg-white p-5 shadow-sm transition hover:border-[#9E1B32]/35 md:grid-cols-[1.2fr_0.7fr_0.8fr_0.8fr_44px] md:items-center"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#77777D]">
                    Proyecto
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">{project.name}</h2>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#77777D]">
                    Estado
                  </p>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPortalStatusClasses(project.sales_stage)}`}>
                    {getPortalProjectStatusLabel(project.sales_stage)}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#77777D]">
                    Saldo
                  </p>
                  <p className="mt-2 font-semibold">
                    {formatCurrency(account.pendingTotalMxn, "MXN")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#77777D]">
                    Garantia
                  </p>
                  <p className="mt-2 text-sm text-[#3A3A42]">
                    {warrantyEnd ? formatPortalDate(warrantyEnd) : "Sin garantia"}
                  </p>
                  <p className="mt-1 text-xs text-[#77777D]">
                    Mant.: {nextMaintenance ? formatPortalDate(nextMaintenance) : "Sin fecha"}
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#111111] text-white">
                  <ArrowRight size={18} />
                </div>
              </Link>
            );
          })}
        </section>

        <section className="mt-12">
          <div className="mb-5 flex items-center gap-3">
            <Wrench size={20} className="text-[#9E1B32]" />
            <h2 className="text-2xl font-semibold">Servicios Realizados</h2>
          </div>
          {serviceList.length === 0 ? (
            <div className="rounded border border-black/10 bg-white p-6 text-sm text-[#5F626A]">
              Aun no hay servicios registrados para tu cuenta.
            </div>
          ) : (
            <div className="grid gap-3">
              {serviceList.map((service) => {
                const balance = getServiceBalance(service.id);

                return (
                  <Link
                    key={service.id}
                    href={`/portal/services/${service.id}`}
                    className="grid gap-4 rounded border border-black/10 bg-white p-4 shadow-sm transition hover:border-[#9E1B32]/35 md:grid-cols-[0.7fr_0.8fr_1.5fr_0.7fr_0.8fr_44px] md:items-center"
                  >
                    <p className="font-semibold">{formatPortalDate(service.service_date)}</p>
                    <p>{service.service_number || `SERV-${String(service.id).padStart(4, "0")}`}</p>
                    <p className="line-clamp-2 text-sm text-[#5F626A]">
                      {service.solution_description || "Servicio ALFA"}
                    </p>
                    <span className="text-sm font-semibold">
                      {serviceStatusLabel(service.status)}
                    </span>
                    <p className="font-semibold text-[#9E1B32]">
                      {formatCurrency(balance, "MXN")}
                    </p>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#111111] text-white">
                      <ArrowRight size={18} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <div className="mt-8 inline-flex items-center gap-2 text-sm text-[#5F626A]">
          <ShieldCheck size={16} className="text-[#9E1B32]" />
          Acceso de solo lectura habilitado por ALFA.
        </div>
      </section>
    </main>
  );
}
