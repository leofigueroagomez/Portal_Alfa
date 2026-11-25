import { NextResponse } from "next/server";
import { checkRateLimit, createRequestId, logApiError } from "@/lib/apiAuth";
import { resolveSimulatorViewer } from "@/lib/simuladorAudio/access";
import {
  sanitizeAssistantSpaces,
  summarizeAssistant,
} from "@/lib/simuladorAudio/assistant";
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

  // La solicitud puede traer el diseño del simulador, las respuestas del
  // asistente, o las dos cosas. Lo que venga debe ser valido, y debe venir algo.
  const hasDesign = body?.design !== undefined && body?.design !== null;
  const hasAssistant = body?.assistant !== undefined && body?.assistant !== null;
  const design = hasDesign ? sanitizeDesign(body?.design) : null;
  const assistant = hasAssistant ? sanitizeAssistantSpaces(body?.assistant) : null;
  const projectType = String(body?.projectType || "");
  const note = String(body?.note || "").trim().slice(0, 1000);

  if (
    (hasDesign && !design) ||
    (hasAssistant && !assistant) ||
    (!design && !assistant) ||
    !PROJECT_TYPES.includes(projectType)
  ) {
    return NextResponse.json({ error: "No pudimos leer tu solicitud." }, { status: 400 });
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
    // Las recomendaciones del asistente se recalculan aqui a partir de las
    // respuestas: no se confia en lo que el navegador diga que se recomendo.
    const summary = [
      assistant ? summarizeAssistant(assistant) : "",
      design ? summarizeDesign(design) : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const nowIso = new Date().toISOString();

    const { error: designError } = await supabase.from("simulator_designs").insert({
      access_id: access.id,
      lead_id: leadId,
      project_type: projectType,
      note: note || null,
      summary,
      // El diseño del simulador en la raiz (como siempre) y, si las hay, las
      // respuestas del asistente en `assistant`.
      design: { ...(design || {}), ...(assistant ? { assistant } : {}) },
    });

    if (designError) throw designError;

    // El mensaje del prospecto tiene tope; si el resumen es largo se recorta
    // el resumen y no la nota del cliente, que va al final.
    const header = "Pidió propuesta desde el simulador de audio.";
    const noteLine = note ? `Nota del cliente: ${note}` : "";
    const summaryRoom = Math.max(
      0,
      2000 - header.length - 1 - (noteLine ? noteLine.length + 1 : 0)
    );
    const message = [header, summary.slice(0, summaryRoom).trimEnd(), noteLine]
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
