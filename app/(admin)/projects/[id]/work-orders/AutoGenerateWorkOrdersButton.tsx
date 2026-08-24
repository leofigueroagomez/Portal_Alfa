"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Cpu, Hammer, Sparkles, Zap } from "lucide-react";
import { autoGenerateWorkOrdersAction } from "./actions";

type Props = {
  projectId: number;
  hasOrders: boolean;
};

export default function AutoGenerateWorkOrdersButton({
  projectId,
  hasOrders,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    const confirmed = window.confirm(
      hasOrders
        ? "¿Deseas re-generar y sincronizar las 3 Órdenes de Trabajo especializadas (Cableado, Instalaciones y Configuraciones) con el tabulador de mano de obra?"
        : "¿Generar automáticamente las 3 Órdenes de Trabajo del proyecto (Cableado, Instalaciones y Configuraciones) liquidando los importes con el tabulador oficial?"
    );

    if (!confirmed) return;

    startTransition(async () => {
      const res = await autoGenerateWorkOrdersAction(projectId);
      if (res.ok) {
        alert(
          `¡Órdenes de Trabajo generadas con éxito!\nSe crearon/actualizaron ${res.generatedOrders?.length || 0} órdenes especializadas.`
        );
        router.refresh();
      } else {
        alert(res.error || "No se pudieron generar las órdenes de trabajo.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-xl border border-[#9E1B32] bg-[#9E1B32]/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-[#9E1B32] transition shadow-lg disabled:opacity-50"
    >
      <Sparkles size={14} className="text-[#F4C66A]" />
      {isPending
        ? "Generando desde tabulador..."
        : hasOrders
        ? "Re-sincronizar con Tabulador"
        : "Auto-Generar 3 ODTs por Especialidad"}
    </button>
  );
}
