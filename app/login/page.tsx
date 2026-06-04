"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "recovery">("login");
  const [message, setMessage] = useState("");
  const [sendingRecovery, setSendingRecovery] = useState(false);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    const { data: profile } = await supabase.rpc("ensure_current_user_profile");
    const userType = profile?.user_type;
    const isInternal = profile?.is_internal !== false;

    router.push(userType === "client_portal" || !isInternal ? "/portal" : "/dashboard");
  }

  async function handlePasswordRecovery(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setSendingRecovery(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setSendingRecovery(false);

    if (error) {
      setMessage(error.message || "No se pudo enviar el correo de recuperacion.");
      return;
    }

    setMessage("Te enviamos un enlace para restablecer tu contrasena.");
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
          <p className="mt-5 text-sm font-medium text-white/62">
            {mode === "login" ? "Sistema interno y Portal Cliente" : "Recuperacion segura"}
          </p>
          <p className="mt-2 text-sm text-white/42">
            {mode === "login"
              ? "CRM - Cotizaciones - Proyectos - Portal"
              : "Recibe un enlace para crear una nueva contrasena"}
          </p>
        </div>

        <form
          onSubmit={mode === "login" ? handleLogin : handlePasswordRecovery}
          className="relative w-full rounded border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-6"
        >
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Correo electronico"
              autoComplete="email"
              required
              className="h-12 w-full rounded border border-white/10 bg-[#101115] px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#E05062] focus:ring-2 focus:ring-[#9E1B32]/25"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            {mode === "login" ? (
              <input
                type="password"
                placeholder="Contrasena"
                autoComplete="current-password"
                required
                className="h-12 w-full rounded border border-white/10 bg-[#101115] px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#E05062] focus:ring-2 focus:ring-[#9E1B32]/25"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            ) : null}

            {message ? (
              <p className="rounded border border-white/10 bg-[#101115] px-3 py-2 text-sm text-white/72">
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={sendingRecovery}
              className="h-12 w-full rounded bg-[#F4F4F5] px-5 text-sm font-semibold text-[#08090B] transition hover:bg-white disabled:opacity-70"
            >
              {mode === "login"
                ? "Entrar"
                : sendingRecovery
                  ? "Enviando..."
                  : "Enviar enlace"}
            </button>

            <button
              type="button"
              onClick={() => {
                setMessage("");
                setMode((current) => (current === "login" ? "recovery" : "login"));
              }}
              className="w-full text-sm font-semibold text-white/62 transition hover:text-white"
            >
              {mode === "login" ? "Olvide mi contrasena" : "Volver al inicio de sesion"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
