import { NextResponse } from "next/server";
import {
  createRequestId,
  jsonError,
  logApiError,
  parsePositiveInteger,
  requireWorkOrderRole,
} from "@/lib/apiAuth";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { generateProjectDeliveryPdf } from "@/lib/postSalePdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; deliveryId: string }> }
) {
  const requestId = createRequestId();
  const { response } = await requireWorkOrderRole();
  if (response) return response;

  const { id, deliveryId } = await params;
  const projectId = parsePositiveInteger(id);
  const parsedDeliveryId = parsePositiveInteger(deliveryId);
  if (!projectId || !parsedDeliveryId) return jsonError("Bad Request", 400);

  const supabase = await createSupabaseServerClient();
  const { data: delivery, error } = await supabase
    .from("project_deliveries")
    .select("id")
    .eq("id", parsedDeliveryId)
    .eq("client_project_id", projectId)
    .maybeSingle();

  if (error) {
    logApiError(requestId, "project delivery PDF lookup failed", error);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }

  if (!delivery) {
    return NextResponse.json({ error: "Entrega no encontrada." }, { status: 404 });
  }

  try {
    const pdf = await generateProjectDeliveryPdf(supabase, projectId, parsedDeliveryId);

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="acta-entrega-${projectId}-${parsedDeliveryId}.pdf"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logApiError(requestId, "project delivery PDF generation failed", error);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }
}
