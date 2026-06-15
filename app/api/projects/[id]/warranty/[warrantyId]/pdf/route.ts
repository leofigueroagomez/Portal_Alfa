import { NextResponse } from "next/server";
import {
  createRequestId,
  jsonError,
  logApiError,
  parsePositiveInteger,
  requireWorkOrderRole,
} from "@/lib/apiAuth";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { generateWarrantyLetterPdf } from "@/lib/postSalePdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; warrantyId: string }> }
) {
  const requestId = createRequestId();
  const { response } = await requireWorkOrderRole();
  if (response) return response;

  const { id, warrantyId } = await params;
  const projectId = parsePositiveInteger(id);
  const parsedWarrantyId = parsePositiveInteger(warrantyId);
  if (!projectId || !parsedWarrantyId) return jsonError("Bad Request", 400);

  const supabase = await createSupabaseServerClient();
  const { data: warranty, error } = await supabase
    .from("project_warranties")
    .select("id")
    .eq("id", parsedWarrantyId)
    .eq("client_project_id", projectId)
    .maybeSingle();

  if (error) {
    logApiError(requestId, "project warranty PDF lookup failed", error);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }

  if (!warranty) {
    return NextResponse.json({ error: "Carta de garantia no encontrada." }, { status: 404 });
  }

  try {
    const pdf = await generateWarrantyLetterPdf(supabase, projectId, parsedWarrantyId);

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="carta-garantia-${projectId}-${parsedWarrantyId}.pdf"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logApiError(requestId, "project warranty PDF generation failed", error);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }
}
