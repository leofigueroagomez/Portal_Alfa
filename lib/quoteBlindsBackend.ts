import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateQuoteBlindItemAmounts,
  calculateQuoteBlindTotals,
  isQuoteBlindImagePathForQuote,
  parseQuoteBlindItemInput,
  QUOTE_BLINDS_TYPE,
  type QuoteBlindItemInput,
} from "@/lib/quoteBlindsContract";

const QUOTE_SELECT =
  "id, created_at, updated_at, quote_number, quote_base_number, quote_group_id, quote_type, status, version, is_latest, client_id, client_project_id, currency, notes, equipment_total, labor_total, subtotal_mxn, taxable_base_mxn, iva_mxn, total_mxn, grand_total";
const ITEM_SELECT =
  "id, quote_id, quote_section_id, quantity, sort_order, area, product_brand, product_model, product_name, customer_visible_note, unit_equipment_price, equipment_total, labor_total, line_total";
const DETAIL_SELECT =
  "quote_item_id, width_cm, height_cm, calculated_m2_per_unit, blind_type, collection, color, mechanism, control, price_per_m2_mxn, billable_m2_override, override_reason, reference_image_path, internal_notes, created_at, updated_at";

type BackendErrorStatus = 400 | 404 | 409 | 500;

export class QuoteBlindsBackendError extends Error {
  status: BackendErrorStatus;

  constructor(message: string, status: BackendErrorStatus = 500) {
    super(message);
    this.name = "QuoteBlindsBackendError";
    this.status = status;
  }
}

type QuoteCreateInput = {
  client_id?: number | null;
  client_project_id?: number | null;
  notes?: string | null;
};

function optionalPositiveInteger(value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new QuoteBlindsBackendError(`${label} debe ser un entero positivo.`, 400);
  }
  return parsed;
}

function optionalNotes(value: unknown) {
  if (value === null || value === undefined) return null;
  const notes = String(value).trim();
  if (!notes) return null;
  if (notes.length > 5000) {
    throw new QuoteBlindsBackendError(
      "Las notas no pueden exceder 5000 caracteres.",
      400
    );
  }
  return notes;
}

export function parseQuoteBlindsCreateInput(input: unknown): QuoteCreateInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new QuoteBlindsBackendError("La cotización es inválida.", 400);
  }

  const source = input as Record<string, unknown>;
  return {
    client_id: optionalPositiveInteger(source.client_id, "Cliente"),
    client_project_id: optionalPositiveInteger(
      source.client_project_id,
      "Proyecto"
    ),
    notes: optionalNotes(source.notes),
  };
}

async function assertProjectMatchesClient(
  supabase: SupabaseClient,
  clientId: number | null | undefined,
  projectId: number | null | undefined
) {
  if (!projectId) return clientId || null;

  const { data: project, error } = await supabase
    .from("client_projects")
    .select("id, client_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw new QuoteBlindsBackendError(
      "No fue posible validar el proyecto de la cotización."
    );
  }
  if (!project) {
    throw new QuoteBlindsBackendError("El proyecto indicado no existe.", 400);
  }
  if (clientId && Number(project.client_id) !== clientId) {
    throw new QuoteBlindsBackendError(
      "El proyecto no pertenece al cliente indicado.",
      400
    );
  }
  return clientId || Number(project.client_id);
}

async function getNextBaseNumber(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("quote_groups")
    .select("base_number")
    .like("base_number", "ALFA-%")
    .order("base_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new QuoteBlindsBackendError(
      "No fue posible generar el folio de cotización."
    );
  }

  const lastNumber = data?.base_number?.match(/^ALFA-(\d+)$/)?.[1];
  return `ALFA-${String((Number(lastNumber) || 0) + 1).padStart(4, "0")}`;
}

async function insertQuoteGroup(
  supabase: SupabaseClient,
  createdBy: string
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const baseNumber = await getNextBaseNumber(supabase);
    const { data, error } = await supabase
      .from("quote_groups")
      .insert({ base_number: baseNumber, created_by: createdBy })
      .select("id, base_number")
      .single();

    if (!error && data) return data;
    if (error?.code !== "23505") {
      throw new QuoteBlindsBackendError(
        "No fue posible crear el grupo de cotización."
      );
    }
  }

  throw new QuoteBlindsBackendError(
    "No fue posible reservar un folio de cotización.",
    409
  );
}

