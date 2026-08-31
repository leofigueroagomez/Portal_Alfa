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

// Acuse de cancelacion del SAT (XML) de un complemento de pago, guardado en
// base64 en project_payment_complements.cancellation_acuse_xml.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();
  const id = parsePositiveInteger((await params).id);

  if (!id) return jsonError("Bad Request", 400);

  const { profile, response: authResponse } = await requireAuthenticatedUser();
  if (authResponse) return authResponse;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_payment_complements")
    .select("id, client_project_id, cancellation_status")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    logApiError(requestId, "complement acuse lookup failed", error);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }

  if (!data) return jsonError("Not Found", 404);

  const { response } = await requireFiscalProjectAccessForProfile(
    profile,
    Number(data.client_project_id)
  );
  if (response) return response;

  const admin = createSupabaseAdminClient();
  const { data: complement, error: complementError } = await admin
    .from("project_payment_complements")
    .select(
      "id, cancellation_acuse_xml, partiality_number, project_invoices(internal_folio, clients(name, tax_business_name))"
    )
    .eq("id", id)
    .maybeSingle();

  if (complementError) {
    logApiError(requestId, "complement acuse admin lookup failed", complementError);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }

  if (!complement?.cancellation_acuse_xml) {
    return jsonError("Not Found", 404);
  }

  let xml: string;
  try {
    xml = Buffer.from(String(complement.cancellation_acuse_xml), "base64").toString(
      "utf-8"
    );
    if (!xml.trim()) throw new Error("empty acuse");
  } catch (decodeError) {
    logApiError(requestId, "complement acuse decode failed", decodeError);
    return jsonError("Not Found", 404);
  }

  const invoice = Array.isArray(complement.project_invoices)
    ? complement.project_invoices[0]
    : complement.project_invoices;
  const client = invoice
    ? Array.isArray(invoice.clients)
      ? invoice.clients[0]
      : invoice.clients
    : null;
  const filename = buildFilename(
    [
      "Acuse cancelacion complemento",
      invoice?.internal_folio || `ID${id}`,
      `P${complement.partiality_number || id}`,
      client?.tax_business_name || client?.name,
    ],
    "xml",
    `acuse-cancelacion-complemento-${id}`
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
