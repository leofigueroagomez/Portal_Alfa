import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { formatNumber } from "@/lib/format";
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

type WorkOrder = {
  id: number;
  work_order_number: string | null;
  title: string | null;
  status: string | null;
  assigned_to_name: string | null;
  assigned_to_phone: string | null;
  contractor_id: number | null;
  contractor_amount_mxn: number | null;
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
  evidenceDisplayUrl: string;
};

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string; workOrderId: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id, workOrderId } = await params;

  const [{ data: project }, { data: workOrder, error }] = await Promise.all([
    supabase.from("client_projects").select("id, name").eq("id", id).maybeSingle(),
    supabase
      .from("work_orders")
      .select("id, work_order_number, title, status, assigned_to_name, assigned_to_phone, contractor_id, contractor_amount_mxn, contractor_payment_status, scheduled_start, scheduled_end, notes, contractors(name, phone)")
      .eq("id", workOrderId)
      .eq("client_project_id", id)
      .maybeSingle(),
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
    .select("id, system_name, product_brand, product_model, product_name, activity_name, quantity_assigned, quantity_completed, status, completion_notes, evidence_photo_url")
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

      <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Contratista</h2>
            <p className="mt-2 text-[#B3B3B8]">
              {orderData.contractors?.name || orderData.assigned_to_name || "Sin contratista"}
              {orderData.contractors?.phone || orderData.assigned_to_phone
                ? ` · ${orderData.contractors?.phone || orderData.assigned_to_phone}`
                : ""}
            </p>
            <p className="mt-1 text-sm text-[#77777D]">
              Pago: {getContractorPaymentStatusLabel(orderData.contractor_payment_status)}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3">
              <p className="text-xs text-[#B3B3B8]">Monto contratista</p>
              <p className="text-xl font-semibold">
                MXN {Number(orderData.contractor_amount_mxn || 0).toFixed(2)}
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
              <p className="text-sm text-[#77777D]">
                El cobro se puede aplicar cuando la OT este completada o validada.
              </p>
            )}
          </div>
        </div>
      </section>

      {orderData.notes ? (
        <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 text-[#B3B3B8]">
          <h2 className="mb-3 text-xl font-semibold text-white">Notas</h2>
          <p className="whitespace-pre-line">{orderData.notes}</p>
        </section>
      ) : null}

      <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <h2 className="mb-5 text-2xl font-semibold">Actividades asignadas</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#2A2A30] bg-[#101114] text-left text-[#B3B3B8]">
                <th className="px-3 py-2">Actividad</th>
                <th className="px-3 py-2">Equipo</th>
                <th className="px-3 py-2 text-right">Asignado</th>
                <th className="px-3 py-2 text-right">Completado</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Evidencia</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity) => (
                <tr key={activity.id} className="border-b border-[#222228] align-middle">
                  <td className="px-3 py-2">
                    <p className="font-semibold">{activity.activity_name || "Actividad"}</p>
                    <p className="text-xs text-[#77777D]">{activity.system_name || "Sin sistema"}</p>
                  </td>
                  <td className="px-3 py-2">
                    <p>{activity.product_brand || "Sin marca"} {activity.product_model || ""}</p>
                    <p className="text-xs text-[#B3B3B8]">{activity.product_name || ""}</p>
                  </td>
                  <td className="px-3 py-2 text-right">{formatNumber(activity.quantity_assigned)}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(activity.quantity_completed)}</td>
                  <td className="px-3 py-2">{getWorkOrderActivityStatusLabel(activity.status)}</td>
                  <td className="px-3 py-2">
                    {activity.evidenceDisplayUrl ? (
                      <img src={activity.evidenceDisplayUrl} alt="Evidencia" className="h-14 w-20 rounded-lg object-cover" />
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
