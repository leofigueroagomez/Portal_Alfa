import { NextResponse } from "next/server";
import {
  createRequestId,
  jsonError,
  logApiError,
  parsePositiveInteger,
  requireInternalUser,
} from "@/lib/apiAuth";
import {
  canDeleteBlindQuoteItems,
  canManageBlindQuotes,
} from "@/lib/permissions";
import {
  deleteQuoteBlindItem,
  getQuoteBlindsDetail,
  QuoteBlindsBackendError,
  updateQuoteBlindItem,
} from "@/lib/quoteBlindsBackend";
import {
  isQuoteBlindImagePathForQuote,
  QuoteBlindValidationError,
} from "@/lib/quoteBlindsContract";
import { QUOTE_BLINDS_IMAGES_BUCKET } from "@/lib/quoteBlindsStorage";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>;
};

async function parseIds(context: RouteContext) {
  const { id, itemId } = await context.params;
  return {
    quoteId: parsePositiveInteger(id),
    quoteItemId: parsePositiveInteger(itemId),
  };
}

function knownErrorResponse(error: unknown) {
  if (
    error instanceof QuoteBlindValidationError ||
    error instanceof QuoteBlindsBackendError
  ) {
    return NextResponse.json(
      { error: error.message },
      {
        status: error instanceof QuoteBlindsBackendError ? error.status : 400,
      }
    );
  }
  if (error instanceof SyntaxError) return jsonError("Bad Request", 400);
  return null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = createRequestId();
  const { profile, response } = await requireInternalUser();
  if (response) return response;
  if (!profile || !canManageBlindQuotes(profile.role)) {
    return jsonError("Forbidden", 403);
  }

  const { quoteId, quoteItemId } = await parseIds(context);
  if (!quoteId || !quoteItemId) return jsonError("Bad Request", 400);

  try {
    const payload = await request.json();
    const supabase = await createSupabaseServerClient();
    const result = await updateQuoteBlindItem(
      supabase,
      quoteId,
      quoteItemId,
      payload
    );
    return NextResponse.json(result);
  } catch (error) {
    const response = knownErrorResponse(error);
    if (response) return response;
    logApiError(requestId, "update blinds quote item failed", error);
    return NextResponse.json(
      { error: "Internal Server Error", request_id: requestId },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const requestId = createRequestId();
  const { profile, response } = await requireInternalUser();
  if (response) return response;
  if (!profile || !canDeleteBlindQuoteItems(profile.role)) {
    return jsonError("Forbidden", 403);
  }

  const { quoteId, quoteItemId } = await parseIds(context);
  if (!quoteId || !quoteItemId) return jsonError("Bad Request", 400);

  try {
    const supabase = await createSupabaseServerClient();
    const detail = await getQuoteBlindsDetail(supabase, quoteId);
    const item = detail.items.find((candidate) => candidate.id === quoteItemId);
    const rawReferenceImagePath =
      item?.blind_detail?.reference_image_path;
    const referenceImagePath =
      typeof rawReferenceImagePath === "string" &&
      isQuoteBlindImagePathForQuote(
        rawReferenceImagePath,
        quoteId
      )
        ? rawReferenceImagePath
        : null;
    const totals = await deleteQuoteBlindItem(
      supabase,
      quoteId,
      quoteItemId
    );
    let imageCleanupPending = false;
    if (referenceImagePath) {
      const { error: storageError } = await supabase.storage
        .from(QUOTE_BLINDS_IMAGES_BUCKET)
        .remove([referenceImagePath]);
      if (storageError) {
        imageCleanupPending = true;
        logApiError(
          requestId,
          "delete blinds item image cleanup failed",
          storageError
        );
      }
    }
    return NextResponse.json({
      deleted: true,
      totals,
      image_cleanup_pending: imageCleanupPending,
    });
  } catch (error) {
    const response = knownErrorResponse(error);
    if (response) return response;
    logApiError(requestId, "delete blinds quote item failed", error);
    return NextResponse.json(
      { error: "Internal Server Error", request_id: requestId },
      { status: 500 }
    );
  }
}
