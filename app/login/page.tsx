"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/dashboard");
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
            Sistema interno
          </p>
          <p className="mt-2 text-sm text-white/42">
            CRM · Cotizaciones · Ingenierías · Proyectos
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="relative w-full rounded border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-6"
        >
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Correo electrónico"
              autoComplete="email"
              required
              className="h-12 w-full rounded border border-white/10 bg-[#101115] px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#E05062] focus:ring-2 focus:ring-[#9E1B32]/25"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Contraseña"
              autoComplete="current-password"
              required
              className="h-12 w-full rounded border border-white/10 bg-[#101115] px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#E05062] focus:ring-2 focus:ring-[#9E1B32]/25"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button className="h-12 w-full rounded bg-[#F4F4F5] px-5 text-sm font-semibold text-[#08090B] transition hover:bg-white">
              Entrar
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
