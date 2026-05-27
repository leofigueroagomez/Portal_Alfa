"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { supabase } from "@/services/supabase";

type Props = {
  clientId: number;
};

export default function DeleteClientButton({ clientId }: Props) {
  const router = useRouter();

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

  async function hasRelatedRows(table: string) {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId);

    if (error) {
      reportError(`verificar relaciones en ${table}`, error);
      return true;
    }

    return Number(count || 0) > 0;
  }

  async function handleDelete() {
    const hasClientProjects = await hasRelatedRows("client_projects");
    const hasQuotes = await hasRelatedRows("quotes");
    const hasProjects = await hasRelatedRows("projects");

    if (hasClientProjects || hasQuotes || hasProjects) {
      alert(
        "No puedes eliminar este cliente porque tiene proyectos, cotizaciones o información relacionada."
      );
      return;
    }

    const confirmed = window.confirm(
      "¿Seguro que deseas eliminar este cliente?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", clientId);

    if (error) {
      reportError("eliminar cliente", error);
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="inline-flex items-center justify-center gap-2 bg-[#222228] hover:bg-[#2A2A30] border border-[#2A2A30] rounded-xl px-4 py-2 font-semibold"
    >
      <Trash2 size={16} />
      Eliminar
    </button>
  );
}
