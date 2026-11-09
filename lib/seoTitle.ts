/**
 * Titulos SEO del sitio publico.
 *
 * El layout raiz define `title.template = "%s | ALFA"`, que se aplica a todo
 * segmento hijo. Los textos SEO del catalogo y del portafolio ya traen la marca,
 * asi que renderizaban "... | ALFA | ALFA". Estas funciones devuelven el titulo
 * final con la marca una sola vez: usarlas con `title: { absolute: ... }`.
 */

const SITE_NAME = "ALFA";
const SITE_SUFFIX = ` | ${SITE_NAME}`;

/** Largo aproximado que Google muestra completo en resultados. */
const MAX_TITLE_LENGTH = 60;

/** Coletillas comerciales que solo gastan espacio del titulo. */
const TRAILING_BRAND_SEGMENTS = [
  /\s*\|\s*ALFA\s*$/i,
  /\s*\|\s*Distribuidor ALFA(?: México)?\s*$/i,
  /\s*\|\s*Cotización México\s*$/i,
];

/** Palabras que no pueden quedar al final de un titulo recortado. */
const DANGLING_WORD = /[\s,]+(?:a|al|con|de|del|el|en|la|las|los|para|por|y|(?:de|con) \d+)$/i;

function stripTrailingBrand(title: string): string {
  let current = title.trim();

  for (;;) {
    const next = TRAILING_BRAND_SEGMENTS.reduce(
      (text, pattern) => text.replace(pattern, ""),
      current
    );
    if (next === current) return current;
    current = next;
  }
}

function clampAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;

  let clamped = text.slice(0, maxLength);
  const lastSpace = clamped.lastIndexOf(" ");
  if (lastSpace > 0 && text[maxLength] !== " ") {
    clamped = clamped.slice(0, lastSpace);
  }

  clamped = clamped.replace(/[\s,]+$/, "");
  while (DANGLING_WORD.test(clamped)) {
    clamped = clamped.replace(DANGLING_WORD, "");
  }

  return clamped;
}

/** Titulo final con la marca del sitio exactamente una vez. */
export function brandedTitle(title: string): string {
  return `${stripTrailingBrand(title)}${SITE_SUFFIX}`;
}

/**
 * Titulo de una ficha de catalogo. La gente busca el modelo, asi que cuando el
 * texto SEO lo trae al final entre parentesis ("Teclado Sunnata (RRST)") se
 * mueve al inicio para que Google no lo corte.
 */
export function catalogProductTitle(product: {
  brand_name: string;
  model: string | null;
  seo_title: string | null;
}): string {
  const { brand_name: brandName, model, seo_title: seoTitle } = product;
  const title = stripTrailingBrand(
    seoTitle || `${brandName} ${model ?? ""} | Cotización e Integración en México`
  );

  const modelSuffix = model ? ` (${model})` : "";
  if (!model || !title.endsWith(modelSuffix)) return `${title}${SITE_SUFFIX}`;

  const productName = title.slice(0, -modelSuffix.length);
  const prefix = `${brandName} ${model} | `;
  const available = MAX_TITLE_LENGTH - SITE_SUFFIX.length - prefix.length;

  return `${prefix}${clampAtWord(productName, available)}${SITE_SUFFIX}`;
}
