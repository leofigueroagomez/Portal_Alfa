"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase";

export default function NewClientPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    company_name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  function updateField(field: string, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

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

  async function getNextClientNumber() {
    const { data, error } = await supabase
      .from("clients")
      .select("client_number")
      .order("client_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      reportError("calcular número de cliente", error);
      return null;
    }

    return Number(data?.client_number || 0) + 1;
  }

  async function handleSave() {
    if (!form.name.trim()) {
      alert("Agrega el nombre del cliente");
      return;
    }

    setSaving(true);

    const clientNumber = await getNextClientNumber();

    if (!clientNumber) {
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("clients")
      .insert({
        client_number: clientNumber,
        name: form.name,
        company_name: form.company_name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        notes: form.notes,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error || !data) {
      reportError(
        "crear cliente",
        error || { message: "No se recibió cliente creado" }
      );
      return;
    }

    router.push(`/clients/${data.id}`);
  }

  return (
    <main className="min-h-screen bg-[#0B0D0F] text-white p-10">
      <section className="mb-10">
        <Link
          href="/clients"
          className="inline-block text-[#B3B3B8] hover:text-white mb-6"
        >
          Volver a clientes
        </Link>

        <p className="text-[#9E1B32] tracking-[0.3em] text-sm mb-3">
          ALFA OS
        </p>

        <h1 className="text-4xl font-bold mb-3">
          Nuevo cliente
        </h1>

        <p className="text-[#B3B3B8]">
          Base CRM para clientes, oportunidades y futuros folios.
        </p>
      </section>

      <section className="grid grid-cols-3 gap-8">
        <div className="col-span-2 bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
          <h2 className="text-2xl font-semibold mb-6">
            Información del cliente
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Nombre" value={form.name} onChange={(e) => updateField("name", e.target.value)} />
            <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Empresa" value={form.company_name} onChange={(e) => updateField("company_name", e.target.value)} />
            <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
            <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Teléfono" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
          </div>

          <textarea className="w-full bg-[#222228] rounded-xl p-4 outline-none mt-4 min-h-24" placeholder="Dirección" value={form.address} onChange={(e) => updateField("address", e.target.value)} />
          <textarea className="w-full bg-[#222228] rounded-xl p-4 outline-none mt-4 min-h-32" placeholder="Notas" value={form.notes} onChange={(e) => updateField("notes", e.target.value)} />
        </div>

        <aside className="space-y-6">
          <div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
            <h2 className="text-2xl font-semibold mb-4">
              Consecutivo
            </h2>
            <p className="text-[#B3B3B8] text-sm">
              Se asignará automáticamente al guardar.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#9E1B32] hover:bg-[#B91C3C] rounded-xl py-4 font-semibold"
          >
            {saving ? "Guardando..." : "Guardar cliente"}
          </button>
        </aside>
      </section>
    </main>
  );
}
