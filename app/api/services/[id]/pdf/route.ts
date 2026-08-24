import { NextResponse } from "next/server";
import {
  createRequestId,
  jsonError,
  logApiError,
  parsePositiveInteger,
  requireServicesRole,
} from "@/lib/apiAuth";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { generateServiceReportPdf } from "@/lib/serviceReportPdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();
  const { response } = await requireServicesRole();
  if (response) return response;

  const { id } = await params;
  const serviceId = parsePositiveInteger(id);
  if (!serviceId) return jsonError("Bad Request", 400);

  const supabase = await createSupabaseServerClient();
  const { data: service, error } = await supabase
    .from("service_reports")
    .select("id, service_number")
    .eq("id", serviceId)
    .maybeSingle();

  if (error) {
    logApiError(requestId, "service PDF lookup failed", error);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }

  if (!service) {
    return NextResponse.json({ error: "Reporte de servicio no encontrado." }, { status: 404 });
  }

  try {
    const pdf = await generateServiceReportPdf(supabase, serviceId);
    const folio = service.service_number || `SERV-${String(serviceId).padStart(4, "0")}`;

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="reporte-${folio}.pdf"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logApiError(requestId, "service PDF generation failed", error);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }
}
