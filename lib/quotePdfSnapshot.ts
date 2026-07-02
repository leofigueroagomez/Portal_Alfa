import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingDiagnosticContextSchema } from "@/lib/quoteDiagnosticContext";

type NumericLike = number | string | null | undefined;

export type QuotePdfSnapshot = {
  quote: {
    id: number;
    quoteNumber: string | null;
    status: string | null;
    currency: string | null;
    createdAt: string | null;
    notes: string | null;
    validityText: string | null;
  };
  client: {
    name: string | null;
    companyName: string | null;
  };
  project: {
    name: string | null;
  };
  exchangeRate: {
    value: number;
    source: string | null;
    date: string | null;
  };
  totals: {
    equipmentTotalUsd: number;
    laborTotalMxn: number;
    subtotalMxn: number;
    taxableBaseMxn: number;
    ivaMxn: number;
    totalMxn: number;
    grandTotalMxn: number;
    discountMxn: number;
    partnerEquipmentDiscountMxn: number;
    partnerLaborDiscountMxn: number;
    partnerTotalDiscountMxn: number;
    travelFuelMxn: number;
    travelTollsMxn: number;
    travelFoodMxn: number;
    travelTotalMxn: number;
  };
  sections: QuotePdfSection[];
  diagnosticContext: {
    enabled: boolean;
    blocks: QuotePdfDiagnosticBlock[];
  };
  terms: {
    payment100Equipment: boolean;
    laborPaymentMode: string;
    payment100Advance: boolean;
    isLocalGuadalajara: boolean;
    includesTravelExpenses: boolean;
    includesConduit: boolean;
    includesCabling: boolean;
  };
};

export type QuotePdfDiagnosticBlock = {
  id: number;
  title: string | null;
  text: string | null;
  imageUrl: string | null;
  image: QuotePdfItemImage;
  sortOrder: number | null;
};

export type QuotePdfSection = {
  id: number;
  name: string | null;
  sortOrder: number | null;
  equipmentTotalUsd: number;
  laborTotalMxn: number;
  totalMxn: number;
  items: QuotePdfItem[];
};

export type QuotePdfItem = {
  id: number;
  productId: number | null;
  quantity: number;
  saleCurrency: string | null;
  unitEquipmentPrice: number;
  unitEquipmentPriceUsd: number;
  equipmentTotalUsd: number;
  unitLaborPriceMxn: number;
  laborTotalMxn: number;
  lineTotalMxn: number;
  productBrand: string | null;
  productModel: string | null;
  productName: string | null;
  productImageUrl: string | null;
  productImage: QuotePdfItemImage;
  sortOrder: number | null;
  laborActivities: QuotePdfLaborActivity[];
};

export type QuotePdfItemImage = {
  src: string | null;
  sourceUrl: string | null;
  status: "embedded" | "remote" | "missing" | "failed";
  alt: string | null;
};

export type QuotePdfLaborActivity = {
  id: number;
  name: string | null;
  quantity: number;
  unit: string | null;
  saleUnitPriceMxn: number;
  saleTotalMxn: number;
  assignedRole: string | null;
  notes: string | null;
  sortOrder: number | null;
};

type QuoteRow = {
  id: number;
  quote_number: string | null;
  status: string | null;
  currency: string | null;
  client_id: number | null;
  client_project_id: number | null;
  equipment_total: NumericLike;
  labor_total: NumericLike;
  grand_total: NumericLike;
  discount_amount_mxn?: NumericLike;
  partner_equipment_discount_mxn?: NumericLike;
  partner_labor_discount_mxn?: NumericLike;
  partner_total_discount_mxn?: NumericLike;
  subtotal_mxn?: NumericLike;
  taxable_base_mxn?: NumericLike;
  iva_mxn?: NumericLike;
  total_mxn?: NumericLike;
  exchange_rate: NumericLike;
  exchange_rate_source: string | null;
  exchange_rate_date: string | null;
  includes_travel_expenses_detail?: boolean | null;
  travel_fuel_mxn?: NumericLike;
  travel_tolls_mxn?: NumericLike;
  travel_food_mxn?: NumericLike;
  travel_total_mxn?: NumericLike;
  notes?: string | null;
  include_diagnostic_context?: boolean | null;
  created_at: string | null;
};

type ClientRow = {
  name: string | null;
  company_name: string | null;
};

type ProjectRow = {
  name: string | null;
};

type SectionRow = {
  id: number;
  name: string | null;
  sort_order: number | null;
  equipment_total: NumericLike;
  labor_total: NumericLike;
  total: NumericLike;
};

