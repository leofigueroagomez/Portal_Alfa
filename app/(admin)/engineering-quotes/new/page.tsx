"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase";
import {
  buildEngineeringQuoteNumber,
  defaultCommercialTerms,
  defaultDeliverables,
  defaultRequirements,
  engineeringSystems,
} from "../constants";

type Client = {
  id: number;
  client_number: number | null;
  name: string | null;
};

type ClientProject = {
  id: number;
  client_id: number;
  project_number: number | null;
  name: string | null;
  sales_stage?: string | null;
};

function parseLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function shouldMoveProjectToEngineering(stage: string | null | undefined) {
  return ["lead", "site_visit"].includes(stage || "");
}

export default function NewEngineeringQuotePage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedSystems, setSelectedSystems] = useState<string[]>([]);
  const [form, setForm] = useState({
    attention_to: "",
    project_name: "",
    intro_text:
      "Por medio de la presente ponemos a su consideración nuestra propuesta para el desarrollo del proyecto ejecutivo de ingeniería de sistemas especiales.",
    deliverables: defaultDeliverables.join("\n"),
    requirements: defaultRequirements.join("\n"),
    commercial_terms: defaultCommercialTerms.join("\n"),
    delivery_time: "",
    total_mxn: "",
    notes: "",
  });

  const selectedClient = clients.find(
    (client) => String(client.id) === selectedClientId
  );
  const selectedProject = projects.find(
    (project) => String(project.id) === selectedProjectId
  );

  const quoteNumberPreview = useMemo(
    () =>
      selectedClient && selectedProject
        ? buildEngineeringQuoteNumber(
            selectedClient.client_number,
            selectedProject.project_number,
            1
          )
        : "ING-000-000-A",
    [selectedClient, selectedProject]
  );

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
    async function loadClients() {
      const { data, error } = await supabase
        .from("clients")
        .select("id, client_number, name")
        .order("client_number", { ascending: true });

      if (error) {
        reportError("cargar clientes", error);
        return;
      }

      setClients((data || []) as Client[]);
    }

    loadClients();
  }, []);

  useEffect(() => {
    async function loadProjects() {
      setSelectedProjectId("");

      if (!selectedClientId) {
        setProjects([]);
        return;
      }

      const { data, error } = await supabase
        .from("client_projects")
        .select("id, client_id, project_number, name, sales_stage")
        .eq("client_id", Number(selectedClientId))
        .order("project_number", { ascending: true });

      if (error) {
        reportError("cargar proyectos", error);
        return;
      }

      setProjects((data || []) as ClientProject[]);
    }

    loadProjects();
  }, [selectedClientId]);

  async function handleSave() {
    if (!selectedClient || !selectedProject) {
      alert("Selecciona cliente y proyecto");
      return;
    }

    setSaving(true);

    const quoteNumber = buildEngineeringQuoteNumber(
      selectedClient.client_number,
      selectedProject.project_number,
      1
    );

    const { data, error } = await supabase
      .from("engineering_quotes")
      .insert({
        quote_number: quoteNumber,
        client_id: selectedClient.id,
        client_project_id: selectedProject.id,
        version: 1,
        version_letter: "A",
        status: "draft",
        attention_to: form.attention_to || selectedClient.name,
        project_name: form.project_name || selectedProject.name,
        intro_text: form.intro_text,
        selected_systems: selectedSystems,
        deliverables: parseLines(form.deliverables),
        requirements: parseLines(form.requirements),
        commercial_terms: parseLines(form.commercial_terms),
        delivery_time: form.delivery_time,
        total_mxn: Number(form.total_mxn) || 0,
        notes: form.notes,
        is_latest: true,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error || !data) {
      reportError(
        "guardar cotización de ingeniería",
        error || { message: "No se recibió engineering_quote" }
      );
      return;
    }

    if (shouldMoveProjectToEngineering(selectedProject.sales_stage)) {
      const { error: stageError } = await supabase
        .from("client_projects")
        .update({ sales_stage: "engineering" })
        .eq("id", selectedProject.id);

      if (stageError) {
        setSaving(false);
        reportError("actualizar etapa de oportunidad", stageError);
        return;
      }
    }

    alert("Cotización de ingeniería guardada");
    router.push(`/engineering-quotes/${data.id}`);
  }

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <section className="mb-10">
        <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA OS</p>
        <h1 className="mb-3 text-3xl font-bold sm:text-4xl">Nueva ingeniería</h1>
        <p className="text-[#B3B3B8]">
          Cotización para proyecto ejecutivo de sistemas residenciales.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-6">
            <h2 className="mb-6 text-2xl font-semibold">Cliente y proyecto</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <select
                className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
              >
                <option value="">Seleccionar cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {String(client.client_number || "").padStart(3, "0")} -{" "}
                    {client.name || "Sin nombre"}
                  </option>
                ))}
              </select>

              <select
                className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none disabled:text-[#77777D]"
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                disabled={!selectedClientId}
              >
                <option value="">Seleccionar proyecto / oportunidad</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {String(project.project_number || "").padStart(3, "0")} -{" "}
                    {project.name || "Sin nombre"}
                  </option>
                ))}
              </select>
            </div>
          </div>

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

          <div className="grid grid-cols-1 gap-8">
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
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6 xl:sticky xl:top-8">
            <h2 className="mb-6 text-2xl font-semibold">Resumen</h2>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[#B3B3B8]">Folio</span>
                <span>{quoteNumberPreview}</span>
              </div>
              <input className="w-full rounded-xl bg-[#222228] p-4 outline-none" placeholder="Total MXN" value={form.total_mxn} onChange={(event) => updateField("total_mxn", event.target.value)} />
              <input className="w-full rounded-xl bg-[#222228] p-4 outline-none" placeholder="Tiempo de entrega" value={form.delivery_time} onChange={(event) => updateField("delivery_time", event.target.value)} />
            </div>
            <button type="button" onClick={handleSave} disabled={saving} className="mt-6 w-full rounded-xl bg-[#9E1B32] py-4 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228]">
              {saving ? "Guardando..." : "Guardar ingeniería"}
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}
