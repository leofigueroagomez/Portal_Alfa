import { NextResponse } from "next/server";
import {
  createRequestId,
  jsonError,
  logApiError,
  parsePositiveInteger,
  requireInternalUser,
} from "@/lib/apiAuth";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { generateProjectContractPdf } from "@/lib/contractPdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();
  const { id } = await params;
  const contractId = parsePositiveInteger(id);
  if (!contractId) return jsonError("Bad Request", 400);

  // Esta ruta es solo para uso interno (panel de ALFA, ver ProjectContractCard.tsx).
  // El flujo publico para clientes vive en app/api/public/contracts/[token]/pdf,
  // que valida por token en vez de por rol.
  const { response: authResponse } = await requireInternalUser();
  if (authResponse) return authResponse;

  const adminClient = createSupabaseAdminClient();
  const { data: contract, error } = await adminClient
    .from("project_contracts")
    .select("id, contract_number")
    .eq("id", contractId)
    .maybeSingle();

  if (error || !contract) {
    return NextResponse.json({ error: "Contrato no encontrado." }, { status: 404 });
  }

  try {
    const pdfBuffer = await generateProjectContractPdf(adminClient, contractId);
    const folio = contract.contract_number || `CONT-${contractId}`;

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="contrato-${folio}.pdf"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logApiError(requestId, "Contract PDF generation failed", error);
    return NextResponse.json({ error: "Error generando PDF del contrato", requestId }, { status: 500 });
  }
}
