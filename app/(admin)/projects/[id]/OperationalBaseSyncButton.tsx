"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { syncProjectOperationalItems } from "@/lib/projectOperationalItems";
import { supabase } from "@/services/supabase";

type Props = {
  projectId: number;
  approvedQuoteCount: number;
};

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

export default function OperationalBaseSyncButton({
  projectId,
  approvedQuoteCount,
}: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    if (approvedQuoteCount === 0) {
      alert("No hay cotizaciones aprobadas para sincronizar.");
      return;
    }

    setSyncing(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setSyncing(false);
      reportError("leer usuario actual", userError);
      return;
    }

    try {
      const result = await syncProjectOperationalItems(supabase, projectId, user?.id || null);
      alert(
        result.inserted > 0
          ? `Base operativa sincronizada. Items agregados: ${result.inserted}.`
          : "La base operativa ya estaba sincronizada."
      );
      router.refresh();
    } catch (error) {
      reportError("sincronizar base operativa", error);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={syncing || approvedQuoteCount === 0}
      className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white disabled:text-[#77777D]"
    >
      <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
      {syncing ? "Sincronizando..." : "Sincronizar base operativa"}
    </button>
  );
}
