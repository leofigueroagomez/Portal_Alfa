import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { getCurrentUserProfile } from "@/services/profile";
import { generateWarrantyLetterPdf } from "@/lib/postSalePdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; warrantyId: string }> }
) {
  const profile = await getCurrentUserProfile();

  if (!profile?.is_active) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id, warrantyId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: warranty, error } = await supabase
    .from("project_warranties")
    .select("id")
    .eq("id", warrantyId)
    .eq("client_project_id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!warranty) {
    return NextResponse.json({ error: "Carta de garantia no encontrada." }, { status: 404 });
  }

  try {
    const pdf = await generateWarrantyLetterPdf(supabase, Number(id), Number(warrantyId));

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="carta-garantia-${id}-${warrantyId}.pdf"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo generar el PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
