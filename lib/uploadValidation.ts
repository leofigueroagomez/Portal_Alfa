// Validacion de archivos subidos (fotos, INE, constancias) antes de guardarlos
// con service_role. Nunca confiar en `file.type`, en la extension del nombre ni
// en el mime declarado de un data URL: el tipo se deduce de los magic bytes y la
// extension del storage path sale de ese tipo detectado.

export type DetectedFileType = "jpeg" | "png" | "webp" | "gif" | "heic" | "pdf";

export const FILE_TYPE_INFO: Record<DetectedFileType, { mime: string; ext: string }> = {
  jpeg: { mime: "image/jpeg", ext: "jpg" },
  png: { mime: "image/png", ext: "png" },
  webp: { mime: "image/webp", ext: "webp" },
  gif: { mime: "image/gif", ext: "gif" },
  heic: { mime: "image/heic", ext: "heic" },
  pdf: { mime: "application/pdf", ext: "pdf" },
};

/** Fotos de evidencia tomadas con el celular (JPEG/PNG/WebP y HEIC de iPhone). */
export const PHOTO_UPLOAD_TYPES: readonly DetectedFileType[] = ["jpeg", "png", "webp", "heic"];
/** INE en firmas publicas: la UI comprime a JPEG en canvas; PNG/WebP por compatibilidad. */
export const ID_IMAGE_UPLOAD_TYPES: readonly DetectedFileType[] = ["jpeg", "png", "webp"];
/** Documentos (INE, constancia fiscal): imagen o PDF, como permite `accept` en la UI. */
export const DOCUMENT_UPLOAD_TYPES: readonly DetectedFileType[] = ["jpeg", "png", "webp", "heic", "pdf"];
/** Imagenes que Chromium puede renderizar en los PDF de cotizacion (sin SVG ni HEIC). */
export const PDF_RENDERABLE_IMAGE_TYPES: readonly DetectedFileType[] = ["jpeg", "png", "webp", "gif"];

const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);

function ascii(bytes: Uint8Array, start: number, end: number) {
  if (bytes.length < end) return "";
  return Buffer.from(bytes.subarray(start, end)).toString("latin1");
}

/** Detecta el tipo real por magic bytes. SVG/HTML/otros devuelven null. */
export function detectFileType(bytes: Uint8Array): DetectedFileType | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "png";
  }
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "webp";
  if (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a") return "gif";
  if (ascii(bytes, 4, 8) === "ftyp" && HEIF_BRANDS.has(ascii(bytes, 8, 12))) return "heic";
  if (ascii(bytes, 0, 5) === "%PDF-") return "pdf";
  return null;
}

export type ValidatedUpload = {
  buffer: Buffer;
  type: DetectedFileType;
  mime: string;
  ext: string;
};

type UploadRules = { allowed: readonly DetectedFileType[]; maxBytes: number };

/** Valida bytes ya leidos: no vacio, tamano maximo y tipo permitido por magic bytes. */
export function validateUploadBytes(bytes: Uint8Array, rules: UploadRules): ValidatedUpload | null {
  if (!bytes.length || bytes.length > rules.maxBytes) return null;
  const type = detectFileType(bytes);
  if (!type || !rules.allowed.includes(type)) return null;
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return { buffer, type, ...FILE_TYPE_INFO[type] };
}

/** Valida un `File` de FormData leyendo el tamano antes de cargarlo en memoria. */
export async function validateUploadFile(
  file: unknown,
  rules: UploadRules
): Promise<ValidatedUpload | null> {
  if (!file || typeof file !== "object" || typeof (file as File).arrayBuffer !== "function") {
    return null;
  }
  const candidate = file as File;
  if (!candidate.size || candidate.size > rules.maxBytes) return null;
  return validateUploadBytes(new Uint8Array(await candidate.arrayBuffer()), rules);
}

const DATA_URL_PATTERN = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/i;

/**
 * Valida un data URL base64 (los formularios usan FileReader.readAsDataURL).
 * El mime declarado solo se usa para descartar SVG/HTML; el tipo final sale de
 * los magic bytes. Acota la longitud antes de decodificar.
 */
export function parseValidatedDataUrl(value: unknown, rules: UploadRules): ValidatedUpload | null {
  if (typeof value !== "string") return null;
  if (value.length > Math.ceil(rules.maxBytes / 3) * 4 + 128) return null;
  const match = DATA_URL_PATTERN.exec(value);
  if (!match) return null;
  const declared = match[1].toLowerCase();
  if (!declared.startsWith("image/") && declared !== "application/pdf") return null;
  if (declared.includes("svg")) return null;
  const buffer = Buffer.from(match[2], "base64");
  return validateUploadBytes(buffer, rules);
}
