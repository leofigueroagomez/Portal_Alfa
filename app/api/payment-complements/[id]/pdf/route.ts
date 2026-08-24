import { NextResponse } from "next/server";
import {
  createRequestId,
  jsonError,
  logApiError,
  parsePositiveInteger,
  requireAuthenticatedUser,
  requireFiscalProjectAccessForProfile,
} from "@/lib/apiAuth";
import { downloadPaymentComplementFile } from "@/lib/facturama";
import { buildFilename } from "@/lib/filenames";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();

  try {
    const id = parsePositiveInteger((await params).id);
    if (!id) return jsonError("Bad Request", 400);

    const { profile, response: authResponse } = await requireAuthenticatedUser();
    if (authResponse) return authResponse;

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("project_payment_complements")
      .select("id, facturama_id, status, complement_env, client_project_id")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      logApiError(requestId, "payment complement lookup failed", error);
      return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
    }
    if (!data?.facturama_id || data.status !== "issued") {
      return jsonError("Not Found", 404);
    }

    const { response } = await requireFiscalProjectAccessForProfile(
      profile,
      Number(data.client_project_id)
    );
    if (response) return response;

    const admin = createSupabaseAdminClient();
    const { data: complement, error: complementError } = await admin
      .from("project_payment_complements")
      .select(
        "id, facturama_id, status, complement_env, project_invoices(internal_folio, clients(name, tax_business_name))"
      )
      .eq("id", id)
      .maybeSingle();

    if (complementError || !complement?.facturama_id || complement.status !== "issued") {
      if (complementError) {
        logApiError(requestId, "payment complement admin lookup failed", complementError);
      }
      return jsonError("Not Found", 404);
    }

    const file = await downloadPaymentComplementFile(
      complement.facturama_id,
      "pdf",
      complement.complement_env === "production" ? "production" : "sandbox"
    );
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
        "Complemento-pago",
        invoice?.internal_folio || `ID${id}`,
        client?.tax_business_name || client?.name,
      ],
      "pdf",
      `complemento-pago-${id}`
    );

    return new NextResponse(file.bytes, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logApiError(requestId, "payment complement PDF download failed", error);
    return NextResponse.json(
      { error: "Unable to process request", requestId },
      { status: 500 }
    );
  }
}
