import { NextResponse } from "next/server";
import {
  createRequestId,
  jsonError,
  logApiError,
  requireInternalUser,
} from "@/lib/apiAuth";
import { canManageBlindQuotes } from "@/lib/permissions";
import {
  createQuoteBlinds,
  listQuoteBlinds,
  QuoteBlindsBackendError,
} from "@/lib/quoteBlindsBackend";
import { QuoteBlindValidationError } from "@/lib/quoteBlindsContract";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export const dynamic = "force-dynamic";

function backendErrorResponse(error: unknown) {
  if (error instanceof QuoteBlindValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof QuoteBlindsBackendError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof SyntaxError) {
    return jsonError("Bad Request", 400);
  }
  return null;
}

export async function GET() {
  const requestId = createRequestId();
  const { response } = await requireInternalUser();
  if (response) return response;

  try {
    const supabase = await createSupabaseServerClient();
    const quotes = await listQuoteBlinds(supabase);
    return NextResponse.json({ quotes });
  } catch (error) {
    const response = backendErrorResponse(error);
    if (response) return response;
    logApiError(requestId, "list blinds quotes failed", error);
    return NextResponse.json(
      { error: "Internal Server Error", request_id: requestId },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const { profile, response } = await requireInternalUser();
  if (response) return response;
  if (!profile || !canManageBlindQuotes(profile.role)) {
    return jsonError("Forbidden", 403);
  }

  try {
    const payload = await request.json();
    const supabase = await createSupabaseServerClient();
    const quote = await createQuoteBlinds(supabase, payload, profile.id);
    return NextResponse.json({ quote }, { status: 201 });
  } catch (error) {
    const response = backendErrorResponse(error);
    if (response) return response;
    logApiError(requestId, "create blinds quote failed", error);
    return NextResponse.json(
      { error: "Internal Server Error", request_id: requestId },
      { status: 500 }
    );
  }
}
