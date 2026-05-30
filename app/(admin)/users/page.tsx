import Link from "next/link";
import { UserCog } from "lucide-react";
import { canManageUsers, normalizeRole } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/services/profile";
import { createSupabaseServerClient } from "@/services/supabaseServer";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  is_active: boolean | null;
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  direccion: "Direccion",
  comercial: "Comercial",
  ingenieria: "Ingenieria",
  project_manager: "Project Manager",
  instalador: "Instalador",
  compras: "Compras",
  finanzas: "Finanzas",
};

export default async function UsersPage() {
  const currentProfile = await getCurrentUserProfile();

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
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .order("full_name", { ascending: true });

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <section className="mb-10">
        <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA OS</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Usuarios</h1>
        <p className="mt-3 text-[#B3B3B8]">
          Administracion de perfiles internos y roles. Los usuarios Auth se crean en Supabase.
        </p>
      </section>

      {error ? (
        <section className="rounded-2xl border border-[#614620] bg-[#322514] p-6 text-[#F4C66A]">
          No se pudieron cargar usuarios. Ejecuta el SQL de perfiles y roles.
        </section>
      ) : !profiles?.length ? (
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8 text-center text-[#B3B3B8]">
          <UserCog className="mx-auto mb-3" size={32} />
          No hay perfiles registrados.
        </section>
      ) : (
        <section className="rounded-xl border border-[#1F1F24] bg-[#151518]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#2A2A30] bg-[#101114] text-left text-[#B3B3B8]">
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {((profiles || []) as ProfileRow[]).map((profile) => {
                  const role = normalizeRole(profile.role);
                  return (
                    <tr key={profile.id} className="border-b border-[#222228] hover:bg-[#1A1A1F]">
                      <td className="px-4 py-3 font-semibold">
                        {profile.full_name || "Sin nombre"}
                      </td>
                      <td className="px-4 py-3 text-[#B3B3B8]">{profile.email || "-"}</td>
                      <td className="px-4 py-3">{roleLabels[role]}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-[#2A2A30] bg-[#222228] px-3 py-1 text-xs text-[#B3B3B8]">
                          {profile.is_active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/users/${profile.id}`}
                          className="rounded-lg border border-[#2A2A30] px-3 py-2 text-xs font-semibold text-[#B3B3B8] hover:text-white"
                        >
                          Editar
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
