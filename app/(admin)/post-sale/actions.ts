"use server";

import { revalidatePath } from "next/cache";
import { canManageUsers } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/services/profile";
import { createSupabaseServerClient } from "@/services/supabaseServer";

type ProjectIdRow = {
  client_project_id: number | null;
};

export async function syncPostSaleProjectStages() {
  const profile = await getCurrentUserProfile();

  if (!canManageUsers(profile?.role)) {
    return {
      ok: false,
      message: "Solo administradores pueden sincronizar estados de postventa.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: deliveryRows, error: deliveriesError }, { data: warrantyRows, error: warrantiesError }] =
    await Promise.all([
      supabase
        .from("project_deliveries")
        .select("client_project_id")
        .in("status", ["delivered", "accepted"]),
      supabase.from("project_warranties").select("client_project_id"),
    ]);

  if (deliveriesError) {
    return { ok: false, message: `Error leyendo entregas: ${deliveriesError.message}` };
  }

  if (warrantiesError) {
    return { ok: false, message: `Error leyendo garantias: ${warrantiesError.message}` };
  }

  const deliveredIds = new Set(
    ((deliveryRows || []) as ProjectIdRow[])
      .map((row) => row.client_project_id)
      .filter((id): id is number => typeof id === "number")
  );
  const warrantyIds = new Set(
    ((warrantyRows || []) as ProjectIdRow[])
      .map((row) => row.client_project_id)
      .filter((id): id is number => typeof id === "number")
  );

  const deliveredOnlyIds = [...deliveredIds].filter((id) => !warrantyIds.has(id));
  const warrantyProjectIds = [...warrantyIds];
  let deliveredUpdated = 0;
  let warrantyUpdated = 0;

  if (deliveredOnlyIds.length > 0) {
    const { error, count } = await supabase
      .from("client_projects")
      .update({ sales_stage: "delivered" }, { count: "exact" })
      .in("id", deliveredOnlyIds)
      .not("sales_stage", "in", "(delivered,warranty,closed,lost)");

    if (error) return { ok: false, message: `Error actualizando entregados: ${error.message}` };
    deliveredUpdated = Number(count || 0);
  }

  if (warrantyProjectIds.length > 0) {
    const { error, count } = await supabase
      .from("client_projects")
      .update({ sales_stage: "warranty" }, { count: "exact" })
      .in("id", warrantyProjectIds)
      .neq("sales_stage", "warranty");

    if (error) return { ok: false, message: `Error actualizando garantias: ${error.message}` };
    warrantyUpdated = Number(count || 0);
  }

  revalidatePath("/projects");
  revalidatePath("/post-sale");

  return {
    ok: true,
    message: `Sincronizacion completa. Entregados: ${deliveredUpdated}. En garantia: ${warrantyUpdated}.`,
  };
}
