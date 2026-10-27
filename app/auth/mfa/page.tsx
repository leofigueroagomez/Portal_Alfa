"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/services/supabase";
import {
  getMfaErrorMessage,
  getSafeNextPath,
  MFA_DEFAULT_NEXT,
  needsMfaChallenge,
  normalizeTotpCode,
} from "@/lib/mfa";

type ChallengeState = "checking" | "ready" | "verifying" | "success" | "unavailable" | "error";

type TotpFactor = {
  id: string;
  friendly_name?: string;
};

function readNextParam() {
  if (typeof window === "undefined") return MFA_DEFAULT_NEXT;
  return getSafeNextPath(new URLSearchParams(window.location.search).get("next"));
}

export default function MfaChallengePage() {
  const router = useRouter();
  const [state, setState] = useState<ChallengeState>("checking");
  const [message, setMessage] = useState("");
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const nextPath = useRef(MFA_DEFAULT_NEXT);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadChallenge() {
      nextPath.current = readNextParam();

      const { data: aal, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError || !aal) {
        setMessage("No pudimos validar tu sesión. Intenta de nuevo.");
        setState("error");
        return;
      }

      if (!aal.currentLevel) {
        router.replace("/login");
        return;
      }

      // listFactors consulta a Supabase Auth (getUser), asi que refleja factores
      // dados de alta en otro dispositivo aunque la cookie local este desfasada.
      const { data, error } = await supabase.auth.mfa.listFactors();

      if (error || !data) {
        setMessage("No pudimos cargar tu verificación. Intenta de nuevo.");
        setState("error");
        return;
      }

      const hasVerifiedFactor = data.all.some((factor) => factor.status === "verified");

      // Sesion ya en AAL2, o usuario sin factor verificado: no hay nada que pedir.
      if (
        !needsMfaChallenge({
          currentLevel: aal.currentLevel,
          nextLevel: hasVerifiedFactor ? "aal2" : aal.currentLevel,
        })
      ) {
        router.replace(nextPath.current);
        return;
      }

      const verified = data.totp.map((factor) => ({
        id: factor.id,
        friendly_name: factor.friendly_name,
      }));

      if (verified.length === 0) {
        setMessage(
          "Tu cuenta requiere un segundo factor que esta pantalla no admite. Pide apoyo a dirección."
        );
        setState("unavailable");
        return;
      }

      setFactors(verified);
      setFactorId(verified[0].id);
      setState("ready");
    }

    loadChallenge();
  }, [router]);

  useEffect(() => {
    if (state === "ready") inputRef.current?.focus();
  }, [state]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const normalized = normalizeTotpCode(code);
    if (!normalized) {
      setMessage("Escribe los 6 dígitos de tu app de autenticación.");
      return;
    }

    setState("verifying");
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: normalized,
    });

    if (error) {
      setMessage(getMfaErrorMessage(error));
      setCode("");
      setState("ready");
      return;
    }

    setState("success");
    // Navegacion completa para que el layout interno lea la sesion AAL2 nueva.
    window.location.replace(nextPath.current);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#07080A] px-4 py-8 text-white">
      <section className="relative mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-md flex-col items-center justify-center">
        <div className="pointer-events-none absolute inset-0 -z-0 bg-[radial-gradient(circle_at_top,rgba(158,27,50,0.24),transparent_38%)]" />

        <div className="relative mb-8 w-full text-center">
          <Image
            src="/logo-alfa-os.png"
            alt="ALFA OS"
            width={420}
            height={220}
            priority
            className="mx-auto h-auto w-full max-w-[250px] object-contain sm:max-w-[320px]"
          />
          <p className="mt-5 text-sm font-medium text-white/62">Acceso seguro</p>
        </div>

        <section className="relative w-full rounded border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#F06B7D]">
            Verificación en dos pasos
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Confirma que eres tú</h1>
          <p className="mt-3 text-sm leading-6 text-white/58">
            Abre tu app de autenticación y escribe el código de 6 dígitos de ALFA OS.
          </p>

          {state === "checking" ? (
            <div className="mt-8 flex items-center gap-3 text-sm text-white/62">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Validando sesión...
            </div>
          ) : null}

          {state === "success" ? (
            <div className="mt-8 flex items-center gap-3 text-sm text-[#8CE0B6]">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              Verificado. Entrando...
            </div>
          ) : null}

          {state === "unavailable" || state === "error" ? (
            <div className="mt-8 space-y-4">
              <p className="rounded border border-[#E05062]/35 bg-[#9E1B32]/14 px-3 py-2 text-sm text-[#FFB3BE]">
                {message}
              </p>
              {state === "error" ? (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex h-12 w-full items-center justify-center rounded bg-[#F4F4F5] px-5 text-sm font-semibold text-[#08090B] transition hover:bg-white"
                >
                  Reintentar
                </button>
              ) : null}
            </div>
          ) : null}

          {state === "ready" || state === "verifying" ? (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {factors.length > 1 ? (
                <label className="block">
                  <span className="sr-only">Dispositivo</span>
                  <select
                    value={factorId}
                    onChange={(event) => setFactorId(event.target.value)}
                    className="h-12 w-full rounded border border-white/10 bg-[#101115] px-4 text-sm text-white outline-none transition focus:border-[#E05062] focus:ring-2 focus:ring-[#9E1B32]/25"
                  >
                    {factors.map((factor) => (
                      <option key={factor.id} value={factor.id}>
                        {factor.friendly_name || "App de autenticación"}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]*"
                maxLength={7}
                required
                aria-label="Código de verificación"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="h-14 w-full rounded border border-white/10 bg-[#101115] px-4 text-center text-2xl font-semibold tracking-[0.5em] text-white outline-none transition placeholder:text-white/20 focus:border-[#E05062] focus:ring-2 focus:ring-[#9E1B32]/25"
                placeholder="000000"
              />

              {message ? (
                <p className="rounded border border-[#E05062]/35 bg-[#9E1B32]/14 px-3 py-2 text-sm text-[#FFB3BE]">
                  {message}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={state === "verifying"}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-[#F4F4F5] px-5 text-sm font-semibold text-[#08090B] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {state === "verifying" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                )}
                Verificar
              </button>
            </form>
          ) : null}

          {state !== "success" ? (
            <form action="/auth/signout" method="post" className="mt-6 text-center">
              <button
                type="submit"
                className="text-sm font-semibold text-white/52 transition hover:text-white"
              >
                Cerrar sesión
              </button>
            </form>
          ) : null}
        </section>

        <p className="relative mt-6 max-w-sm text-center text-xs leading-5 text-white/38">
          ¿Perdiste tu dispositivo? Pide a dirección que retire tu factor para volver a
          configurarlo.
        </p>
      </section>
    </main>
  );
}
