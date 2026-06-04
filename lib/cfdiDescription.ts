export const CFDI_DESCRIPTION_MAX_LENGTH = 1000;

const controlCharactersPattern = /[\u0000-\u001F\u007F]/g;
const whitespacePattern = /\s+/g;
const forbiddenCfdiDescriptionChars = ["|"];

export type CfdiDescriptionValidation = {
  ok: boolean;
  sanitized: string;
  errors: string[];
  forbiddenCharacters: string[];
  isEmpty: boolean;
  isTooLong: boolean;
  hasControlCharacters: boolean;
};

export function sanitizeCfdiDescription(text: string | null | undefined) {
  const sanitized = String(text ?? "")
    .replace(/\|/g, " - ")
    .replace(controlCharactersPattern, " ")
    .replace(whitespacePattern, " ")
    .trim()
    .slice(0, CFDI_DESCRIPTION_MAX_LENGTH)
    .trim();

  return sanitized || "Concepto ALFA";
}

export function validateCfdiDescription(
  text: string | null | undefined
): CfdiDescriptionValidation {
  const raw = String(text ?? "");
  const trimmed = raw.trim();
  const forbiddenCharacters = forbiddenCfdiDescriptionChars.filter((char) =>
    raw.includes(char)
  );
  const isEmpty = trimmed.length === 0;
  const isTooLong = trimmed.length > CFDI_DESCRIPTION_MAX_LENGTH;
  const hasControlCharacters = controlCharactersPattern.test(raw);
  controlCharactersPattern.lastIndex = 0;

  const errors: string[] = [];
  if (isEmpty) errors.push("La descripcion CFDI esta vacia.");
  if (isTooLong) errors.push("La descripcion CFDI supera 1000 caracteres.");
  if (forbiddenCharacters.length > 0) {
    errors.push(
      `La descripcion CFDI contiene caracteres no permitidos: ${forbiddenCharacters.join(
        " "
      )}`
    );
  }
  if (hasControlCharacters) {
    errors.push("La descripcion CFDI contiene caracteres de control no permitidos.");
  }

  return {
    ok: errors.length === 0,
    sanitized: sanitizeCfdiDescription(raw),
    errors,
    forbiddenCharacters,
    isEmpty,
    isTooLong,
    hasControlCharacters,
  };
}
