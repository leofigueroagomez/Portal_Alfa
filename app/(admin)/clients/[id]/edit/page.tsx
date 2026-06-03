"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/services/supabase";

const sourceOptions = [
  "Landing Web",
  "Referido",
  "LinkedIn",
  "Google",
  "Prospectación Directa",
  "Cliente Existente",
];

export default function EditClientPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const clientId = Number(params.id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_number: "",
    name: "",
    company_name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    tax_rfc: "",
    tax_business_name: "",
    tax_regime: "",
    default_cfdi_use: "",
    tax_zip_code: "",
    source: "Prospectación Directa",
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

  useEffect(() => {
    async function loadClient() {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single();

      if (error || !data) {
        reportError(
          "leer cliente",
          error || { message: "No se recibió cliente" }
        );
        setLoading(false);
        return;
      }

      setForm({
        client_number: String(data.client_number || ""),
        name: data.name || "",
        company_name: data.company_name || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        notes: data.notes || "",
        tax_rfc: data.tax_rfc || "",
        tax_business_name: data.tax_business_name || "",
        tax_regime: data.tax_regime || "",
        default_cfdi_use: data.default_cfdi_use || "",
        tax_zip_code: data.tax_zip_code || "",
        source: data.source || "Prospectación Directa",
      });
      setLoading(false);
    }

    loadClient();
  }, [clientId]);

  async function handleSave() {
    if (!form.name.trim()) {
      alert("Agrega el nombre del cliente");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("clients")
      .update({
        client_number: Number(form.client_number) || null,
        name: form.name,
        company_name: form.company_name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        notes: form.notes,
        tax_rfc: form.tax_rfc.trim().toUpperCase() || null,
        tax_business_name: form.tax_business_name.trim() || null,
        tax_regime: form.tax_regime.trim() || null,
        default_cfdi_use: form.default_cfdi_use.trim().toUpperCase() || null,
        tax_zip_code: form.tax_zip_code.trim() || null,
        source: form.source,
      })
      .eq("id", clientId)
      .select("id")
      .single();

    setSaving(false);

    if (error || !data) {
      reportError(
        "guardar cliente",
        error || { message: "No se recibió cliente actualizado" }
      );
      return;
    }

    router.push(`/clients/${clientId}`);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <p className="text-[#B3B3B8]">Cargando cliente...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <section className="mb-10">
        <Link
          href={`/clients/${clientId}`}
          className="inline-block text-[#B3B3B8] hover:text-white mb-6"
        >
          Volver al cliente
        </Link>

        <p className="text-[#9E1B32] tracking-[0.3em] text-sm mb-3">
          ALFA OS
        </p>

        <h1 className="mb-3 text-3xl font-bold sm:text-4xl">
          Editar cliente
        </h1>

        <p className="text-[#B3B3B8]">
          Actualiza la información CRM del cliente.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3 xl:gap-8">
        <div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-4 sm:p-6 xl:col-span-2">
          <h2 className="text-2xl font-semibold mb-6">
            Información del cliente
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Número de cliente" value={form.client_number} onChange={(e) => updateField("client_number", e.target.value)} />
            <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Nombre" value={form.name} onChange={(e) => updateField("name", e.target.value)} />
            <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Empresa" value={form.company_name} onChange={(e) => updateField("company_name", e.target.value)} />
            <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
            <input className="bg-[#222228] rounded-xl p-4 outline-none" placeholder="Teléfono" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
            <select className="bg-[#222228] rounded-xl p-4 outline-none" value={form.source} onChange={(e) => updateField("source", e.target.value)}>
              {sourceOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <textarea className="w-full bg-[#222228] rounded-xl p-4 outline-none mt-4 min-h-24" placeholder="Dirección" value={form.address} onChange={(e) => updateField("address", e.target.value)} />
          <textarea className="w-full bg-[#222228] rounded-xl p-4 outline-none mt-4 min-h-32" placeholder="Notas" value={form.notes} onChange={(e) => updateField("notes", e.target.value)} />
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
            <h2 className="mb-4 text-2xl font-semibold">
              Datos fiscales
            </h2>
            <div className="space-y-3">
              <input className="w-full rounded-xl bg-[#222228] p-4 outline-none" placeholder="RFC" value={form.tax_rfc} onChange={(e) => updateField("tax_rfc", e.target.value)} />
              <input className="w-full rounded-xl bg-[#222228] p-4 outline-none" placeholder="Razon social" value={form.tax_business_name} onChange={(e) => updateField("tax_business_name", e.target.value)} />
              <input className="w-full rounded-xl bg-[#222228] p-4 outline-none" placeholder="Regimen fiscal" value={form.tax_regime} onChange={(e) => updateField("tax_regime", e.target.value)} />
              <input className="w-full rounded-xl bg-[#222228] p-4 outline-none" placeholder="Uso CFDI default" value={form.default_cfdi_use} onChange={(e) => updateField("default_cfdi_use", e.target.value)} />
              <input className="w-full rounded-xl bg-[#222228] p-4 outline-none" placeholder="Codigo postal fiscal" value={form.tax_zip_code} onChange={(e) => updateField("tax_zip_code", e.target.value)} />
            </div>
          </div>

          <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
            <h2 className="text-2xl font-semibold mb-4">
              Folios futuros
            </h2>
            <p className="text-[#B3B3B8] text-sm">
              Este número alimentará formatos como CT-100-001-A.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#9E1B32] hover:bg-[#B91C3C] rounded-xl py-4 font-semibold"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </aside>
      </section>
    </main>
  );
}
