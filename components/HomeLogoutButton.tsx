"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { supabase } from "@/services/supabase";

export default function HomeLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-white/75 transition hover:border-white/20 hover:bg-white/[0.1] hover:text-white sm:w-auto"
    >
      <LogOut className="h-4 w-4" aria-hidden="true" />
      Cerrar sesión
    </button>
  );
}
