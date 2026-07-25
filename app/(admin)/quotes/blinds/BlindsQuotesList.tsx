"use client";

import Link from "next/link";
import { ArrowRight, FilePlus2, RefreshCw, Ruler, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/services/supabase";
import {
  type BlindQuote,
  type ClientOption,
  formatMxn,
  type ProjectOption,
  readApiResponse,
} from "./types";

export default function BlindsQuotesList({
  canCreate,
}: {
  canCreate: boolean;
}) {
  const [quotes, setQuotes] = useState<BlindQuote[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadQuotes = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
      setError("");
    }

    try {
      const response = await fetch("/api/quotes/blinds", {
        cache: "no-store",
      });
      const payload = await readApiResponse<{ quotes: BlindQuote[] }>(response);
      setQuotes(payload.quotes);

      const clientIds = [
        ...new Set(
          payload.quotes
            .map((quote) => quote.client_id)
            .filter((value): value is number => Boolean(value))
        ),
      ];
      const projectIds = [
        ...new Set(
          payload.quotes
            .map((quote) => quote.client_project_id)
            .filter((value): value is number => Boolean(value))
        ),
      ];

      const [clientResult, projectResult] = await Promise.all([
        clientIds.length
          ? supabase.from("clients").select("id, name").in("id", clientIds)
          : Promise.resolve({ data: [], error: null }),
        projectIds.length
          ? supabase
              .from("client_projects")
              .select("id, client_id, name")
              .in("id", projectIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (clientResult.error || projectResult.error) {
        throw new Error("No fue posible cargar clientes y proyectos.");
      }

      setClients((clientResult.data || []) as ClientOption[]);
      setProjects((projectResult.data || []) as ProjectOption[]);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No fue posible cargar las cotizaciones."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadQuotes(false), 0);
    return () => window.clearTimeout(timeout);
  }, [loadQuotes]);

  const filteredQuotes = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("es-MX");
    if (!term) return quotes;

    return quotes.filter((quote) => {
      const client =
        clients.find((item) => item.id === quote.client_id)?.name || "";
      const project =
        projects.find((item) => item.id === quote.client_project_id)?.name || "";
      return [quote.quote_number, client, project, quote.status]
        .filter(Boolean)
        .some((value) =>
          String(value).toLocaleLowerCase("es-MX").includes(term)
        );
    });
  }, [clients, projects, quotes, search]);

  function clientName(id: number | null) {
    return clients.find((client) => client.id === id)?.name || "Sin cliente";
  }

  function projectName(id: number | null) {
    return projects.find((project) => project.id === id)?.name || "Sin proyecto";
  }

  return (
    <main className="min-h-screen bg-[#F7F6F3] px-5 py-8 text-[#111111] md:px-10 xl:px-14 xl:py-12">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-col gap-7 border-b border-black/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
              Cotizaciones · Vertical comercial
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Persianas
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-black/55">
              Captura medidas, acabados y controles por ubicación sin mezclar
              partidas con servicios o ingeniería.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/quotes"
              className="inline-flex min-h-11 items-center justify-center border border-black/10 bg-white px-5 text-sm font-semibold transition hover:border-black/25"
            >
              Ver cotizaciones estándar
            </Link>
            {canCreate ? (
              <Link
                href="/quotes/blinds/new"
                className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#7A1F2B] px-5 text-sm font-semibold text-white transition hover:bg-[#641923]"
              >
                <FilePlus2 size={17} />
                Nueva cotización
              </Link>
            ) : null}
          </div>
        </header>

        <section className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex min-h-12 w-full max-w-lg items-center gap-3 border border-black/10 bg-white px-4 text-sm shadow-sm">
            <Search size={17} className="text-black/35" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por folio, cliente, proyecto o estado"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-black/35"
            />
          </label>
          <button
            type="button"
            onClick={() => void loadQuotes(true)}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-semibold text-black/55 transition hover:text-[#7A1F2B] disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
        </section>

        {loading ? (
          <section className="mt-8 grid gap-4">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-36 animate-pulse border border-black/5 bg-white/70"
              />
            ))}
          </section>
        ) : error ? (
          <section className="mt-8 border border-[#7A1F2B]/20 bg-[#7A1F2B]/[0.04] p-6">
            <p className="font-semibold text-[#7A1F2B]">No se pudo cargar</p>
            <p className="mt-2 text-sm text-black/55">{error}</p>
          </section>
        ) : filteredQuotes.length === 0 ? (
          <section className="mt-8 flex min-h-72 flex-col items-center justify-center border border-dashed border-black/15 bg-white px-6 text-center">
            <Ruler size={28} className="text-[#7A1F2B]" />
            <h2 className="mt-5 text-2xl font-semibold">
              {quotes.length ? "Sin resultados" : "Aún no hay cotizaciones"}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-black/50">
              {quotes.length
                ? "Prueba con otro folio, cliente o proyecto."
                : "Crea una cotización y agrega ventanas por área para comenzar."}
            </p>
            {canCreate && !quotes.length ? (
              <Link
                href="/quotes/blinds/new"
                className="mt-6 inline-flex items-center gap-2 bg-[#7A1F2B] px-5 py-3 text-sm font-semibold text-white"
              >
                Crear primera cotización
                <ArrowRight size={16} />
              </Link>
            ) : null}
          </section>
        ) : (
          <section className="mt-8 overflow-hidden border border-black/10 bg-white shadow-sm">
            <div className="hidden grid-cols-[1.1fr_1fr_1fr_130px_160px_110px] gap-5 border-b border-black/10 bg-black/[0.025] px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-black/40 lg:grid">
              <p>Folio</p>
              <p>Cliente</p>
              <p>Proyecto</p>
              <p>Estado</p>
              <p>Total</p>
              <p>Fecha</p>
            </div>
            <div className="divide-y divide-black/10">
              {filteredQuotes.map((quote) => (
                <Link
                  key={quote.id}
                  href={`/quotes/blinds/${quote.id}`}
                  className="group grid gap-4 px-6 py-6 transition hover:bg-[#F7F6F3] lg:grid-cols-[1.1fr_1fr_1fr_130px_160px_110px] lg:items-center lg:gap-5"
                >
                  <div>
                    <p className="font-semibold">
                      {quote.quote_number || `Cotización #${quote.id}`}
                    </p>
                    <p className="mt-1 text-xs text-black/40">
                      Persianas · versión {quote.version || 1}
                    </p>
                  </div>
                  <p className="text-sm text-black/60">
                    {clientName(quote.client_id)}
                  </p>
                  <p className="text-sm text-black/60">
                    {projectName(quote.client_project_id)}
                  </p>
                  <span className="w-fit rounded-full bg-black/[0.055] px-3 py-1 text-xs font-medium capitalize text-black/60">
                    {quote.status || "draft"}
                  </span>
                  <p className="font-semibold">{formatMxn(quote.total_mxn)}</p>
                  <div className="flex items-center justify-between text-sm text-black/45">
                    <span>
                      {quote.created_at
                        ? new Date(quote.created_at).toLocaleDateString("es-MX")
                        : "Sin fecha"}
                    </span>
                    <ArrowRight
                      size={16}
                      className="text-[#7A1F2B] transition group-hover:translate-x-1 lg:hidden"
                    />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