type ItemRow = {
  id: number;
  quote_section_id: number;
  product_id: number | null;
  quantity: NumericLike;
  sale_currency: string | null;
  unit_equipment_price: NumericLike;
  unit_equipment_price_usd?: NumericLike;
  equipment_total?: NumericLike;
  equipment_total_usd?: NumericLike;
  unit_labor_price: NumericLike;
  labor_total?: NumericLike;
  line_total: NumericLike;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  product_image_url: string | null;
  sort_order: number | null;
};

type ProductImageRow = {
  id: number;
  image_url: string | null;
};

type LaborActivityRow = {
  id: number;
  quote_item_id: number;
  name_snapshot: string | null;
  quantity: NumericLike;
  unit: string | null;
  sale_unit_price_mxn: NumericLike;
  sale_total_mxn: NumericLike;
  assigned_role: string | null;
  notes: string | null;
  sort_order: number | null;
};

type TermsRow = {
  payment_100_equipment: boolean | null;
  labor_payment_mode: string | null;
  payment_100_advance: boolean | null;
  is_local_guadalajara: boolean | null;
  includes_travel_expenses: boolean | null;
  includes_conduit: boolean | null;
  includes_cabling: boolean | null;
};

type DiagnosticBlockRow = {
  id: number;
  title: string | null;
  text: string | null;
  image_url: string | null;
  sort_order: number | null;
};

const defaultTerms = {
  payment100Equipment: true,
  laborPaymentMode: "50_50",
  payment100Advance: false,
  isLocalGuadalajara: true,
  includesTravelExpenses: false,
  includesConduit: false,
  includesCabling: false,
};

function toNumber(value: NumericLike) {
  return Number(value || 0);
}

function getEquipmentUnitPriceUsd(item: ItemRow, exchangeRate: number) {
  if (item.unit_equipment_price_usd != null) {
    return toNumber(item.unit_equipment_price_usd);
  }

  if ((item.sale_currency || "USD").toUpperCase() === "MXN") {
    return exchangeRate > 0 ? toNumber(item.unit_equipment_price) / exchangeRate : 0;
  }

  return toNumber(item.unit_equipment_price);
}

function bySortOrder<T extends { sortOrder: number | null }>(a: T, b: T) {
  return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
}

function getPublicProductImageUrl(supabase: SupabaseClient, imageUrl: string | null) {
  if (!imageUrl) return null;
  if (/^data:image\//i.test(imageUrl)) return imageUrl;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  const { data } = supabase.storage.from("product-images").getPublicUrl(imageUrl);
  return data.publicUrl || null;
}

function isPublicFetchableUrl(value: string) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return false;

    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "::1" ||
      host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.")
    ) {
      return false;
    }

    const match172 = host.match(/^172\.(\d+)\./);
    if (match172) {
      const secondOctet = Number(match172[1]);
      if (secondOctet >= 16 && secondOctet <= 31) return false;
    }

    return true;
  } catch {
    return false;
  }
}

