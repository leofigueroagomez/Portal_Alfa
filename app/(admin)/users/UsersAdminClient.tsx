"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, UserCog } from "lucide-react";
import { alfaRoles, type AlfaRole } from "@/lib/permissions";

type AdminUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  is_active: boolean;
  auth_created_at: string | null;
};

type Props = {
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

function reportError(step: string, error: unknown) {
  console.error(`Error en ${step}:`, error);
  alert(`Error en ${step}`);
}

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

export default function UsersAdminClient({ currentUserId }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "comercial",
  });
  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) =>
        (a.full_name || a.email || "").localeCompare(b.full_name || b.email || "")
      ),
    [users]
  );

  async function loadUsers() {
    setLoading(true);
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const json = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      alert(formatApiError(json));
      return;
    }

    setUsers(json.users || []);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      alert(formatApiError(json));
      return;
    }

    setForm({ email: "", password: "", full_name: "", role: "comercial" });
    setShowCreate(false);
    await loadUsers();
  }

  async function handleDeactivate(user: AdminUser) {
    if (user.id === currentUserId) {
      alert("No puedes desactivarte a ti mismo.");
      return;
    }

    const confirmed = window.confirm(`Desactivar a ${user.email || user.full_name}?`);
    if (!confirmed) return;

    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "DELETE",
    });
    const json = await response.json().catch(() => null);

    if (!response.ok) {
      alert(formatApiError(json));
      return;
    }

    await loadUsers();
  }

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <section className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA OS</p>
          <h1 className="text-3xl font-bold sm:text-4xl">Usuarios</h1>
          <p className="mt-3 text-[#B3B3B8]">
            Administracion real de usuarios Auth y perfiles internos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((current) => !current)}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
        >
          <Plus size={18} />
          Nuevo usuario
        </button>
      </section>

      {showCreate ? (
        <form
          onSubmit={handleCreate}
          className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6"
        >
          <h2 className="mb-5 text-2xl font-semibold">Crear usuario</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input
              type="email"
              required
              className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              placeholder="Email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
            <input
              type="password"
              required
              minLength={8}
              className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              placeholder="Contrasena temporal"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
            <input
              className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              placeholder="Nombre"
              value={form.full_name}
              onChange={(event) => setForm({ ...form, full_name: event.target.value })}
            />
            <select
              className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
            >
              {alfaRoles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
          >
            {saving ? "Creando..." : "Crear usuario"}
          </button>
        </form>
      ) : null}

      {loading ? (
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8 text-[#B3B3B8]">
          Cargando usuarios...
        </section>
      ) : users.length === 0 ? (
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8 text-center text-[#B3B3B8]">
          <UserCog className="mx-auto mb-3" size={32} />
          No hay usuarios registrados.
        </section>
      ) : (
        <section className="rounded-xl border border-[#1F1F24] bg-[#151518]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-sm">
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
                {sortedUsers.map((user) => (
                  <tr key={user.id} className="border-b border-[#222228] hover:bg-[#1A1A1F]">
                    <td className="px-4 py-3 font-semibold">{user.full_name || "Sin nombre"}</td>
                    <td className="px-4 py-3 text-[#B3B3B8]">{user.email || "-"}</td>
                    <td className="px-4 py-3">{roleLabels[user.role as AlfaRole] || user.role}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-[#2A2A30] bg-[#222228] px-3 py-1 text-xs text-[#B3B3B8]">
                        {user.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/users/${user.id}`}
                          className="rounded-lg border border-[#2A2A30] px-3 py-2 text-xs font-semibold text-[#B3B3B8] hover:text-white"
                        >
                          Editar
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeactivate(user)}
                          disabled={user.id === currentUserId || !user.is_active}
                          className="rounded-lg border border-[#7A2E1F] px-3 py-2 text-xs font-semibold text-[#FFB19C] hover:text-white disabled:border-[#2A2A30] disabled:text-[#555963]"
                        >
                          Desactivar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
