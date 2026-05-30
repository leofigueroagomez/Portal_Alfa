"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  profile: {
    id: string;
    email: string | null;
    full_name: string | null;
    role: string | null;
    is_active: boolean | null;
  };
  currentUserId: string;
  roleOptions: { value: string; label: string }[];
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

export default function UserProfileForm({
  profile,
  currentUserId,
  roleOptions,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(profile.full_name || "");
  const [role, setRole] = useState(profile.role || "comercial");
  const [isActive, setIsActive] = useState(profile.is_active ?? true);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (profile.id === currentUserId && !isActive) {
      alert("No puedes desactivarte a ti mismo.");
      return;
    }

    setSaving(true);

    const response = await fetch(`/api/admin/users/${profile.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName.trim() || null,
        role,
        is_active: isActive,
      }),
    });
    const json = await response.json().catch(() => null);

    setSaving(false);

    if (!response.ok) {
      alert(formatApiError(json));
      return;
    }

    router.push("/users");
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="grid grid-cols-1 gap-6 xl:grid-cols-3 xl:gap-8">
      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6 xl:col-span-2">
        <h2 className="mb-6 text-2xl font-semibold">Perfil interno</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Email</span>
            <input
              className="w-full rounded-xl border border-[#2A2A30] bg-[#111318] px-4 py-3 text-[#77777D] outline-none"
              value={profile.email || ""}
              readOnly
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Nombre</span>
            <input
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Rol</span>
            <select
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              {roleOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-7 flex items-center gap-3 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            Usuario activo
          </label>
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
          <h2 className="mb-2 text-xl font-semibold">Acceso</h2>
          <p className="text-sm text-[#B3B3B8]">
            Este modulo solo administra el perfil interno. El usuario Auth se crea en Supabase.
          </p>
        </section>
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-[#9E1B32] py-4 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
        >
          {saving ? "Guardando..." : "Guardar usuario"}
        </button>
      </aside>
    </form>
  );
}
