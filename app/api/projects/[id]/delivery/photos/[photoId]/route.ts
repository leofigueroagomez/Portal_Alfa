import { NextResponse } from "next/server";
import {
  createRequestId,
  jsonError,
  logApiError,
  parsePositiveInteger,
  requireWorkOrderRole,
} from "@/lib/apiAuth";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const requestId = createRequestId();
  const { response } = await requireWorkOrderRole();
  if (response) return response;

  const { id, photoId } = await params;
  const projectId = parsePositiveInteger(id);
  const evidenceId = parsePositiveInteger(photoId);

  if (!projectId || !evidenceId) {
    return jsonError("Bad Request", 400);
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
    logApiError(requestId, "delivery photo delete lookup failed", evidenceResult.error);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
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
    const { error: storageError } = await supabase.storage.from("project-photos").remove([storagePath]);
    if (storageError) {
      logApiError(requestId, "delivery photo storage remove failed", storageError);
    }
  }

  const { error: deleteError } = await supabase
    .from("project_delivery_evidences")
    .delete()
    .eq("id", evidenceId);

  if (deleteError) {
    logApiError(requestId, "delivery photo delete failed", deleteError);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
