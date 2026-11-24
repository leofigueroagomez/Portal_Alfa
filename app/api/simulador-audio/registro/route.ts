import { NextResponse } from "next/server";
import {
  checkRateLimit,
  createRequestId,
  getClientIp,
  logApiError,
} from "@/lib/apiAuth";
import {
  SIMULATOR_CODE_RESEND_COOLDOWN_MS,
  SIMULATOR_CODE_TTL_MS,
  generateVerificationCode,
  getSimulatorAccessSecret,
  hashVerificationCode,
  normalizeEmail,
  normalizePhone,
} from "@/lib/simuladorAudio/access";
import { sendSimulatorCodeEmail } from "@/lib/simuladorAudio/email";
import {
  isTurnstileEnforced,
  readTurnstileToken,
  verifyTurnstileToken,
} from "@/lib/turnstile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";

const TEN_MINUTES = 10 * 60_000;
const ONE_HOUR = 60 * 60_000;

type AccessRow = {
  id: number;
  name: string;
  verified_at: string | null;
  code_sent_at: string | null;
};

function sanitizeAttribution(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;

  const source = raw as Record<string, unknown>;
  const keys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
    "referrer",
    "landing_page",
  ];
  const result: Record<string, string> = {};

  for (const key of keys) {
    const value = String(source[key] || "").trim().slice(0, 300);
    if (value) result[key] = value;
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Alta de visitante (o reenvio de codigo a uno ya registrado) para el
 * simulador de audio. Siempre termina mandando un codigo de 6 digitos al
 * correo; el acceso se concede en /api/simulador-audio/verificar.
 */
export async function POST(request: Request) {
  const requestId = createRequestId();
  const clientIp = getClientIp(request);
  const secret = getSimulatorAccessSecret();

  if (!secret || !process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "El registro no está disponible por ahora. Intenta más tarde.", requestId },
      { status: 503 }
    );
  }

  if (!(await checkRateLimit(`sim-registro-ip:${clientIp}`, 6, TEN_MINUTES))) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos.", requestId },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);

  // Campo trampa: un bot lo llena, una persona no lo ve.
  if (String(body?.hp_website || "").trim()) {
    return NextResponse.json({ ok: true });
  }

  const isReturning = body?.mode === "regreso";
  const email = normalizeEmail(body?.email);

  if (!email) {
    return NextResponse.json({ error: "Escribe un correo válido." }, { status: 400 });
  }

  const name = String(body?.name || "").trim().replace(/\s+/g, " ").slice(0, 120);
  const phone = normalizePhone(body?.phone);

  if (!isReturning) {
    if (name.length < 2) {
      return NextResponse.json({ error: "Escribe tu nombre." }, { status: 400 });
    }
    if (!phone) {
      return NextResponse.json(
        { error: "Escribe un teléfono de 10 dígitos." },
        { status: 400 }
      );
    }
    if (body?.privacyAccepted !== true) {
      return NextResponse.json(
        { error: "Necesitamos que aceptes el aviso de privacidad." },
        { status: 400 }
      );
    }
  }

  if (isTurnstileEnforced()) {
    const isHuman = await verifyTurnstileToken(readTurnstileToken(body), clientIp);
    if (!isHuman) {
      return NextResponse.json(
        { error: "No pudimos completar la verificación de seguridad. Intenta de nuevo.", requestId },
        { status: 400 }
      );
    }
  }

  // Dos topes contra el uso del formulario para bombardear correos ajenos:
  // por destinatario y global.
  const [emailAllowed, globalAllowed] = await Promise.all([
    checkRateLimit(`sim-registro-email:${email}`, 4, 15 * 60_000),
    checkRateLimit("sim-registro-global", 120, ONE_HOUR),
  ]);

  if (!emailAllowed || !globalAllowed) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos.", requestId },
      { status: 429 }
    );
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data: existing, error: lookupError } = await supabase
      .from("simulator_access")
      .select("id, name, verified_at, code_sent_at")
      .eq("email", email)
      .maybeSingle();

    if (lookupError) throw lookupError;

    let access = existing as AccessRow | null;

    if (isReturning && !access?.verified_at) {
      // Misma respuesta exista o no el correo: no revela quien esta registrado.
      return NextResponse.json({ ok: true });
    }

    if (
      access?.code_sent_at &&
      Date.now() - new Date(access.code_sent_at).getTime() <
        SIMULATOR_CODE_RESEND_COOLDOWN_MS
    ) {
      return NextResponse.json(
        { error: "Ya te enviamos un código. Espera un momento antes de pedir otro." },
        { status: 429 }
      );
    }

    if (!access) {
      const { data: created, error: insertError } = await supabase
        .from("simulator_access")
        .insert({
          email,
          name,
          phone,
          privacy_accepted_at: new Date().toISOString(),
          attribution: sanitizeAttribution(body?.attribution),
        })
        .select("id, name, verified_at, code_sent_at")
        .single();

      if (insertError) throw insertError;
      access = created as AccessRow;
    } else if (!access.verified_at && !isReturning) {
      // Aun sin verificar: se aceptan los datos mas recientes. Una vez
      // verificado, nadie mas puede sobrescribir nombre o telefono.
      const { error: updateError } = await supabase
        .from("simulator_access")
        .update({ name, phone, updated_at: new Date().toISOString() })
        .eq("id", access.id);

      if (updateError) throw updateError;
      access = { ...access, name };
    }

    const code = generateVerificationCode();
    const now = Date.now();
    const { error: codeError } = await supabase
      .from("simulator_access")
      .update({
        code_hash: hashVerificationCode(secret, access.id, code),
        code_expires_at: new Date(now + SIMULATOR_CODE_TTL_MS).toISOString(),
        code_attempts: 0,
        code_sent_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString(),
      })
      .eq("id", access.id);

    if (codeError) throw codeError;

    const sent = await sendSimulatorCodeEmail({ to: email, name: access.name, code });

    if (!sent) {
      return NextResponse.json(
        { error: "No pudimos enviar el correo. Revisa la dirección e intenta de nuevo.", requestId },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logApiError(requestId, "simulador-audio registro failed", error);

    return NextResponse.json(
      { error: "El registro no está disponible por ahora. Intenta más tarde.", requestId },
      { status: 503 }
    );
  }
}
