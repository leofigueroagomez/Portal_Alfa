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
import { notifySiteVisitCreated } from "@/lib/notifications";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const { response } = await requireNotificationPermission();
  if (response) return response;

  if (!checkBasicRateLimit(`notification:site-visit-created:${getClientIp(request)}`)) {
    return jsonError("Too Many Requests", 429);
  }

  const body = await request.json().catch(() => null);
  const projectId = parsePositiveInteger(body?.projectId);
  const visitId = parsePositiveInteger(body?.visitId);

  if (!projectId || !visitId) {
    return jsonError("Bad Request", 400);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: visit, error } = await supabase
      .from("project_site_visits")
      .select("id, client_project_id")
      .eq("id", visitId)
      .eq("client_project_id", projectId)
      .maybeSingle();

    if (error) {
      logApiError(requestId, "site visit notification validation failed", error);
      return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
    }

    if (!visit) return jsonError("Not Found", 404);

    const result = await notifySiteVisitCreated(projectId, visitId);
    return NextResponse.json(result);
  } catch (error) {
    logApiError(requestId, "Notification site-visit-created failed", error);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }
}
