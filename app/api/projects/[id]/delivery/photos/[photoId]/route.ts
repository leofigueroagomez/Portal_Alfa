import { NextResponse } from "next/server";
import { canManageWorkOrders } from "@/lib/permissions";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const profile = await getCurrentInternalUserProfile();
  if (!profile || !canManageWorkOrders(profile.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id, photoId } = await params;
  const projectId = Number(id);
  const evidenceId = Number(photoId);

  if (!projectId || !evidenceId) {
    return NextResponse.json({ error: "Proyecto y foto requeridos." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  let evidenceResult = await supabase
    .from("project_delivery_evidences")
    .select("id, file_url, file_path, project_deliveries!inner(client_project_id)")
    .eq("id", evidenceId)
    .eq("project_deliveries.client_project_id", projectId)
    .maybeSingle();

  if (evidenceResult.error) {
    evidenceResult = await supabase
      .from("project_delivery_evidences")
      .select("id, file_url, project_deliveries!inner(client_project_id)")
      .eq("id", evidenceId)
      .eq("project_deliveries.client_project_id", projectId)
      .maybeSingle();
  }

  if (evidenceResult.error) {
    return NextResponse.json({ error: evidenceResult.error.message }, { status: 500 });
  }
  const evidence = evidenceResult.data;
  if (!evidence) {
    return NextResponse.json({ error: "Foto no encontrada." }, { status: 404 });
  }

  const row = evidence as {
    id: number;
    file_url: string | null;
    file_path: string | null;
  };
  const storagePath = row.file_path || row.file_url;
  if (storagePath) {
    await supabase.storage.from("project-photos").remove([storagePath]);
  }

  const { error: deleteError } = await supabase
    .from("project_delivery_evidences")
    .delete()
    .eq("id", evidenceId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
