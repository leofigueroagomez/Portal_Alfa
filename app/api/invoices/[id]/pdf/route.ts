import { NextResponse } from "next/server";
import { downloadFacturamaInvoiceFile } from "@/lib/facturama";
import { canViewFinancials } from "@/lib/permissions";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return downloadInvoiceFile((await params).id, "pdf");
}

async function downloadInvoiceFile(id: string, format: "pdf" | "xml") {
  const profile = await getCurrentInternalUserProfile();

  if (!profile || !canViewFinancials(profile.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("project_invoices")
    .select("id, facturama_id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.facturama_id) {
    return NextResponse.json({ error: "Factura sin ID de Facturama" }, { status: 404 });
  }

  try {
    const file = await downloadFacturamaInvoiceFile(data.facturama_id, format);
    return new Response(file.bytes, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="factura-${id}.${format}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-ALFA-Invoice-File": format,
        ...(file.providerContentType
          ? { "X-Facturama-Content-Type": file.providerContentType }
          : {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error descargando archivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
