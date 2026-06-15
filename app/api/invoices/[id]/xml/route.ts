import { NextResponse } from "next/server";
import {
  createRequestId,
  jsonError,
  logApiError,
  parsePositiveInteger,
  requireAuthenticatedUser,
  requireFiscalProjectAccessForProfile,
} from "@/lib/apiAuth";
import { downloadFacturamaInvoiceFile } from "@/lib/facturama";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export const dynamic = "force-dynamic";

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
    .select("id, client_project_id, facturama_id, status")
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) {
    logApiError(requestId, "invoice lookup failed", error);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }

  if (!data?.facturama_id || !["issued", "paid"].includes(String(data.status))) {
    return jsonError("Not Found", 404);
  }

  const { response } = await requireFiscalProjectAccessForProfile(
    profile,
    Number(data.client_project_id)
  );
  if (response) return response;

  const admin = createSupabaseAdminClient();
  const { data: invoice, error: invoiceError } = await admin
    .from("project_invoices")
    .select("id, facturama_id, status")
    .eq("id", invoiceId)
    .maybeSingle();

  if (invoiceError || !invoice?.facturama_id || !["issued", "paid"].includes(String(invoice.status))) {
    if (invoiceError) logApiError(requestId, "invoice admin lookup failed", invoiceError);
    return jsonError("Not Found", 404);
  }

  try {
    const file = await downloadFacturamaInvoiceFile(invoice.facturama_id, "xml");
    return new Response(file.bytes, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="factura-${invoiceId}.xml"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-ALFA-Invoice-File": "xml",
        ...(file.providerContentType
          ? { "X-Facturama-Content-Type": file.providerContentType }
          : {}),
      },
    });
  } catch (error) {
    logApiError(requestId, "invoice XML download failed", error);
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }
}
