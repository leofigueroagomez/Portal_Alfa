"use client";

import {
  createEmptyDiagnosticBlock,
  type QuoteDiagnosticBlock,
} from "@/lib/quoteDiagnosticContext";

type Props = {
  enabled: boolean;
  blocks: QuoteDiagnosticBlock[];
  onEnabledChange: (value: boolean) => void;
  onBlocksChange: (blocks: QuoteDiagnosticBlock[]) => void;
};

export default function QuoteDiagnosticContextEditor({
  enabled,
  blocks,
  onEnabledChange,
  onBlocksChange,
}: Props) {
  function updateBlock(
    blockId: string,
    field: keyof Omit<QuoteDiagnosticBlock, "id">,
    value: string
  ) {
    onBlocksChange(
      blocks.map((block) =>
        block.id === blockId ? { ...block, [field]: value } : block
      )
    );
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= blocks.length) return;

    const nextBlocks = [...blocks];
    const [block] = nextBlocks.splice(index, 1);
    nextBlocks.splice(nextIndex, 0, block);
    onBlocksChange(nextBlocks);
  }

  return (
    <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Contexto y Diagnóstico</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#B3B3B8]">
            Documenta situacion actual, hallazgos y criterio tecnico para
            propuestas donde conviene justificar la solucion antes del catalogo.
          </p>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onEnabledChange(event.target.checked)}
          />
          Incluir en PDF Premium
        </label>
      </div>

      {enabled ? (
        <div className="space-y-4">
          {blocks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#2A2A30] bg-[#101013] p-5 text-sm text-[#B3B3B8]">
              Agrega bloques breves como situacion actual, hallazgos, riesgos u
              oportunidad de mejora.
            </div>
          ) : null}

          {blocks.map((block, index) => (
            <div
              key={block.id}
              className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4"
            >
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <span className="text-sm font-semibold text-[#B3B3B8]">
                  Bloque {index + 1}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => moveBlock(index, -1)}
                    disabled={index === 0}
                    className="rounded-lg border border-[#3A3A42] px-3 py-2 text-xs font-semibold text-[#F5F5F7] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Subir
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(index, 1)}
                    disabled={index === blocks.length - 1}
                    className="rounded-lg border border-[#3A3A42] px-3 py-2 text-xs font-semibold text-[#F5F5F7] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Bajar
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onBlocksChange(blocks.filter((item) => item.id !== block.id))
                    }
                    className="rounded-lg border border-[#5A2730] px-3 py-2 text-xs font-semibold text-[#F28B82]"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <input
                  className="rounded-xl border border-[#2A2A30] bg-[#151518] px-4 py-3 outline-none focus:border-[#9E1B32]"
                  placeholder="Titulo del bloque"
                  value={block.title}
                  onChange={(event) =>
                    updateBlock(block.id, "title", event.target.value)
                  }
                />

                <textarea
                  className="min-h-32 rounded-xl border border-[#2A2A30] bg-[#151518] p-4 leading-relaxed outline-none focus:border-[#9E1B32]"
                  placeholder="Texto breve: hallazgo, riesgo, oportunidad o criterio tecnico de ALFA."
                  value={block.text}
                  onChange={(event) =>
                    updateBlock(block.id, "text", event.target.value)
                  }
                />

                <label className="grid gap-2 text-sm text-[#B3B3B8]">
                  <span>Imagen opcional para PDF Premium (URL)</span>
                  <input
                    className="rounded-xl border border-[#2A2A30] bg-[#151518] px-4 py-3 text-[#F5F5F7] outline-none focus:border-[#9E1B32]"
                    placeholder="https://..."
                    value={block.imageUrl}
                    onChange={(event) =>
                      updateBlock(block.id, "imageUrl", event.target.value)
                    }
                  />
                </label>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => onBlocksChange([...blocks, createEmptyDiagnosticBlock()])}
            className="rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
          >
            Agregar bloque
          </button>
        </div>
      ) : null}
    </section>
  );
}
