"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import {
  salesStageClasses,
  salesStageLabels,
  type SalesStage,
} from "@/lib/salesStages";
import DeleteQuoteButton from "./DeleteQuoteButton";

export type EnrichedQuote = {
  id: number;
  quoteNumber: string | null;
  clientName: string;
  projectName: string;
  stage: SalesStage;
  status: string | null;
  currency: string | null;
  equipmentTotal: number | null;
  laborTotal: number | null;
  total: number | null;
  createdAt: string | null;
};

type SortOption = "recent" | "oldest" | "total_desc" | "total_asc";

const sortLabels: Record<SortOption, string> = {
  recent: "Más reciente",
  oldest: "Más antigua",
  total_desc: "Total: mayor a menor",
  total_asc: "Total: menor a mayor",
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX");
}

export default function QuotesFilterableList({
  quotes,
  canDeleteQuotes,
}: {
  quotes: EnrichedQuote[];
  canDeleteQuotes: boolean;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recent");

  const statusOptions = useMemo(() => {
    const set = new Set<string>();
    quotes.forEach((quote) => {
      if (quote.status) set.add(quote.status);
    });
    return Array.from(set).sort();
  }, [quotes]);

  const stageOptions = useMemo(() => {
    const set = new Set<SalesStage>();
    quotes.forEach((quote) => set.add(quote.stage));
    return Array.from(set);
  }, [quotes]);

  const hasActiveFilters =
    query.trim() !== "" || statusFilter !== "all" || stageFilter !== "all";

  const filteredQuotes = useMemo(() => {
    const normalizedQuery = normalize(query.trim());

    const filtered = quotes.filter((quote) => {
      if (statusFilter !== "all" && quote.status !== statusFilter) {
        return false;
      }

      if (stageFilter !== "all" && quote.stage !== stageFilter) {
        return false;
      }

      if (!normalizedQuery) return true;

      const haystack = normalize(
        [
          quote.quoteNumber || "",
          `cotizacion #${quote.id}`,
          quote.clientName,
          quote.projectName,
        ].join(" ")
      );

      return haystack.includes(normalizedQuery);
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return (
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime()
          );
        case "total_desc":
          return (b.total || 0) - (a.total || 0);
        case "total_asc":
          return (a.total || 0) - (b.total || 0);
        case "recent":
        default:
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
      }
    });

    return sorted;
  }, [quotes, query, statusFilter, stageFilter, sortBy]);

  function clearFilters() {
    setQuery("");
    setStatusFilter("all");
    setStageFilter("all");
  }

  return (
    <>
      <section className="mb-8 space-y-4">
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#77777D]"
          />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por folio, cliente o proyecto..."
            className="w-full rounded-xl border border-[#2A2A30] bg-[#151518] py-3.5 pl-11 pr-11 text-base text-white placeholder:text-[#77777D] outline-none transition focus:border-[#9E1B32]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#77777D] hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                statusFilter === "all"
                  ? "border-[#9E1B32] bg-[#9E1B32]/15 text-white"
                  : "border-[#2A2A30] bg-[#151518] text-[#B3B3B8] hover:border-[#3A3A42]"
              }`}
            >
              Todos los estados
            </button>
            {statusOptions.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium capitalize transition ${
                  statusFilter === status
                    ? "border-[#9E1B32] bg-[#9E1B32]/15 text-white"
                    : "border-[#2A2A30] bg-[#151518] text-[#B3B3B8] hover:border-[#3A3A42]"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value)}
              className="rounded-xl border border-[#2A2A30] bg-[#151518] px-3.5 py-2 text-xs text-[#B3B3B8] outline-none focus:border-[#9E1B32]"
            >
              <option value="all">Todas las etapas</option>
              {stageOptions.map((stage) => (
                <option key={stage} value={stage}>
                  {salesStageLabels[stage]}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortOption)}
              className="rounded-xl border border-[#2A2A30] bg-[#151518] px-3.5 py-2 text-xs text-[#B3B3B8] outline-none focus:border-[#9E1B32]"
            >
              {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                <option key={option} value={option}>
                  {sortLabels[option]}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-[#B3B3B8] underline decoration-[#3A3A42] underline-offset-4 hover:text-white"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-[#77777D]">
          {filteredQuotes.length} de {quotes.length} cotizaciones
        </p>
      </section>

      {filteredQuotes.length === 0 ? (
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6 lg:p-8">
          <p className="text-[#B3B3B8]">
            Ninguna cotización coincide con tu búsqueda.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 text-sm font-medium text-[#9E1B32] hover:text-[#B91C3C]"
            >
              Limpiar filtros
            </button>
          )}
        </section>
      ) : (
        <section className="space-y-4">
          {filteredQuotes.map((quote) => (
            <div
              key={quote.id}
              className="bg-[#151518] border border-[#1F1F24] hover:border-[#9E1B32] rounded-2xl p-6 transition"
            >
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <Link href={`/quotes/${quote.id}`} className="block flex-1">
                  <div>
                    <p className="text-xs text-[#9E1B32] uppercase tracking-[0.2em] mb-2">
                      {quote.quoteNumber || "Sin folio"}
                    </p>

                    <h2 className="text-2xl font-semibold">
                      Cotización #{quote.id}
                    </h2>
                  </div>
                </Link>

                <div className="flex items-center gap-3">
                  <span className="bg-[#222228] border border-[#2A2A30] text-[#B3B3B8] rounded-full px-4 py-2 text-sm">
                    {quote.status || "Sin estado"}
                  </span>

                  {canDeleteQuotes && <DeleteQuoteButton quoteId={quote.id} />}
                </div>
              </div>

              <Link
                href={`/quotes/${quote.id}`}
                className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 xl:grid-cols-8"
              >
                <div>
                  <p className="text-[#77777D] mb-1">Cliente</p>
                  <p>{quote.clientName}</p>
                </div>

                <div>
                  <p className="text-[#77777D] mb-1">Proyecto</p>
                  <p>{quote.projectName}</p>
                </div>

                <div>
                  <p className="text-[#77777D] mb-1">Etapa</p>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs ${salesStageClasses[quote.stage]}`}
                  >
                    {salesStageLabels[quote.stage]}
                  </span>
                </div>

                <div>
                  <p className="text-[#77777D] mb-1">Moneda</p>
                  <p>{quote.currency || "USD"}</p>
                </div>

                <div>
                  <p className="text-[#77777D] mb-1">Equipos</p>
                  <p>{formatCurrency(quote.equipmentTotal, quote.currency)}</p>
                </div>

                <div>
                  <p className="text-[#77777D] mb-1">Mano de obra</p>
                  <p>{formatCurrency(quote.laborTotal, quote.currency)}</p>
                </div>

                <div>
                  <p className="text-[#77777D] mb-1">Total</p>
                  <p className="font-semibold">
                    {formatCurrency(quote.total, "MXN")}
                  </p>
                </div>

                <div>
                  <p className="text-[#77777D] mb-1">Creada</p>
                  <p>{formatDate(quote.createdAt)}</p>
                </div>
              </Link>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
