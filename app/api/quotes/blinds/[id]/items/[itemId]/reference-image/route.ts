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
  getQuoteBlindsDetail,
  QuoteBlindsBackendError,
} from "@/lib/quoteBlindsBackend";
import { isQuoteBlindImagePathForQuote } from "@/lib/quoteBlindsContract";
import {
  buildQuoteBlindImagePath,
  isAcceptedQuoteBlindImageMimeType,
  QUOTE_BLINDS_IMAGE_MAX_BYTES,
  QUOTE_BLINDS_IMAGE_SIGNED_URL_TTL_SECONDS,
  QUOTE_BLINDS_IMAGES_BUCKET,
} from "@/lib/quoteBlindsStorage";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>;
};

async function getRouteState(context: RouteContext) {
  const { id, itemId } = await context.params;
  const quoteId = parsePositiveInteger(id);
  const quoteItemId = parsePositiveInteger(itemId);

  if (!quoteId || !quoteItemId) {
    return { quoteId: null, quoteItemId: null, item: null };
  }

  const supabase = await createSupabaseServerClient();
  const detail = await getQuoteBlindsDetail(supabase, quoteId);
  const item = detail.items.find((candidate) => candidate.id === quoteItemId);

  if (!item) {
    throw new QuoteBlindsBackendError("Partida no encontrada.", 404);
  }

  return { quoteId, quoteItemId, item, supabase };
}

function knownErrorResponse(error: unknown) {
  if (error instanceof QuoteBlindsBackendError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status }
    );
  }
  return null;
}

function getReferenceImagePath(item: {
  blind_detail?: { reference_image_path?: unknown } | null;
}) {
  const value = item.blind_detail?.reference_image_path;
  return typeof value === "string" && value ? value : null;
}

export async function GET(_request: Request, context: RouteContext) {
  const requestId = createRequestId();
  const { response } = await requireInternalUser();
  if (response) return response;

  try {
    const state = await getRouteState(context);
    if (!state.quoteId || !state.item || !state.supabase) {
      return jsonError("Bad Request", 400);
    }

    const path = getReferenceImagePath(state.item);
    if (!path) return jsonError("Not Found", 404);
    if (!isQuoteBlindImagePathForQuote(path, state.quoteId)) {
      return NextResponse.json(
        { error: "La referencia de imagen no cumple el contrato privado." },
        { status: 409 }
      );
    }

    const { data, error } = await state.supabase.storage
      .from(QUOTE_BLINDS_IMAGES_BUCKET)
      .createSignedUrl(path, QUOTE_BLINDS_IMAGE_SIGNED_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      throw error || new Error("No fue posible firmar la imagen.");
    }

    return NextResponse.json({
      signed_url: data.signedUrl,
      expires_in: QUOTE_BLINDS_IMAGE_SIGNED_URL_TTL_SECONDS,
    });
  } catch (error) {
    const response = knownErrorResponse(error);
    if (response) return response;
    logApiError(requestId, "get blinds reference image failed", error);
    return NextResponse.json(
      { error: "Internal Server Error", request_id: requestId },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  const requestId = createRequestId();
  const { profile, response } = await requireInternalUser();
  if (response) return response;
  if (!profile || !canManageBlindQuotes(profile.role)) {
    return jsonError("Forbidden", 403);
  }

  try {
    const state = await getRouteState(context);
    if (
      !state.quoteId ||
      !state.quoteItemId ||
      !state.item ||
      !state.supabase
    ) {
      return jsonError("Bad Request", 400);
    }

    const formData = await request.formData();
    const file = formData.get("image");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Selecciona una imagen." },
        { status: 400 }
      );
    }
    if (!isAcceptedQuoteBlindImageMimeType(file.type)) {
      return NextResponse.json(
        { error: "La imagen debe ser JPG, PNG o WebP." },
        { status: 400 }
      );
    }
    if (file.size > QUOTE_BLINDS_IMAGE_MAX_BYTES) {
      return NextResponse.json(
        { error: "La imagen no puede superar 10 MB." },
        { status: 400 }
      );
    }

    const newPath = buildQuoteBlindImagePath({
      quoteId: state.quoteId,
      quoteItemId: state.quoteItemId,
      mimeType: file.type,
      uniqueId: crypto.randomUUID(),
    });
    const previousPath = getReferenceImagePath(state.item);
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await state.supabase.storage
      .from(QUOTE_BLINDS_IMAGES_BUCKET)
      .upload(newPath, bytes, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { error: updateError } = await state.supabase
      .from("quote_blind_item_details")
      .update({ reference_image_path: newPath })
      .eq("quote_item_id", state.quoteItemId);

    if (updateError) {
      await state.supabase.storage
        .from(QUOTE_BLINDS_IMAGES_BUCKET)
        .remove([newPath]);
      throw updateError;
    }

    let cleanupPending = false;
    if (previousPath && previousPath !== newPath) {
      const { error: removeError } = await state.supabase.storage
        .from(QUOTE_BLINDS_IMAGES_BUCKET)
        .remove([previousPath]);
      if (removeError) {
        cleanupPending = true;
        logApiError(
          requestId,
          "replace blinds reference image cleanup failed",
          removeError
        );
      }
    }

    const { data: signedData, error: signedError } =
      await state.supabase.storage
        .from(QUOTE_BLINDS_IMAGES_BUCKET)
        .createSignedUrl(
          newPath,
          QUOTE_BLINDS_IMAGE_SIGNED_URL_TTL_SECONDS
        );
    if (signedError || !signedData?.signedUrl) {
      throw signedError || new Error("No fue posible firmar la imagen.");
    }

    return NextResponse.json({
      reference_image_path: newPath,
      signed_url: signedData.signedUrl,
      expires_in: QUOTE_BLINDS_IMAGE_SIGNED_URL_TTL_SECONDS,
      cleanup_pending: cleanupPending,
    });
  } catch (error) {
    const response = knownErrorResponse(error);
    if (response) return response;
    logApiError(requestId, "upload blinds reference image failed", error);
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
  if (!profile || !canManageBlindQuotes(profile.role)) {
    return jsonError("Forbidden", 403);
  }

  try {
    const state = await getRouteState(context);
    if (
      !state.quoteId ||
      !state.quoteItemId ||
      !state.item ||
      !state.supabase
    ) {
      return jsonError("Bad Request", 400);
    }

    const path = getReferenceImagePath(state.item);
    if (!path) return NextResponse.json({ deleted: false });
    if (!isQuoteBlindImagePathForQuote(path, state.quoteId)) {
      return NextResponse.json(
        { error: "La referencia de imagen no cumple el contrato privado." },
        { status: 409 }
      );
    }

    const { error: updateError } = await state.supabase
      .from("quote_blind_item_details")
      .update({ reference_image_path: null })
      .eq("quote_item_id", state.quoteItemId);
    if (updateError) throw updateError;

    const { error: removeError } = await state.supabase.storage
      .from(QUOTE_BLINDS_IMAGES_BUCKET)
      .remove([path]);
    if (removeError) {
      logApiError(
        requestId,
        "delete blinds reference image cleanup failed",
        removeError
      );
    }

    return NextResponse.json({
      deleted: true,
      cleanup_pending: Boolean(removeError),
    });
  } catch (error) {
    const response = knownErrorResponse(error);
    if (response) return response;
    logApiError(requestId, "delete blinds reference image failed", error);
    return NextResponse.json(
      { error: "Internal Server Error", request_id: requestId },
      { status: 500 }
    );
  }
}
