"use client";

import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";

type DeliveryPhoto = {
  id: number;
  file_url: string | null;
  file_path?: string | null;
  file_name?: string | null;
  caption: string | null;
  displayUrl: string;
};

type Props = {
  projectId: number;
  deliveryId: number;
  initialPhotos: DeliveryPhoto[];
};

const maxImageSize = 50 * 1024 * 1024;

export default function DeliveryPhotoManager({ projectId, deliveryId, initialPhotos }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [photos, setPhotos] = useState(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function uploadPhotos(files: FileList | null) {
    const selected = Array.from(files || []);
    if (selected.length === 0) return;

    const rejected = selected
      .filter((file) => !file.type.startsWith("image/") || file.size > maxImageSize)
      .map((file) =>
        !file.type.startsWith("image/")
          ? `${file.name}: no es imagen`
          : `${file.name}: supera 50 MB`
      );
    const valid = selected.filter((file) => file.type.startsWith("image/") && file.size <= maxImageSize);

    if (rejected.length > 0) {
      setMessage(`Algunas fotos no se agregaron: ${rejected.join(" / ")}`);
    }
    if (valid.length === 0) return;

    const formData = new FormData();
    formData.append("deliveryId", String(deliveryId));
    valid.forEach((file) => formData.append("photos", file));

    setUploading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/delivery/photos`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudieron subir las fotos.");

      setPhotos((current) => [...current, ...(payload.photos || [])]);
      if (payload.errors?.length > 0) {
        setMessage(
          `Algunas fotos fallaron: ${payload.errors
            .map((error: { fileName: string; error: string }) => `${error.fileName}: ${error.error}`)
            .join(" / ")}`
        );
      } else {
        setMessage("Fotos agregadas correctamente.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron subir las fotos.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function deletePhoto(photoId: number) {
    const shouldDelete = window.confirm("Eliminar esta foto de evidencia?");
    if (!shouldDelete) return;

    setDeletingId(photoId);
    try {
      const response = await fetch(`/api/projects/${projectId}/delivery/photos/${photoId}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "No se pudo eliminar la foto.");
      setPhotos((current) => current.filter((photo) => photo.id !== photoId));
      setMessage("Foto eliminada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo eliminar la foto.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Evidencias</h2>
          <p className="mt-1 text-sm text-[#B3B3B8]">
            Agrega una o varias fotos de evidencia de entrega.
          </p>
        </div>
        <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-sm font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white">
          <Camera size={16} />
          {uploading ? "Subiendo..." : "Agregar mas fotos"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            disabled={uploading}
            className="sr-only"
            onChange={(event) => uploadPhotos(event.target.files)}
          />
        </label>
      </div>

      {message ? (
        <p className="mb-4 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-sm text-[#B3B3B8]">
          {message}
        </p>
      ) : null}

      {photos.length === 0 ? (
        <p className="flex h-56 items-center justify-center rounded-xl border border-dashed border-[#2A2A30] text-[#77777D]">
          Sin evidencias disponibles.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {photos.map((photo, index) => (
            <figure
              key={photo.id}
              className="overflow-hidden rounded-xl border border-[#2A2A30] bg-[#101114]"
            >
              <a href={photo.displayUrl} target="_blank" rel="noreferrer">
                <img
                  src={photo.displayUrl}
                  alt={photo.caption || `Evidencia ${index + 1}`}
                  className="h-72 w-full object-cover"
                />
              </a>
              <figcaption className="flex items-center justify-between gap-3 p-3 text-sm text-[#B3B3B8]">
                <span className="truncate">
                  {photo.file_name || photo.caption || `Evidencia ${index + 1}`}
                </span>
                <button
                  type="button"
                  onClick={() => deletePhoto(photo.id)}
                  disabled={deletingId === photo.id}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#6A2A2A] px-2 py-1 text-xs text-[#FFB4B4] hover:bg-[#351818] disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Eliminar
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
