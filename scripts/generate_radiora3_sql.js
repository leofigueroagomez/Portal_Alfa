const fs = require('fs');
const path = require('path');

const catalogDataPath = path.join(__dirname, '..', 'lib', 'catalogData.ts');
const fileText = fs.readFileSync(catalogDataPath, 'utf8');

// Extract JSON from STATIC_CATALOG_PRODUCTS
const match = fileText.match(/STATIC_CATALOG_PRODUCTS:\s*CatalogProduct\[\]\s*=\s*(\[[\s\S]*?\]);/);
if (!match) {
  console.error('Could not extract STATIC_CATALOG_PRODUCTS');
  process.exit(1);
}

const products = JSON.parse(match[1]);

let sql = `-- Migration: 20260827_seed_radiora3_catalog.sql
-- Seed 67 Flagship Lutron RadioRA 3 Products for ALFA Catalog & SEO with Aesthetic Imagery

DO $$
DECLARE
    lutron_brand_id BIGINT;
    cat_id BIGINT;
BEGIN
    SELECT id INTO lutron_brand_id FROM public.brands WHERE slug = 'lutron' LIMIT 1;
    SELECT id INTO cat_id FROM public.product_categories WHERE name ILIKE '%iluminac%' OR name ILIKE '%control%' LIMIT 1;

`;

products.forEach((p) => {
  const sku = p.sku;
  const model = p.model;
  const name = p.name;
  const slug = p.slug;
  const shortDesc = (p.short_description || '').replace(/'/g, "''");
  const imageUrl = p.image_url || '';
  const satCode = '39112403';
  const seoTitle = (p.seo_title || '').replace(/'/g, "''");
  const seoDesc = (p.seo_description || '').replace(/'/g, "''");

  sql += `
    INSERT INTO public.products (
        sku,
        brand,
        brand_id,
        model,
        name,
        slug,
        category,
        category_id,
        short_description,
        description,
        image_url,
        cost_price,
        cost_currency,
        pricing_method,
        target_margin,
        calculated_sale_price,
        sale_currency,
        labor_unit_cost,
        labor_sale_multiplier,
        labor_unit_sale_price,
        sat_product_key,
        sat_unit_key,
        sat_product_service_code,
        sat_unit_code,
        sat_unit_name,
        fiscal_object,
        tax_rate,
        is_favorite,
        is_public,
        is_active,
        seo_title,
        seo_description,
        seo_keywords
    )
    VALUES (
        '${sku}',
        'Lutron',
        lutron_brand_id,
        '${model}',
        '${name.replace(/'/g, "''")}',
        '${slug}',
        'Control e Iluminación',
        cat_id,
        '${shortDesc}',
        '${shortDesc}',
        '${imageUrl}',
        150.00,
        'USD',
        'target_margin',
        30.0,
        214.28,
        'USD',
        300.00,
        2.0,
        600.00,
        '${satCode}',
        'H87',
        '${satCode}',
        'H87',
        'Pieza',
        '02',
        16.0,
        false,
        true,
        true,
        '${seoTitle}',
        '${seoDesc}',
        ARRAY['Lutron RadioRA 3', '${model}', 'Lutron ${model}', 'RadioRA 3 Mexico', 'Lutron cotizacion']
    )
    ON CONFLICT (sku) DO UPDATE SET
        brand_id = EXCLUDED.brand_id,
        model = EXCLUDED.model,
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        short_description = EXCLUDED.short_description,
        description = EXCLUDED.description,
        image_url = EXCLUDED.image_url,
        sat_product_service_code = EXCLUDED.sat_product_service_code,
        is_public = EXCLUDED.is_public,
        seo_title = EXCLUDED.seo_title,
        seo_description = EXCLUDED.seo_description,
        seo_keywords = EXCLUDED.seo_keywords,
        updated_at = NOW();
`;
});

sql += `
END $$;
`;

const outputPath = path.join(__dirname, '..', 'sql', '20260827_seed_radiora3_catalog.sql');
fs.writeFileSync(outputPath, sql, 'utf8');
console.log('Successfully updated SQL migration with aesthetic imagery for ' + products.length + ' products: ' + outputPath);
