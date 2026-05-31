import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";

const allowedCustomerTypes = [
  "residencial",
  "comercial",
  "corporativo",
  "industrial",
];

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const lead = {
    name: String(body?.name || "").trim(),
    customerType: String(body?.customerType || "").trim(),
    company: String(body?.company || "").trim(),
    phone: String(body?.phone || "").trim(),
    service: String(body?.service || "").trim(),
    message: String(body?.message || "").trim(),
    source: String(body?.source || "pagina_web_alfa_high_end_services").trim(),
    status: String(body?.status || "nuevo").trim(),
  };

  if (!lead.name || !lead.phone || !lead.service) {
    return NextResponse.json(
      { error: "Nombre, telefono y objetivo son requeridos" },
      { status: 400 }
    );
  }

  if (!allowedCustomerTypes.includes(lead.customerType)) {
    return NextResponse.json(
      { error: "Tipo de proyecto invalido" },
      { status: 400 }
    );
  }

  if (
    lead.source !== "pagina_web_alfa_high_end_services" ||
    lead.status !== "nuevo"
  ) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("leads").insert({
      name: lead.name,
      customer_type: lead.customerType,
      company: lead.company || null,
      phone: lead.phone,
      service: lead.service,
      message: lead.message || null,
      source: lead.source,
      status: lead.status,
      raw_payload: lead,
    });

    if (error) throw error;

    return NextResponse.json({ ok: true, stored: true });
  } catch (error) {
    console.error("lead persistence failed:", error);

    return NextResponse.json({ ok: true, stored: false });
  }
}
