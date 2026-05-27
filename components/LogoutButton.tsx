"use client";

import { supabase } from "@/services/supabase";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();

    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full bg-[#222228] hover:bg-[#2A2A30] transition rounded-xl py-3 text-sm"
    >
      Cerrar sesión
    </button>
  );
}