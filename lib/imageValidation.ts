import "server-only";

export type ImageValidationResult =
  | { ok: true; detectedMime: string }
  | { ok: false; detectedMime: string | null; error: string };

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

export function validateImageMagicBytes(
  buffer: Buffer,
  allowedMimes: Set<string> = ALLOWED_MIME_TYPES
): ImageValidationResult {
  if (!buffer || buffer.length < 12) {
    return { ok: false, detectedMime: null, error: "Archivo demasiado pequeño o vacío." };
  }

  // Check for common script/HTML injection patterns at the start of the file
  const headerUtf8 = buffer.subarray(0, 64).toString("utf8").toLowerCase();
  if (
    headerUtf8.includes("<script") ||
    headerUtf8.includes("<?php") ||
    headerUtf8.includes("<html") ||
    headerUtf8.includes("<!doctype html")
  ) {
    return {
      ok: false,
      detectedMime: null,
      error: "Contenido de archivo no permitido.",
    };
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    const mime = "image/jpeg";
    return allowedMimes.has(mime)
      ? { ok: true, detectedMime: mime }
      : { ok: false, detectedMime: mime, error: "Formato JPEG no permitido para este recurso." };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    const mime = "image/png";
    return allowedMimes.has(mime)
      ? { ok: true, detectedMime: mime }
      : { ok: false, detectedMime: mime, error: "Formato PNG no permitido para este recurso." };
  }

  // 3. WebP: 52 49 46 46 (RIFF) .... 57 45 42 50 (WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    const mime = "image/webp";
    return allowedMimes.has(mime)
      ? { ok: true, detectedMime: mime }
      : { ok: false, detectedMime: mime, error: "Formato WebP no permitido para este recurso." };
  }

  // 4. GIF: 47 49 46 38 (GIF8)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    const mime = "image/gif";
    return allowedMimes.has(mime)
      ? { ok: true, detectedMime: mime }
      : { ok: false, detectedMime: mime, error: "Formato GIF no permitido para este recurso." };
  }

  // 5. HEIC / HEIF: bytes 4-7 equal 'ftyp'
  if (
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    const brand = buffer.subarray(8, 12).toString("ascii").toLowerCase();
    if (["heic", "heix", "hevc", "heim", "heis", "mif1", "msf1"].includes(brand)) {
      const mime = "image/heic";
      return allowedMimes.has(mime)
        ? { ok: true, detectedMime: mime }
        : { ok: false, detectedMime: mime, error: "Formato HEIC no permitido para este recurso." };
    }
  }

  return {
    ok: false,
    detectedMime: null,
    error: "El archivo no contiene una firma de imagen válida (Magic Bytes no reconocidos).",
  };
}
