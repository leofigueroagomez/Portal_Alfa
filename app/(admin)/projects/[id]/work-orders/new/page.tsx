import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { syncProjectOperationalItems } from "@/lib/projectOperationalItems";
import NewWorkOrderForm, { AvailableWorkActivity } from "./NewWorkOrderForm";

type ClientProject = {
  id: number;
  name: string | null;
};

type OperationalActivity = {
  id: number;
  project_operational_item_id: number;
  name_snapshot: string | null;
  quantity: number | null;
  unit: string | null;
  status: string | null;
  project_operational_items: {
    system_name: string | null;
    product_brand: string | null;
    product_model: string | null;
    product_name: string | null;
    status?: string | null;
  } | null;
};

type WorkOrderAssignment = {
  project_operational_item_labor_activity_id: number | null;
  quantity_assigned: number | null;
  status: string | null;
};

type ContractorOption = {
  id: number;
  name: string | null;
  phone: string | null;
  specialty: string | null;
};

export default async function NewProjectWorkOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;
  let workOrderSqlError: string | null = null;

  try {
    await syncProjectOperationalItems(supabase, Number(id));
  } catch (error) {
    workOrderSqlError =
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
        ? error.message
        : "No se pudo sincronizar la base operativa.";
  }

  const [
    { data: project },
    { data: rawActivities },
    { data: rawAssignments },
    { data: contractors },
  ] = workOrderSqlError
    ? [
        { data: null },
        { data: [] },
        { data: [] },
        { data: [] },
      ]
    :
    await Promise.all([
      supabase.from("client_projects").select("id, name").eq("id", id).maybeSingle(),
      supabase
        .from("project_operational_item_labor_activities")
        .select(
          "id, project_operational_item_id, name_snapshot, quantity, unit, status, project_operational_items!inner(system_name, product_brand, product_model, product_name, status, client_project_id)"
        )
        .eq("project_operational_items.client_project_id", id)
        .neq("project_operational_items.status", "deleted")
        .neq("status", "cancelled")
        .order("name_snapshot", { ascending: true }),
      supabase
        .from("work_order_activities")
        .select("project_operational_item_labor_activity_id, quantity_assigned, status")
        .neq("status", "cancelled")
        .not("project_operational_item_labor_activity_id", "is", null),
      supabase
        .from("contractors")
        .select("id, name, phone, specialty")
        .eq("is_active", true)
        .order("name", { ascending: true }),
    ]);

  const projectData = project as ClientProject | null;
  const assignmentsByActivity = ((rawAssignments || []) as WorkOrderAssignment[]).reduce(
    (map, assignment) => {
      const activityId = assignment.project_operational_item_labor_activity_id;
      if (!activityId) return map;
      map.set(
        activityId,
        Number(map.get(activityId) || 0) + Number(assignment.quantity_assigned || 0)
      );
      return map;
    },
    new Map<number, number>()
  );
  const activities = ((rawActivities || []) as unknown as OperationalActivity[])
    .map((activity) => {
      const quantityTotal = Number(activity.quantity || 0);
      const assignedPreviously = Number(assignmentsByActivity.get(activity.id) || 0);
      const pending = Math.max(quantityTotal - assignedPreviously, 0);

      return {
        id: activity.id,
        system_name: activity.project_operational_items?.system_name || null,
        product_brand: activity.project_operational_items?.product_brand || null,
        product_model: activity.project_operational_items?.product_model || null,
        product_name: activity.project_operational_items?.product_name || null,
        activity_name: activity.name_snapshot || "Actividad",
        quantity_total: quantityTotal,
        quantity_assigned_previously: assignedPreviously,
        quantity_pending: pending,
        unit: activity.unit || "pieza",
        status: activity.status,
      };
    })
    .filter((activity) => activity.quantity_pending > 0) satisfies AvailableWorkActivity[];

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link
        href={`/projects/${id}/work-orders`}
        className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]"
      >
        <ArrowLeft size={18} />
        Volver a ordenes
      </Link>

      <section className="mb-10">
        <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA OS</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Nueva orden de trabajo</h1>
        <p className="mt-3 text-[#B3B3B8]">
          {projectData?.name || "Proyecto operativo"}
        </p>
      </section>

      {workOrderSqlError ? (
        <section className="rounded-2xl border border-[#614620] bg-[#322514] p-5 text-[#F4C66A]">
          No se pudo sincronizar actividades operativas. Detalle: {workOrderSqlError}
        </section>
      ) : (
        <NewWorkOrderForm
          projectId={Number(id)}
          activities={activities}
          contractors={(contractors || []) as ContractorOption[]}
        />
      )}
    </main>
  );
}
