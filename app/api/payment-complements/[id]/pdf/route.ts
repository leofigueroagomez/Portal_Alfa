import { NextResponse } from "next/server";
import { downloadPaymentComplementFile } from "@/lib/facturama";
import { getPaymentComplementsConfig } from "@/lib/paymentComplements";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const config = getPaymentComplementsConfig();
    const { id } = await params;
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("project_payment_complements")
      .select("id, facturama_id, status, complement_env")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data?.facturama_id || data.status !== "issued") {
      return NextResponse.json(
        { error: "Complemento de pago no timbrado." },
        { status: 404 }
      );
    }

    const file = await downloadPaymentComplementFile(
      data.facturama_id,
      "pdf",
      config.env
    );

    return new NextResponse(file.bytes, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `inline; filename="complemento-pago-${id}.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo descargar el PDF del complemento.",
      },
      { status: 500 }
    );
  }
}
