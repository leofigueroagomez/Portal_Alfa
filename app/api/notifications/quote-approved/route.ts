import { NextResponse } from "next/server";
import {
  checkBasicRateLimit,
  createRequestId,
  getClientIp,
  jsonError,
  logApiError,
  parsePositiveInteger,
  requireQuoteNotificationPermission,
} from "@/lib/apiAuth";
import { notifyQuoteApproved } from "@/lib/notifications";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const { response } = await requireQuoteNotificationPermission();
  if (response) return response;

  if (!checkBasicRateLimit(`notification:quote-approved:${getClientIp(request)}`)) {
    return jsonError("Too Many Requests", 429);
  }

  const body = await request.json().catch(() => null);
  const projectId = parsePositiveInteger(body?.projectId);
  const quoteId = parsePositiveInteger(body?.quoteId);

  if (!projectId || !quoteId) {
    return jsonError("Bad Request", 400);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: quote, error } = await supabase
      .from("quotes")
      .select("id, client_project_id")
      .eq("id", quoteId)
      .eq("client_project_id", projectId)
      .maybeSingle();

    if (error) {
      logApiError(requestId, "quote notification validation failed", error);
      return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
    }

    if (!quote) return jsonError("Not Found", 404);

    const result = await notifyQuoteApproved(projectId, quoteId);
    return NextResponse.json(result);
  } catch (error) {
    logApiError(requestId, "Notification quote-approved failed", error);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }
}
