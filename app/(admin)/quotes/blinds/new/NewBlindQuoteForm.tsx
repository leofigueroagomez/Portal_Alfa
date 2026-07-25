"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/services/supabase";
import {
  type BlindQuote,
  type ClientOption,
  type ProjectOption,
  readApiResponse,
} from "../types";

export default function NewBlindQuoteForm() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [notes, setNotes] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadClients() {
      const { data, error: clientsError } = await supabase
        .from("clients")
        .select("id, name, client_number")
        .order("client_number", { ascending: true });

      if (clientsError) {
        setError("No fue posible cargar los clientes.");
      } else {
        setClients((data || []) as ClientOption[]);
      }
      setLoadingOptions(false);
    }

    void loadClients();
  }, []);

  useEffect(() => {
    async function loadProjects() {
      setProjectId("");
      if (!clientId) {
        setProjects([]);
        return;
      }

      const { data, error: projectsError } = await supabase
        .from("client_projects")
        .select("id, client_id, name, project_number")
        .eq("client_id", Number(clientId))
        .order("project_number", { ascending: true });

      if (projectsError) {
        setError("No fue posible cargar los proyectos del cliente.");
        return;
      }
      setProjects((data || []) as ProjectOption[]);
    }

    void loadProjects();
  }, [clientId]);

  const selectedClient = useMemo(
    () => clients.find((client) => String(client.id) === clientId),
    [clientId, clients]
  );
  const selectedProject = useMemo(
    () => projects.find((project) => String(project.id) === projectId),
    [projectId, projects]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/quotes/blinds", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client_id: clientId ? Number(clientId) : null,
          client_project_id: projectId ? Number(projectId) : null,
          notes: notes.trim() || null,
        }),
      });
      const payload = await readApiResponse<{ quote: BlindQuote }>(response);
      router.push(`/quotes/blinds/${payload.quote.id}`);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No fue posible crear la cotización."
      );
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F6F3] px-5 py-8 text-[#111111] md:px-10 xl:px-14 xl:py-12">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/quotes/blinds"
          className="inline-flex items-center gap-2 text-sm text-black/50 transition hover:text-[#7A1F2B]"
        >
          <ArrowLeft size={16} />
          Volver a Persianas
        </Link>

        <header className="mt-8 border-b border-black/10 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
            Nueva cotización
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
            Preparar captura
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-black/55">
            Asigna cliente y proyecto. Las ventanas y sus especificaciones se
            capturan en la siguiente pantalla.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]"
        >
          <section className="border border-black/10 bg-white p-6 shadow-sm sm:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/35">
                01 · Contexto comercial
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.025em]">
                Cliente y proyecto
              </h2>
            </div>

            {loadingOptions ? (
              <div className="mt-8 flex items-center gap-3 text-sm text-black/45">
                <LoaderCircle size={17} className="animate-spin" />
                Cargando clientes…
              </div>
            ) : (
              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  Cliente
                  <select
                    data-testid="blind-client-select"
                    value={clientId}
                    onChange={(event) => setClientId(event.target.value)}
                    className="min-h-12 border border-black/10 bg-[#F7F6F3] px-4 outline-none transition focus:border-[#7A1F2B]"
                  >
                    <option value="">Sin cliente asignado</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.client_number
                          ? `${String(client.client_number).padStart(3, "0")} · `
                          : ""}
                        {client.name || "Sin nombre"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-medium">
                  Proyecto
                  <select
                    data-testid="blind-project-select"
                    value={projectId}
                    onChange={(event) => setProjectId(event.target.value)}
                    disabled={!clientId}
                    className="min-h-12 border border-black/10 bg-[#F7F6F3] px-4 outline-none transition focus:border-[#7A1F2B] disabled:cursor-not-allowed disabled:text-black/30"
                  >
                    <option value="">Sin proyecto asignado</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.project_number
                          ? `${String(project.project_number).padStart(3, "0")} · `
                          : ""}
                        {project.name || "Sin nombre"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <label className="mt-7 grid gap-2 text-sm font-medium">
              Notas generales
              <textarea
                data-testid="blind-quote-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={5000}
                placeholder="Contexto comercial o alcance general de esta propuesta."
                className="min-h-36 resize-y border border-black/10 bg-[#F7F6F3] p-4 leading-6 outline-none transition placeholder:text-black/30 focus:border-[#7A1F2B]"
              />
              <span className="text-right text-xs font-normal text-black/35">
                {notes.length}/5000
              </span>
            </label>

            {error ? (
              <div className="mt-6 border-l-2 border-[#7A1F2B] bg-[#7A1F2B]/[0.045] px-4 py-3 text-sm text-[#7A1F2B]">
                {error}
              </div>
            ) : null}
          </section>

          <aside className="h-fit border border-black/10 bg-[#111111] p-6 text-white lg:sticky lg:top-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
              Resumen
            </p>
            <dl className="mt-6 space-y-5 text-sm">
              <div>
                <dt className="text-white/40">Cliente</dt>
                <dd className="mt-1 font-medium">
                  {selectedClient?.name || "Por definir"}
                </dd>
              </div>
              <div>
                <dt className="text-white/40">Proyecto</dt>
                <dd className="mt-1 font-medium">
                  {selectedProject?.name || "Por definir"}
                </dd>
              </div>
              <div>
                <dt className="text-white/40">Moneda</dt>
                <dd className="mt-1 font-medium">MXN · IVA 16%</dd>
              </div>
            </dl>
            <button
              data-testid="create-blind-quote"
              type="submit"
              disabled={saving || loadingOptions}
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#7A1F2B] px-5 text-sm font-semibold transition hover:bg-[#8F2532] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
            >
              {saving ? (
                <>
                  <LoaderCircle size={17} className="animate-spin" />
                  Creando…
                </>
              ) : (
                <>
                  Crear y capturar partidas
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </aside>
        </form>
      </div>
    </main>
  );
}
