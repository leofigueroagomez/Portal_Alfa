import { NextResponse } from "next/server";
import { normalizeRole } from "@/lib/permissions";
import { investigateFinding, runAutoInvestigations } from "@/lib/vigia/investigate";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Sprint B2 - disparo de "Investigar a fondo" fuera de la Bandeja.
 *
 *   POST /api/vigia/investigate            { "findingId": 42 }   -> investiga ese hallazgo
 *   POST /api/vigia/investigate?auto=1                            -> corre runAutoInvestigations()
 *
 * Auth: CRON_SECRET (header Bearer o ?key=) para automatizaciones, o sesion
 * interna con rol admin/direccion.
 */
async function authorize(request: Request): Promise<{ ok: boolean; actor: string }> {
  const cronSecret = process.env.CRON_SECRET;
  const url = new URL(request.url);
  const authHeader = request.headers.get("authorization");
  if (
    cronSecret &&
    (authHeader === `Bearer ${cronSecret}` || url.searchParams.get("key") === cronSecret)
  ) {
    return { ok: true, actor: "cron" };
  }

  const profile = await getCurrentInternalUserProfile();
  if (profile) {
    const role = normalizeRole(profile.role);
    if (role === "admin" || role === "direccion") {
      return { ok: true, actor: profile.email || profile.full_name || "operador" };
    }
  }
  return { ok: false, actor: "" };
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const supabase = createSupabaseAdminClient();

  try {
    if (url.searchParams.get("auto") === "1") {
      const result = await runAutoInvestigations(supabase);
      return NextResponse.json({ ok: true, mode: "auto", result });
    }

    let findingId: number | null = null;
    try {
      const body = (await request.json()) as { findingId?: number };
      findingId = Number(body?.findingId) || null;
    } catch {
      findingId = Number(url.searchParams.get("findingId")) || null;
    }
    if (!findingId) {
      return NextResponse.json(
        { error: "Falta findingId (en el body JSON o ?findingId=)." },
        { status: 400 },
      );
    }

    const outcome = await investigateFinding(supabase, findingId, {
      trigger: "manual",
      requestedBy: auth.actor,
    });
    return NextResponse.json(
      { ok: outcome.ok, outcome },
      { status: outcome.ok ? 200 : 422 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    console.error("El Vigia (investigate) fallo:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
