"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/services/supabase";
import { engineeringSystems } from "../../constants";

type EngineeringQuote = {
  id: number;
  quote_number: string | null;
  status: string | null;
  attention_to: string | null;
  project_name: string | null;
  intro_text: string | null;
  selected_systems: string[] | null;
  deliverables: string[] | null;
  requirements: string[] | null;
  commercial_terms: string[] | null;
  delivery_time: string | null;
  total_mxn: number | null;
  notes: string | null;
};

function parseLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function EditEngineeringQuotePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const quoteId = Number(params.id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quote, setQuote] = useState<EngineeringQuote | null>(null);
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
  const [form, setForm] = useState({
    attention_to: "",
    project_name: "",
    intro_text: "",
    deliverables: "",
    requirements: "",
    commercial_terms: "",
    delivery_time: "",
    total_mxn: "",
    notes: "",
  });

  const isDraft = quote?.status === "draft";

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleSystem(system: string) {
    setSelectedSystems((current) =>
      current.includes(system)
        ? current.filter((item) => item !== system)
        : [...current, system]
    );
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
    async function loadQuote() {
      const { data, error } = await supabase
        .from("engineering_quotes")
        .select("*")
        .eq("id", quoteId)
        .single();

      if (error || !data) {
        reportError(
          "leer cotización de ingeniería",
          error || { message: "No se recibió engineering_quote" }
        );
        setLoading(false);
        return;
      }

      const engineeringQuote = data as EngineeringQuote;
      setQuote(engineeringQuote);
      setSelectedSystems(engineeringQuote.selected_systems || []);
      setForm({
        attention_to: engineeringQuote.attention_to || "",
        project_name: engineeringQuote.project_name || "",
        intro_text: engineeringQuote.intro_text || "",
        deliverables: (engineeringQuote.deliverables || []).join("\n"),
        requirements: (engineeringQuote.requirements || []).join("\n"),
        commercial_terms: (engineeringQuote.commercial_terms || []).join("\n"),
        delivery_time: engineeringQuote.delivery_time || "",
        total_mxn: String(engineeringQuote.total_mxn || ""),
        notes: engineeringQuote.notes || "",
      });
      setLoading(false);
    }

    loadQuote();
  }, [quoteId]);

  async function handleSave() {
    if (!isDraft) return;

    setSaving(true);
    const { error } = await supabase
      .from("engineering_quotes")
      .update({
        attention_to: form.attention_to,
        project_name: form.project_name,
        intro_text: form.intro_text,
        selected_systems: selectedSystems,
        deliverables: parseLines(form.deliverables),
        requirements: parseLines(form.requirements),
        commercial_terms: parseLines(form.commercial_terms),
        delivery_time: form.delivery_time,
        total_mxn: Number(form.total_mxn) || 0,
        notes: form.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", quoteId);

    setSaving(false);

    if (error) {
      reportError("guardar cambios", error);
      return;
    }

    alert("Cambios guardados");
    router.push(`/engineering-quotes/${quoteId}`);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <p className="text-[#B3B3B8]">Cargando ingeniería...</p>
      </main>
    );
  }

  if (!quote) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <h1 className="text-3xl font-bold">Ingeniería no encontrada</h1>
      </main>
    );
  }

  if (!isDraft) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <Link href={`/engineering-quotes/${quoteId}`} className="mb-8 inline-block text-[#B3B3B8]">
          Volver a ingeniería
        </Link>
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6 lg:p-8">
          <h1 className="mb-3 text-3xl font-bold">{quote.quote_number}</h1>
          <p className="text-[#B3B3B8]">
            Esta cotización de ingeniería no se puede editar porque no está en borrador.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <section className="mb-10">
        <Link href={`/engineering-quotes/${quoteId}`} className="mb-6 inline-block text-[#B3B3B8] hover:text-white">
          Volver a ingeniería
        </Link>
        <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
          {quote.quote_number || "Sin folio"}
        </p>
        <h1 className="mb-3 text-3xl font-bold sm:text-4xl">Editar ingeniería</h1>
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-6">
            <h2 className="mb-6 text-2xl font-semibold">Documento comercial</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <input className="rounded-xl bg-[#222228] p-4 outline-none" placeholder="Atención a" value={form.attention_to} onChange={(event) => updateField("attention_to", event.target.value)} />
              <input className="rounded-xl bg-[#222228] p-4 outline-none" placeholder="Nombre del proyecto" value={form.project_name} onChange={(event) => updateField("project_name", event.target.value)} />
            </div>
            <textarea className="mt-4 min-h-28 w-full rounded-xl bg-[#222228] p-4 outline-none" placeholder="Texto introductorio" value={form.intro_text} onChange={(event) => updateField("intro_text", event.target.value)} />
          </div>

          <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-6">
            <h2 className="mb-6 text-2xl font-semibold">Sistemas contemplados</h2>
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              {engineeringSystems.map((system) => (
                <label key={system} className="flex items-center gap-3 rounded-xl bg-[#222228] p-4">
                  <input type="checkbox" checked={selectedSystems.includes(system)} onChange={() => toggleSystem(system)} />
                  {system}
                </label>
              ))}
            </div>
          </div>

          <textarea className="min-h-44 rounded-2xl border border-[#1F1F24] bg-[#151518] p-6 outline-none" value={form.deliverables} onChange={(event) => updateField("deliverables", event.target.value)} />
          <textarea className="min-h-32 rounded-2xl border border-[#1F1F24] bg-[#151518] p-6 outline-none" value={form.requirements} onChange={(event) => updateField("requirements", event.target.value)} />
          <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-6">
            <h2 className="mb-4 text-2xl font-semibold">
              Aclaraciones / Notas especiales
            </h2>
            <textarea
              className="min-h-44 w-full rounded-xl border border-[#2A2A30] bg-[#222228] p-4 leading-relaxed outline-none focus:border-[#9E1B32]"
              placeholder="Limitaciones, exclusiones, dependencias de terceros o consideraciones especiales de obra."
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
            />
          </section>
          <textarea className="min-h-44 rounded-2xl border border-[#1F1F24] bg-[#151518] p-6 outline-none" value={form.commercial_terms} onChange={(event) => updateField("commercial_terms", event.target.value)} />
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6 xl:sticky xl:top-8">
            <h2 className="mb-6 text-2xl font-semibold">Resumen</h2>
            <div className="space-y-4">
              <input className="w-full rounded-xl bg-[#222228] p-4 outline-none" placeholder="Total MXN" value={form.total_mxn} onChange={(event) => updateField("total_mxn", event.target.value)} />
              <input className="w-full rounded-xl bg-[#222228] p-4 outline-none" placeholder="Tiempo de entrega" value={form.delivery_time} onChange={(event) => updateField("delivery_time", event.target.value)} />
            </div>
            <button type="button" onClick={handleSave} disabled={saving} className="mt-6 w-full rounded-xl bg-[#9E1B32] py-4 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228]">
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}
