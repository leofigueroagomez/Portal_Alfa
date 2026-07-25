"use client";

import { Image as ImageIcon, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { readApiResponse } from "../types";

const acceptedImages = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

type SignedImageResponse = {
  signed_url: string;
  expires_in: number;
};

type UploadImageResponse = SignedImageResponse & {
  reference_image_path: string;
  cleanup_pending: boolean;
};

function imageEndpoint(quoteId: number, itemId: number) {
  return `/api/quotes/blinds/${quoteId}/items/${itemId}/reference-image`;
}

export function BlindReferenceImageManager({
  quoteId,
  itemId,
  hasImage,
  onChanged,
}: {
  quoteId: number;
  itemId: number;
  hasImage: boolean;
  onChanged: (path: string | null, message: string) => Promise<void>;
}) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(hasImage);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");

  const loadPreview = useCallback(async () => {
    if (!hasImage) {
      setPreviewUrl("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(imageEndpoint(quoteId, itemId), {
        cache: "no-store",
      });
      const payload = await readApiResponse<SignedImageResponse>(response);
      setPreviewUrl(payload.signed_url);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No fue posible cargar la vista previa."
      );
    } finally {
      setLoading(false);
    }
  }, [hasImage, itemId, quoteId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadPreview(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadPreview]);

  async function uploadImage(file: File | null | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.set("image", file);
      const response = await fetch(imageEndpoint(quoteId, itemId), {
        method: "POST",
        body: formData,
      });
      const payload = await readApiResponse<UploadImageResponse>(response);
      setPreviewUrl(payload.signed_url);
      await onChanged(
        payload.reference_image_path,
        payload.cleanup_pending
          ? "Foto reemplazada. Quedó una limpieza de archivo pendiente para auditoría."
          : hasImage
            ? "Foto de referencia reemplazada."
            : "Foto de referencia agregada."
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "No fue posible subir la imagen."
      );
    } finally {
      setUploading(false);
    }
  }

  async function removeImage() {
    setRemoving(true);
    setError("");
    try {
      const response = await fetch(imageEndpoint(quoteId, itemId), {
        method: "DELETE",
      });
      await readApiResponse(response);
      setPreviewUrl("");
      await onChanged(null, "Foto de referencia eliminada.");
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "No fue posible eliminar la imagen."
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="grid gap-4 border border-black/10 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-black/70">
            Foto de referencia
          </p>
          <p className="mt-1 text-xs text-black/40">
            Privada · JPG, PNG o WebP · máximo 10 MB
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 border border-black/10 px-3 text-xs font-semibold text-black/60 transition hover:border-[#7A1F2B]/30 hover:text-[#7A1F2B]">
            {uploading ? (
              <LoaderCircle size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            {hasImage ? "Reemplazar" : "Subir foto"}
            <input
              type="file"
              accept={acceptedImages}
              className="sr-only"
              disabled={uploading || removing}
              onChange={(event) => {
                void uploadImage(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          {hasImage ? (
            <button
              type="button"
              onClick={() => void removeImage()}
              disabled={uploading || removing}
              className="inline-flex min-h-10 items-center gap-2 border border-[#7A1F2B]/20 px-3 text-xs font-semibold text-[#7A1F2B] disabled:opacity-50"
            >
              {removing ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              Quitar
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-40 items-center justify-center overflow-hidden bg-[#F7F6F3]">
        {loading ? (
          <LoaderCircle size={24} className="animate-spin text-black/25" />
        ) : previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Foto de referencia de la persiana"
            className="max-h-72 w-full object-contain"
          />
        ) : (
          <div className="flex items-center gap-2 text-sm text-black/35">
            <ImageIcon size={18} />
            Sin foto de referencia
          </div>
        )}
      </div>

      {error ? (
        <p className="border-l-2 border-[#7A1F2B] bg-[#7A1F2B]/[0.04] px-3 py-2 text-xs text-[#7A1F2B]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function BlindReferenceImageThumbnail({
  quoteId,
  itemId,
  hasImage,
}: {
  quoteId: number;
  itemId: number;
  hasImage: boolean;
}) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!hasImage) {
      return;
    }

    void fetch(imageEndpoint(quoteId, itemId), { cache: "no-store" })
      .then((response) => readApiResponse<SignedImageResponse>(response))
      .then((payload) => {
        if (!cancelled) setPreviewUrl(payload.signed_url);
      })
      .catch(() => {
        if (!cancelled) setPreviewUrl("");
      });

    return () => {
      cancelled = true;
    };
  }, [hasImage, itemId, quoteId]);

  if (!hasImage) return null;

  return (
    <div className="h-24 w-32 shrink-0 overflow-hidden bg-[#F7F6F3]">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Referencia privada"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-black/20">
          <ImageIcon size={20} />
        </div>
      )}
    </div>
  );
}
