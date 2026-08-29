const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '..', 'lib', 'catalogData.ts');
const catalogText = fs.readFileSync(catalogPath, 'utf8');

const match = catalogText.match(/STATIC_CATALOG_PRODUCTS:\s*CatalogProduct\[\]\s*=\s*(\[[\s\S]*?\]);/);
const products = JSON.parse(match[1]);
const sonosProducts = products.filter(p => p.brand_slug === 'sonos');

console.log(`\n=== AUDITORÍA SEO: CATÁLOGO SONOS (${sonosProducts.length} PRODUCTOS) ===\n`);

let errors = 0;
let warnings = 0;

sonosProducts.forEach((p, idx) => {
  // Check Slug
  if (!p.slug || !/^[a-z0-9-]+$/.test(p.slug)) {
    console.error(`❌ [${p.model}] Slug inválido: ${p.slug}`);
    errors++;
  }

  // Check Title
  if (!p.seo_title || p.seo_title.length < 20 || p.seo_title.length > 75) {
    console.warn(`⚠️ [${p.model}] Longitud de seo_title (${p.seo_title?.length || 0} chars): "${p.seo_title}"`);
    warnings++;
  }

  // Check Description
  if (!p.seo_description || p.seo_description.length < 80 || p.seo_description.length > 250) {
    console.warn(`⚠️ [${p.model}] Longitud de seo_description (${p.seo_description?.length || 0} chars): "${p.seo_description}"`);
    warnings++;
  }

  // Check Keywords
  if (!p.seo_keywords || p.seo_keywords.length === 0) {
    console.error(`❌ [${p.model}] Sin keywords`);
    errors++;
  }

  // Check Image existence
  const imgRelative = p.image_url.replace(/^\//, '');
  const imgPath = path.join(__dirname, '..', 'public', imgRelative);
  if (!fs.existsSync(imgPath)) {
    console.error(`❌ [${p.model}] Imagen no encontrada en disco: ${imgPath}`);
    errors++;
  }

  // Check Specifications
  if (!p.specifications || Object.keys(p.specifications).length === 0) {
    console.warn(`⚠️ [${p.model}] Sin especificaciones`);
    warnings++;
  }

  // Check Highlights
  if (!p.highlights || p.highlights.length === 0) {
    console.warn(`⚠️ [${p.model}] Sin viñetas/highlights`);
    warnings++;
  }
});

console.log(`\nAuditoría terminada: ${errors} errores críticos, ${warnings} advertencias.`);
