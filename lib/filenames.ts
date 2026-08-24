export function slugifyFilenamePart(
  value: string | null | undefined,
  maxLength = 40
) {
  const normalized = (value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

  return normalized
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
}

export function buildFilename(
  parts: Array<string | null | undefined>,
  extension: string,
  fallback = "documento"
) {
  const slugParts = parts.map((part) => slugifyFilenamePart(part)).filter(Boolean);
  const base = slugParts.length > 0 ? slugParts.join("-") : fallback;

  return `${base}.${extension}`;
}
