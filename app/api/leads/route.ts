import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";

const allowedCustomerTypes = [
  "residencial",
  "comercial",
  "corporativo",
  "industrial",
];

const allowedInterests = [
  "Audio y video",
  "Redes e infraestructura",
  "CCTV y seguridad",
  "Control de acceso",
  "Automatización",
  "Soporte",
  "Otro",
];

const allowedBudgetRanges = [
  "Menos de $50,000",
  "$50,000 – $150,000",
  "$150,000 – $500,000",
  "Más de $500,000",
  "Aún no lo sé",
];

const allowedTimelines = [
  "Lo antes posible",
  "Este mes",
  "1 a 3 meses",
  "Solo estoy explorando",
];

const allowedSources = [
  "Landing Web",
  "Referido",
  "LinkedIn",
  "Google",
  "Prospectación Directa",
  "Cliente Existente",
  "pagina_web_alfa_high_end_services",
];

function normalizeSource(value: string) {
  return value === "pagina_web_alfa_high_end_services" ? "Landing Web" : value;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const lead = {
    name: String(body?.name || "").trim(),
    customerType: String(body?.customerType || "").trim(),
    company: String(body?.company || "").trim(),
    phone: String(body?.phone || "").trim(),
    service: String(body?.service || "").trim(),
    message: String(body?.message || "").trim(),
    interest: String(body?.interest || "").trim(),
    budgetRange: String(body?.budgetRange || "").trim(),
    timeline: String(body?.timeline || "").trim(),
    source: normalizeSource(String(body?.source || "Landing Web").trim()),
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
    (lead.interest && !allowedInterests.includes(lead.interest)) ||
    (lead.budgetRange && !allowedBudgetRanges.includes(lead.budgetRange)) ||
    (lead.timeline && !allowedTimelines.includes(lead.timeline))
  ) {
    return NextResponse.json(
      { error: "Datos de calificacion invalidos" },
      { status: 400 }
    );
  }

  if (
    !allowedSources.includes(lead.source) ||
    lead.status !== "nuevo"
  ) {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const baseInsert = {
      name: lead.name,
      customer_type: lead.customerType,
      company: lead.company || null,
      phone: lead.phone,
      service: lead.service,
      message: lead.message || null,
      source: lead.source,
      status: lead.status,
      raw_payload: lead,
    };

    const { error } = await supabase.from("leads").insert({
      ...baseInsert,
      interest: lead.interest || null,
      budget_range: lead.budgetRange || null,
      timeline: lead.timeline || null,
    });

    if (error) {
      const missingColumn =
        error.code === "42703" ||
        error.code === "PGRST204" ||
        error.message.toLowerCase().includes("budget_range") ||
        error.message.toLowerCase().includes("interest") ||
        error.message.toLowerCase().includes("timeline");

      if (!missingColumn) throw error;

      const { error: fallbackError } = await supabase
        .from("leads")
        .insert(baseInsert);

      if (fallbackError) throw fallbackError;
    }

    return NextResponse.json({ ok: true, stored: true });
  } catch (error) {
    console.error("lead persistence failed:", error);

    return NextResponse.json({ ok: true, stored: false });
  }
}
