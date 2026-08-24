import Link from "next/link";
import { ArrowLeft, Cpu, FileText, Hammer, Plus, Sparkles, Zap } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency } from "@/lib/format";
import { getContractorPaymentStatusLabel } from "@/lib/contractors";
import {
  formatWorkOrderDate,
  getWorkOrderProgress,
  getWorkOrderStatusLabel,
} from "@/lib/workOrders";
import AutoGenerateWorkOrdersButton from "./AutoGenerateWorkOrdersButton";

type ClientProject = {
  id: number;
  name: string | null;
};

type WorkOrder = {
  id: number;
  work_order_number: string | null;
  title: string | null;
  status: string | null;
  work_order_type?: string | null;
  execution_type?: string | null;
  assigned_to_name: string | null;
  contractor_amount_mxn: number | null;
  budgeted_labor_amount_mxn?: number | null;
  contractor_payment_status: string | null;
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
      .select("id, work_order_number, title, status, work_order_type, execution_type, assigned_to_name, contractor_amount_mxn, budgeted_labor_amount_mxn, contractor_payment_status, scheduled_start, scheduled_end, created_at")
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

        <div className="flex flex-wrap items-center gap-3">
          <AutoGenerateWorkOrdersButton
            projectId={Number(id)}
            hasOrders={orderList.length > 0}
          />
          <Link
            href={`/projects/${id}/work-orders/new`}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#B91C3C] transition shadow-lg"
          >
            <Plus size={16} />
            Nueva ODT Manual
          </Link>
        </div>
      </section>

      {error ? (
        <section className="rounded-2xl border border-[#614620] bg-[#322514] p-6 text-[#F4C66A]">
          No se pudieron cargar ordenes. Ejecuta el SQL del modulo si aun no existe la tabla.
        </section>
      ) : orderList.length === 0 ? (
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-10 text-center space-y-4">
          <p className="text-[#B3B3B8] text-sm">
            No hay órdenes de trabajo generadas para este proyecto aún.
          </p>
          <div className="flex justify-center">
            <AutoGenerateWorkOrdersButton
              projectId={Number(id)}
              hasOrders={false}
            />
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#2A2A30] bg-[#101114] text-left text-[#B3B3B8]">
                  <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Folio / Especialidad</th>
                  <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Título de la Fase</th>
                  <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Modo / Asignado</th>
                  <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Fechas</th>
                  <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Avance</th>
                  <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Pago Tabulador</th>
                  <th className="px-4 py-3.5 font-bold uppercase tracking-wider">Presupuesto Venta</th>
                  <th className="px-4 py-3.5 font-bold uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orderList.map((order) => {
                  const progress = getWorkOrderProgress(activitiesByOrder.get(order.id) || []);
                  const isCableado = order.work_order_type === "cableado" || order.title?.toLowerCase().includes("cableado");
                  const isConfig = order.work_order_type === "configuraciones" || order.title?.toLowerCase().includes("configuraci");
                  const isInternal = order.execution_type === "internal_staff" || order.assigned_to_name?.toLowerCase().includes("interno");

                  return (
                    <tr key={order.id} className="border-b border-[#222228] align-middle hover:bg-[#1A1A1F] transition">
                      <td className="px-4 py-4 font-mono font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span
                            className={`p-1.5 rounded-lg ${
                              isCableado
                                ? "bg-[#322514] text-[#F4C66A]"
                                : isConfig
                                ? "bg-[#1A2E40] text-[#8AB4F8]"
                                : "bg-[#143D2A] text-[#8CE0B6]"
                            }`}
                          >
                            {isCableado ? (
                              <Zap size={13} />
                            ) : isConfig ? (
                              <Cpu size={13} />
                            ) : (
                              <Hammer size={13} />
                            )}
                          </span>
                          <span>{order.work_order_number || `OT-${String(order.id).padStart(4, "0")}`}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-white text-sm">{order.title || "Sin título"}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              isInternal
                                ? "bg-[#143D2A] text-[#8CE0B6]"
                                : "bg-[#222228] text-[#F4C66A] border border-[#3A3A40]"
                            }`}
                          >
                            {isInternal ? "Personal Interno ALFA" : "Subcontratista Externo"}
                          </span>
                          <p className="text-white font-medium">
                            {order.assigned_to_name || "Sin asignar"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[#B3B3B8]">
                        {formatWorkOrderDate(order.scheduled_start)} / {formatWorkOrderDate(order.scheduled_end)}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full border border-[#2A2A30] bg-[#222228] px-2.5 py-1 text-[11px] font-semibold text-[#B3B3B8]">
                          {getWorkOrderStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <span className="font-bold text-[#8CE0B6]">{progress.percent.toFixed(0)}%</span>
                          <p className="text-[10px] text-[#77777D]">
                            {progress.completed.toFixed(1)} / {progress.assigned.toFixed(1)} acts.
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-[#F4C66A]">
                          {formatCurrency(order.contractor_amount_mxn || 0, "MXN")}
                        </p>
                        <p className="text-[10px] text-[#77777D]">
                          {getContractorPaymentStatusLabel(order.contractor_payment_status)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-[#8CE0B6]">
                          {formatCurrency(order.budgeted_labor_amount_mxn || 0, "MXN")}
                        </p>
                        <p className="text-[10px] text-[#77777D]">Presupuestado</p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/projects/${id}/work-orders/${order.id}`}
                            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-1.5 text-xs font-semibold text-[#B3B3B8] hover:text-white hover:border-[#9E1B32] transition"
                          >
                            Ver detalle
                          </Link>
                          <Link
                            href={`/projects/${id}/work-orders/${order.id}/print`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-1.5 text-xs font-semibold text-[#B3B3B8] hover:text-white transition"
                          >
                            <FileText size={13} />
                            PDF
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
