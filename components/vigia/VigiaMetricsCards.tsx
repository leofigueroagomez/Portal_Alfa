"use client";

import { Activity, AlertTriangle, CheckCircle2, DollarSign, ShieldCheck } from "lucide-react";
import type { VigiaOverview } from "@/lib/vigia/queries";

type Props = {
  overview: VigiaOverview;
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string | null) {
  if (!dateString) return "Sin corridas registradas";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function VigiaMetricsCards({ overview }: Props) {
  const isHealthy = overview.integrityScore >= 80;
  const isSevere = overview.requiresAuthCount > 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Tarjeta 1: Indice de Salud Operativa */}
      <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-black/50">
            Salud Operativa
          </span>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full ${
              isHealthy ? "bg-[#8CE0B6]/20 text-[#1B8053]" : "bg-[#F4C66A]/20 text-[#9E6A1B]"
            }`}
          >
            {isHealthy ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-[#111111]">
            {overview.integrityScore}%
          </span>
          <span className="text-xs text-black/40">índice de integridad</span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
          <div
            className={`h-full transition-all duration-500 ${
              isHealthy ? "bg-[#1B8053]" : "bg-[#9E1B32]"
            }`}
            style={{ width: `${overview.integrityScore}%` }}
          />
        </div>
      </div>

      {/* Tarjeta 2: Requiere Autorizacion */}
      <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-black/50">
            Por Autorizar
          </span>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full ${
              isSevere ? "bg-[#9E1B32]/15 text-[#9E1B32]" : "bg-black/5 text-black/40"
            }`}
          >
            <AlertTriangle size={20} />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span
            className={`text-3xl font-bold tracking-tight ${
              isSevere ? "text-[#9E1B32]" : "text-[#111111]"
            }`}
          >
            {overview.requiresAuthCount}
          </span>
          <span className="text-xs text-black/40">requieren decisión</span>
        </div>
        <p className="mt-2 text-xs text-black/50">
          {overview.payAttentionCount} adicionales en prestar atención
        </p>
      </div>

      {/* Tarjeta 3: Dinero en Riesgo / Sobrecostos */}
      <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-black/50">
            Dinero en Riesgo
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4C66A]/20 text-[#8F6515]">
            <DollarSign size={20} />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-[#111111]">
            {formatMoney(overview.impactMxnOpen)}
          </span>
        </div>
        <p className="mt-2 text-xs text-black/50">
          sobrecostos y desfases monetarios
        </p>
      </div>

      {/* Tarjeta 4: Sensores y Ultima Corrida */}
      <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-black/50">
            Vigilancia Activa
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111111]/5 text-[#111111]">
            <Activity size={20} />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-[#111111]">
            {overview.activeSensorsCount}
          </span>
          <span className="text-xs text-black/40">sensores en producción</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-black/50">
          <CheckCircle2 size={13} className="text-[#1B8053]" />
          <span>Último scan: {formatDate(overview.lastRunAt)}</span>
        </div>
      </div>
    </div>
  );
}
