export type SatProductServiceCatalogItem = {
  code: string;
  description: string;
  is_active: boolean;
};

export type SatUnitCatalogItem = {
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

export type TaxObjectCatalogItem = {
  code: string;
  name: string;
  is_active: boolean;
};

export type ProductFiscalData = {
  id: number;
  name?: string | null;
  sat_product_service_code?: string | null;
  sat_unit_code?: string | null;
  sat_unit_name?: string | null;
  fiscal_object?: string | null;
  sat_product_key?: string | null;
  sat_unit_key?: string | null;
  unit_name?: string | null;
  fiscal_description?: string | null;
};

export type ProductFiscalCatalogs = {
  productServices: SatProductServiceCatalogItem[];
  units: SatUnitCatalogItem[];
  taxObjects?: TaxObjectCatalogItem[];
};

export function getProductSatProductCode(product: ProductFiscalData | null | undefined) {
  return product?.sat_product_service_code?.trim() || "";
}

export function getProductSatUnitCode(product: ProductFiscalData | null | undefined) {
  return product?.sat_unit_code?.trim() || "";
}

export function getProductSatUnitName(product: ProductFiscalData | null | undefined) {
  return product?.sat_unit_name?.trim() || product?.unit_name?.trim() || "";
}

export function getProductFiscalObject(product: ProductFiscalData | null | undefined) {
  return product?.fiscal_object?.trim() || "02";
}

export function getMissingProductFiscalFields(
  product: ProductFiscalData | null | undefined,
  catalogs?: ProductFiscalCatalogs
) {
  const missing: string[] = [];
  const productCode = getProductSatProductCode(product);
  const unitCode = getProductSatUnitCode(product);
  const unitName = getProductSatUnitName(product);
  const fiscalObject = getProductFiscalObject(product);

  if (!productCode) {
    missing.push(
      product?.sat_product_key?.trim()
        ? "Codigo SAT producto/servicio requiere actualizacion"
        : "Codigo SAT producto/servicio"
    );
  }
  if (!unitCode) {
    missing.push(
      product?.sat_unit_key?.trim()
        ? "Clave unidad SAT requiere actualizacion"
        : "Clave unidad SAT"
    );
  }
  if (!unitName) missing.push("Nombre unidad SAT");
  if (!fiscalObject) missing.push("Objeto de impuesto");

  if (catalogs && productCode) {
    const item = catalogs.productServices.find((option) => option.code === productCode);
    if (!item || !item.is_active) {
      missing.push("Codigo SAT producto/servicio requiere actualizacion");
    }
  }

  if (catalogs && unitCode) {
    const item = catalogs.units.find((option) => option.code === unitCode);
    if (!item || !item.is_active) {
      missing.push("Clave unidad SAT requiere actualizacion");
    }
  }

  if (catalogs?.taxObjects && fiscalObject) {
    const item = catalogs.taxObjects.find((option) => option.code === fiscalObject);
    if (!item || !item.is_active) {
      missing.push("Objeto de impuesto requiere actualizacion");
    }
  }

  return [...new Set(missing)];
}

export function getSatProductLabel(
  code: string | null | undefined,
  catalog: SatProductServiceCatalogItem[]
) {
  const item = catalog.find((option) => option.code === code);
  return item ? `${item.code} - ${item.description}` : code || "Pendiente";
}

export function getSatUnitLabel(
  code: string | null | undefined,
  catalog: SatUnitCatalogItem[]
) {
  const item = catalog.find((option) => option.code === code);
  return item
    ? `${item.code} - ${item.name}${item.description ? ` / ${item.description}` : ""}`
    : code || "Pendiente";
}