async function getBlindsQuote(supabase: SupabaseClient, quoteId: number) {
  const { data, error } = await supabase
    .from("quotes")
    .select(QUOTE_SELECT)
    .eq("id", quoteId)
    .eq("quote_type", QUOTE_BLINDS_TYPE)
    .maybeSingle();

  if (error) {
    throw new QuoteBlindsBackendError(
      "No fue posible consultar la cotización."
    );
  }
  if (!data) {
    throw new QuoteBlindsBackendError(
      "La cotización de persianas no existe.",
      404
    );
  }
  return data;
}

async function getDefaultSectionId(
  supabase: SupabaseClient,
  quoteId: number
) {
  const { data, error } = await supabase
    .from("quote_sections")
    .select("id")
    .eq("quote_id", quoteId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new QuoteBlindsBackendError(
      "La cotización no tiene una sección operativa válida."
    );
  }
  return Number(data.id);
}

async function recalculateBlindsQuote(
  supabase: SupabaseClient,
  quoteId: number
) {
  await getBlindsQuote(supabase, quoteId);

  const { data: items, error: itemsError } = await supabase
    .from("quote_items")
    .select("equipment_total, labor_total")
    .eq("quote_id", quoteId);

  if (itemsError) {
    throw new QuoteBlindsBackendError(
      "No fue posible recalcular la cotización."
    );
  }

  const totals = calculateQuoteBlindTotals(items || []);
  const sectionId = await getDefaultSectionId(supabase, quoteId);
  const { error: sectionUpdateError } = await supabase
    .from("quote_sections")
    .update({
      equipment_total: totals.equipment_total_mxn,
      labor_total: totals.labor_total_mxn,
      total: totals.subtotal_mxn,
      subtotal_mxn: totals.subtotal_mxn,
    })
    .eq("id", sectionId)
    .eq("quote_id", quoteId);

  if (sectionUpdateError) {
    throw new QuoteBlindsBackendError(
      "No fue posible guardar los totales de la sección."
    );
  }

  const { error: updateError } = await supabase
    .from("quotes")
    .update({
      equipment_total: totals.equipment_total_mxn,
      equipment_total_mxn: totals.equipment_total_mxn,
      labor_total: totals.labor_total_mxn,
      installation_total_mxn: totals.labor_total_mxn,
      subtotal_mxn: totals.subtotal_mxn,
      taxable_base_mxn: totals.taxable_base_mxn,
      iva_mxn: totals.iva_mxn,
      tax_total: totals.iva_mxn,
      total_mxn: totals.total_mxn,
      grand_total: totals.total_mxn,
      grand_total_mxn: totals.total_mxn,
    })
    .eq("id", quoteId)
    .eq("quote_type", QUOTE_BLINDS_TYPE);

  if (updateError) {
    throw new QuoteBlindsBackendError(
      "No fue posible guardar los totales de la cotización."
    );
  }

  return totals;
}

function buildItemPayload(
  input: QuoteBlindItemInput,
  quoteId: number,
  quoteSectionId: number,
  sortOrder: number
) {
  const amounts = calculateQuoteBlindItemAmounts(input);
  return {
    amounts,
    item: {
      quote_id: quoteId,
      quote_section_id: quoteSectionId,
      quantity: input.quantity,
      sale_currency: "MXN",
      unit_equipment_price: amounts.unit_equipment_price_mxn,
      unit_labor_price: 0,
      equipment_total: amounts.line_total_mxn,
      labor_total: 0,
      line_total: amounts.line_total_mxn,
      product_brand: input.brand,
      product_model: input.model,
      product_name: `${input.blind_type} ${input.model}`.trim(),
      area: input.area,
      customer_visible_note: input.customer_visible_note,
      sort_order: sortOrder,
    },
    detail: {
      width_cm: input.width_cm,
      height_cm: input.height_cm,
      blind_type: input.blind_type,
      collection: input.collection,
      color: input.color,
      mechanism: input.mechanism,
      control: input.control,
      price_per_m2_mxn: input.price_per_m2_mxn,
      billable_m2_override: input.billable_m2_override,
      override_reason: input.override_reason,
      reference_image_path: input.reference_image_path,
      internal_notes: input.internal_notes,
    },
  };
}

function assertImageBelongsToQuote(
  referenceImagePath: string | null,
  quoteId: number
) {
  if (
    referenceImagePath &&
    !isQuoteBlindImagePathForQuote(referenceImagePath, quoteId)
  ) {
    throw new QuoteBlindsBackendError(
      `La imagen debe usar el prefijo privado quote-blinds/${quoteId}/.`,
      400
    );
  }
}

