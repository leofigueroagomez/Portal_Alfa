import Link from "next/link";
import { formatNumber } from "@/lib/format";
import { formatWorkOrderDate, getWorkOrderActivityStatusLabel } from "@/lib/workOrders";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import PrintWorkOrderButton from "./PrintWorkOrderButton";

type ClientProject = {
  id: number;
  name: string | null;
  client_id: number | null;
  site_contact_name: string | null;
  site_contact_phone: string | null;
  site_address: string | null;
  site_google_maps_url: string | null;
};

type Client = {
  name: string | null;
  company_name: string | null;
};

type WorkOrder = {
  id: number;
  work_order_number: string | null;
  title: string | null;
  assigned_to_name: string | null;
  assigned_to_phone: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  notes: string | null;
};

type WorkOrderActivity = {
  id: number;
  system_name: string | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  activity_name: string | null;
  quantity_assigned: number | null;
  quantity_completed: number | null;
  status: string | null;
  completion_notes: string | null;
};

export default async function WorkOrderPrintPage({
  params,
}: {
  params: Promise<{ id: string; workOrderId: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id, workOrderId } = await params;

  const { data: workOrder, error } = await supabase
    .from("work_orders")
    .select("id, work_order_number, title, assigned_to_name, assigned_to_phone, scheduled_start, scheduled_end, notes")
    .eq("id", workOrderId)
    .eq("client_project_id", id)
    .maybeSingle();

  if (error || !workOrder) {
    return (
      <main className="min-h-screen bg-white p-10 text-[#111318]">
        <h1 className="text-2xl font-semibold">Orden de trabajo no encontrada</h1>
      </main>
    );
  }

  const orderData = workOrder as WorkOrder;
  const [{ data: project }, { data: activities }] = await Promise.all([
    supabase
      .from("client_projects")
      .select("id, name, client_id, site_contact_name, site_contact_phone, site_address, site_google_maps_url")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("work_order_activities")
      .select("id, system_name, product_brand, product_model, product_name, activity_name, quantity_assigned, quantity_completed, status, completion_notes")
      .eq("work_order_id", workOrderId)
      .order("created_at", { ascending: true }),
  ]);
  const projectData = project as ClientProject | null;
  const { data: client } = projectData?.client_id
    ? await supabase
        .from("clients")
        .select("name, company_name")
        .eq("id", projectData.client_id)
        .maybeSingle()
    : { data: null };
  const clientData = client as Client | null;
  const activityList = (activities || []) as WorkOrderActivity[];
  const orderNumber =
    orderData.work_order_number || `OT-${String(orderData.id).padStart(4, "0")}`;

  return (
    <main className="print-root min-h-screen bg-[#EDEBE6] py-5 text-[#111318]">
      <style>{`
        @page { size: letter; margin: 12mm; }
        .print-root { font-family: Arial, Helvetica, sans-serif; }
        .summary-box, .activity-row, .notes-box { break-inside: avoid; page-break-inside: avoid; }
        @media print {
          html, body { background: white !important; font-size: 10.5px !important; }
          body > div > aside, body aside, body header:not(.quote-print-header), nav,
          .admin-sidebar, .admin-nav, .mobile-admin-header, .admin-menu-button,
          .admin-menu-overlay, .admin-user-card, .no-print, .print-actions {
            display: none !important;
          }
          body > div, .admin-print-route, main {
            display: block !important;
            min-height: auto !important;
            background: white !important;
            padding: 0 !important;
          }
          .document {
            width: 100% !important;
            min-height: auto !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .quote-print-logo { max-height: 28px !important; max-width: 112px !important; }
        }
      `}</style>

      <div className="print-actions mx-auto mb-4 flex w-[8.5in] max-w-[calc(100vw-32px)] items-center justify-between">
        <Link href={`/projects/${id}/work-orders/${workOrderId}`} className="text-xs text-[#5F626A]">
          Volver a orden
        </Link>
        <PrintWorkOrderButton />
      </div>

      <article className="document mx-auto w-[8.5in] min-h-[11in] max-w-[calc(100vw-32px)] bg-white px-10 py-8 shadow-xl">
        <header className="quote-print-header mb-5 flex items-start justify-between border-b border-[#D6D1C8] pb-4">
          <div>
            <div className="mb-3 flex h-11 items-center">
              <img src="/logo-print.png" alt="ALFA OS" className="quote-print-logo max-h-11 max-w-36" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9E1B32]">
              Orden de trabajo
            </p>
          </div>
          <div className="text-right text-[11px] leading-5 text-[#555963]">
            <p className="mt-2 text-xl font-semibold text-[#111318]">{orderNumber}</p>
            <p>{orderData.title || "Orden de trabajo"}</p>
          </div>
        </header>

        <section className="summary-box mb-5 grid grid-cols-2 gap-4 text-xs">
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">Cliente</p>
            <p className="text-base font-semibold">{clientData?.name || "Sin cliente"}</p>
            <p className="mt-1 text-[#555963]">{clientData?.company_name || ""}</p>
          </div>
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">Proyecto</p>
            <p className="text-base font-semibold">{projectData?.name || "Sin proyecto"}</p>
            <p className="mt-1 text-[#555963]">
              {formatWorkOrderDate(orderData.scheduled_start)} / {formatWorkOrderDate(orderData.scheduled_end)}
            </p>
          </div>
        </section>

        <section className="summary-box mb-5 grid grid-cols-2 gap-4 text-xs">
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">Obra</p>
            <p>{projectData?.site_address || "-"}</p>
            <p className="mt-1 break-all text-[#555963]">{projectData?.site_google_maps_url || ""}</p>
            <p className="mt-2 text-[#555963]">
              Contacto: {projectData?.site_contact_name || "-"} {projectData?.site_contact_phone || ""}
            </p>
          </div>
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">Asignado a</p>
            <p className="text-base font-semibold">{orderData.assigned_to_name || "-"}</p>
            <p className="mt-1 text-[#555963]">{orderData.assigned_to_phone || ""}</p>
          </div>
        </section>

        {orderData.notes ? (
          <section className="notes-box mb-5 border-t border-[#D6D1C8] pt-3">
            <h2 className="mb-1 text-sm font-semibold">Notas</h2>
            <p className="whitespace-pre-line text-[11px] leading-5 text-[#555963]">{orderData.notes}</p>
          </section>
        ) : null}

        <section>
          <h2 className="mb-3 border-b border-[#D6D1C8] pb-2 text-sm font-semibold">Actividades</h2>
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="bg-[#F7F5F1] text-left uppercase tracking-[0.12em] text-[#555963]">
                <th className="border border-[#E1DDD5] p-2">Sistema</th>
                <th className="border border-[#E1DDD5] p-2">Producto</th>
                <th className="border border-[#E1DDD5] p-2">Actividad</th>
                <th className="border border-[#E1DDD5] p-2 text-right">Asignada</th>
                <th className="border border-[#E1DDD5] p-2 text-right">Completada</th>
                <th className="border border-[#E1DDD5] p-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {activityList.map((activity) => (
                <tr key={activity.id} className="activity-row">
                  <td className="border border-[#E1DDD5] p-2">{activity.system_name || "-"}</td>
                  <td className="border border-[#E1DDD5] p-2">
                    {activity.product_brand || "Sin marca"} {activity.product_model || ""}
                    <p className="text-[#555963]">{activity.product_name || ""}</p>
                  </td>
                  <td className="border border-[#E1DDD5] p-2">{activity.activity_name || "Actividad"}</td>
                  <td className="border border-[#E1DDD5] p-2 text-right">{formatNumber(activity.quantity_assigned)}</td>
                  <td className="border border-[#E1DDD5] p-2 text-right">{formatNumber(activity.quantity_completed)}</td>
                  <td className="border border-[#E1DDD5] p-2">{getWorkOrderActivityStatusLabel(activity.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </article>
    </main>
  );
}
