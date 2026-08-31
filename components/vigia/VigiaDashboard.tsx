"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  History,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type {
  VigiaAuditRecord,
  VigiaFindingRecord,
  VigiaOverview,
} from "@/lib/vigia/queries";
import { runVigiaNowAction } from "@/app/(admin)/vigia/actions";
import VigiaMetricsCards from "./VigiaMetricsCards";
import FindingCard from "./FindingCard";
import VigiaAuditDrawer from "./VigiaAuditDrawer";

type Props = {
  overview: VigiaOverview;
  findings: VigiaFindingRecord[];
  auditLogs: VigiaAuditRecord[];
};

type TabKey =
  | "requiere_autorizacion"
  | "prestar_atencion"
  | "pospuesto"
  | "resuelto"
  | "archivo";

export default function VigiaDashboard({ overview, findings, auditLogs }: Props) {
  const router = useRouter();
  const [currentTab, setCurrentTab] = useState<TabKey>("requiere_autorizacion");
  const [selectedDomain, setSelectedDomain] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isScanning, startScan] = useTransition();

  // Filtrado de hallazgos
  const filteredFindings = findings.filter((f) => {
    // Filtro por pestaña
    if (currentTab === "requiere_autorizacion") {
      if (f.lane !== "requiere_autorizacion" || (f.status !== "abierto" && f.status !== "reconocido")) {
        return false;
      }
    } else if (currentTab === "prestar_atencion") {
      if (f.lane !== "prestar_atencion" || (f.status !== "abierto" && f.status !== "reconocido")) {
        return false;
      }
    } else if (currentTab === "pospuesto") {
      if (f.status !== "pospuesto") {
        return false;
      }
    } else if (currentTab === "resuelto") {
      if (f.status !== "resuelto" && f.status !== "auto_aplicado") {
        return false;
      }
    } else if (currentTab === "archivo") {
      if (f.status !== "descartado") {
        return false;
      }
    }

    // Filtro por dominio
    if (selectedDomain !== "todos" && f.domain !== selectedDomain) {
      return false;
    }

    // Filtro por texto de busqueda
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = f.title.toLowerCase().includes(q);
      const matchSummary = f.summary.toLowerCase().includes(q);
      const matchSensor = f.sensor_id.toLowerCase().includes(q);
      const matchLabel = (f.entity_label || "").toLowerCase().includes(q);
      if (!matchTitle && !matchSummary && !matchSensor && !matchLabel) {
        return false;
      }
    }

    return true;
  });

  async function handleRunScan() {
    startScan(async () => {
      const res = await runVigiaNowAction();
      if (res.ok) {
        router.refresh();
      }
    });
  }

  const authCount = findings.filter(
    (f) => f.lane === "requiere_autorizacion" && (f.status === "abierto" || f.status === "reconocido"),
  ).length;

  const attentionCount = findings.filter(
    (f) => f.lane === "prestar_atencion" && (f.status === "abierto" || f.status === "reconocido"),
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header Ejecutivo */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-black/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#9E1B32]/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#9E1B32]">
            <Sparkles size={13} />
            <span>ALFA OS &middot; Vigilancia Autónoma</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
            El Vigía
          </h1>
          <p className="mt-1 text-sm text-black/60">
            Observabilidad determinista, detección temprana de riesgos y salud operativa del negocio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAuditOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2.5 text-xs font-semibold text-black/80 shadow-sm transition hover:bg-black/5 hover:text-black"
          >
            <History size={15} />
            <span>Ver Bitácora</span>
          </button>

          <button
            type="button"
            onClick={handleRunScan}
            disabled={isScanning}
            className="inline-flex items-center gap-2 rounded-full bg-[#9E1B32] px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#7A1F2B] disabled:opacity-50"
          >
            {isScanning ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <RefreshCw size={15} />
            )}
            <span>{isScanning ? "Ejecutando diagnóstico..." : "Escanear ahora"}</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Metricas */}
      <VigiaMetricsCards overview={overview} />

      {/* Seccion Principal de la Bandeja */}
      <div className="space-y-6">
        {/* Barra de Pestañas y Filtros */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-black/10 pb-4">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentTab("requiere_autorizacion")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
                currentTab === "requiere_autorizacion"
                  ? "bg-[#9E1B32] text-white shadow-sm"
                  : "bg-white text-black/70 hover:bg-black/5"
              }`}
            >
              <span>Requiere tu autorización</span>
              {authCount > 0 && (
                <span
                  className={`rounded-full px-2 py-0.2 text-[10px] ${
                    currentTab === "requiere_autorizacion"
                      ? "bg-white/20 text-white"
                      : "bg-[#9E1B32]/10 text-[#9E1B32]"
                  }`}
                >
                  {authCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab("prestar_atencion")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
                currentTab === "prestar_atencion"
                  ? "bg-[#111111] text-white shadow-sm"
                  : "bg-white text-black/70 hover:bg-black/5"
              }`}
            >
              <span>Prestar atención</span>
              {attentionCount > 0 && (
                <span
                  className={`rounded-full px-2 py-0.2 text-[10px] ${
                    currentTab === "prestar_atencion"
                      ? "bg-white/20 text-white"
                      : "bg-black/10 text-black/70"
                  }`}
                >
                  {attentionCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab("pospuesto")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
                currentTab === "pospuesto"
                  ? "bg-[#8F6515] text-white shadow-sm"
                  : "bg-white text-black/70 hover:bg-black/5"
              }`}
            >
              <Clock size={13} />
              <span>Pospuestos</span>
              {overview.snoozedCount > 0 && (
                <span
                  className={`rounded-full px-2 py-0.2 text-[10px] ${
                    currentTab === "pospuesto"
                      ? "bg-white/20 text-white"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {overview.snoozedCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab("resuelto")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
                currentTab === "resuelto"
                  ? "bg-[#1B8053] text-white shadow-sm"
                  : "bg-white text-black/70 hover:bg-black/5"
              }`}
            >
              <CheckCircle2 size={13} />
              <span>Resueltos</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentTab("archivo")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
                currentTab === "archivo"
                  ? "bg-[#111111] text-white shadow-sm"
                  : "bg-white text-black/70 hover:bg-black/5"
              }`}
            >
              <span>Descartados</span>
            </button>
          </div>

          {/* Filtros y Busqueda */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Buscador */}
            <div className="relative min-w-[220px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por proyecto, producto..."
                className="w-full rounded-full border border-black/15 bg-white py-1.5 pl-9 pr-3 text-xs text-[#111111] placeholder:text-black/30 focus:border-[#9E1B32] focus:outline-none"
              />
            </div>

            {/* Selector de Dominio */}
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-semibold text-black/70 focus:border-[#9E1B32] focus:outline-none"
            >
              <option value="todos">Todos los dominios</option>
              <option value="integridad_datos">Integridad de datos (INT)</option>
              <option value="costos_margenes">Costos y márgenes (CST)</option>
              <option value="ventas_pipeline">Ventas y cotizaciones (VTA)</option>
              <option value="postventa_servicios">Postventa y servicios (SRV)</option>
              <option value="procesos">Procesos (PRC)</option>
            </select>
          </div>
        </div>

        {/* Lista de Hallazgos */}
        <div className="space-y-4">
          {filteredFindings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white/50 p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#1B8053]/10 text-[#1B8053]">
                <ShieldCheck size={24} />
              </div>
              <h3 className="mt-3 text-sm font-bold text-[#111111]">
                {currentTab === "requiere_autorizacion"
                  ? "Sin hallazgos pendientes de autorización"
                  : "No se encontraron hallazgos en esta vista"}
              </h3>
              <p className="mt-1 text-xs text-black/50">
                Todo opera bajo los parámetros normales de integridad y costos.
              </p>
            </div>
          ) : (
            filteredFindings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                onRefresh={() => router.refresh()}
              />
            ))
          )}
        </div>
      </div>

      {/* Drawer de Auditoria */}
      <VigiaAuditDrawer
        logs={auditLogs}
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
      />
    </div>
  );
}
