import { supabase } from "@/services/supabase";
import { STATIC_BRANDS, STATIC_CATALOG_PRODUCTS } from "./catalogData";
import { SITE_URL } from "@/lib/siteUrl";

export type Brand = {
  id: number;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  website_url: string | null;
  origin_country: string | null;
  focus_areas: string[];
  authorized_partner_tier: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[];
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type CatalogProduct = {
  id: number;
  slug: string;
  brand_id: number | null;
  brand_name: string;
  brand_slug: string;
  brand_logo_url: string | null;
  brand_partner_tier: string | null;
  model: string | null;
  name: string | null;
  sku: string | null;
  short_description: string | null;
  description: string | null;
  category: string | null;
  category_id: number | null;
  image_url: string | null;
  specifications: Record<string, string | number | boolean | string[]>;
  highlights: string[];
  warranty_years: number | null;
  is_favorite: boolean;
  is_public: boolean;
  is_active: boolean;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[];
  created_at: string;
  updated_at: string;
};

export type CatalogSearchParams = {
  query?: string;
  brandSlug?: string;
  category?: string;
  categoryId?: number;
  page?: number;
  limit?: number;
};

export type CatalogSearchResult = {
  products: CatalogProduct[];
  total: number;
  page: number;
  totalPages: number;
};

/**
 * Obtiene todas las marcas activas ordenadas para el directorio /marcas
 */
export async function getPublicBrands(): Promise<Brand[]> {
  try {
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (!error && data && data.length > 0) {
      return data as Brand[];
    }
  } catch (err) {
    console.error("[getPublicBrands] Error fetching brands, using fallback:", err);
  }

  return [...STATIC_BRANDS]
    .filter((b) => b.is_active)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

/**
 * Obtiene una marca activa por su slug (ej. 'lutron')
 */
export async function getPublicBrandBySlug(slug: string): Promise<Brand | null> {
  if (!slug?.trim()) return null;
  const normalized = slug.trim().toLowerCase();

  try {
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("slug", normalized)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && data) {
      return data as Brand;
    }
  } catch (err) {
    console.error(`[getPublicBrandBySlug] Error fetching brand ${slug}, using fallback:`, err);
  }

  return STATIC_BRANDS.find((b) => b.slug.toLowerCase() === normalized) || null;
}

/**
 * Obtiene todos los productos públicos de una marca
 */
export async function getPublicBrandProducts(brandSlug: string): Promise<CatalogProduct[]> {
  if (!brandSlug?.trim()) return [];
  const normalized = brandSlug.trim().toLowerCase();

  try {
    const { data, error } = await supabase
      .from("public_catalog_products")
      .select("*")
      .eq("brand_slug", normalized)
      .order("is_favorite", { ascending: false })
      .order("name", { ascending: true });

    if (!error && data && data.length > 0) {
      return data as CatalogProduct[];
    }
  } catch (err) {
    console.error(`[getPublicBrandProducts] Error fetching products for ${brandSlug}, using fallback:`, err);
  }

  return STATIC_CATALOG_PRODUCTS.filter((p) => p.brand_slug.toLowerCase() === normalized);
}

/**
 * Obtiene un producto público por el slug de su marca y el slug del producto
 */
export async function getPublicProductBySlug(
  brandSlug: string,
  productSlug: string
): Promise<CatalogProduct | null> {
  if (!brandSlug?.trim() || !productSlug?.trim()) return null;
  const normalizedBrand = brandSlug.trim().toLowerCase();
  const normalizedProduct = productSlug.trim().toLowerCase();

  try {
    const { data, error } = await supabase
      .from("public_catalog_products")
      .select("*")
      .eq("brand_slug", normalizedBrand)
      .or(`slug.eq.${normalizedProduct},sku.ilike.${normalizedProduct},model.ilike.${normalizedProduct}`)
      .maybeSingle();

    if (!error && data) {
      return data as CatalogProduct;
    }
  } catch (err) {
    console.error(`[getPublicProductBySlug] Error fetching ${brandSlug}/${productSlug}, using fallback:`, err);
  }

  return (
    STATIC_CATALOG_PRODUCTS.find(
      (p) =>
        p.brand_slug.toLowerCase() === normalizedBrand &&
        (p.slug.toLowerCase() === normalizedProduct ||
          p.sku?.toLowerCase() === normalizedProduct ||
          p.model?.toLowerCase() === normalizedProduct)
    ) || null
  );
}

/**
 * Obtiene productos destacados para home o landings
 */
export async function getFeaturedCatalogProducts(limit = 6): Promise<CatalogProduct[]> {
  try {
    const { data, error } = await supabase
      .from("public_catalog_products")
      .select("*")
      .eq("is_favorite", true)
      .limit(limit);

    if (error) {
      console.error("[getFeaturedCatalogProducts] Error fetching featured products:", error);
      return [];
    }

    return (data || []) as CatalogProduct[];
  } catch (err) {
    console.error("[getFeaturedCatalogProducts] Unexpected error:", err);
    return [];
  }
}

/**
 * Obtiene productos relacionados de la misma categoría o marca
 */
export async function getRelatedCatalogProducts(
  productId: number,
  category?: string | null,
  brandSlug?: string | null,
  limit = 4
): Promise<CatalogProduct[]> {
  try {
    let query = supabase
      .from("public_catalog_products")
      .select("*")
      .neq("id", productId);

    if (brandSlug) {
      query = query.eq("brand_slug", brandSlug);
    } else if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query.limit(limit);

    if (!error && data && data.length > 0) {
      return data as CatalogProduct[];
    }
  } catch (err) {
    console.error("[getRelatedCatalogProducts] Error fetching related products, using fallback:", err);
  }

  const pool = STATIC_CATALOG_PRODUCTS.filter((p) => p.id !== productId);
  const scoped = pool.filter((p) =>
    brandSlug
      ? p.brand_slug.toLowerCase() === brandSlug.toLowerCase()
      : category
      ? p.category === category
      : true
  );
  return (scoped.length > 0 ? scoped : pool).slice(0, limit);
}

/**
 * Búsqueda y filtrado de productos públicos en catálogo
 */
export async function searchCatalogProducts(
  params: CatalogSearchParams = {}
): Promise<CatalogSearchResult> {
  const {
    query = "",
    brandSlug,
    category,
    categoryId,
    page = 1,
    limit = 12,
  } = params;

  try {
    let dbQuery = supabase
      .from("public_catalog_products")
      .select("*", { count: "exact" });

    if (brandSlug) {
      dbQuery = dbQuery.eq("brand_slug", brandSlug.trim().toLowerCase());
    }

    if (categoryId) {
      dbQuery = dbQuery.eq("category_id", categoryId);
    } else if (category) {
      dbQuery = dbQuery.ilike("category", `%${category.trim()}%`);
    }

    if (query?.trim()) {
      const q = query.trim();
      dbQuery = dbQuery.or(
        `name.ilike.%${q}%,model.ilike.%${q}%,sku.ilike.%${q}%,short_description.ilike.%${q}%,description.ilike.%${q}%`
      );
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await dbQuery
      .order("is_favorite", { ascending: false })
      .order("name", { ascending: true })
      .range(from, to);

    if (error) {
      console.error("[searchCatalogProducts] Error searching products:", error);
      return { products: [], total: 0, page, totalPages: 0 };
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      products: (data || []) as CatalogProduct[],
      total,
      page,
      totalPages,
    };
  } catch (err) {
    console.error("[searchCatalogProducts] Unexpected error:", err);
    return { products: [], total: 0, page, totalPages: 0 };
  }
}

// ---------------------------------------------------------------------------
// Generadores de Datos Estructurados Schema.org (JSON-LD para Google SEO)
// ---------------------------------------------------------------------------

/**
 * Genera el JSON-LD de un producto para Google Rich Results (Schema.org/Product)
 */
export function generateProductJsonLd(
  product: CatalogProduct,
  siteUrl: string = SITE_URL
) {
  const cleanSiteUrl = siteUrl.replace(/\/+$/, "");
  const productUrl = `${cleanSiteUrl}/marcas/${product.brand_slug}/${product.slug}`;
  const fullImageUrl = product.image_url
    ? product.image_url.startsWith("http")
      ? product.image_url
      : `${cleanSiteUrl}${product.image_url}`
    : undefined;
  const fullBrandLogoUrl = product.brand_logo_url
    ? product.brand_logo_url.startsWith("http")
      ? product.brand_logo_url
      : `${cleanSiteUrl}${product.brand_logo_url}`
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name || `${product.brand_name} ${product.model}`,
    image: fullImageUrl ? [fullImageUrl] : undefined,
    description:
      product.short_description ||
      product.description ||
      `Especificación e integración del modelo ${product.model} de ${product.brand_name} con garantía oficial en México por ALFA.`,
    sku: product.sku || undefined,
    mpn: product.model || product.sku || undefined,
    brand: {
      "@type": "Brand",
      name: product.brand_name,
      logo: fullBrandLogoUrl || undefined,
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: productUrl,
      seller: {
        "@type": "Organization",
        name: "ALFA High End Services",
        url: cleanSiteUrl,
      },
      itemCondition: "https://schema.org/NewCondition",
    },
    additionalProperty: Object.entries(product.specifications || {}).map(
      ([name, value]) => ({
        "@type": "PropertyValue",
        name,
        value: Array.isArray(value) ? value.join(", ") : String(value),
      })
    ),
  };
}

/**
 * Genera el JSON-LD de una Marca (Schema.org/Brand + Organization)
 */
export function generateBrandJsonLd(
  brand: Brand,
  siteUrl: string = SITE_URL
) {
  const cleanSiteUrl = siteUrl.replace(/\/+$/, "");
  const brandUrl = `${cleanSiteUrl}/marcas/${brand.slug}`;
  const fullBrandLogoUrl = brand.logo_url
    ? brand.logo_url.startsWith("http")
      ? brand.logo_url
      : `${cleanSiteUrl}${brand.logo_url}`
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Brand",
    name: brand.name,
    url: brandUrl,
    logo: fullBrandLogoUrl || undefined,
    description: brand.description || brand.tagline || undefined,
    sameAs: brand.website_url ? [brand.website_url] : undefined,
  };
}

/**
 * Genera el JSON-LD de Breadcrumb (Schema.org/BreadcrumbList)
 */
export function generateCatalogBreadcrumbJsonLd(
  items: Array<{ name: string; url: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
