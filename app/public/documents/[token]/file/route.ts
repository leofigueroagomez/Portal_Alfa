import { NextResponse } from "next/server";
import { getPublicDocumentLink } from "@/lib/publicDocuments";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const result = await getPublicDocumentLink(token);

  if (!result) {
    return NextResponse.json({ error: "Documento no disponible." }, { status: 404 });
  }

  const { supabase, link } = result;

  if (link.document_type !== "authorized_plan" || !link.document_id) {
    return NextResponse.json({ error: "Archivo no disponible." }, { status: 404 });
  }

  const { data: document, error } = await supabase
    .from("documents")
    .select("id, project_id, name, file_url, type, document_type, is_client_visible")
    .eq("id", link.document_id)
    .eq("project_id", link.client_project_id)
    .eq("is_client_visible", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const documentType = document?.document_type || document?.type;
  if (!document?.file_url || documentType !== "authorized_plan") {
    return NextResponse.json({ error: "Archivo no disponible." }, { status: 404 });
  }

  return NextResponse.redirect(document.file_url);
}
