"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/services/supabase";

type ResetState = "checking" | "ready" | "saving" | "success" | "invalid" | "error";

function getHashParams() {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [state, setState] = useState<ResetState>("checking");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordsMatch = useMemo(
    () => password.length > 0 && password === confirmPassword,
    [password, confirmPassword]
  );

  useEffect(() => {
    async function acceptRecoverySession() {
      const params = getHashParams();
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type");

      if (!accessToken || !refreshToken || type !== "recovery") {
        setMessage("El enlace de recuperacion no es valido o ha expirado.");
        setState("invalid");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        setMessage("El enlace de recuperacion no es valido o ha expirado.");
        setState("invalid");
        return;
      }

      window.history.replaceState(null, "", "/auth/reset-password");
      setState("ready");
    }

    acceptRecoverySession();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("La contrasena debe tener al menos 8 caracteres.");
      return;
    }

    if (!passwordsMatch) {
      setMessage("Las contrasenas no coinciden.");
      return;
    }

    setState("saving");
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message || "No se pudo actualizar la contrasena.");
      setState("error");
      return;
    }

    setState("success");
    setTimeout(() => {
      router.replace("/portal");
      router.refresh();
    }, 900);
  }

  return (
    <main className="min-h-screen bg-[#07080A] px-4 py-8 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-md flex-col items-center justify-center">
        <div className="mb-8 text-center">
          <Image
            src="/logo-alfa-os.png"
            alt="ALFA IT"
            width={420}
            height={220}
            priority
            className="mx-auto h-auto w-full max-w-[250px] object-contain sm:max-w-[320px]"
          />
          <p className="mt-5 text-sm font-medium text-white/62">Acceso seguro</p>
        </div>

        <section className="w-full rounded border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#F06B7D]">
            Recuperacion
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Crea una nueva contrasena</h1>
          <p className="mt-3 text-sm leading-6 text-white/58">
            Este enlace solo puede usarse para restablecer el acceso de tu cuenta.
          </p>

          {state === "checking" ? (
            <div className="mt-8 flex items-center gap-3 rounded border border-white/10 bg-[#101115] p-4 text-sm text-white/62">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validando enlace...
            </div>
          ) : null}

          {state === "invalid" ? (
            <div className="mt-8 rounded border border-[#E05062]/35 bg-[#9E1B32]/14 p-4 text-sm text-[#FFB3BE]">
              {message || "El enlace de recuperacion no es valido o ha expirado."}
            </div>
          ) : null}

          {state === "success" ? (
            <div className="mt-8 flex items-center gap-3 rounded border border-[#1F7A4D]/45 bg-[#143D2A] p-4 text-sm text-[#8CE0B6]">
              <CheckCircle2 className="h-5 w-5" />
              Contrasena actualizada. Redirigiendo...
            </div>
          ) : null}

          {state === "ready" || state === "saving" || state === "error" ? (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded border border-white/10 bg-[#101115] px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#E05062] focus:ring-2 focus:ring-[#9E1B32]/25"
                placeholder="Nueva contrasena"
              />
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-12 w-full rounded border border-white/10 bg-[#101115] px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#E05062] focus:ring-2 focus:ring-[#9E1B32]/25"
                placeholder="Confirmar contrasena"
              />

              {message ? (
                <p className="rounded border border-[#E05062]/35 bg-[#9E1B32]/14 px-3 py-2 text-sm text-[#FFB3BE]">
                  {message}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={state === "saving"}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-[#F4F4F5] px-5 text-sm font-semibold text-[#08090B] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                {state === "saving" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                )}
                Guardar contrasena
              </button>
            </form>
          ) : null}
        </section>
      </section>
    </main>
  );
}
