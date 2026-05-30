"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { alfaRoles, type AlfaRole } from "@/lib/permissions";
import UserProfileForm from "../UserProfileForm";

type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  is_active: boolean;
};

type Props = {
  userId: string;
  currentUserId: string;
};

const roleLabels: Record<AlfaRole, string> = {
  admin: "Admin",
  direccion: "Direccion",
  comercial: "Comercial",
  ingenieria: "Ingenieria",
  project_manager: "Project Manager",
  instalador: "Instalador",
  compras: "Compras",
  finanzas: "Finanzas",
};

function formatApiError(json: unknown) {
  if (!json || typeof json !== "object") return "Error desconocido";
  const payload = json as Record<string, unknown>;
  return [
    payload.error ? `error: ${String(payload.error)}` : null,
    payload.code ? `code: ${String(payload.code)}` : null,
    `currentUserEmail: ${String(payload.currentUserEmail ?? "")}`,
    `hasServiceRoleKey: ${String(payload.hasServiceRoleKey ?? "")}`,
    `isAdmin: ${String(payload.isAdmin ?? "")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export default function UserDetailClient({ userId, currentUserId }: Props) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const json = await response.json().catch(() => null);
      setLoading(false);

      if (!response.ok) {
        alert(formatApiError(json));
        return;
      }

      setUser((json.users || []).find((item: AdminUser) => item.id === userId) || null);
    }

    loadUser();
  }, [userId]);

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
          {user?.email || "Perfil interno"}
        </p>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8 text-[#B3B3B8]">
          Cargando usuario...
        </section>
      ) : user ? (
        <UserProfileForm
          profile={user}
          currentUserId={currentUserId}
          roleOptions={alfaRoles.map((role) => ({
            value: role,
            label: roleLabels[role],
          }))}
        />
      ) : (
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8">
          Usuario no encontrado.
        </section>
      )}
    </main>
  );
}
