"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/services/supabase";

type InviteState =
  | "checking"
  | "ready"
  | "saving"
  | "success"
  | "invalid"
  | "error";

function getHashParams() {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.hash.replace(/^#/, ""));
}

function getSearchParams() {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
}

export default function AcceptInvitePage() {
  const router = useRouter();
  const [state, setState] = useState<InviteState>("checking");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const passwordsMatch = useMemo(
    () => password.length > 0 && password === confirmPassword,
    [password, confirmPassword]
  );

  useEffect(() => {
    async function acceptInviteSession() {
      try {
        const hashParams = getHashParams();
        const searchParams = getSearchParams();

        const accessToken = hashParams.get("access_token") || searchParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token") || searchParams.get("refresh_token");
        const code = searchParams.get("code");
        const tokenHash = searchParams.get("token_hash");
        const type = hashParams.get("type") || searchParams.get("type");

        // 1. Si hay código PKCE de Supabase
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data.session) {
            setUserEmail(data.user?.email || null);
            setState("ready");
            return;
          }
        }

        // 2. Si hay token hash de verificación
        if (tokenHash && type) {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });
          if (!error && data.session) {
            setUserEmail(data.user?.email || null);
            setState("ready");
            return;
          }
        }

        // 3. Si hay tokens de acceso en el hash de redirección de Supabase
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (!error && data.session) {
            setUserEmail(data.user?.email || null);
            window.history.replaceState(null, "", "/auth/accept-invite");
            setState("ready");
            return;
          }
        }

        // 4. Verificar si ya existe una sesión activa
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          setUserEmail(sessionData.session.user.email || null);
          setState("ready");
          return;
        }

        setMessage("El enlace de acceso o invitación no es válido o ha expirado. Solicita uno nuevo por WhatsApp.");
        setState("invalid");
      } catch (err: any) {
        setMessage(err?.message || "Error al procesar el enlace de invitación.");
        setState("invalid");
      }
    }

    acceptInviteSession();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (!passwordsMatch) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }

    setState("saving");
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message || "No se pudo guardar la contraseña.");
      setState("error");
      return;
    }

    setState("success");
    setTimeout(() => {
      router.replace("/portal");
      router.refresh();
    }, 1000);
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
          <p className="mt-5 text-sm font-medium text-white/62">
            Portal de Servicios y Subcontratistas
          </p>
        </div>

        <section className="w-full rounded-2xl border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-8">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#E08A96]" />
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#F06B7D]">
              Activación Segura de Cuenta
            </p>
          </div>

          <h1 className="mt-3 text-2xl font-semibold">
            Crea tu contraseña de acceso
          </h1>
          <p className="mt-2 text-xs leading-5 text-white/60">
            {userEmail ? (
              <>
                Cuenta vinculada a: <strong className="text-white">{userEmail}</strong>.
              </>
            ) : null}{" "}
            Define tu clave para acceder a tus servicios asignados, órdenes y convenios en ALFA OS.
          </p>

          {state === "checking" ? (
            <div className="mt-8 flex items-center gap-3 rounded-xl border border-white/10 bg-[#101115] p-4 text-sm text-white/62">
              <Loader2 className="h-4 w-4 animate-spin text-[#E08A96]" />
              Validando enlace de acceso...
            </div>
          ) : null}

          {state === "invalid" ? (
            <div className="mt-8 space-y-3 rounded-xl border border-[#E05062]/35 bg-[#9E1B32]/14 p-4 text-sm text-[#FFB3BE]">
              <p>{message || "El enlace de invitación no es válido o ha expirado."}</p>
              <p className="text-xs text-white/60">
                Pide al administrador que te reenvíe el enlace de activación por WhatsApp.
              </p>
            </div>
          ) : null}

          {state === "success" ? (
            <div className="mt-8 flex items-center gap-3 rounded-xl border border-[#1F7A4D]/45 bg-[#143D2A] p-4 text-sm text-[#8CE0B6]">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>Contraseña guardada con éxito. Entrando a tu portal...</span>
            </div>
          ) : null}

          {state === "ready" || state === "saving" || state === "error" ? (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-white/70 uppercase">
                  Nueva contraseña <span className="text-[#E08A96]">*</span>
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#101115] px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#E05062] focus:ring-2 focus:ring-[#9E1B32]/25"
                  placeholder="Mínimo 8 caracteres"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-white/70 uppercase">
                  Confirmar contraseña <span className="text-[#E08A96]">*</span>
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="h-12 w-full rounded-xl border border-white/10 bg-[#101115] px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#E05062] focus:ring-2 focus:ring-[#9E1B32]/25"
                  placeholder="Repite tu contraseña"
                />
              </label>

              {message ? (
                <p className="rounded-xl border border-[#E05062]/35 bg-[#9E1B32]/14 px-3 py-2 text-xs text-[#FFB3BE]">
                  {message}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={state === "saving" || !passwordsMatch || password.length < 8}
                className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#7A1F2B] px-5 text-sm font-bold uppercase tracking-wider text-white shadow-xl shadow-[#7A1F2B]/30 transition hover:bg-[#5A1320] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {state === "saving" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                )}
                {state === "saving" ? "Guardando contraseña..." : "Activar Cuenta y Continuar"}
              </button>
            </form>
          ) : null}
        </section>
      </section>
    </main>
  );
}
