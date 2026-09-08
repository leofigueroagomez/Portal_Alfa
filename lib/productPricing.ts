/**
 * Recalculo del precio de venta a partir del costo.
 *
 * La formula vive replicada en el alta y la edicion de producto (efectos de
 * React sobre el formulario). El verificador de costo de la cotizacion no la
 * tenia: guardaba `cost_price` y `cost_updated_at` sin tocar
 * `calculated_sale_price`, dejando productos con margen real distinto al
 * objetivo e incluso por debajo del costo.
 */

export type ProductPricingFields = {
  pricing_method?: string | null;
  target_margin?: number | string | null;
  public_price?: number | string | null;
};

export type SalePriceRecalculation =
  /** Hay precio nuevo que guardar. */
  | { status: "recalculated"; salePrice: number }
  /** El metodo no depende del costo (manual o precio publico): no se toca. */
  | { status: "unchanged"; reason: "manual" | "public_price" }
  /** Margen fuera de rango: no se puede calcular, hay que corregir el producto. */
  | { status: "invalid_margin"; margin: number };

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function recalculateSalePrice(
  product: ProductPricingFields,
  costPrice: number
): SalePriceRecalculation {
  const method = (product.pricing_method || "target_margin").trim();

  if (method === "public_price") {
    return { status: "unchanged", reason: "public_price" };
  }

  if (method !== "target_margin") {
    return { status: "unchanged", reason: "manual" };
  }

  const margin = toNumber(product.target_margin);

  // Un margen de 100% o mas divide entre cero o invierte el signo.
  if (margin < 0 || margin >= 100) {
    return { status: "invalid_margin", margin };
  }

  const salePrice = toNumber(costPrice) / (1 - margin / 100);

  return { status: "recalculated", salePrice: Number(salePrice.toFixed(2)) };
}
