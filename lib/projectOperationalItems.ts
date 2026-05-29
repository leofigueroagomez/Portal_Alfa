import type { SupabaseClient } from "@supabase/supabase-js";

type Quote = {
  id: number;
  exchange_rate: number | null;
};

type QuoteSection = {
  id: number;
  name: string | null;
};

type QuoteItem = {
  id: number;
  quote_id: number;
  quote_section_id: number | null;
  product_id: number | null;
  quantity: number | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  product_image_url: string | null;
};

type Product = {
  id: number;
  cost_price: number | null;
  cost_currency: string | null;
  image_url: string | null;
};

type ExistingOperationalItem = {
  source_quote_item_id: number | null;
};

export type SyncProjectOperationalItemsResult = {
  inserted: number;
  skipped: number;
  approvedQuotes: number;
};

function normalizeCostCurrency(value: string | null | undefined) {
  return value?.toUpperCase() === "MXN" ? "MXN" : "USD";
}

export async function syncProjectOperationalItems(
  supabase: SupabaseClient,
  projectId: number,
  userId?: string | null
): Promise<SyncProjectOperationalItemsResult> {
  const { data: quotes, error: quotesError } = await supabase
    .from("quotes")
    .select("id, exchange_rate")
    .eq("client_project_id", projectId)
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  if (quotesError) throw quotesError;

  const approvedQuotes = (quotes || []) as Quote[];
  const quoteIds = approvedQuotes.map((quote) => quote.id);

  if (quoteIds.length === 0) {
    return { inserted: 0, skipped: 0, approvedQuotes: 0 };
  }

  const [{ data: quoteItems, error: quoteItemsError }, { data: sections, error: sectionsError }] =
    await Promise.all([
      supabase
        .from("quote_items")
        .select(
          "id, quote_id, quote_section_id, product_id, quantity, product_brand, product_model, product_name, product_image_url"
        )
        .in("quote_id", quoteIds),
      supabase
        .from("quote_sections")
        .select("id, name")
        .in("quote_id", quoteIds),
    ]);

  if (quoteItemsError) throw quoteItemsError;
  if (sectionsError) throw sectionsError;

  const items = (quoteItems || []) as QuoteItem[];
  const quoteSections = (sections || []) as QuoteSection[];

  if (items.length === 0) {
    return { inserted: 0, skipped: 0, approvedQuotes: approvedQuotes.length };
  }

  const quoteById = new Map(approvedQuotes.map((quote) => [quote.id, quote]));
  const sectionById = new Map(quoteSections.map((section) => [section.id, section]));
  const productIds = Array.from(
    new Set(items.map((item) => item.product_id).filter(Boolean) as number[])
  );

  const { data: products, error: productsError } = productIds.length
    ? await supabase
        .from("products")
        .select("id, cost_price, cost_currency, image_url")
        .in("id", productIds)
    : { data: [], error: null };

  if (productsError) throw productsError;

  const productById = new Map(
    ((products || []) as Product[]).map((product) => [product.id, product])
  );
  const { data: existingItems, error: existingError } = await supabase
    .from("project_operational_items")
    .select("source_quote_item_id")
    .eq("client_project_id", projectId)
    .in("source_quote_item_id", items.map((item) => item.id));

  if (existingError) throw existingError;

  const existingQuoteItemIds = new Set(
    ((existingItems || []) as ExistingOperationalItem[])
      .map((item) => item.source_quote_item_id)
      .filter(Boolean) as number[]
  );
  const rowsToInsert = items
    .filter((item) => !existingQuoteItemIds.has(item.id))
    .map((item) => {
      const product = item.product_id ? productById.get(item.product_id) : null;
      const quote = quoteById.get(item.quote_id);
      const unitCost = Number(product?.cost_price || 0);

      return {
        client_project_id: projectId,
        source_quote_id: item.quote_id,
        source_quote_item_id: item.id,
        system_name: item.quote_section_id
          ? sectionById.get(item.quote_section_id)?.name || null
          : null,
        product_id: item.product_id,
        product_brand: item.product_brand,
        product_model: item.product_model,
        product_name: item.product_name,
        product_image_url: item.product_image_url || product?.image_url || null,
        quantity: Number(item.quantity || 0),
        original_quantity: Number(item.quantity || 0),
        original_unit_cost: unitCost,
        operational_unit_cost: unitCost,
        cost_currency: normalizeCostCurrency(product?.cost_currency),
        exchange_rate: quote?.exchange_rate || null,
        status: "active",
        change_origin: "quote_seed",
        created_by_user_id: userId || null,
        updated_by_user_id: userId || null,
      };
    });

  if (rowsToInsert.length === 0) {
    return {
      inserted: 0,
      skipped: existingQuoteItemIds.size,
      approvedQuotes: approvedQuotes.length,
    };
  }

  const { error: insertError } = await supabase
    .from("project_operational_items")
    .insert(rowsToInsert);

  if (insertError) throw insertError;

  return {
    inserted: rowsToInsert.length,
    skipped: existingQuoteItemIds.size,
    approvedQuotes: approvedQuotes.length,
  };
}
