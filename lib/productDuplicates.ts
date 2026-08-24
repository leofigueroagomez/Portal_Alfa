import type { SupabaseClient } from "@supabase/supabase-js";

export type DuplicateProductMatch = {
  id: number;
  brand: string | null;
  model: string | null;
  name: string | null;
  sku: string | null;
};

export async function findDuplicateProduct(
  supabase: SupabaseClient,
  params: { brand: string; model: string; sku?: string; excludeId?: number }
): Promise<DuplicateProductMatch | null> {
  const brand = params.brand.trim();
  const model = params.model.trim();
  const sku = params.sku?.trim();

  if (brand && model) {
    let brandModelQuery = supabase
      .from("products")
      .select("id, brand, model, name, sku")
      .eq("is_active", true)
      .ilike("brand", brand)
      .ilike("model", model)
      .limit(1);

    if (params.excludeId) {
      brandModelQuery = brandModelQuery.neq("id", params.excludeId);
    }

    const { data } = await brandModelQuery;
    if (data && data.length > 0) {
      return data[0] as DuplicateProductMatch;
    }
  }

  if (sku) {
    let skuQuery = supabase
      .from("products")
      .select("id, brand, model, name, sku")
      .eq("is_active", true)
      .ilike("sku", sku)
      .limit(1);

    if (params.excludeId) {
      skuQuery = skuQuery.neq("id", params.excludeId);
    }

    const { data } = await skuQuery;
    if (data && data.length > 0) {
      return data[0] as DuplicateProductMatch;
    }
  }

  return null;
}

export function formatDuplicateProductMessage(match: DuplicateProductMatch) {
  return (
    `Ya existe un producto con esa marca/modelo${match.sku ? " o SKU" : ""}: ` +
    `"${match.brand || ""} ${match.model || ""}"${
      match.sku ? ` (SKU ${match.sku})` : ""
    } — ${match.name || "sin nombre"}.\n\n` +
    `Usa ese producto (id ${match.id}) en la cotizacion o edítalo en vez de crear uno duplicado.`
  );
}
