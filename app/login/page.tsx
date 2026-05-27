"use client";

import { useState } from "react";
import { supabase } from "@/services/supabase";
import { useRouter } from "next/navigation";

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
    <main className="min-h-screen bg-[#0B0B0D] text-white flex items-center justify-center">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md bg-[#151518] border border-[#1F1F24] rounded-2xl p-8"
      >
        <p className="text-[#9E1B32] tracking-[0.3em] text-sm mb-4">
          ALFA IT
        </p>

        <h1 className="text-3xl font-bold mb-2">
          Iniciar sesión
        </h1>

        <p className="text-[#B3B3B8] mb-8">
          Accede a tu portal de proyectos.
        </p>

        <div className="space-y-5">
          <input
            type="email"
            placeholder="Correo electrónico"
            className="w-full bg-[#222228] rounded-xl p-4 outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Contraseña"
            className="w-full bg-[#222228] rounded-xl p-4 outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="w-full bg-[#9E1B32] hover:bg-[#B91C3C] rounded-xl py-4 font-semibold">
            Entrar
          </button>
        </div>
      </form>
    </main>
  );
}