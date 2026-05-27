"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { supabase } from "@/services/supabase";

type Props = {
  quoteId: number;
};

export default function DeleteQuoteButton({ quoteId }: Props) {
  const router = useRouter();

  async function handleDelete() {
    const confirmed = window.confirm(
      "¿Seguro que deseas eliminar esta cotización? Esta acción eliminará sus secciones y partidas."
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("quotes")
      .delete()
      .eq("id", quoteId);

    if (error) {
      console.error(error);
      alert("Error eliminando cotización");
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="inline-flex items-center gap-2 bg-[#222228] hover:bg-[#2A2A30] border border-[#2A2A30] text-[#B3B3B8] rounded-xl px-4 py-3 text-sm font-semibold"
    >
      <Trash2 size={16} />
      Eliminar
    </button>
  );
}
