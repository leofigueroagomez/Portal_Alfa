export const QUOTE_BLINDS_TYPE = "blinds" as const;
export const QUOTE_STANDARD_TYPE = "standard" as const;
export const QUOTE_BLINDS_IVA_RATE = 0.16;

const MAX_SHORT_TEXT_LENGTH = 255;
const MAX_NOTES_LENGTH = 5000;
const MAX_IMAGE_PATH_LENGTH = 1024;

export class QuoteBlindValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuoteBlindValidationError";
  }
}

export type QuoteBlindItemInput = {
  area: string;
  brand: string;
  model: string;
  width_cm: number;
  height_cm: number;
  blind_type: string;
  collection: string;
  color: string;
  mechanism: string;
  control: string;
  quantity: number;
  price_per_m2_mxn: number;
  billable_m2_override: number | null;
  override_reason: string | null;
  reference_image_path: string | null;
  internal_notes: string | null;
  customer_visible_note: string | null;
};

export type QuoteBlindItemAmounts = {
  calculated_m2_per_unit: number;
  calculated_m2_total: number;
  billable_m2: number;
  unit_equipment_price_mxn: number;
  line_total_mxn: number;
};

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function requiredText(
  source: Record<string, unknown>,
  field: string,
  label: string
) {
  const value = String(source[field] ?? "").trim();

  if (!value) {
    throw new QuoteBlindValidationError(`${label} es requerido.`);
  }

  if (value.length > MAX_SHORT_TEXT_LENGTH) {
    throw new QuoteBlindValidationError(
      `${label} no puede exceder ${MAX_SHORT_TEXT_LENGTH} caracteres.`
    );
  }

  return value;
}

function optionalText(
  source: Record<string, unknown>,
  field: string,
  label: string,
  maxLength = MAX_SHORT_TEXT_LENGTH
) {
  const rawValue = source[field];
  if (rawValue === null || rawValue === undefined) return null;

  const value = String(rawValue).trim();
  if (!value) return null;

  if (value.length > maxLength) {
    throw new QuoteBlindValidationError(
      `${label} no puede exceder ${maxLength} caracteres.`
    );
  }

  return value;
}

function requiredNumber(
  source: Record<string, unknown>,
  field: string,
  label: string
) {
  if (
    source[field] === null ||
    source[field] === undefined ||
    source[field] === ""
  ) {
    throw new QuoteBlindValidationError(`${label} es requerido.`);
  }

  const value = Number(source[field]);

  if (!Number.isFinite(value)) {
    throw new QuoteBlindValidationError(`${label} debe ser numérico.`);
  }

  return value;
}

export function isPrivateQuoteBlindImagePath(value: string) {
  return (
    value.length <= MAX_IMAGE_PATH_LENGTH &&
    value.startsWith("quote-blinds/") &&
    !/(^|\/)\.\.(\/|$)/.test(value) &&
    !/^(https?:|data:)/i.test(value) &&
    !value.includes("//")
  );
}

export function isQuoteBlindImagePathForQuote(
  value: string,
  quoteId: number
) {
  return (
    isPrivateQuoteBlindImagePath(value) &&
    value.startsWith(`quote-blinds/${quoteId}/`)
  );
}

