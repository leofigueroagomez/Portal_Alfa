import { NextResponse } from "next/server";
import {
  createRequestId,
  jsonError,
  logApiError,
  parsePositiveInteger,
  requireInternalUser,
} from "@/lib/apiAuth";
import {
  getQuoteBlindsDetail,
  QuoteBlindsBackendError,
} from "@/lib/quoteBlindsBackend";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();
  const { response } = await requireInternalUser();
  if (response) return response;

  const { id } = await context.params;
  const quoteId = parsePositiveInteger(id);
  if (!quoteId) return jsonError("Bad Request", 400);

  try {
    const supabase = await createSupabaseServerClient();
    const quote = await getQuoteBlindsDetail(supabase, quoteId);
    return NextResponse.json(quote);
  } catch (error) {
    if (error instanceof QuoteBlindsBackendError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    logApiError(requestId, "get blinds quote failed", error);
    return NextResponse.json(
      { error: "Internal Server Error", request_id: requestId },
      { status: 500 }
    );
  }
}
