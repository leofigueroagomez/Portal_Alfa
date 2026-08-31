import { NextResponse } from "next/server";
import {
  createRequestId,
  jsonError,
  logApiError,
  parsePositiveInteger,
  requireAuthenticatedUser,
  requireFiscalProjectAccessForProfile,
} from "@/lib/apiAuth";
import { buildFilename } from "@/lib/filenames";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export const dynamic = "force-dynamic";

// Acuse de cancelacion del SAT (XML), guardado en base64 en
// project_invoices.cancellation_acuse_xml al cancelar el CFDI.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();
  const invoiceId = parsePositiveInteger((await params).id);

  if (!invoiceId) return jsonError("Bad Request", 400);

  const { profile, response: authResponse } = await requireAuthenticatedUser();
  if (authResponse) return authResponse;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_invoices")
    .select("id, client_project_id, cancellation_status")
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) {
    logApiError(requestId, "cancellation acuse lookup failed", error);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }

  if (!data) return jsonError("Not Found", 404);

  const { response } = await requireFiscalProjectAccessForProfile(
    profile,
    Number(data.client_project_id)
  );
  if (response) return response;

  const admin = createSupabaseAdminClient();
  const { data: invoice, error: invoiceError } = await admin
    .from("project_invoices")
    .select("id, internal_folio, cancellation_acuse_xml, clients(name, tax_business_name)")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invoiceError) {
    logApiError(requestId, "cancellation acuse admin lookup failed", invoiceError);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }

  if (!invoice?.cancellation_acuse_xml) {
    return jsonError("Not Found", 404);
  }

  let xml: string;
  try {
    xml = Buffer.from(String(invoice.cancellation_acuse_xml), "base64").toString(
      "utf-8"
    );
    if (!xml.trim()) throw new Error("empty acuse");
  } catch (decodeError) {
    logApiError(requestId, "cancellation acuse decode failed", decodeError);
    return jsonError("Not Found", 404);
  }

  const client = Array.isArray(invoice.clients) ? invoice.clients[0] : invoice.clients;
  const filename = buildFilename(
    [
      "Acuse cancelacion",
      invoice.internal_folio || `ID${invoiceId}`,
      client?.tax_business_name || client?.name,
    ],
    "xml",
    `acuse-cancelacion-${invoiceId}`
  );

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
