import { NextResponse } from "next/server";
import { checkRateLimit, createRequestId, logApiError } from "@/lib/apiAuth";
import { resolveSimulatorViewer } from "@/lib/simuladorAudio/access";
import { sanitizeDesign, summarizeDesign } from "@/lib/simuladorAudio/design";
import { ensureLeadForAccess } from "@/lib/simuladorAudio/leads";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";

// Los mismos valores que acepta leads_customer_type_check.
const PROJECT_TYPES = ["residencial", "comercial", "corporativo", "industrial"];
const MAX_BODY_BYTES = 400_000;

/**
 * "Solicitar propuesta": guarda el diseño del visitante y lo deja en su
 * prospecto. Solo para visitantes verificados; el equipo de ALFA y los
 * clientes de portal usan el simulador sin generar prospectos.
 */
export async function POST(request: Request) {
  const requestId = createRequestId();
  const viewer = await resolveSimulatorViewer();

  if (!viewer) {
    return NextResponse.json(
      { error: "Tu acceso venció. Vuelve a verificar tu correo." },
      { status: 401 }
    );
  }

  if (viewer.kind !== "visitante") {
    return NextResponse.json(
      { error: "La solicitud de propuesta es para visitantes del sitio." },
      { status: 403 }
    );
  }

  if (!(await checkRateLimit(`sim-propuesta:${viewer.accessId}`, 6, 60 * 60_000))) {
    return NextResponse.json(
      { error: "Ya recibimos varias solicitudes tuyas. Te contactaremos pronto.", requestId },
      { status: 429 }
    );
  }

  const rawBody = await request.text().catch(() => "");
  if (!rawBody || rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "El diseño es demasiado grande." }, { status: 400 });
  }

  let body: Record<string, unknown> | null = null;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    body = null;
  }

  const design = sanitizeDesign(body?.design);
  const projectType = String(body?.projectType || "");
  const note = String(body?.note || "").trim().slice(0, 1000);

  if (!design || !PROJECT_TYPES.includes(projectType)) {
    return NextResponse.json({ error: "No pudimos leer el diseño." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: access, error: accessError } = await supabase
      .from("simulator_access")
      .select("id, email, name, phone, verified_at, lead_id, attribution")
      .eq("id", viewer.accessId)
      .maybeSingle();

    if (accessError) throw accessError;

    if (!access?.verified_at) {
      return NextResponse.json(
        { error: "Tu acceso venció. Vuelve a verificar tu correo." },
        { status: 401 }
      );
    }

    const leadId = await ensureLeadForAccess(supabase, access);
    const summary = summarizeDesign(design);
    const nowIso = new Date().toISOString();

    const { error: designError } = await supabase.from("simulator_designs").insert({
      access_id: access.id,
      lead_id: leadId,
      project_type: projectType,
      note: note || null,
      summary,
      design,
    });

    if (designError) throw designError;

    const message = [
      "Pidió propuesta desde el simulador de audio.",
      summary,
      note ? `Nota del cliente: ${note}` : "",
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 2000);

    const { error: leadError } = await supabase
      .from("leads")
      .update({ customer_type: projectType, message, updated_at: nowIso })
      .eq("id", leadId);

    if (leadError) throw leadError;

    await supabase
      .from("simulator_access")
      .update({ last_seen_at: nowIso })
      .eq("id", access.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    logApiError(requestId, "simulador-audio propuesta failed", error);

    return NextResponse.json(
      { error: "No pudimos enviar tu solicitud. Intenta de nuevo en unos minutos.", requestId },
      { status: 503 }
    );
  }
}
