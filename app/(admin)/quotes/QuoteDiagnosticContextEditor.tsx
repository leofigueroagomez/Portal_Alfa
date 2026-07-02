"use client";

import { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon, Trash2, Upload } from "lucide-react";
import {
  createEmptyDiagnosticBlock,
  type QuoteDiagnosticBlock,
} from "@/lib/quoteDiagnosticContext";
import { supabase } from "@/services/supabase";

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
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const imageSignature = useMemo(
    () => blocks.map((block) => `${block.id}:${block.imageUrl}`).join("|"),
    [blocks]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPreviews() {
      const entries = await Promise.all(
        blocks.map(async (block) => {
          const imageUrl = block.imageUrl.trim();
          if (!imageUrl) return [block.id, ""] as const;
          if (isDirectPreviewUrl(imageUrl) && !isGoogleDrivePreviewUrl(imageUrl)) {
            return [block.id, imageUrl] as const;
          }

          const { data } = await supabase.storage
            .from("project-photos")
            .createSignedUrl(imageUrl, 60 * 60);

          return [block.id, data?.signedUrl || ""] as const;
        })
      );

      if (!cancelled) {
        setPreviewUrls(Object.fromEntries(entries));
      }
    }

    loadPreviews();

    return () => {
      cancelled = true;
    };
  }, [blocks, imageSignature]);

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

  async function uploadImage(blockId: string, file: File | null | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Selecciona una imagen valida.");
      return;
    }

    const filePath = `quote-diagnostics/${crypto.randomUUID()}.${safeExt(file)}`;
    setUploadingBlockId(blockId);

    try {
      const { error } = await supabase.storage
        .from("project-photos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;
      updateBlock(blockId, "imageUrl", filePath);
    } catch (error) {
      console.error("Error subiendo imagen de diagnostico:", error);
      alert(
        "No se pudo subir la imagen. Intenta de nuevo o guarda una URL manual."
      );
    } finally {
      setUploadingBlockId(null);
    }
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

          {blocks.map((block, index) => {
            const imageUrl = block.imageUrl.trim();
            const previewUrl = previewUrls[block.id] || "";
            const hasGoogleDriveUrl = isGoogleDrivePreviewUrl(imageUrl);

            return (
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
                        onBlocksChange(
                          blocks.filter((item) => item.id !== block.id)
                        )
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

                  <div className="grid gap-3 rounded-xl border border-[#2A2A30] bg-[#151518] p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3 text-sm text-[#B3B3B8]">
                        <ImageIcon size={16} />
                        <span>
                          {imageUrl
                            ? getImageLabel(imageUrl)
                            : "Imagen opcional para PDF Premium"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#3A3A42] px-3 py-2 text-xs font-semibold text-[#F5F5F7] hover:border-[#9E1B32]">
                          <Upload size={14} />
                          {uploadingBlockId === block.id
                            ? "Subiendo..."
                            : "Subir imagen"}
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            disabled={uploadingBlockId === block.id}
                            onChange={(event) => {
                              void uploadImage(
                                block.id,
                                event.target.files?.[0]
                              );
                              event.target.value = "";
                            }}
                          />
                        </label>
                        {imageUrl ? (
                          <button
                            type="button"
                            onClick={() => updateBlock(block.id, "imageUrl", "")}
                            className="inline-flex items-center gap-2 rounded-lg border border-[#5A2730] px-3 py-2 text-xs font-semibold text-[#F28B82]"
                          >
                            <Trash2 size={14} />
                            Quitar
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt={block.title || "Imagen de diagnostico"}
                        className="h-40 w-full rounded-lg object-cover"
                      />
                    ) : imageUrl ? (
                      <div className="rounded-lg border border-dashed border-[#2A2A30] p-3 text-xs text-[#B3B3B8]">
                        La vista previa no esta disponible, pero el PDF intentara
                        resolver la imagen al generarse.
                      </div>
                    ) : null}

                    {hasGoogleDriveUrl ? (
                      <p className="text-xs leading-relaxed text-[#F4B860]">
                        Los enlaces de vista de Google Drive pueden no
                        renderizarse en el PDF. Usa una imagen subida al sistema.
                      </p>
                    ) : null}

                    <label className="grid gap-2 text-sm text-[#B3B3B8]">
                      <span>URL manual opcional</span>
                      <input
                        className="rounded-xl border border-[#2A2A30] bg-[#101013] px-4 py-3 text-[#F5F5F7] outline-none focus:border-[#9E1B32]"
                        placeholder="https://..."
                        value={block.imageUrl}
                        onChange={(event) =>
                          updateBlock(block.id, "imageUrl", event.target.value)
                        }
                      />
                    </label>
                  </div>
                </div>
              </div>
            );
          })}

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

function safeExt(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

function isDirectPreviewUrl(value: string) {
  return /^https?:\/\//i.test(value) || /^data:image\//i.test(value);
}

function isGoogleDrivePreviewUrl(value: string) {
  if (!value) return false;

  try {
    return new URL(value).hostname.toLowerCase().endsWith("drive.google.com");
  } catch {
    return false;
  }
}

function getImageLabel(value: string) {
  if (/^https?:\/\//i.test(value)) return "URL manual";

  const name = value.split("/").pop();
  return name || "Imagen subida";
}
