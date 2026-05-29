"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase";

export type ContractorInitial = {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  specialty: string | null;
  notes: string | null;
  is_active: boolean | null;
};

type Props = {
  mode: "new" | "edit";
  initialContractor?: ContractorInitial | null;
};

function reportError(step: string, error: unknown) {
  const message =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
      ? ` ${error.message}`
      : "";

  console.error(`Error en ${step}:`, error);
  alert(`Error en ${step}: ${JSON.stringify(error)}${message}`);
}

export default function ContractorForm({ mode, initialContractor }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: initialContractor?.name || "",
    phone: initialContractor?.phone || "",
    email: initialContractor?.email || "",
    specialty: initialContractor?.specialty || "",
    notes: initialContractor?.notes || "",
    is_active: initialContractor?.is_active ?? true,
  });

  function updateField(field: string, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      alert("Captura el nombre del contratista.");
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      specialty: form.specialty.trim() || null,
      notes: form.notes.trim() || null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    if (mode === "edit" && initialContractor?.id) {
      const { error } = await supabase
        .from("contractors")
        .update(payload)
        .eq("id", initialContractor.id);

      setSaving(false);

      if (error) {
        reportError("actualizar contratista", error);
        return;
      }

      router.push(`/contractors/${initialContractor.id}`);
      router.refresh();
      return;
    }

    const { data, error } = await supabase
      .from("contractors")
      .insert(payload)
      .select("id")
      .single();

    setSaving(false);

    if (error || !data) {
      reportError("crear contratista", error || { message: "No se recibio contratista" });
      return;
    }

    router.push(`/contractors/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-3 xl:gap-8">
      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6 xl:col-span-2">
        <h2 className="mb-6 text-2xl font-semibold">Datos del contratista</h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Nombre</span>
            <input
              className="w-full rounded-xl bg-[#222228] p-4 outline-none"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Telefono</span>
            <input
              className="w-full rounded-xl bg-[#222228] p-4 outline-none"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Email</span>
            <input
              type="email"
              className="w-full rounded-xl bg-[#222228] p-4 outline-none"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Especialidad</span>
            <input
              className="w-full rounded-xl bg-[#222228] p-4 outline-none"
              value={form.specialty}
              onChange={(event) => updateField("specialty", event.target.value)}
            />
          </label>
        </div>

        <label className="mt-4 block space-y-2">
          <span className="text-sm text-[#B3B3B8]">Notas</span>
          <textarea
            className="min-h-32 w-full rounded-xl bg-[#222228] p-4 outline-none"
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
          />
        </label>
      </section>

      <aside className="space-y-6">
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
          <h2 className="mb-4 text-2xl font-semibold">Estado</h2>
          <label className="flex items-center gap-3 rounded-xl bg-[#222228] p-4 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) => updateField("is_active", event.target.checked)}
            />
            Contratista activo
          </label>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-[#9E1B32] py-4 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
        >
          {saving ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Guardar contratista"}
        </button>
      </aside>
    </form>
  );
}
