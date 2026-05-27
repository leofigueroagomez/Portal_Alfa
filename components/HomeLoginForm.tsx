"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/services/supabase";

export default function HomeLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await supabase.rpc("ensure_current_user_profile");

    router.refresh();
    router.push("/dashboard");
  }

  return (
    <form
      onSubmit={handleLogin}
      className="rounded border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-6"
    >
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#F06B7D]">
          Acceso seguro
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          Iniciar sesión
        </h2>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm text-white/60">Correo</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12 w-full rounded border border-white/10 bg-[#101115] px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#E05062] focus:ring-2 focus:ring-[#9E1B32]/25"
            placeholder="correo@empresa.com"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-white/60">Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-12 w-full rounded border border-white/10 bg-[#101115] px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#E05062] focus:ring-2 focus:ring-[#9E1B32]/25"
            placeholder="Tu contraseña"
          />
        </label>
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded border border-[#E05062]/35 bg-[#9E1B32]/14 px-3 py-2 text-sm text-[#FFB3BE]">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-[#F4F4F5] px-5 text-sm font-semibold text-[#08090B] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        )}
        Entrar a ALFA OS
      </button>

      <Link
        href="/login"
        className="mt-4 inline-flex w-full justify-center text-sm text-white/55 transition hover:text-white"
      >
        Abrir página de login
      </Link>
    </form>
  );
}
