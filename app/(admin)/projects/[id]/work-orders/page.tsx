import Link from "next/link";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import {
  formatWorkOrderDate,
  getWorkOrderProgress,
  getWorkOrderStatusLabel,
} from "@/lib/workOrders";

type ClientProject = {
  id: number;
  name: string | null;
};

type WorkOrder = {
  id: number;
  work_order_number: string | null;
  title: string | null;
  status: string | null;
  assigned_to_name: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  created_at: string | null;
};

type WorkOrderActivity = {
  work_order_id: number;
  quantity_assigned: number | null;
  quantity_completed: number | null;
  status: string | null;
};

export default async function ProjectWorkOrdersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  const [{ data: project }, { data: workOrders, error }] = await Promise.all([
    supabase.from("client_projects").select("id, name").eq("id", id).maybeSingle(),
    supabase
      .from("work_orders")
      .select("id, work_order_number, title, status, assigned_to_name, scheduled_start, scheduled_end, created_at")
      .eq("client_project_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const projectData = project as ClientProject | null;
  const orderList = (workOrders || []) as WorkOrder[];
  const orderIds = orderList.map((order) => order.id);
  const { data: rawActivities } = orderIds.length
    ? await supabase
        .from("work_order_activities")
        .select("work_order_id, quantity_assigned, quantity_completed, status")
        .in("work_order_id", orderIds)
    : { data: [] };
  const activitiesByOrder = new Map<number, WorkOrderActivity[]>();

  ((rawActivities || []) as WorkOrderActivity[]).forEach((activity) => {
    const current = activitiesByOrder.get(activity.work_order_id) || [];
    activitiesByOrder.set(activity.work_order_id, [...current, activity]);
  });

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link href={`/projects/${id}`} className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
        <ArrowLeft size={18} />
        Volver al proyecto
      </Link>

      <section className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA OS</p>
          <h1 className="text-3xl font-bold sm:text-4xl">Ordenes de trabajo</h1>
          <p className="mt-3 text-[#B3B3B8]">
            {projectData?.name || "Proyecto operativo"}
          </p>
        </div>

        <Link
          href={`/projects/${id}/work-orders/new`}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
        >
          <Plus size={18} />
          Nueva orden de trabajo
        </Link>
      </section>

      {error ? (
        <section className="rounded-2xl border border-[#614620] bg-[#322514] p-6 text-[#F4C66A]">
          No se pudieron cargar ordenes. Ejecuta el SQL del modulo si aun no existe la tabla.
        </section>
      ) : orderList.length === 0 ? (
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8 text-[#B3B3B8]">
          No hay ordenes de trabajo registradas para este proyecto.
        </section>
      ) : (
        <section className="rounded-xl border border-[#1F1F24] bg-[#151518]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#2A2A30] bg-[#101114] text-left text-[#B3B3B8]">
                  <th className="px-4 py-3 font-semibold">Numero</th>
                  <th className="px-4 py-3 font-semibold">Titulo</th>
                  <th className="px-4 py-3 font-semibold">Asignado a</th>
                  <th className="px-4 py-3 font-semibold">Fechas</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Avance</th>
                  <th className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orderList.map((order) => {
                  const progress = getWorkOrderProgress(activitiesByOrder.get(order.id) || []);

                  return (
                    <tr key={order.id} className="border-b border-[#222228] align-middle hover:bg-[#1A1A1F]">
                      <td className="px-4 py-3 font-semibold">
                        {order.work_order_number || `OT-${String(order.id).padStart(4, "0")}`}
                      </td>
                      <td className="px-4 py-3">{order.title || "Sin titulo"}</td>
                      <td className="px-4 py-3">{order.assigned_to_name || "-"}</td>
                      <td className="px-4 py-3 text-[#B3B3B8]">
                        {formatWorkOrderDate(order.scheduled_start)} / {formatWorkOrderDate(order.scheduled_end)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full border border-[#2A2A30] bg-[#222228] px-3 py-1 text-xs text-[#B3B3B8]">
                          {getWorkOrderStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-[#8CE0B6]">{progress.percent.toFixed(0)}%</span>
                        <p className="text-xs text-[#77777D]">
                          {progress.completed.toFixed(2)} / {progress.assigned.toFixed(2)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/projects/${id}/work-orders/${order.id}`}
                            className="rounded-lg border border-[#2A2A30] px-3 py-2 text-xs font-semibold text-[#B3B3B8] hover:text-white"
                          >
                            Ver detalle
                          </Link>
                          <Link
                            href={`/projects/${id}/work-orders/${order.id}/print`}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A30] px-3 py-2 text-xs font-semibold text-[#B3B3B8] hover:text-white"
                          >
                            <FileText size={14} />
                            Imprimir
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
