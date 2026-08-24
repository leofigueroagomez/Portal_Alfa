import { NextResponse } from "next/server";
import {
  checkBasicRateLimit,
  createRequestId,
  getClientIp,
  logApiError,
} from "@/lib/apiAuth";
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

async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) return true;

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (ip && ip !== "unknown") formData.append("remoteip", ip);

    const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: formData,
      cache: "no-store",
    });

    if (!result.ok) return false;
    const json = (await result.json()) as { success?: boolean };
    return Boolean(json.success);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const clientIp = getClientIp(request);

  if (!checkBasicRateLimit(`lead-submit:${clientIp}`, 5, 60_000)) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo más tarde.", requestId },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);

  // Honeypot anti-bot check
  const honeypot = String(body?.hp_website || body?.website_url || "").trim();
  if (honeypot) {
    return NextResponse.json({ ok: true, stored: false });
  }

  // Cloudflare Turnstile verification if configured in production
  if (process.env.TURNSTILE_SECRET_KEY) {
    const turnstileToken = String(
      body?.turnstileToken || body?.["cf-turnstile-response"] || ""
    ).trim();

    if (!turnstileToken) {
      return NextResponse.json(
        { error: "Verificación de seguridad requerida.", requestId },
        { status: 400 }
      );
    }

    const isHuman = await verifyTurnstileToken(turnstileToken, clientIp);
    if (!isHuman) {
      return NextResponse.json(
        { error: "Falló la verificación de seguridad.", requestId },
        { status: 400 }
      );
    }
  }

  const lead = {
    name: String(body?.name || "").trim().slice(0, 120),
    customerType: String(body?.customerType || "").trim().slice(0, 50),
    company: String(body?.company || "").trim().slice(0, 120),
    phone: String(body?.phone || "").trim().slice(0, 30),
    service: String(body?.service || "").trim().slice(0, 200),
    message: String(body?.message || "").trim().slice(0, 2000),
    interest: String(body?.interest || "").trim().slice(0, 100),
    budgetRange: String(body?.budgetRange || "").trim().slice(0, 100),
    timeline: String(body?.timeline || "").trim().slice(0, 100),
    source: normalizeSource(String(body?.source || "Landing Web").trim().slice(0, 100)),
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
    logApiError(requestId, "lead persistence failed", error);

    return NextResponse.json({ ok: true, stored: false });
  }
}
