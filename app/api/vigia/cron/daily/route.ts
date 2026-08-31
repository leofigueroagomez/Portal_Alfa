import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { runVigia } from "@/lib/vigia/runner";
import { renderVigiaBrief, sendVigiaBrief } from "@/lib/vigia/brief";
import { runAutoInvestigations } from "@/lib/vigia/investigate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  return handleVigiaDaily(request);
}

export async function POST(request: Request) {
  return handleVigiaDaily(request);
}

async function handleVigiaDaily(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const url = new URL(request.url);

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    if (url.searchParams.get("key") !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const dryRun = url.searchParams.get("dry") === "1";
  const previewOnly = url.searchParams.get("preview") === "1";
  const sensorParam = url.searchParams.get("sensors");
  const sensorIds = sensorParam
    ? sensorParam.split(",").map((value) => value.trim().toUpperCase()).filter(Boolean)
    : undefined;

  try {
    const supabase = createSupabaseAdminClient();
    const summary = await runVigia(supabase, sensorIds ? { sensorIds } : undefined);

    if (previewOnly) {
      const { html } = await renderVigiaBrief(supabase, summary);
      return new NextResponse(html, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    const brief = dryRun
      ? { sent: false, skipped: "dry run" }
      : await sendVigiaBrief(supabase, summary);

    // B2: investigacion automatica de los hallazgos criticos sin diagnostico.
    // No corre en dry run ni si solo se pidio un subconjunto de sensores.
    const investigations =
      dryRun || sensorIds
        ? { attempted: 0, completed: 0, skipped: 0, results: [] }
        : await runAutoInvestigations(supabase);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      dryRun,
      summary,
      brief,
      investigations,
    });
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : "Error desconocido";
    console.error("El Vigia (cron daily) fallo:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
