export type RfcPersonType = "moral" | "physical" | "unknown";

export type RfcDiagnostic = {
  captured: string;
  normalized: string;
  length: number;
  detectedType: RfcPersonType;
  isValid: boolean;
};

export const moralRfcRegex = /^[A-Z\u00D1&]{3}[0-9]{6}[A-Z0-9]{3}$/;
export const physicalRfcRegex = /^[A-Z\u00D1&]{4}[0-9]{6}[A-Z0-9]{3}$/;

export function normalizeRfc(value: string | null | undefined) {
  return (value || "").trim().toUpperCase().replace(/[\s.-]/g, "");
}

export function getRfcPersonTypeFromLength(normalizedRfc: string): RfcPersonType {
  if (normalizedRfc.length === 12) return "moral";
  if (normalizedRfc.length === 13) return "physical";
  return "unknown";
}

export function isValidNormalizedRfc(normalizedRfc: string) {
  return moralRfcRegex.test(normalizedRfc) || physicalRfcRegex.test(normalizedRfc);
}

export function getRfcDiagnostic(value: string | null | undefined): RfcDiagnostic {
  const captured = value || "";
  const normalized = normalizeRfc(captured);

  return {
    captured,
    normalized,
    length: normalized.length,
    detectedType: getRfcPersonTypeFromLength(normalized),
    isValid: isValidNormalizedRfc(normalized),
  };
}

export function formatRfcDiagnostic(diagnostic: RfcDiagnostic) {
  return [
    `RFC capturado: ${diagnostic.captured || "(vacio)"}`,
    `RFC normalizado: ${diagnostic.normalized || "(vacio)"}`,
    `Longitud: ${diagnostic.length}`,
    `Tipo detectado: ${diagnostic.detectedType}`,
  ].join(" | ");
}
