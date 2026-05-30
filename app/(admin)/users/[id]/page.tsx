import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { canManageUsers } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/services/profile";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import UserProfileForm from "../UserProfileForm";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentProfile = await getCurrentUserProfile();
  const { id } = await params;

  if (!canManageUsers(currentProfile?.role)) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8">
          No tienes permiso para administrar usuarios.
        </section>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .eq("id", id)
    .maybeSingle();

  if (error || !profile) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <Link href="/users" className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
          <ArrowLeft size={18} />
          Volver a usuarios
        </Link>
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8">
          Usuario no encontrado.
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link href="/users" className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
        <ArrowLeft size={18} />
        Volver a usuarios
      </Link>

      <section className="mb-10">
        <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA OS</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Editar usuario</h1>
        <p className="mt-3 text-[#B3B3B8]">
          {(profile as { email?: string | null }).email || "Perfil interno"}
        </p>
      </section>

      <UserProfileForm
        profile={
          profile as {
            id: string;
            email: string | null;
            full_name: string | null;
            role: string | null;
            is_active: boolean | null;
          }
        }
      />
    </main>
  );
}
