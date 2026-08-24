import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { generateProjectContractPdf } from "@/lib/contractPdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  const adminClient = createSupabaseAdminClient();
  const { data: contract, error } = await adminClient
    .from("project_contracts")
    .select("id, contract_number, onboarding_token, signing_token")
    .or(`onboarding_token.eq.${token},signing_token.eq.${token}`)
    .maybeSingle();

  if (error || !contract) {
    return NextResponse.json({ error: "Contrato no encontrado o token expirado" }, { status: 404 });
  }

  try {
    const pdfBuffer = await generateProjectContractPdf(adminClient, contract.id);
    const folio = contract.contract_number || `CONT-${contract.id}`;

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="contrato-${folio}.pdf"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error generando PDF público de contrato:", error);
    return NextResponse.json({ error: "Error generando PDF" }, { status: 500 });
  }
}
