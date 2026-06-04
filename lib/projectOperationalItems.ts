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
  unit_labor_price?: number | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  product_image_url: string | null;
};

type QuoteItemLaborActivity = {
  id: number;
  quote_item_id: number;
  labor_activity_id: number | null;
  name_snapshot: string | null;
  quantity: number | null;
  unit: string | null;
  internal_unit_cost_mxn: number | null;
  sale_unit_price_mxn: number | null;
  internal_total_mxn: number | null;
  sale_total_mxn: number | null;
  notes: string | null;
  sort_order: number | null;
};

type Product = {
  id: number;
  cost_price: number | null;
  cost_currency: string | null;
  image_url: string | null;
  labor_unit_cost?: number | null;
};

type ExistingOperationalItem = {
  id: number;
  source_quote_item_id: number | null;
  status?: string | null;
};

type ManualOperationalItem = {
  id: number;
  quantity: number | null;
  product_id: number | null;
  status: string | null;
};

type OperationalLaborActivityInsert = {
  project_operational_item_id: number;
  source_quote_item_labor_activity_id: number | null;
  labor_activity_id: number | null;
  name_snapshot: string;
  quantity: number;
  unit: string;
  internal_unit_cost_mxn: number;
  sale_unit_price_mxn: number;
  internal_total_mxn: number;
  sale_total_mxn: number;
  status: string;
  notes: string | null;
};

export type SyncProjectOperationalItemsResult = {
  inserted: number;
  skipped: number;
  approvedQuotes: number;
  activitiesInserted: number;
  activitiesSkipped: number;
};

