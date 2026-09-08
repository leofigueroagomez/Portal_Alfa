import { formatCurrency } from "@/lib/format";
import { isProductCostStale } from "@/lib/productFreshness";

/**
 * Campos del catalogo que se pueden refrescar en una partida ya agregada:
 * equipo y descriptivos. La mano de obra queda fuera a proposito, porque las
 * actividades de MO tienen su propio snapshot y su propio panel.
 */
export type UpdatableProduct = {
  id: number;
  brand: string;
  model: string;
  name: string;
  image_url: string | null;
  cost_price: number | null;
  cost_currency: string | null;
  calculated_sale_price: number;
  sale_currency: string;
  cost_updated_at?: string | null;
};

export type ProductUpdateChange = {
  label: string;
  from: string;
  to: string;
};

export type PendingProductUpdate<P extends UpdatableProduct> = {
  product: P;
  changes: ProductUpdateChange[];
  itemCount: number;
};

function textChange(
  label: string,
  from: string | null | undefined,
  to: string | null | undefined
): ProductUpdateChange | null {
  const current = (from || "").trim();
  const next = (to || "").trim();

  if (current === next) return null;

  return { label, from: current || "sin dato", to: next || "sin dato" };
}

function moneyChange(
  label: string,
  fromValue: number | null | undefined,
  fromCurrency: string | null | undefined,
  toValue: number | null | undefined,
  toCurrency: string | null | undefined
): ProductUpdateChange | null {
  const currentValue = Number(fromValue || 0);
  const nextValue = Number(toValue || 0);
  const currentCurrency = (fromCurrency || "USD").toUpperCase();
  const nextCurrency = (toCurrency || "USD").toUpperCase();

  if (currentValue === nextValue && currentCurrency === nextCurrency) {
    return null;
  }

  return {
    label,
    from: formatCurrency(currentValue, currentCurrency),
    to: formatCurrency(nextValue, nextCurrency),
  };
}

function imageChange(
  from: string | null | undefined,
  to: string | null | undefined
): ProductUpdateChange | null {
  const current = (from || "").trim();
  const next = (to || "").trim();

  if (current === next) return null;

  return {
    label: "Imagen",
    from: current ? "actual" : "sin imagen",
    to: next ? "nueva" : "sin imagen",
  };
}

export function getProductUpdateChanges(
  item: UpdatableProduct,
  product: UpdatableProduct
): ProductUpdateChange[] {
  return [
    textChange("Marca", item.brand, product.brand),
    textChange("Modelo", item.model, product.model),
    textChange("Nombre", item.name, product.name),
    imageChange(item.image_url, product.image_url),
    moneyChange(
      "Precio de venta",
      item.calculated_sale_price,
      item.sale_currency,
      product.calculated_sale_price,
      product.sale_currency
    ),
    moneyChange(
      "Costo",
      item.cost_price,
      item.cost_currency,
      product.cost_price,
      product.cost_currency
    ),
  ].filter((change): change is ProductUpdateChange => change !== null);
}

/**
 * Solo considera productos que se editaron en esta sesion. No detecta deriva
 * historica contra el catalogo en cotizaciones ya guardadas.
 */
export function getPendingProductUpdates<
  P extends UpdatableProduct,
  I extends UpdatableProduct,
  S extends { items: I[] },
>(
  sections: S[],
  products: P[],
  editedProductIds: number[]
): PendingProductUpdate<P>[] {
  const pending: PendingProductUpdate<P>[] = [];

  for (const productId of editedProductIds) {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) continue;

    const staleItems = sections
      .flatMap((section) => section.items)
      .filter((item) => item.id === productId)
      .map((item) => getProductUpdateChanges(item, product))
      .filter((changes) => changes.length > 0);

    if (staleItems.length === 0) continue;

    pending.push({
      product,
      changes: staleItems[0],
      itemCount: staleItems.length,
    });
  }

  return pending;
}

export function getProductUpdatePatch(product: UpdatableProduct) {
  return {
    brand: product.brand,
    model: product.model,
    name: product.name,
    image_url: product.image_url,
    cost_price: product.cost_price,
    cost_currency: product.cost_currency,
    calculated_sale_price: product.calculated_sale_price,
    sale_currency: product.sale_currency,
    cost_updated_at: product.cost_updated_at ?? null,
    costVerificationPending: isProductCostStale(product.cost_updated_at),
  };
}
