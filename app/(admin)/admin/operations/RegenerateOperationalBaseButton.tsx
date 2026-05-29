"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  syncAllApprovedProjectOperationalItems,
  type SyncAllProjectOperationalItemsResult,
} from "@/lib/projectOperationalItems";
import { supabase } from "@/services/supabase";

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

export default function RegenerateOperationalBaseButton() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SyncAllProjectOperationalItemsResult | null>(null);

  async function handleRun() {
    const confirmed = window.confirm(
      "Regenerar la base operativa faltante de todos los proyectos aprobados/ganados?"
    );

    if (!confirmed) return;

    setRunning(true);
    setResult(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setRunning(false);
      reportError("leer usuario actual", userError);
      return;
    }

    try {
      const syncResult = await syncAllApprovedProjectOperationalItems(
        supabase,
        user?.id || null
      );
      setResult(syncResult);
    } catch (error) {
      reportError("regenerar proyectos", error);
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Regeneracion operativa</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#B3B3B8]">
            Recorre proyectos con cotizaciones aprobadas o etapa ganada y genera
            solo equipos/actividades operativas faltantes. Omite registros ya
            sincronizados.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRun}
          disabled={running}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
        >
          <RefreshCw size={18} className={running ? "animate-spin" : ""} />
          {running ? "Regenerando..." : "Regenerar todos los proyectos aprobados"}
        </button>
      </div>

      {result ? (
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
            <p className="text-xs text-[#B3B3B8]">Proyectos revisados</p>
            <p className="mt-2 text-2xl font-bold">{result.projectsScanned}</p>
          </div>
          <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
            <p className="text-xs text-[#B3B3B8]">Proyectos procesados</p>
            <p className="mt-2 text-2xl font-bold">{result.projectsSynced}</p>
          </div>
          <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
            <p className="text-xs text-[#B3B3B8]">Equipos generados</p>
            <p className="mt-2 text-2xl font-bold text-[#8CE0B6]">{result.inserted}</p>
          </div>
          <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
            <p className="text-xs text-[#B3B3B8]">Actividades generadas</p>
            <p className="mt-2 text-2xl font-bold text-[#8CE0B6]">{result.activitiesInserted}</p>
          </div>
          <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
            <p className="text-xs text-[#B3B3B8]">Ya existentes</p>
            <p className="mt-2 text-2xl font-bold">{result.skipped + result.activitiesSkipped}</p>
          </div>
          <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
            <p className="text-xs text-[#B3B3B8]">Errores</p>
            <p className="mt-2 text-2xl font-bold text-[#F28B82]">{result.errors.length}</p>
          </div>
        </div>
      ) : null}

      {result?.errors.length ? (
        <div className="mt-5 rounded-xl border border-[#614620] bg-[#322514] p-4 text-sm text-[#F4C66A]">
          <p className="mb-3 font-semibold">Errores encontrados</p>
          <div className="space-y-2">
            {result.errors.map((error) => (
              <p key={`${error.projectId}-${error.message}`}>
                Proyecto #{error.projectId}: {error.message}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
