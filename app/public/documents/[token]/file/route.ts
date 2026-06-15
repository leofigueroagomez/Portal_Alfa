import { NextResponse } from "next/server";
import { createRequestId, logApiError } from "@/lib/apiAuth";
import { getPublicDocumentLink } from "@/lib/publicDocuments";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const requestId = createRequestId();
  const { token } = await params;
  const result = await getPublicDocumentLink(token).catch((error) => {
    logApiError(requestId, "public document link lookup failed", error);
    return null;
  });

  if (!result) {
    return NextResponse.json({ error: "Documento no disponible." }, { status: 404 });
  }

  const { supabase, link } = result;

  if (link.document_type !== "authorized_plan" || !link.document_id) {
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
  if (
    !document?.bucket_id ||
    !document.storage_path ||
    documentType !== "authorized_plan"
  ) {
    return NextResponse.json(
      {
        error:
          "El archivo no está disponible. Verifica el almacenamiento del documento.",
      },
      { status: 404 }
    );
  }

  const { data: signedData, error: signedError } = await supabase.storage
    .from(document.bucket_id)
    .createSignedUrl(document.storage_path, 300);

  if (signedError || !signedData?.signedUrl) {
    return NextResponse.json(
      {
        error:
          "El archivo no está disponible. Verifica el almacenamiento del documento.",
      },
      { status: 404 }
    );
  }

  return NextResponse.redirect(signedData.signedUrl);
}
