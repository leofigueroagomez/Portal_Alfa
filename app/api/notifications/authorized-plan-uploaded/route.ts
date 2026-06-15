import { NextResponse } from "next/server";
import {
  checkBasicRateLimit,
  createRequestId,
  getClientIp,
  jsonError,
  logApiError,
  parsePositiveInteger,
  requireNotificationPermission,
} from "@/lib/apiAuth";
import { notifyAuthorizedPlanUploaded } from "@/lib/notifications";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const { response } = await requireNotificationPermission();
  if (response) return response;

  if (!checkBasicRateLimit(`notification:authorized-plan-uploaded:${getClientIp(request)}`)) {
    return jsonError("Too Many Requests", 429);
  }

  const body = await request.json().catch(() => null);
  const projectId = parsePositiveInteger(body?.projectId);
  const documentId = parsePositiveInteger(body?.documentId);

  if (!projectId || !documentId) {
    return jsonError("Bad Request", 400);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: document, error } = await supabase
      .from("documents")
      .select("id, project_id, type, document_type")
      .eq("id", documentId)
      .eq("project_id", projectId)
      .maybeSingle();

    if (error) {
      logApiError(requestId, "authorized plan notification validation failed", error);
      return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
    }

    const documentType = document?.document_type || document?.type;
    if (!document || documentType !== "authorized_plan") {
      return jsonError("Not Found", 404);
    }

    const result = await notifyAuthorizedPlanUploaded(projectId, documentId);
    return NextResponse.json(result);
  } catch (error) {
    logApiError(requestId, "Notification authorized-plan-uploaded failed", error);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }
}