async function fetchImageAsDataUrl(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6_000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) return null;

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > 3 * 1024 * 1024) return null;

    return `data:${contentType};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveQuoteItemImage(
  supabase: SupabaseClient,
  imageUrl: string | null,
  alt: string | null
): Promise<QuotePdfItemImage> {
  const sourceUrl = getPublicProductImageUrl(supabase, imageUrl);
  if (!sourceUrl) {
    return { src: null, sourceUrl: null, status: "missing", alt };
  }

  if (/^data:image\//i.test(sourceUrl)) {
    return { src: sourceUrl, sourceUrl, status: "embedded", alt };
  }

  if (!isPublicFetchableUrl(sourceUrl)) {
    return { src: null, sourceUrl, status: "failed", alt };
  }

  const dataUrl = await fetchImageAsDataUrl(sourceUrl);
  if (dataUrl) {
    return { src: dataUrl, sourceUrl, status: "embedded", alt };
  }

  return { src: sourceUrl, sourceUrl, status: "remote", alt };
}

async function resolveDiagnosticImage(
  imageUrl: string | null,
  alt: string | null
): Promise<QuotePdfItemImage> {
  if (!imageUrl) {
    return { src: null, sourceUrl: null, status: "missing", alt };
  }

  if (/^data:image\//i.test(imageUrl)) {
    return { src: imageUrl, sourceUrl: imageUrl, status: "embedded", alt };
  }

  if (!isPublicFetchableUrl(imageUrl)) {
    return { src: null, sourceUrl: imageUrl, status: "failed", alt };
  }

  const dataUrl = await fetchImageAsDataUrl(imageUrl);
  if (dataUrl) {
    return { src: dataUrl, sourceUrl: imageUrl, status: "embedded", alt };
  }

  return { src: imageUrl, sourceUrl: imageUrl, status: "remote", alt };
}

async function mapWithConcurrency<T, R>(
  values: T[],
  limit: number,
  mapper: (value: T) => Promise<R>
) {
  const results: R[] = [];

  for (let index = 0; index < values.length; index += limit) {
    const chunk = values.slice(index, index + limit);
    results.push(...(await Promise.all(chunk.map(mapper))));
  }

  return results;
}

export async function getQuotePdfSnapshot(
  supabase: SupabaseClient,
  quoteId: number
): Promise<QuotePdfSnapshot> {
  let { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select(
      "id, quote_number, status, currency, client_id, client_project_id, equipment_total, labor_total, grand_total, discount_amount_mxn, partner_equipment_discount_mxn, partner_labor_discount_mxn, partner_total_discount_mxn, subtotal_mxn, taxable_base_mxn, iva_mxn, total_mxn, exchange_rate, exchange_rate_source, exchange_rate_date, includes_travel_expenses_detail, travel_fuel_mxn, travel_tolls_mxn, travel_food_mxn, travel_total_mxn, notes, include_diagnostic_context, created_at"
    )
    .eq("id", quoteId)
    .maybeSingle<QuoteRow>();

  if (quoteError && isMissingDiagnosticContextSchema(quoteError)) {
    const fallback = await supabase
      .from("quotes")
      .select(
        "id, quote_number, status, currency, client_id, client_project_id, equipment_total, labor_total, grand_total, discount_amount_mxn, partner_equipment_discount_mxn, partner_labor_discount_mxn, partner_total_discount_mxn, subtotal_mxn, taxable_base_mxn, iva_mxn, total_mxn, exchange_rate, exchange_rate_source, exchange_rate_date, includes_travel_expenses_detail, travel_fuel_mxn, travel_tolls_mxn, travel_food_mxn, travel_total_mxn, notes, created_at"
      )
      .eq("id", quoteId)
      .maybeSingle<QuoteRow>();

    quote = fallback.data;
    quoteError = fallback.error;
  }

  if (quoteError) throw quoteError;
  if (!quote) throw new Error("Cotizacion no encontrada.");

  const [
    { data: client },
    { data: project },
    { data: sections },
    { data: items },
    { data: terms },
    diagnosticBlocksResult,
  ] = await Promise.all([
    quote.client_id
      ? supabase
          .from("clients")
          .select("name, company_name")
          .eq("id", quote.client_id)
          .maybeSingle<ClientRow>()
      : Promise.resolve({ data: null }),
    quote.client_project_id
      ? supabase
          .from("client_projects")
          .select("name")
          .eq("id", quote.client_project_id)
          .maybeSingle<ProjectRow>()
      : Promise.resolve({ data: null }),
    supabase
      .from("quote_sections")
      .select("id, name, sort_order, equipment_total, labor_total, total")
      .eq("quote_id", quoteId)
      .order("sort_order", { ascending: true })
      .returns<SectionRow[]>(),
    supabase
      .from("quote_items")
      .select(
        "id, quote_section_id, product_id, quantity, sale_currency, unit_equipment_price, unit_equipment_price_usd, equipment_total, equipment_total_usd, unit_labor_price, labor_total, line_total, product_brand, product_model, product_name, product_image_url, sort_order"
      )
      .eq("quote_id", quoteId)
      .order("sort_order", { ascending: true })
      .returns<ItemRow[]>(),
    supabase
      .from("quote_terms_settings")
      .select(
        "payment_100_equipment, labor_payment_mode, payment_100_advance, is_local_guadalajara, includes_travel_expenses, includes_conduit, includes_cabling"
      )
      .eq("quote_id", quoteId)
      .maybeSingle<TermsRow>(),
    supabase
      .from("quote_diagnostic_blocks")
      .select("id, title, text, image_url, sort_order")
      .eq("quote_id", quoteId)
      .order("sort_order", { ascending: true })
      .returns<DiagnosticBlockRow[]>(),
  ]);

  if (
    diagnosticBlocksResult.error &&
    !isMissingDiagnosticContextSchema(diagnosticBlocksResult.error)
  ) {
    throw diagnosticBlocksResult.error;
  }

  const diagnosticBlocks = diagnosticBlocksResult.error
    ? []
    : diagnosticBlocksResult.data || [];

  const quoteItems = items || [];
  const productIds = Array.from(
    new Set(quoteItems.map((item) => item.product_id).filter(Boolean) as number[])
  );
  const { data: products } = productIds.length
    ? await supabase
        .from("products")
        .select("id, image_url")
        .in("id", productIds)
        .returns<ProductImageRow[]>()
    : { data: [] };
  const imageUrlByProductId = new Map(
    (products || []).map((product) => [product.id, product.image_url])
  );
  const itemIds = quoteItems.map((item) => item.id);
  const { data: laborActivities } = itemIds.length
    ? await supabase
        .from("quote_item_labor_activities")
        .select(
          "id, quote_item_id, name_snapshot, quantity, unit, sale_unit_price_mxn, sale_total_mxn, assigned_role, notes, sort_order"
        )
        .in("quote_item_id", itemIds)
        .order("sort_order", { ascending: true })
        .returns<LaborActivityRow[]>()
    : { data: [] };

  const exchangeRate = toNumber(quote.exchange_rate) || 1;
  const laborByItemId = new Map<number, QuotePdfLaborActivity[]>();
  for (const activity of laborActivities || []) {
    const current = laborByItemId.get(activity.quote_item_id) || [];
    current.push({
      id: activity.id,
      name: activity.name_snapshot,
      quantity: toNumber(activity.quantity),
      unit: activity.unit,
      saleUnitPriceMxn: toNumber(activity.sale_unit_price_mxn),
      saleTotalMxn: toNumber(activity.sale_total_mxn),
      assignedRole: activity.assigned_role,
      notes: activity.notes,
      sortOrder: activity.sort_order,
    });
    laborByItemId.set(activity.quote_item_id, current.sort(bySortOrder));
  }

  const itemsBySectionId = new Map<number, QuotePdfItem[]>();
  const snapshotItems = await mapWithConcurrency(quoteItems, 6, async (item) => {
    const quantity = toNumber(item.quantity);
    const unitEquipmentPriceUsd = getEquipmentUnitPriceUsd(item, exchangeRate);
    const equipmentTotalUsd =
      toNumber(item.equipment_total_usd) ||
      toNumber(item.equipment_total) ||
      unitEquipmentPriceUsd * quantity;
    const unitLaborPriceMxn = toNumber(item.unit_labor_price);
    const laborTotalMxn = toNumber(item.labor_total) || unitLaborPriceMxn * quantity;
    const lineTotalMxn =
      toNumber(item.line_total) || equipmentTotalUsd * exchangeRate + laborTotalMxn;
    const description = [item.product_brand, item.product_model, item.product_name]
      .filter(Boolean)
      .join(" ");
    const imageUrl = item.product_image_url || imageUrlByProductId.get(item.product_id || 0) || null;

    return {
      id: item.id,
      productId: item.product_id,
      quantity,
      saleCurrency: item.sale_currency,
      unitEquipmentPrice: toNumber(item.unit_equipment_price),
      unitEquipmentPriceUsd,
      equipmentTotalUsd,
      unitLaborPriceMxn,
      laborTotalMxn,
      lineTotalMxn,
      productBrand: item.product_brand,
      productModel: item.product_model,
      productName: item.product_name,
      productImageUrl: imageUrl,
      productImage: await resolveQuoteItemImage(supabase, imageUrl, description || null),
      sortOrder: item.sort_order,
      laborActivities: laborByItemId.get(item.id) || [],
      quoteSectionId: item.quote_section_id,
    };
  });

  for (const item of snapshotItems) {
    const current = itemsBySectionId.get(item.quoteSectionId) || [];
    current.push({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      saleCurrency: item.saleCurrency,
      unitEquipmentPrice: item.unitEquipmentPrice,
      unitEquipmentPriceUsd: item.unitEquipmentPriceUsd,
      equipmentTotalUsd: item.equipmentTotalUsd,
      unitLaborPriceMxn: item.unitLaborPriceMxn,
      laborTotalMxn: item.laborTotalMxn,
      lineTotalMxn: item.lineTotalMxn,
      productBrand: item.productBrand,
      productModel: item.productModel,
      productName: item.productName,
      productImageUrl: item.productImageUrl,
      productImage: item.productImage,
      sortOrder: item.sortOrder,
      laborActivities: item.laborActivities,
    });
    itemsBySectionId.set(item.quoteSectionId, current.sort(bySortOrder));
  }

  const snapshotSections = (sections || []).map((section) => {
    const sectionItems = itemsBySectionId.get(section.id) || [];
    const equipmentTotalUsd =
      toNumber(section.equipment_total) ||
      sectionItems.reduce((sum, item) => sum + item.equipmentTotalUsd, 0);
    const laborTotalMxn =
      toNumber(section.labor_total) ||
      sectionItems.reduce((sum, item) => sum + item.laborTotalMxn, 0);
    const totalMxn =
      toNumber(section.total) || equipmentTotalUsd * exchangeRate + laborTotalMxn;

    return {
      id: section.id,
      name: section.name,
      sortOrder: section.sort_order,
      equipmentTotalUsd,
      laborTotalMxn,
      totalMxn,
      items: sectionItems,
    };
  });

  const equipmentTotalUsd =
    toNumber(quote.equipment_total) ||
    snapshotSections.reduce((sum, section) => sum + section.equipmentTotalUsd, 0);
  const laborTotalMxn =
    toNumber(quote.labor_total) ||
    snapshotSections.reduce((sum, section) => sum + section.laborTotalMxn, 0);
  const subtotalMxn =
    toNumber(quote.subtotal_mxn) || equipmentTotalUsd * exchangeRate + laborTotalMxn;
  const discountMxn = toNumber(quote.discount_amount_mxn);
  const partnerEquipmentDiscountMxn = toNumber(quote.partner_equipment_discount_mxn);
  const partnerLaborDiscountMxn = toNumber(quote.partner_labor_discount_mxn);
  const partnerTotalDiscountMxn =
    toNumber(quote.partner_total_discount_mxn) ||
    partnerEquipmentDiscountMxn + partnerLaborDiscountMxn;
  const taxableBaseMxn =
    toNumber(quote.taxable_base_mxn) ||
    subtotalMxn - partnerTotalDiscountMxn - discountMxn;
  const ivaMxn = toNumber(quote.iva_mxn) || taxableBaseMxn * 0.16;
  const totalMxn =
    toNumber(quote.total_mxn) || toNumber(quote.grand_total) || taxableBaseMxn + ivaMxn;
  const snapshotDiagnosticBlocks = await mapWithConcurrency(
    (diagnosticBlocks || []).filter(
      (block) =>
        Boolean(block.title?.trim()) ||
        Boolean(block.text?.trim()) ||
        Boolean(block.image_url?.trim())
    ),
    4,
    async (block) => ({
      id: block.id,
      title: block.title?.trim() || null,
      text: block.text?.trim() || null,
      imageUrl: block.image_url?.trim() || null,
      image: await resolveDiagnosticImage(
        block.image_url?.trim() || null,
        block.title?.trim() || "Contexto y Diagnostico"
      ),
      sortOrder: block.sort_order,
    })
  );

  return {
    quote: {
      id: quote.id,
      quoteNumber: quote.quote_number,
      status: quote.status,
      currency: quote.currency,
      createdAt: quote.created_at,
      notes: quote.notes || null,
      validityText: null,
    },
    client: {
      name: client?.name || null,
      companyName: client?.company_name || null,
    },
    project: {
      name: project?.name || null,
    },
    exchangeRate: {
      value: exchangeRate,
      source: quote.exchange_rate_source,
      date: quote.exchange_rate_date,
    },
    totals: {
      equipmentTotalUsd,
      laborTotalMxn,
      subtotalMxn,
      taxableBaseMxn,
      ivaMxn,
      totalMxn,
      grandTotalMxn: toNumber(quote.grand_total) || totalMxn,
      discountMxn,
      partnerEquipmentDiscountMxn,
      partnerLaborDiscountMxn,
      partnerTotalDiscountMxn,
      travelFuelMxn: toNumber(quote.travel_fuel_mxn),
      travelTollsMxn: toNumber(quote.travel_tolls_mxn),
      travelFoodMxn: toNumber(quote.travel_food_mxn),
      travelTotalMxn:
        toNumber(quote.travel_total_mxn) ||
        toNumber(quote.travel_fuel_mxn) +
          toNumber(quote.travel_tolls_mxn) +
          toNumber(quote.travel_food_mxn),
    },
    sections: snapshotSections.sort(bySortOrder),
    diagnosticContext: {
      enabled: Boolean(quote.include_diagnostic_context),
      blocks: snapshotDiagnosticBlocks.sort(bySortOrder),
    },
    terms: {
      payment100Equipment:
        terms?.payment_100_equipment ?? defaultTerms.payment100Equipment,
      laborPaymentMode: terms?.labor_payment_mode || defaultTerms.laborPaymentMode,
      payment100Advance: terms?.payment_100_advance ?? defaultTerms.payment100Advance,
      isLocalGuadalajara:
        terms?.is_local_guadalajara ?? defaultTerms.isLocalGuadalajara,
      includesTravelExpenses:
        terms?.includes_travel_expenses ?? defaultTerms.includesTravelExpenses,
      includesConduit: terms?.includes_conduit ?? defaultTerms.includesConduit,
      includesCabling: terms?.includes_cabling ?? defaultTerms.includesCabling,
    },
  };
}
