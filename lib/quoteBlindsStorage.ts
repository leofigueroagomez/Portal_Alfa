export const QUOTE_BLINDS_IMAGES_BUCKET = "quote-blinds-private";
export const QUOTE_BLINDS_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const QUOTE_BLINDS_IMAGE_SIGNED_URL_TTL_SECONDS = 10 * 60;

export const QUOTE_BLINDS_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const extensionByMimeType: Record<
  (typeof QUOTE_BLINDS_IMAGE_MIME_TYPES)[number],
  string
> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isAcceptedQuoteBlindImageMimeType(
  value: string
): value is (typeof QUOTE_BLINDS_IMAGE_MIME_TYPES)[number] {
  return QUOTE_BLINDS_IMAGE_MIME_TYPES.includes(
    value as (typeof QUOTE_BLINDS_IMAGE_MIME_TYPES)[number]
  );
}

export function buildQuoteBlindImagePath({
  quoteId,
  quoteItemId,
  mimeType,
  uniqueId,
}: {
  quoteId: number;
  quoteItemId: number;
  mimeType: (typeof QUOTE_BLINDS_IMAGE_MIME_TYPES)[number];
  uniqueId: string;
}) {
  if (
    !Number.isInteger(quoteId) ||
    quoteId <= 0 ||
    !Number.isInteger(quoteItemId) ||
    quoteItemId <= 0 ||
    !/^[a-zA-Z0-9-]+$/.test(uniqueId)
  ) {
    throw new Error("No se pudo construir el path privado de la imagen.");
  }

  return `quote-blinds/${quoteId}/${quoteItemId}/${uniqueId}.${extensionByMimeType[mimeType]}`;
}
