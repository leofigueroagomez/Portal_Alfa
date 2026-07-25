export type BlindQuote = {
  id: number;
  created_at: string | null;
  updated_at: string | null;
  quote_number: string | null;
  quote_base_number: string | null;
  quote_group_id: number | null;
  quote_type: "blinds";
  status: string | null;
  version: number;
  is_latest: boolean;
  client_id: number | null;
  client_project_id: number | null;
  currency: string | null;
  notes: string | null;
  equipment_total: number | null;
  labor_total: number | null;
  subtotal_mxn: number | null;
  taxable_base_mxn: number | null;
  iva_mxn: number | null;
  total_mxn: number | null;
  grand_total: number | null;
};

export type BlindItemDetail = {
  quote_item_id: number;
  width_cm: number;
  height_cm: number;
  calculated_m2_per_unit: number;
  blind_type: string;
  collection: string | null;
  color: string | null;
  mechanism: string | null;
  control: string | null;
  price_per_m2_mxn: number;
  billable_m2_override: number | null;
  override_reason: string | null;
  reference_image_path: string | null;
  internal_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type BlindQuoteItem = {
  id: number;
  quote_id: number;
  quote_section_id: number | null;
  quantity: number;
  sort_order: number | null;
  area: string | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  customer_visible_note: string | null;
  unit_equipment_price: number | null;
  equipment_total: number | null;
  labor_total: number | null;
  line_total: number | null;
  blind_detail: BlindItemDetail | null;
};

export type BlindQuoteDetailResponse = {
  quote: BlindQuote;
  sections: Array<{
    id: number;
    name: string | null;
    description: string | null;
    sort_order: number | null;
    equipment_total: number | null;
    labor_total: number | null;
    total: number | null;
  }>;
  items: BlindQuoteItem[];
};

export type ClientOption = {
  id: number;
  name: string | null;
  client_number?: number | null;
};

export type ProjectOption = {
  id: number;
  client_id: number;
  name: string | null;
  project_number?: number | null;
};

export async function readApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | T
    | { error?: string }
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? payload.error
        : null;
    throw new Error(message || "No fue posible completar la operación.");
  }

  return payload as T;
}

export function formatMxn(value: number | null | undefined) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function formatM2(value: number | null | undefined) {
  return `${new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(Number(value || 0))} m²`;
}
