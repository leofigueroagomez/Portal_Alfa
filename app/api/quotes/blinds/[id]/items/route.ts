import { NextResponse } from "next/server";
import {
  createRequestId,
  jsonError,
  logApiError,
  parsePositiveInteger,
  requireInternalUser,
} from "@/lib/apiAuth";
import { canManageBlindQuotes } from "@/lib/permissions";
import {
  addQuoteBlindItem,
  QuoteBlindsBackendError,
} from "@/lib/quoteBlindsBackend";
import { QuoteBlindValidationError } from "@/lib/quoteBlindsContract";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();
  const { profile, response } = await requireInternalUser();
  if (response) return response;
  if (!profile || !canManageBlindQuotes(profile.role)) {
    return jsonError("Forbidden", 403);
  }

  const { id } = await context.params;
  const quoteId = parsePositiveInteger(id);
  if (!quoteId) return jsonError("Bad Request", 400);

  try {
    const payload = await request.json();
    const supabase = await createSupabaseServerClient();
    const result = await addQuoteBlindItem(supabase, quoteId, payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (
      error instanceof QuoteBlindValidationError ||
      error instanceof QuoteBlindsBackendError
    ) {
      return NextResponse.json(
        { error: error.message },
        {
          status:
            error instanceof QuoteBlindsBackendError ? error.status : 400,
        }
      );
    }
    if (error instanceof SyntaxError) return jsonError("Bad Request", 400);
    logApiError(requestId, "create blinds quote item failed", error);
    return NextResponse.json(
      { error: "Internal Server Error", request_id: requestId },
      { status: 500 }
    );
  }
}