export async function createQuoteBlinds(
  supabase: SupabaseClient,
  rawInput: unknown,
  createdBy: string
) {
  const input = parseQuoteBlindsCreateInput(rawInput);
  const clientId = await assertProjectMatchesClient(
    supabase,
    input.client_id,
    input.client_project_id
  );

  const group = await insertQuoteGroup(supabase, createdBy);
  const quoteNumber = `${group.base_number}-V1`;
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .insert({
      quote_group_id: group.id,
      quote_base_number: group.base_number,
      quote_number: quoteNumber,
      quote_type: QUOTE_BLINDS_TYPE,
      status: "draft",
      version: 1,
      is_latest: true,
      currency: "MXN",
      exchange_rate: 1,
      client_id: clientId,
      client_project_id: input.client_project_id,
      notes: input.notes,
      created_by: createdBy,
      equipment_total: 0,
      labor_total: 0,
      tax_total: 0,
      grand_total: 0,
      subtotal_mxn: 0,
      taxable_base_mxn: 0,
      iva_mxn: 0,
      total_mxn: 0,
    })
    .select(QUOTE_SELECT)
    .single();

  if (quoteError || !quote) {
    throw new QuoteBlindsBackendError(
      "No fue posible crear la cotización de persianas."
    );
  }

  const { error: sectionError } = await supabase.from("quote_sections").insert({
    quote_id: quote.id,
    quotes_id: quote.id,
    name: "Persianas",
    description: "Partidas de persianas",
    sort_order: 0,
    equipment_total: 0,
    labor_total: 0,
    total: 0,
  });

  if (sectionError) {
    throw new QuoteBlindsBackendError(
      "La cotización fue creada, pero no fue posible crear su sección."
    );
  }

  return quote;
}

export async function listQuoteBlinds(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("quotes")
    .select(QUOTE_SELECT)
    .eq("quote_type", QUOTE_BLINDS_TYPE)
    .order("created_at", { ascending: false });

  if (error) {
    throw new QuoteBlindsBackendError(
      "No fue posible listar las cotizaciones de persianas."
    );
  }
  return data || [];
}