export type SyncAllProjectOperationalItemsResult = {
  projectsScanned: number;
  projectsSynced: number;
  inserted: number;
  skipped: number;
  approvedQuotes: number;
  activitiesInserted: number;
  activitiesSkipped: number;
  errors: { projectId: number; message: string }[];
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
    return {
      inserted: 0,
      skipped: 0,
      approvedQuotes: 0,
      activitiesInserted: 0,
      activitiesSkipped: 0,
    };
  }

  const [{ data: quoteItems, error: quoteItemsError }, { data: sections, error: sectionsError }] =
    await Promise.all([
      supabase
        .from("quote_items")
        .select(
          "id, quote_id, quote_section_id, product_id, quantity, unit_labor_price, product_brand, product_model, product_name, product_image_url"
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
    return {
      inserted: 0,
      skipped: 0,
      approvedQuotes: approvedQuotes.length,
      activitiesInserted: 0,
      activitiesSkipped: 0,
    };
  }

  const quoteById = new Map(approvedQuotes.map((quote) => [quote.id, quote]));
  const sectionById = new Map(quoteSections.map((section) => [section.id, section]));
  const productIds = Array.from(
    new Set(items.map((item) => item.product_id).filter(Boolean) as number[])
  );

  const { data: products, error: productsError } = productIds.length
    ? await supabase
        .from("products")
        .select("id, cost_price, cost_currency, image_url, labor_unit_cost")
        .in("id", productIds)
    : { data: [], error: null };

  if (productsError) throw productsError;

  const productById = new Map(
    ((products || []) as Product[]).map((product) => [product.id, product])
  );

  const { data: projectItemsForApprovedQuotes, error: projectItemsError } =
    await supabase
      .from("project_operational_items")
      .select("id, source_quote_id, source_quote_item_id, status, change_origin")
      .eq("client_project_id", projectId)
      .in("source_quote_id", quoteIds)
      .not("source_quote_item_id", "is", null);

  if (projectItemsError) throw projectItemsError;

  const currentQuoteItemIds = new Set(items.map((item) => item.id));
  const staleOperationalItemIds = (
    (projectItemsForApprovedQuotes || []) as {
      id: number;
      source_quote_item_id: number | null;
      status: string | null;
      change_origin: string | null;
    }[]
  )
    .filter((item) => item.source_quote_item_id)
    .filter((item) => !currentQuoteItemIds.has(item.source_quote_item_id as number))
    .filter((item) => item.change_origin === "quote_seed")
    .filter((item) => !["purchased", "partially_purchased", "delivered"].includes(item.status || ""))
    .map((item) => item.id);

  if (staleOperationalItemIds.length > 0) {
    const { error: staleUpdateError } = await supabase
      .from("project_operational_items")
      .update({
        status: "deleted",
        updated_by_user_id: userId || null,
        updated_at: new Date().toISOString(),
      })
      .in("id", staleOperationalItemIds);

    if (staleUpdateError) throw staleUpdateError;
  }

  const { data: existingItems, error: existingError } = await supabase
    .from("project_operational_items")
    .select("id, source_quote_item_id, status")
    .eq("client_project_id", projectId)
    .in("source_quote_item_id", items.map((item) => item.id));

  if (existingError) throw existingError;

  const existingQuoteItemIds = new Set(
    ((existingItems || []) as ExistingOperationalItem[])
      .filter((item) => item.status !== "deleted")
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

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("project_operational_items")
      .insert(rowsToInsert);

    if (insertError) throw insertError;
  }

  const existingItemsByQuoteItemId = new Map(
    ((existingItems || []) as ExistingOperationalItem[])
      .filter((item) => item.source_quote_item_id)
      .map((item) => [item.source_quote_item_id as number, item])
  );
  const rowsToUpdate = items
    .map((item) => {
      const existing = existingItemsByQuoteItemId.get(item.id);
      if (!existing || existing.status === "deleted") return null;

      const product = item.product_id ? productById.get(item.product_id) : null;
      const quote = quoteById.get(item.quote_id);
      const unitCost = Number(product?.cost_price || 0);

      return {
        id: existing.id,
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
        updated_by_user_id: userId || null,
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean) as {
      id: number;
      system_name: string | null;
      product_id: number | null;
      product_brand: string | null;
      product_model: string | null;
      product_name: string | null;
      product_image_url: string | null;
      quantity: number;
      original_quantity: number;
      original_unit_cost: number;
      operational_unit_cost: number;
      cost_currency: string;
      exchange_rate: number | null;
      updated_by_user_id: string | null;
      updated_at: string;
    }[];

  for (const row of rowsToUpdate) {
    const { id: operationalItemId, ...payload } = row;
    const { error: updateError } = await supabase
      .from("project_operational_items")
      .update(payload)
      .eq("id", operationalItemId);

    if (updateError) throw updateError;
  }

  const { data: operationalItems, error: operationalItemsError } =
    await supabase
      .from("project_operational_items")
      .select("id, source_quote_item_id")
      .eq("client_project_id", projectId)
      .in("source_quote_item_id", items.map((item) => item.id));

  if (operationalItemsError) throw operationalItemsError;

  const operationalItemByQuoteItemId = new Map(
    ((operationalItems || []) as ExistingOperationalItem[])
      .filter((item) => item.source_quote_item_id)
      .map((item) => [item.source_quote_item_id as number, item.id])
  );
  const itemIds = items.map((item) => item.id);
  const { data: quoteLaborActivities, error: quoteLaborActivitiesError } =
    await supabase
      .from("quote_item_labor_activities")
      .select(
        "id, quote_item_id, labor_activity_id, name_snapshot, quantity, unit, internal_unit_cost_mxn, sale_unit_price_mxn, internal_total_mxn, sale_total_mxn, notes, sort_order"
      )
      .in("quote_item_id", itemIds)
      .order("sort_order", { ascending: true });

  if (quoteLaborActivitiesError) throw quoteLaborActivitiesError;

  const sourceLaborActivities = (quoteLaborActivities || []) as QuoteItemLaborActivity[];
  const sourceLaborActivityIds = sourceLaborActivities.map((activity) => activity.id);
  const operationalItemIds = Array.from(operationalItemByQuoteItemId.values());
  const [
    { data: existingSourceActivities, error: existingSourceActivitiesError },
    { data: existingOperationalActivities, error: existingOperationalActivitiesError },
  ] = await Promise.all([
    sourceLaborActivityIds.length
      ? supabase
          .from("project_operational_item_labor_activities")
          .select("source_quote_item_labor_activity_id")
          .in("source_quote_item_labor_activity_id", sourceLaborActivityIds)
      : Promise.resolve({ data: [], error: null }),
    operationalItemIds.length
      ? supabase
          .from("project_operational_item_labor_activities")
          .select("project_operational_item_id, source_quote_item_labor_activity_id, name_snapshot")
          .in("project_operational_item_id", operationalItemIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (existingSourceActivitiesError) throw existingSourceActivitiesError;
  if (existingOperationalActivitiesError) throw existingOperationalActivitiesError;

  const existingSourceActivityIds = new Set(
    ((existingSourceActivities || []) as { source_quote_item_labor_activity_id: number | null }[])
      .map((activity) => activity.source_quote_item_labor_activity_id)
      .filter(Boolean) as number[]
  );
  const existingLegacyActivityItemIds = new Set(
    ((existingOperationalActivities || []) as {
      project_operational_item_id: number;
      source_quote_item_labor_activity_id: number | null;
      name_snapshot: string | null;
    }[])
      .filter(
        (activity) =>
          !activity.source_quote_item_labor_activity_id &&
          activity.name_snapshot === "Mano de obra general"
      )
      .map((activity) => activity.project_operational_item_id)
  );
  const quoteLaborActivityByQuoteItemId = new Map<number, QuoteItemLaborActivity[]>();

  for (const activity of sourceLaborActivities) {
    const current = quoteLaborActivityByQuoteItemId.get(activity.quote_item_id) || [];
    quoteLaborActivityByQuoteItemId.set(activity.quote_item_id, [...current, activity]);
  }

  const activityRowsToInsert = items.reduce<OperationalLaborActivityInsert[]>((rows, item) => {
    const operationalItemId = operationalItemByQuoteItemId.get(item.id);
    if (!operationalItemId) return rows;

    const activities = quoteLaborActivityByQuoteItemId.get(item.id) || [];
    if (activities.length > 0) {
      rows.push(
        ...activities
        .filter((activity) => !existingSourceActivityIds.has(activity.id))
        .map((activity) => ({
          project_operational_item_id: operationalItemId,
          source_quote_item_labor_activity_id: activity.id,
          labor_activity_id: activity.labor_activity_id,
          name_snapshot: activity.name_snapshot || "Actividad",
          quantity: Number(activity.quantity || 0),
          unit: activity.unit || "pieza",
          internal_unit_cost_mxn: Number(activity.internal_unit_cost_mxn || 0),
          sale_unit_price_mxn: Number(activity.sale_unit_price_mxn || 0),
          internal_total_mxn: Number(activity.internal_total_mxn || 0),
          sale_total_mxn: Number(activity.sale_total_mxn || 0),
          status: "pending",
          notes: activity.notes,
        }))
      );
      return rows;
    }

    const unitLaborPrice = Number(item.unit_labor_price || 0);
    if (unitLaborPrice <= 0 || existingLegacyActivityItemIds.has(operationalItemId)) {
      return rows;
    }

    const quantity = Number(item.quantity || 1);
    const product = item.product_id ? productById.get(item.product_id) : null;
    const internalUnitCost = Number(product?.labor_unit_cost || 0);
    rows.push({
      project_operational_item_id: operationalItemId,
      source_quote_item_labor_activity_id: null,
      labor_activity_id: null,
      name_snapshot: "Mano de obra general",
      quantity,
      unit: "pieza",
      internal_unit_cost_mxn: internalUnitCost,
      sale_unit_price_mxn: unitLaborPrice,
      internal_total_mxn: quantity * internalUnitCost,
      sale_total_mxn: quantity * unitLaborPrice,
      status: "pending",
      notes: null,
    });

    return rows;
  }, []);

  if (activityRowsToInsert.length > 0) {
    const { error: insertActivitiesError } = await supabase
      .from("project_operational_item_labor_activities")
      .insert(activityRowsToInsert);

    if (insertActivitiesError) throw insertActivitiesError;
  }

  const { data: manualOperationalItems, error: manualItemsError } =
    await supabase
      .from("project_operational_items")
      .select("id, quantity, product_id, status")
      .eq("client_project_id", projectId)
      .is("source_quote_item_id", null)
      .neq("status", "deleted");

  if (manualItemsError) throw manualItemsError;

  const manualItems = (manualOperationalItems || []) as ManualOperationalItem[];
  const manualItemIds = manualItems.map((item) => item.id);
  const { data: existingManualActivities, error: existingManualActivitiesError } =
    manualItemIds.length
      ? await supabase
          .from("project_operational_item_labor_activities")
          .select("project_operational_item_id")
          .in("project_operational_item_id", manualItemIds)
          .neq("status", "cancelled")
      : { data: [], error: null };

  if (existingManualActivitiesError) throw existingManualActivitiesError;

  const manualItemIdsWithActivities = new Set(
    ((existingManualActivities || []) as { project_operational_item_id: number | null }[])
      .map((activity) => activity.project_operational_item_id)
      .filter(Boolean) as number[]
  );
  const manualProductIds = Array.from(
    new Set(manualItems.map((item) => item.product_id).filter(Boolean) as number[])
  );
  const { data: manualProducts, error: manualProductsError } = manualProductIds.length
    ? await supabase
        .from("products")
        .select("id, labor_unit_cost, labor_unit_sale_price")
        .in("id", manualProductIds)
    : { data: [], error: null };

  if (manualProductsError) throw manualProductsError;

  const manualProductById = new Map(
    ((manualProducts || []) as (Product & { labor_unit_sale_price?: number | null })[]).map(
      (product) => [product.id, product]
    )
  );
  const manualActivityRows = manualItems
    .filter((item) => !manualItemIdsWithActivities.has(item.id))
    .filter((item) => Number(item.quantity || 0) > 0)
    .map((item) => {
      const product = item.product_id ? manualProductById.get(item.product_id) : null;
      const quantity = Number(item.quantity || 0);
      const internalUnitCost = Number(product?.labor_unit_cost || 0);
      const saleUnitPrice = Number(product?.labor_unit_sale_price || 0);

      return {
        project_operational_item_id: item.id,
        source_quote_item_labor_activity_id: null,
        labor_activity_id: null,
        name_snapshot: "Mano de obra general",
        quantity,
        unit: "pieza",
        internal_unit_cost_mxn: internalUnitCost,
        sale_unit_price_mxn: saleUnitPrice,
        internal_total_mxn: quantity * internalUnitCost,
        sale_total_mxn: quantity * saleUnitPrice,
        status: "pending",
        notes: "Generada automaticamente para traduccion tecnica",
      };
    });

  if (manualActivityRows.length > 0) {
    const { error: insertManualActivitiesError } = await supabase
      .from("project_operational_item_labor_activities")
      .insert(manualActivityRows);

    if (insertManualActivitiesError) throw insertManualActivitiesError;
  }

  return {
    inserted: rowsToInsert.length,
    skipped: existingQuoteItemIds.size,
    approvedQuotes: approvedQuotes.length,
    activitiesInserted: activityRowsToInsert.length + manualActivityRows.length,
    activitiesSkipped:
      existingSourceActivityIds.size +
      existingLegacyActivityItemIds.size +
      manualItemIdsWithActivities.size,
  };
}

function getErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return JSON.stringify(error);
}

export async function syncAllApprovedProjectOperationalItems(
  supabase: SupabaseClient,
  userId?: string | null
): Promise<SyncAllProjectOperationalItemsResult> {
  const [
    { data: approvedQuotes, error: quotesError },
    { data: wonProjects, error: projectsError },
  ] = await Promise.all([
    supabase
      .from("quotes")
      .select("client_project_id")
      .eq("status", "approved")
      .not("client_project_id", "is", null),
    supabase
      .from("client_projects")
      .select("id")
      .in("sales_stage", ["won", "installed", "closed"]),
  ]);

  if (quotesError) throw quotesError;
  if (projectsError) throw projectsError;

  const quoteProjectIds = ((approvedQuotes || []) as {
    client_project_id: number | null;
  }[])
    .map((quote) => quote.client_project_id)
    .filter(Boolean) as number[];
  const wonProjectIds = ((wonProjects || []) as { id: number }[]).map(
    (project) => project.id
  );
  const projectIds = Array.from(new Set([...quoteProjectIds, ...wonProjectIds]));
  const summary: SyncAllProjectOperationalItemsResult = {
    projectsScanned: projectIds.length,
    projectsSynced: 0,
    inserted: 0,
    skipped: 0,
    approvedQuotes: 0,
    activitiesInserted: 0,
    activitiesSkipped: 0,
    errors: [],
  };

  for (const projectId of projectIds) {
    try {
      const result = await syncProjectOperationalItems(supabase, projectId, userId);
      summary.projectsSynced += 1;
      summary.inserted += result.inserted;
      summary.skipped += result.skipped;
      summary.approvedQuotes += result.approvedQuotes;
      summary.activitiesInserted += result.activitiesInserted;
      summary.activitiesSkipped += result.activitiesSkipped;
    } catch (error) {
      summary.errors.push({ projectId, message: getErrorMessage(error) });
    }
  }

  return summary;
}
