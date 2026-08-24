import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  getContractorPaymentStatusLabel,
} from "@/lib/contractors";
import {
  formatWorkOrderDate,
  getWorkOrderActivityStatusLabel,
  getWorkOrderProgress,
  getWorkOrderStatusLabel,
  resolveWorkOrderPhotoUrl,
} from "@/lib/workOrders";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import ApplyContractorChargeButton from "./ApplyContractorChargeButton";
import DeleteWorkOrderButton from "./DeleteWorkOrderButton";
import WorkOrderActivityUpdater, { EditableWorkOrderActivity } from "./WorkOrderActivityUpdater";
import WorkOrderAssignmentPanel from "./WorkOrderAssignmentPanel";

type WorkOrder = {
  id: number;
  work_order_number: string | null;
  title: string | null;
  status: string | null;
  work_order_type?: string | null;
  execution_type?: string | null;
  assigned_to_name: string | null;
  assigned_to_phone: string | null;
  contractor_id: number | null;
  contractor_amount_mxn: number | null;
  budgeted_labor_amount_mxn?: number | null;
  contractor_payment_status: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  notes: string | null;
  contractors?: {
    name: string | null;
    phone: string | null;
  } | null;
};

type ClientProject = {
  id: number;
  name: string | null;
};

type WorkOrderActivity = EditableWorkOrderActivity & {
  system_name: string | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  activity_name: string | null;
  unit?: string | null;
  unit_cost_mxn?: number | null;
  total_cost_mxn?: number | null;
  unit_sale_price_mxn?: number | null;
  total_sale_price_mxn?: number | null;
  evidenceDisplayUrl: string;
};

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string; workOrderId: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id, workOrderId } = await params;

  const [{ data: project }, { data: workOrder, error }, { data: contractorsList }] = await Promise.all([
    supabase.from("client_projects").select("id, name").eq("id", id).maybeSingle(),
    supabase
      .from("work_orders")
      .select("id, work_order_number, title, status, work_order_type, execution_type, assigned_to_name, assigned_to_phone, contractor_id, contractor_amount_mxn, budgeted_labor_amount_mxn, contractor_payment_status, scheduled_start, scheduled_end, notes, contractors(name, phone)")
      .eq("id", workOrderId)
      .eq("client_project_id", id)
      .maybeSingle(),
    supabase
      .from("contractors")
      .select("id, name, phone, specialty")
      .eq("is_active", true)
      .order("name", { ascending: true }),
  ]);

  if (error || !workOrder) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <Link href={`/projects/${id}/work-orders`} className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
          <ArrowLeft size={18} />
          Volver a ordenes
        </Link>
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8">
          Orden de trabajo no encontrada.
        </section>
      </main>
    );
  }

  const orderData = workOrder as unknown as WorkOrder;
  const projectData = project as ClientProject | null;
  const { data: rawActivities } = await supabase
    .from("work_order_activities")
    .select("id, system_name, product_brand, product_model, product_name, activity_name, quantity_assigned, quantity_completed, unit, unit_cost_mxn, total_cost_mxn, unit_sale_price_mxn, total_sale_price_mxn, status, completion_notes, evidence_photo_url")
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: true });
  const activities = await Promise.all(
    ((rawActivities || []) as Omit<WorkOrderActivity, "evidenceDisplayUrl">[]).map(async (activity) => ({
      ...activity,
      evidenceDisplayUrl: await resolveWorkOrderPhotoUrl(supabase.storage, activity.evidence_photo_url),
    }))
  );
  const progress = getWorkOrderProgress(activities);

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link href={`/projects/${id}/work-orders`} className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
        <ArrowLeft size={18} />
        Volver a ordenes
      </Link>

      <section className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
            {orderData.work_order_number || `OT-${String(orderData.id).padStart(4, "0")}`}
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">{orderData.title || "Orden de trabajo"}</h1>
          <p className="mt-3 text-[#B3B3B8]">{getWorkOrderStatusLabel(orderData.status)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/projects/${id}/work-orders/${workOrderId}/print`}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:text-white"
          >
            <FileText size={18} />
            Imprimir
          </Link>
          <DeleteWorkOrderButton
            projectId={Number(id)}
            workOrderId={Number(workOrderId)}
            contractorPaymentStatus={orderData.contractor_payment_status}
          />
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="text-sm text-[#B3B3B8]">Asignado a</p>
          <p className="mt-2 text-xl font-semibold">{orderData.assigned_to_name || "-"}</p>
          <p className="mt-1 text-sm text-[#77777D]">{orderData.assigned_to_phone || ""}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="text-sm text-[#B3B3B8]">Inicio</p>
          <p className="mt-2 text-xl font-semibold">{formatWorkOrderDate(orderData.scheduled_start)}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="text-sm text-[#B3B3B8]">Fin</p>
          <p className="mt-2 text-xl font-semibold">{formatWorkOrderDate(orderData.scheduled_end)}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="text-sm text-[#B3B3B8]">Avance</p>
          <p className="mt-2 text-xl font-semibold text-[#8CE0B6]">{progress.percent.toFixed(0)}%</p>
        </div>
      </section>

      {/* Panel de Asignación y Despacho WhatsApp */}
      <WorkOrderAssignmentPanel
        projectId={Number(id)}
        workOrderId={Number(workOrderId)}
        workOrderNumber={
          orderData.work_order_number ||
          `OT-${String(orderData.id).padStart(4, "0")}`
        }
        workOrderTitle={orderData.title || "Fase de Trabajo"}
        projectName={projectData?.name || "Proyecto"}
        initialExecutionType={orderData.execution_type || "subcontractor"}
        initialContractorId={orderData.contractor_id}
        initialAssignedName={orderData.assigned_to_name}
        initialAssignedPhone={orderData.assigned_to_phone}
        contractorAmountMxn={Number(orderData.contractor_amount_mxn || 0)}
        contractors={(contractorsList || []) as any}
        activitiesSummary={activities
          .map(
            (a, i) =>
              `• ${a.activity_name || "Actividad"}: ${a.quantity_assigned} ${a.unit || "piezas"} (${a.product_name || a.product_model || ""})`
          )
          .join("\n")}
      />

      {/* Liquidación de Pagos a Contratistas */}
      {orderData.execution_type !== "internal_staff" && (
        <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Liquidación de Subcontratista</h2>
              <p className="mt-1 text-[#B3B3B8] text-xs">
                {orderData.contractors?.name || orderData.assigned_to_name || "Sin contratista"}
                {orderData.contractors?.phone || orderData.assigned_to_phone
                  ? ` · ${orderData.contractors?.phone || orderData.assigned_to_phone}`
                  : ""}
              </p>
              <p className="mt-1 text-xs text-[#77777D]">
                Estado de Pago: {getContractorPaymentStatusLabel(orderData.contractor_payment_status)}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3">
                <p className="text-xs text-[#B3B3B8]">Monto liquidable (Tabulador)</p>
                <p className="text-xl font-semibold text-[#F4C66A]">
                  {formatCurrency(Number(orderData.contractor_amount_mxn || 0), "MXN")}
                </p>
              </div>
              {orderData.status === "completed" || orderData.status === "validated" ? (
                <ApplyContractorChargeButton
                  workOrderId={Number(workOrderId)}
                  projectId={Number(id)}
                  contractorId={orderData.contractor_id}
                  contractorAmountMxn={Number(orderData.contractor_amount_mxn || 0)}
                  paymentStatus={orderData.contractor_payment_status}
                  workOrderNumber={
                    orderData.work_order_number ||
                    `OT-${String(orderData.id).padStart(4, "0")}`
                  }
                  projectName={projectData?.name || "Proyecto"}
                />
              ) : (
                <p className="text-xs text-[#77777D]">
                  El cobro se puede aplicar cuando la OT esté completada o validada.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {orderData.notes ? (
        <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 text-[#B3B3B8]">
          <h2 className="mb-3 text-lg font-semibold text-white">Notas de la Fase</h2>
          <p className="whitespace-pre-line text-xs">{orderData.notes}</p>
        </section>
      ) : null}

      <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6 shadow-xl">
        <h2 className="mb-5 text-xl font-bold text-white">Actividades y Alcance Desglosado</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#2A2A30] bg-[#101114] text-left text-[#B3B3B8]">
                <th className="px-3 py-3 font-semibold uppercase">Actividad del Tabulador</th>
                <th className="px-3 py-3 font-semibold uppercase">Equipo / Partida</th>
                <th className="px-3 py-3 font-semibold uppercase text-right">Cant. Asignada</th>
                <th className="px-3 py-3 font-semibold uppercase text-right">Tarifa Tabulador</th>
                <th className="px-3 py-3 font-semibold uppercase text-right">Total Tabulador</th>
                <th className="px-3 py-3 font-semibold uppercase text-right">Completado</th>
                <th className="px-3 py-3 font-semibold uppercase">Estado</th>
                <th className="px-3 py-3 font-semibold uppercase">Evidencia</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr key={activity.id} className="border-b border-[#222228] align-middle hover:bg-[#1A1A1F]">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-white">{activity.activity_name || "Actividad"}</p>
                    <p className="text-[11px] text-[#77777D]">{activity.system_name || "Sin sistema"}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-white">{activity.product_brand || "Sin marca"} {activity.product_model || ""}</p>
                    <p className="text-[11px] text-[#B3B3B8]">{activity.product_name || ""}</p>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-white">
                    {formatNumber(activity.quantity_assigned)} {activity.unit || "pza"}
                  </td>
                  <td className="px-3 py-3 text-right text-[#F4C66A]">
                    {formatCurrency(activity.unit_cost_mxn || 0, "MXN")}
                  </td>
                  <td className="px-3 py-3 text-right font-bold text-[#F4C66A]">
                    {formatCurrency(activity.total_cost_mxn || (Number(activity.quantity_assigned || 0) * Number(activity.unit_cost_mxn || 0)), "MXN")}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-[#8CE0B6]">
                    {formatNumber(activity.quantity_completed)}
                  </td>
                  <td className="px-3 py-3">{getWorkOrderActivityStatusLabel(activity.status)}</td>
                  <td className="px-3 py-3">
                    {activity.evidenceDisplayUrl ? (
                      <img src={activity.evidenceDisplayUrl} alt="Evidencia" className="h-12 w-16 rounded-lg object-cover" />
                    ) : (
                      <span className="text-[#77777D]">Sin evidencia</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <WorkOrderActivityUpdater
        projectId={Number(id)}
        workOrderId={Number(workOrderId)}
        activities={activities.map((activity) => ({
          id: activity.id,
          quantity_assigned: Number(activity.quantity_assigned || 0),
          quantity_completed: Number(activity.quantity_completed || 0),
          status: activity.status || "pending",
          completion_notes: activity.completion_notes,
          evidence_photo_url: activity.evidence_photo_url,
        }))}
      />
    </main>
  );
}
