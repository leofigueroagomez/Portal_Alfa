import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { getCurrentUserProfile } from "@/services/profile";
import { renderPrintRouteToPdf } from "@/lib/serverPdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; deliveryId: string }> }
) {
  const profile = await getCurrentUserProfile();

  if (!profile?.is_active) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id, deliveryId } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: delivery, error } = await supabase
    .from("project_deliveries")
    .select("id")
    .eq("id", deliveryId)
    .eq("client_project_id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!delivery) {
    return NextResponse.json({ error: "Entrega no encontrada." }, { status: 404 });
  }

  try {
    const pdf = await renderPrintRouteToPdf(
      `/projects/${id}/deliveries/${deliveryId}/print`,
      request.headers.get("cookie")
    );

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="acta-entrega-${id}-${deliveryId}.pdf"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo generar el PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
