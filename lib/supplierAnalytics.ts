import type { SupabaseClient } from "@supabase/supabase-js";

export type SupplierWithStats = {
  id: number;
  name: string;
  legal_business_name: string | null;
  rfc: string | null;
  account_number: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_position: string | null;
  website_url: string | null;
  credit_days: number;
  credit_limit_mxn: number | null;
  discount_terms_notes: string | null;
  address: string | null;
  brands_distributed: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  
  // Métricas calculadas para negociación
  products_count: number;
  quoted_amount_ytd_usd: number;
  quoted_amount_ytd_mxn: number;
  purchased_amount_ytd_usd: number;
  purchased_amount_ytd_mxn: number;
  quotes_count_ytd: number;
  approved_projects_count_ytd: number;
};

export async function getSuppliersWithAnalytics(
  supabase: SupabaseClient,
  year: number = new Date().getFullYear()
): Promise<{
  suppliers: SupplierWithStats[];
  summary: {
    totalSuppliers: number;
    activeSuppliers: number;
    totalQuotedYtdMxn: number;
    totalPurchasedYtdMxn: number;
    topSupplierName: string | null;
  };
}> {
  // 1. Obtener todos los proveedores
  const { data: suppliersData, error: suppliersError } = await supabase
    .from("suppliers")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (suppliersError || !suppliersData) {
    console.error("Error cargando proveedores:", suppliersError);
    return {
      suppliers: [],
      summary: {
        totalSuppliers: 0,
        activeSuppliers: 0,
        totalQuotedYtdMxn: 0,
        totalPurchasedYtdMxn: 0,
        topSupplierName: null,
      },
    };
  }

  // 2. Obtener productos con su supplier_id
  const { data: productsData } = await supabase
    .from("products")
    .select("id, name, brand, supplier_id, supplier");

  const productSupplierMap = new Map<number, number>();
  const supplierProductCountMap = new Map<number, number>();

  for (const p of productsData || []) {
    if (p.supplier_id) {
      productSupplierMap.set(p.id, p.supplier_id);
      supplierProductCountMap.set(
        p.supplier_id,
        (supplierProductCountMap.get(p.supplier_id) || 0) + 1
      );
    }
  }

  // 3. Obtener cotizaciones del año actual
  const startOfYear = `${year}-01-01T00:00:00.000Z`;
  const endOfYear = `${year}-12-31T23:59:59.999Z`;

  const { data: quotesData } = await supabase
    .from("quotes")
    .select("id, status, exchange_rate, created_at")
    .gte("created_at", startOfYear)
    .lte("created_at", endOfYear);

  const quoteMap = new Map<
    number,
    { status: string; exchangeRate: number }
  >();
  for (const q of quotesData || []) {
    quoteMap.set(q.id, {
      status: q.status || "draft",
      exchangeRate: Number(q.exchange_rate) || 17.5,
    });
  }

  // 4. Obtener partidas de cotización del año
  const quoteIds = Array.from(quoteMap.keys());
  let quoteItems: Array<{
    quote_id: number;
    product_id: number | null;
    quantity: number;
    unit_equipment_price: number | null;
    sale_currency: string | null;
    line_total: number | null;
    product_brand: string | null;
  }> = [];

  if (quoteIds.length > 0) {
    const { data: itemsData } = await supabase
      .from("quote_items")
      .select("quote_id, product_id, quantity, unit_equipment_price, sale_currency, line_total, product_brand")
      .in("quote_id", quoteIds);

    quoteItems = (itemsData || []) as typeof quoteItems;
  }

  // 5. Mapear compras y cotizaciones por proveedor
  const supplierQuotedUsd = new Map<number, number>();
  const supplierQuotedMxn = new Map<number, number>();
  const supplierPurchasedUsd = new Map<number, number>();
  const supplierPurchasedMxn = new Map<number, number>();
  const supplierQuotesSet = new Map<number, Set<number>>();
  const supplierApprovedQuotesSet = new Map<number, Set<number>>();

  for (const item of quoteItems) {
    if (!item.product_id) continue;
    const supplierId = productSupplierMap.get(item.product_id);
    if (!supplierId) continue;

    const quoteInfo = quoteMap.get(item.quote_id);
    if (!quoteInfo) continue;

    const qty = Number(item.quantity || 0);
    const unitPrice = Number(item.unit_equipment_price || 0);
    const currency = (item.sale_currency || "USD").toUpperCase();
    const rate = quoteInfo.exchangeRate;

    let itemTotalUsd = 0;
    let itemTotalMxn = 0;

    if (currency === "USD") {
      itemTotalUsd = qty * unitPrice;
      itemTotalMxn = itemTotalUsd * rate;
    } else {
      itemTotalMxn = qty * unitPrice;
      itemTotalUsd = rate > 0 ? itemTotalMxn / rate : itemTotalMxn / 17.5;
    }

    // Acumular cotizado
    supplierQuotedUsd.set(
      supplierId,
      (supplierQuotedUsd.get(supplierId) || 0) + itemTotalUsd
    );
    supplierQuotedMxn.set(
      supplierId,
      (supplierQuotedMxn.get(supplierId) || 0) + itemTotalMxn
    );

    if (!supplierQuotesSet.has(supplierId)) {
      supplierQuotesSet.set(supplierId, new Set());
    }
    supplierQuotesSet.get(supplierId)!.add(item.quote_id);

    // Acumular comprado (si la cotización está aprobada)
    if (quoteInfo.status === "approved") {
      supplierPurchasedUsd.set(
        supplierId,
        (supplierPurchasedUsd.get(supplierId) || 0) + itemTotalUsd
      );
      supplierPurchasedMxn.set(
        supplierId,
        (supplierPurchasedMxn.get(supplierId) || 0) + itemTotalMxn
      );

      if (!supplierApprovedQuotesSet.has(supplierId)) {
        supplierApprovedQuotesSet.set(supplierId, new Set());
      }
      supplierApprovedQuotesSet.get(supplierId)!.add(item.quote_id);
    }
  }

  let totalQuotedYtdMxn = 0;
  let totalPurchasedYtdMxn = 0;
  let maxPurchasedMxn = -1;
  let topSupplierName: string | null = null;

  const suppliers: SupplierWithStats[] = suppliersData.map((s) => {
    const quotedUsd = supplierQuotedUsd.get(s.id) || 0;
    const quotedMxn = supplierQuotedMxn.get(s.id) || 0;
    const purchasedUsd = supplierPurchasedUsd.get(s.id) || 0;
    const purchasedMxn = supplierPurchasedMxn.get(s.id) || 0;

    totalQuotedYtdMxn += quotedMxn;
    totalPurchasedYtdMxn += purchasedMxn;

    if (purchasedMxn > maxPurchasedMxn && purchasedMxn > 0) {
      maxPurchasedMxn = purchasedMxn;
      topSupplierName = s.name;
    }

    return {
      ...s,
      brands_distributed: s.brands_distributed || [],
      products_count: supplierProductCountMap.get(s.id) || 0,
      quoted_amount_ytd_usd: quotedUsd,
      quoted_amount_ytd_mxn: quotedMxn,
      purchased_amount_ytd_usd: purchasedUsd,
      purchased_amount_ytd_mxn: purchasedMxn,
      quotes_count_ytd: supplierQuotesSet.get(s.id)?.size || 0,
      approved_projects_count_ytd: supplierApprovedQuotesSet.get(s.id)?.size || 0,
    };
  });

  return {
    suppliers,
    summary: {
      totalSuppliers: suppliers.length,
      activeSuppliers: suppliers.filter((s) => s.is_active).length,
      totalQuotedYtdMxn,
      totalPurchasedYtdMxn,
      topSupplierName,
    },
  };
}
