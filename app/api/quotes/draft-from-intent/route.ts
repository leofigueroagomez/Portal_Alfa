import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/appUrl";
import { normalizeRole } from "@/lib/permissions";
import { runVoiceDraft } from "@/lib/quotes/voiceDraft";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Sprint G4 - Voz/texto -> borrador de cotizacion.
 *
 *   POST /api/quotes/draft-from-intent
 *   body: { "transcript": "cotizacion para Guillermo de 4 camaras Hikvision..." }
 *
 * Auth: QUOTE_VOICE_SECRET / CRON_SECRET (header Bearer o ?key=) para el Atajo
 * de Siri, o sesion interna de ALFA OS.
 *
 * Respuesta:
 *   { ok, status: "completada", quote_id, url, grand_total_mxn, assumptions, warnings }
 *   { ok, status: "aclaracion", question, options }
 *   { ok:false, status: "error" | "sin_presupuesto", error }
 */
async function authorize(request: Request): Promise<{ ok: boolean; actor: string }> {
  const secret = process.env.QUOTE_VOICE_SECRET || process.env.CRON_SECRET;
  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization");
  if (
    secret &&
    (authHeader === `Bearer ${secret}` || url.searchParams.get("key") === secret)
  ) {
    return { ok: true, actor: "voz" };
  }
  const profile = await getCurrentInternalUserProfile();
  if (profile) {
    const role = normalizeRole(profile.role);
    if (role !== "client" && role !== "contractor") {
      return { ok: true, actor: profile.email || profile.full_name || "operador" };
    }
  }
  return { ok: false, actor: "" };
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { transcript?: string; conversation?: unknown };
  try {
    body = (await request.json()) as { transcript?: string; conversation?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body JSON invalido. Envia { transcript: \"...\" }." },
      { status: 400 },
    );
  }

  const transcript = String(body?.transcript ?? "").trim().slice(0, 2000);
  if (!transcript) {
    return NextResponse.json(
      { ok: false, error: "Falta transcript." },
      { status: 400 },
    );
  }

  const conversation = Array.isArray(body?.conversation)
    ? (body.conversation as Array<{ role: "user" | "assistant"; content: unknown }>)
    : undefined;

  try {
    const supabase = createSupabaseAdminClient();
    const outcome = await runVoiceDraft(supabase, {
      transcript,
      conversation,
      actor: auth.actor,
    });

    const base = getAppBaseUrl();
    const url =
      outcome.status === "completada" && outcome.quoteId
        ? `${base}/quotes/${outcome.quoteId}/edit`
        : undefined;

    return NextResponse.json(
      {
        ok: outcome.status === "completada" || outcome.status === "aclaracion",
        status: outcome.status,
        quote_id: outcome.quoteId,
        url,
        grand_total_mxn: outcome.grandTotalMxn,
        assumptions: outcome.assumptions,
        warnings: outcome.warnings,
        question: outcome.question,
        options: outcome.options,
        cost_usd: outcome.costUsd,
        error: outcome.error,
      },
      { status: outcome.status === "error" ? 500 : 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("draft-from-intent fallo:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
