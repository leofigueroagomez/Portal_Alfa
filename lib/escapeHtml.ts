// Escapado compartido para HTML de correos. Usar en todo valor que venga de
// clientes, firmantes, contratistas o texto libre antes de interpolarlo.

export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Para `href="..."`: solo acepta URLs absolutas http(s) (bloquea `javascript:`,
 * `data:`, etc.) y las devuelve escapadas para atributo. Si no es valida
 * devuelve cadena vacia para que el llamador omita el enlace.
 */
export function safeHrefUrl(value: string | null | undefined): string {
  const raw = (value || "").trim();
  if (!raw) {
    return "";
  }

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "";
    }
    return escapeHtml(url.toString());
  } catch {
    return "";
  }
}