export function parseQuoteBlindItemInput(input: unknown): QuoteBlindItemInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new QuoteBlindValidationError("La partida de persiana es inválida.");
  }

  const source = input as Record<string, unknown>;
  const widthCm = requiredNumber(source, "width_cm", "Ancho");
  const heightCm = requiredNumber(source, "height_cm", "Alto");
  const quantity = requiredNumber(source, "quantity", "Cantidad");
  const pricePerM2 = requiredNumber(
    source,
    "price_per_m2_mxn",
    "Precio por m²"
  );

  if (widthCm <= 0) {
    throw new QuoteBlindValidationError("Ancho debe ser mayor a cero.");
  }

  if (heightCm <= 0) {
    throw new QuoteBlindValidationError("Alto debe ser mayor a cero.");
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new QuoteBlindValidationError(
      "Cantidad debe ser un entero mayor a cero."
    );
  }

  if (pricePerM2 < 0) {
    throw new QuoteBlindValidationError(
      "Precio por m² no puede ser negativo."
    );
  }

  const overrideValue = source.billable_m2_override;
  const billableM2Override =
    overrideValue === null || overrideValue === undefined || overrideValue === ""
      ? null
      : Number(overrideValue);
  const overrideReason = optionalText(
    source,
    "override_reason",
    "Motivo del ajuste",
    MAX_NOTES_LENGTH
  );

  if (
    billableM2Override !== null &&
    (!Number.isFinite(billableM2Override) || billableM2Override <= 0)
  ) {
    throw new QuoteBlindValidationError(
      "El ajuste de m² debe ser mayor a cero."
    );
  }

  if (billableM2Override !== null && !overrideReason) {
    throw new QuoteBlindValidationError(
      "El motivo del ajuste es requerido cuando se ajustan los m²."
    );
  }

  if (billableM2Override === null && overrideReason) {
    throw new QuoteBlindValidationError(
      "No puede existir motivo de ajuste sin m² ajustados."
    );
  }

  const referenceImagePath = optionalText(
    source,
    "reference_image_path",
    "Path de imagen",
    MAX_IMAGE_PATH_LENGTH
  );

  if (
    referenceImagePath &&
    !isPrivateQuoteBlindImagePath(referenceImagePath)
  ) {
    throw new QuoteBlindValidationError(
      "La imagen debe usar un path privado quote-blinds/..."
    );
  }

  return {
    area: requiredText(source, "area", "Área"),
    brand: requiredText(source, "brand", "Marca"),
    model: requiredText(source, "model", "Modelo"),
    width_cm: round(widthCm, 2),
    height_cm: round(heightCm, 2),
    blind_type: requiredText(source, "blind_type", "Tipo de persiana"),
    collection: requiredText(source, "collection", "Colección"),
    color: requiredText(source, "color", "Color"),
    mechanism: requiredText(source, "mechanism", "Mecanismo"),
    control: requiredText(source, "control", "Control"),
    quantity,
    price_per_m2_mxn: round(pricePerM2, 2),
    billable_m2_override:
      billableM2Override === null ? null : round(billableM2Override, 4),
    override_reason: overrideReason,
    reference_image_path: referenceImagePath,
    internal_notes: optionalText(
      source,
      "internal_notes",
      "Notas internas",
      MAX_NOTES_LENGTH
    ),
    customer_visible_note: optionalText(
      source,
      "customer_visible_note",
      "Notas visibles",
      MAX_NOTES_LENGTH
    ),
  };
}

export function calculateQuoteBlindItemAmounts(
  input: Pick<
    QuoteBlindItemInput,
    | "width_cm"
    | "height_cm"
    | "quantity"
    | "price_per_m2_mxn"
    | "billable_m2_override"
  >
): QuoteBlindItemAmounts {
  const calculatedM2PerUnit = round(
    (input.width_cm * input.height_cm) / 10_000,
    4
  );
  const calculatedM2Total = round(
    calculatedM2PerUnit * input.quantity,
    4
  );
  const billableM2 =
    input.billable_m2_override === null
      ? calculatedM2Total
      : round(input.billable_m2_override, 4);
  const lineTotalMxn = round(billableM2 * input.price_per_m2_mxn, 2);

  return {
    calculated_m2_per_unit: calculatedM2PerUnit,
    calculated_m2_total: calculatedM2Total,
    billable_m2: billableM2,
    unit_equipment_price_mxn: round(lineTotalMxn / input.quantity, 2),
    line_total_mxn: lineTotalMxn,
  };
}

export function calculateQuoteBlindTotals(
  items: Array<{ equipment_total: number | null; labor_total?: number | null }>
) {
  const equipmentTotalMxn = round(
    items.reduce(
      (sum, item) => sum + Number(item.equipment_total || 0),
      0
    ),
    2
  );
  const laborTotalMxn = round(
    items.reduce((sum, item) => sum + Number(item.labor_total || 0), 0),
    2
  );
  const subtotalMxn = round(equipmentTotalMxn + laborTotalMxn, 2);
  const ivaMxn = round(subtotalMxn * QUOTE_BLINDS_IVA_RATE, 2);
  const totalMxn = round(subtotalMxn + ivaMxn, 2);

  return {
    equipment_total_mxn: equipmentTotalMxn,
    labor_total_mxn: laborTotalMxn,
    subtotal_mxn: subtotalMxn,
    taxable_base_mxn: subtotalMxn,
    iva_mxn: ivaMxn,
    total_mxn: totalMxn,
  };
}

export function isQuoteBlindsType(value: unknown) {
  return value === QUOTE_BLINDS_TYPE;
}
