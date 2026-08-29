const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'public', 'products', 'lutron');
const files = fs.readdirSync(targetDir);

// Read catalog data
const catalogPath = path.join(__dirname, '..', 'lib', 'catalogData.ts');
const catalogText = fs.readFileSync(catalogPath, 'utf8');

const match = catalogText.match(/STATIC_CATALOG_PRODUCTS:\s*CatalogProduct\[\]\s*=\s*(\[[\s\S]*?\]);/);
const products = JSON.parse(match[1]);

console.log(`Total products in catalog: ${products.length}`);
console.log(`Total files in public/catalog/lutron: ${files.length}`);

// Fix typo if rsthn4btf.avif exists
const typoFile = path.join(targetDir, 'rsthn4btf.avif');
const correctFile = path.join(targetDir, 'rrsthn4btf.avif');
if (fs.existsSync(typoFile) && !fs.existsSync(correctFile)) {
  fs.copyFileSync(typoFile, correctFile);
  console.log('✓ Copied rsthn4btf.avif to rrsthn4btf.avif for exact match');
}

const missing = [];
const found = [];

products.forEach(p => {
  const expectedName = `${p.model.toLowerCase()}.avif`;
  if (fs.existsSync(path.join(targetDir, expectedName))) {
    found.push(p.model);
  } else {
    // Check if any file matches loosely
    const loose = files.find(f => f.toLowerCase().includes(p.model.toLowerCase()) || p.model.toLowerCase().includes(f.split('.')[0]));
    missing.push({ model: p.model, name: p.name, suggestedMatch: loose || 'NONE' });
  }
});

console.log(`\nFound exact match for: ${found.length} / ${products.length} products.`);

if (missing.length > 0) {
  console.log('\nMissing or unmatched products:');
  missing.forEach(m => console.log(` - ${m.model}: ${m.name} (Suggested match: ${m.suggestedMatch})`));
}
