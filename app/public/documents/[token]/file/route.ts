import { NextResponse } from "next/server";
import { checkBasicRateLimit, createRequestId, getClientIp, logApiError } from "@/lib/apiAuth";
import { getPublicDocumentLink, recordPublicDocumentAccess } from "@/lib/publicDocuments";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const requestId = createRequestId();
  const { token } = await params;
  const rateLimitKey = `public-doc:file:${token}:${getClientIp(request)}`;

  if (!checkBasicRateLimit(rateLimitKey, 30, 60_000)) {
    return NextResponse.json({ error: "Too Many Requests", requestId }, { status: 429 });
  }

  const result = await getPublicDocumentLink(token, { request, requestId }).catch((error) => {
    logApiError(requestId, "public document link lookup failed", error);
    return null;
  });

  if (!result) {
    return NextResponse.json({ error: "Documento no disponible." }, { status: 404 });
  }

  const { supabase, link } = result;

  if (link.document_type !== "authorized_plan" || !link.document_id) {
    await recordPublicDocumentAccess(supabase, link, "unsupported_file", {
      request,
      requestId,
    });
    return NextResponse.json({ error: "Archivo no disponible." }, { status: 404 });
  }

  const { data: document, error } = await supabase
    .from("documents")
    .select("id, project_id, name, file_url, type, document_type, is_client_visible, bucket_id, storage_path")
    .eq("id", link.document_id)
    .eq("project_id", link.client_project_id)
    .eq("is_client_visible", true)
    .maybeSingle();

  if (error) {
    logApiError(requestId, "public authorized plan lookup failed", error);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }

  const documentType = document?.document_type || document?.type;
  if (!document?.bucket_id || !document.storage_path || documentType !== "authorized_plan") {
    await recordPublicDocumentAccess(supabase, link, "missing_file", {
      request,
      requestId,
    });
    return NextResponse.json({ error: "Archivo no disponible." }, { status: 404 });
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(document.bucket_id)
    .createSignedUrl(document.storage_path, 300);

  if (signedError || !signedData?.signedUrl) {
    if (signedError) {
      logApiError(requestId, "public authorized plan signed url failed", signedError);
    }
    await recordPublicDocumentAccess(supabase, link, "signed_url_failed", {
      request,
      requestId,
    });
    return NextResponse.json({ error: "Archivo no disponible.", requestId }, { status: 404 });
  }

  await recordPublicDocumentAccess(supabase, link, "success", { request, requestId });
  return NextResponse.redirect(signedData.signedUrl);
}
