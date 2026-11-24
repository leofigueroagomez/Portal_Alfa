"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Mail } from "lucide-react";
import TurnstileWidget, {
  TURNSTILE_PENDING_MESSAGE,
  useTurnstile,
} from "@/components/TurnstileWidget";
import { getStoredAttribution } from "@/lib/utmTracking";

type Step = "datos" | "regreso" | "codigo";

const inputClass =
  "mt-2 w-full rounded-xl border border-[#E5E3DD] bg-white px-4 py-3 text-base text-[#111111] outline-none transition placeholder:text-[#A3A5AB] focus:border-[#9E1B32] focus:ring-2 focus:ring-[#9E1B32]/15";
const labelClass = "block text-sm font-medium text-[#33353B]";
const primaryButtonClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#9E1B32] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#B91C3C] disabled:cursor-not-allowed disabled:opacity-60";
const linkButtonClass =
  "text-sm font-medium text-[#9E1B32] underline-offset-4 hover:underline disabled:opacity-60";

async function postJson(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => null)) as { error?: string } | null;

  return {
    ok: response.ok,
    error: data?.error || "Algo salió mal. Intenta de nuevo.",
  };
}

export default function AccessGate() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("datos");
  const [previousStep, setPreviousStep] = useState<"datos" | "regreso">("datos");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const turnstile = useTurnstile();

  async function requestCode(mode: "nuevo" | "regreso") {
    setError("");
    setNotice("");

    if (turnstile.pending) {
      setError(TURNSTILE_PENDING_MESSAGE);
      return false;
    }

    setBusy(true);

    const result = await postJson("/api/simulador-audio/registro", {
      mode,
      name,
      email,
      phone,
      privacyAccepted,
      hp_website: honeypot,
      attribution: getStoredAttribution(),
      turnstileToken: turnstile.token,
    });

    // Cada token sirve una sola vez: se pide otro para el siguiente envio.
    turnstile.reset();
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return false;
    }

    return true;
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await requestCode("nuevo")) {
      setPreviousStep("datos");
      setCode("");
      setStep("codigo");
    }
  }

  async function handleReturning(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await requestCode("regreso")) {
      setPreviousStep("regreso");
      setCode("");
      setStep("codigo");
    }
  }

  async function handleResend() {
    if (await requestCode(previousStep === "regreso" ? "regreso" : "nuevo")) {
      setNotice("Te enviamos un código nuevo.");
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    const result = await postJson("/api/simulador-audio/verificar", { email, code });

    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }

    // El pase ya viene en una cookie: al refrescar, el servidor muestra el simulador.
    router.refresh();
  }

  // Va dentro de cada paso, arriba del control que lo usa: si Cloudflare pide
  // marcar la casilla, el visitante la ve antes de enviar. Solo hay un paso
  // montado a la vez, asi que nunca hay dos widgets en pantalla.
  const turnstileWidget = (
    <TurnstileWidget {...turnstile.widgetProps} theme="light" className="mt-6" />
  );

  return (
    <div className="rounded-3xl bg-white p-7 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.35)] sm:p-9">
      {step === "datos" ? (
        <form onSubmit={handleRegister} noValidate>
          <h2 className="text-2xl font-semibold tracking-tight text-[#111111]">
            Empieza tu diseño
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#5F626A]">
            Déjanos tus datos y te enviamos un código a tu correo para entrar.
          </p>

          <div className="mt-7 space-y-5">
            <label className={labelClass}>
              Nombre
              <input
                className={inputClass}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                maxLength={120}
                required
              />
            </label>
            <label className={labelClass}>
              Correo
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                inputMode="email"
                maxLength={254}
                required
              />
            </label>
            <label className={labelClass}>
              Teléfono
              <input
                className={inputClass}
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                autoComplete="tel"
                inputMode="tel"
                maxLength={30}
                placeholder="10 dígitos"
                required
              />
            </label>

            {/* Campo trampa para bots; fuera de pantalla y del orden de tabulación. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Sitio web
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(event) => setHoneypot(event.target.value)}
                />
              </label>
            </div>

            <label className="flex items-start gap-3 text-sm leading-6 text-[#5F626A]">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-[#9E1B32]"
                checked={privacyAccepted}
                onChange={(event) => setPrivacyAccepted(event.target.checked)}
              />
              <span>
                Acepto el{" "}
                <Link
                  href="/aviso-de-privacidad"
                  target="_blank"
                  className="font-medium text-[#9E1B32] underline-offset-4 hover:underline"
                >
                  aviso de privacidad
                </Link>{" "}
                y que ALFA me contacte sobre mi proyecto.
              </span>
            </label>
          </div>

          {turnstileWidget}

          {error ? (
            <p role="alert" className="mt-5 text-sm text-[#9E1B32]">
              {error}
            </p>
          ) : null}

          <button type="submit" className={`${primaryButtonClass} mt-7`} disabled={busy}>
            {busy ? "Enviando código…" : "Enviar código"}
            {busy ? null : <ArrowRight className="h-4 w-4" />}
          </button>

          <p className="mt-6 text-center text-sm text-[#5F626A]">
            ¿Ya te registraste?{" "}
            <button
              type="button"
              className={linkButtonClass}
              onClick={() => {
                setError("");
                setStep("regreso");
              }}
            >
              Entra con tu correo
            </button>
          </p>
        </form>
      ) : null}

      {step === "regreso" ? (
        <form onSubmit={handleReturning} noValidate>
          <h2 className="text-2xl font-semibold tracking-tight text-[#111111]">
            Entra con tu correo
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#5F626A]">
            Si ya te registraste, te enviamos un código nuevo.
          </p>

          <label className={`${labelClass} mt-7`}>
            Correo
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              inputMode="email"
              maxLength={254}
              required
            />
          </label>

          {turnstileWidget}

          {error ? (
            <p role="alert" className="mt-5 text-sm text-[#9E1B32]">
              {error}
            </p>
          ) : null}

          <button type="submit" className={`${primaryButtonClass} mt-7`} disabled={busy}>
            {busy ? "Enviando código…" : "Enviar código"}
          </button>

          <p className="mt-6 text-center text-sm text-[#5F626A]">
            ¿Es tu primera vez?{" "}
            <button
              type="button"
              className={linkButtonClass}
              onClick={() => {
                setError("");
                setStep("datos");
              }}
            >
              Regístrate
            </button>
          </p>
        </form>
      ) : null}

      {step === "codigo" ? (
        <form onSubmit={handleVerify} noValidate>
          <Mail className="h-7 w-7 text-[#9E1B32]" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[#111111]">
            Revisa tu correo
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#5F626A]">
            {previousStep === "regreso"
              ? "Si ese correo ya está registrado, le enviamos un código de 6 dígitos a "
              : "Enviamos un código de 6 dígitos a "}
            <span className="font-medium text-[#111111]">{email}</span>. Vence en 15
            minutos.
          </p>

          <label className={`${labelClass} mt-7`}>
            Código
            <input
              className={`${inputClass} text-center text-2xl font-semibold tracking-[0.4em]`}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              required
            />
          </label>

          {error ? (
            <p role="alert" className="mt-5 text-sm text-[#9E1B32]">
              {error}
            </p>
          ) : null}
          {notice ? <p className="mt-5 text-sm text-[#0F6B43]">{notice}</p> : null}

          <button
            type="submit"
            className={`${primaryButtonClass} mt-7`}
            disabled={busy || code.length !== 6}
          >
            {busy ? "Verificando…" : "Entrar al simulador"}
          </button>

          {turnstileWidget}

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              className={linkButtonClass}
              onClick={handleResend}
              disabled={busy}
            >
              Enviar otro código
            </button>
            <button
              type="button"
              className="text-sm text-[#5F626A] underline-offset-4 hover:underline"
              onClick={() => {
                setError("");
                setNotice("");
                setStep(previousStep);
              }}
            >
              Cambiar correo
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
