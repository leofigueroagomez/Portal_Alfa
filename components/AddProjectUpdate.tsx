"use client";

import { useState } from "react";
import { supabase } from "@/services/supabase";

type Props = {
  projectId: number;
  userId: string;
};

export default function AddProjectUpdate({ projectId, userId }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!title.trim()) {
      alert("Agrega un título");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("project_updates").insert({
      project_id: projectId,
      title,
      description,
      status: "completed",
      created_by: userId,
    });

    if (error) {
      console.error(error);
      alert("Error guardando actualización");
      setSaving(false);
      return;
    }

    setSaving(false);
    setOpen(false);
    window.location.reload();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mb-6 bg-[#9E1B32] hover:bg-[#B91C3C] transition rounded-xl px-5 py-3 font-semibold"
      >
        Agregar actualización
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6">
          <div className="w-full max-w-lg bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold">
                  Nueva actualización
                </h3>

                <p className="text-[#B3B3B8] text-sm mt-1">
                  Registra un avance o evento del proyecto.
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="text-[#B3B3B8] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <input
                className="w-full bg-[#222228] rounded-xl p-4 mb-4 outline-none"
                placeholder="Título"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <textarea
                className="w-full bg-[#222228] rounded-xl p-4 mb-4 outline-none min-h-32"
                placeholder="Descripción"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 bg-[#222228] hover:bg-[#2A2A30] rounded-xl py-3 font-semibold"
                >
                  Cancelar
                </button>

                <button
                  className="flex-1 bg-[#9E1B32] hover:bg-[#B91C3C] rounded-xl py-3 font-semibold"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}