import { NextResponse } from "next/server";
import {
  checkRateLimit,
  createRequestId,
  getClientIp,
  logApiError,
} from "@/lib/apiAuth";
import {
  SIMULATOR_ACCESS_COOKIE,
  SIMULATOR_ACCESS_MAX_AGE_SECONDS,
  SIMULATOR_CODE_MAX_ATTEMPTS,
  createAccessToken,
  getSimulatorAccessSecret,
  normalizeEmail,
  verificationCodeMatches,
} from "@/lib/simuladorAudio/access";
import { ensureLeadForAccess } from "@/lib/simuladorAudio/leads";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";

const INVALID_CODE = "El código no es correcto o ya venció. Pide uno nuevo.";

/** Valida el codigo de 6 digitos, crea el prospecto y entrega el pase. */
export async function POST(request: Request) {
  const requestId = createRequestId();
  const clientIp = getClientIp(request);
  const secret = getSimulatorAccessSecret();

  if (!secret) {
    return NextResponse.json(
      { error: "La verificación no está disponible por ahora.", requestId },
      { status: 503 }
    );
  }

  if (!(await checkRateLimit(`sim-verificar-ip:${clientIp}`, 12, 10 * 60_000))) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos.", requestId },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const email = normalizeEmail(body?.email);
  const code = String(body?.code || "").replace(/\s/g, "");

  if (!email || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: INVALID_CODE }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: access, error: lookupError } = await supabase
      .from("simulator_access")
      .select(
        "id, email, name, phone, code_hash, code_expires_at, code_attempts, verified_at, lead_id, attribution"
      )
      .eq("email", email)
      .maybeSingle();

    if (lookupError) throw lookupError;

    const expired =
      !access?.code_expires_at ||
      new Date(access.code_expires_at).getTime() <= Date.now();

    if (!access || !access.code_hash || expired) {
      return NextResponse.json({ error: INVALID_CODE }, { status: 400 });
    }

    if (access.code_attempts >= SIMULATOR_CODE_MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "Se agotaron los intentos para este código. Pide uno nuevo." },
        { status: 429 }
      );
    }

    // El intento se cuenta antes de comparar para que no se pueda adivinar en paralelo.
    const { error: attemptError } = await supabase
      .from("simulator_access")
      .update({ code_attempts: access.code_attempts + 1 })
      .eq("id", access.id);

    if (attemptError) throw attemptError;

    if (!verificationCodeMatches(secret, access.id, code, access.code_hash)) {
      return NextResponse.json({ error: INVALID_CODE }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const { error: verifyError } = await supabase
      .from("simulator_access")
      .update({
        verified_at: access.verified_at || nowIso,
        code_hash: null,
        code_expires_at: null,
        code_attempts: 0,
        last_seen_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", access.id);

    if (verifyError) throw verifyError;

    // Si el prospecto no se pudo crear, el acceso se concede igual: los datos
    // ya estan en simulator_access y se reintenta en la siguiente verificacion.
    await ensureLeadForAccess(supabase, access).catch((error) =>
      logApiError(requestId, "simulador-audio lead creation failed", error)
    );

    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      SIMULATOR_ACCESS_COOKIE,
      createAccessToken(secret, access.id),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SIMULATOR_ACCESS_MAX_AGE_SECONDS,
      }
    );

    return response;
  } catch (error) {
    logApiError(requestId, "simulador-audio verificar failed", error);

    return NextResponse.json(
      { error: "La verificación no está disponible por ahora.", requestId },
      { status: 503 }
    );
  }
}