export async function getQuoteBlindsDetail(
  supabase: SupabaseClient,
  quoteId: number
) {
  const quote = await getBlindsQuote(supabase, quoteId);
  const [{ data: sections, error: sectionsError }, { data: items, error: itemsError }] =
    await Promise.all([
      supabase
        .from("quote_sections")
        .select("id, name, description, sort_order, equipment_total, labor_total, total")
        .eq("quote_id", quoteId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("quote_items")
        .select(ITEM_SELECT)
        .eq("quote_id", quoteId)
        .order("sort_order", { ascending: true }),
    ]);

  if (sectionsError || itemsError) {
    throw new QuoteBlindsBackendError(
      "No fue posible consultar las partidas de la cotización."
    );
  }

  const itemIds = (items || []).map((item) => item.id);
  let details: Record<string, unknown>[] = [];

  if (itemIds.length > 0) {
    const { data, error } = await supabase
      .from("quote_blind_item_details")
      .select(DETAIL_SELECT)
      .in("quote_item_id", itemIds);

    if (error) {
      throw new QuoteBlindsBackendError(
        "No fue posible consultar los detalles de persianas."
      );
    }
    details = data || [];
  }

  const detailByItemId = new Map(
    details.map((detail) => [Number(detail.quote_item_id), detail])
  );

  return {
    quote,
    sections: sections || [],
    items: (items || []).map((item) => ({
      ...item,
      blind_detail: detailByItemId.get(Number(item.id)) || null,
    })),
  };
}

export async function addQuoteBlindItem(
  supabase: SupabaseClient,
  quoteId: number,
  rawInput: unknown
) {
  await getBlindsQuote(supabase, quoteId);
  const input = parseQuoteBlindItemInput(rawInput);
  assertImageBelongsToQuote(input.reference_image_path, quoteId);
  const quoteSectionId = await getDefaultSectionId(supabase, quoteId);

  const { data: lastItem, error: lastItemError } = await supabase
    .from("quote_items")
    .select("sort_order")
    .eq("quote_id", quoteId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastItemError) {
    throw new QuoteBlindsBackendError(
      "No fue posible determinar el orden de la partida."
    );
  }

  const payload = buildItemPayload(
    input,
    quoteId,
    quoteSectionId,
    Number(lastItem?.sort_order ?? -1) + 1
  );
  const { data: item, error: itemError } = await supabase
    .from("quote_items")
    .insert(payload.item)
    .select(ITEM_SELECT)
    .single();

  if (itemError || !item) {
    throw new QuoteBlindsBackendError(
      "No fue posible crear la partida de persiana."
    );
  }

  const { data: detail, error: detailError } = await supabase
    .from("quote_blind_item_details")
    .insert({ quote_item_id: item.id, ...payload.detail })
    .select(DETAIL_SELECT)
    .single();

  if (detailError || !detail) {
    await supabase.from("quote_items").delete().eq("id", item.id);
    throw new QuoteBlindsBackendError(
      "No fue posible guardar el detalle de la persiana."
    );
  }

  const totals = await recalculateBlindsQuote(supabase, quoteId);
  return { item: { ...item, blind_detail: detail }, totals };
}

export async function updateQuoteBlindItem(
  supabase: SupabaseClient,
  quoteId: number,
  itemId: number,
  rawInput: unknown
) {
  await getBlindsQuote(supabase, quoteId);
  const input = parseQuoteBlindItemInput(rawInput);
  assertImageBelongsToQuote(input.reference_image_path, quoteId);
  const { data: existingItem, error: itemReadError } = await supabase
    .from("quote_items")
    .select(ITEM_SELECT)
    .eq("id", itemId)
    .eq("quote_id", quoteId)
    .maybeSingle();
  const { data: existingDetail, error: detailReadError } = await supabase
    .from("quote_blind_item_details")
    .select(DETAIL_SELECT)
    .eq("quote_item_id", itemId)
    .maybeSingle();

  if (itemReadError || detailReadError) {
    throw new QuoteBlindsBackendError(
      "No fue posible consultar la partida de persiana."
    );
  }
  if (!existingItem || !existingDetail) {
    throw new QuoteBlindsBackendError(
      "La partida de persiana no existe.",
      404
    );
  }

  const payload = buildItemPayload(
    input,
    quoteId,
    Number(existingItem.quote_section_id),
    Number(existingItem.sort_order || 0)
  );
  const { data: item, error: itemError } = await supabase
    .from("quote_items")
    .update(payload.item)
    .eq("id", itemId)
    .eq("quote_id", quoteId)
    .select(ITEM_SELECT)
    .single();

  if (itemError || !item) {
    throw new QuoteBlindsBackendError(
      "No fue posible actualizar la partida de persiana."
    );
  }

  const { data: detail, error: detailError } = await supabase
    .from("quote_blind_item_details")
    .update(payload.detail)
    .eq("quote_item_id", itemId)
    .select(DETAIL_SELECT)
    .single();

  if (detailError || !detail) {
    await supabase
      .from("quote_items")
      .update({
        quantity: existingItem.quantity,
        sale_currency: "MXN",
        unit_equipment_price: existingItem.unit_equipment_price,
        unit_labor_price: 0,
        equipment_total: existingItem.equipment_total,
        labor_total: existingItem.labor_total,
        line_total: existingItem.line_total,
        product_brand: existingItem.product_brand,
        product_model: existingItem.product_model,
        product_name: existingItem.product_name,
        area: existingItem.area,
        customer_visible_note: existingItem.customer_visible_note,
        sort_order: existingItem.sort_order,
      })
      .eq("id", itemId);
    throw new QuoteBlindsBackendError(
      "No fue posible actualizar el detalle de la persiana."
    );
  }

  const totals = await recalculateBlindsQuote(supabase, quoteId);
  return { item: { ...item, blind_detail: detail }, totals };
}

export async function deleteQuoteBlindItem(
  supabase: SupabaseClient,
  quoteId: number,
  itemId: number
) {
  await getBlindsQuote(supabase, quoteId);
  const { data: item, error: readError } = await supabase
    .from("quote_items")
    .select("id")
    .eq("id", itemId)
    .eq("quote_id", quoteId)
    .maybeSingle();

  if (readError) {
    throw new QuoteBlindsBackendError(
      "No fue posible consultar la partida de persiana."
    );
  }
  if (!item) {
    throw new QuoteBlindsBackendError(
      "La partida de persiana no existe.",
      404
    );
  }

  const { data: deletedItem, error: deleteError } = await supabase
    .from("quote_items")
    .delete()
    .eq("id", itemId)
    .eq("quote_id", quoteId)
    .select("id")
    .maybeSingle();

  if (deleteError || !deletedItem) {
    throw new QuoteBlindsBackendError(
      "No fue posible eliminar la partida de persiana."
    );
  }

  return recalculateBlindsQuote(supabase, quoteId);
}
