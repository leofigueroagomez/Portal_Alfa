const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '..', 'lib', 'catalogData.ts');
let catalogText = fs.readFileSync(catalogPath, 'utf8');

const match = catalogText.match(/export const STATIC_CATALOG_PRODUCTS:\s*CatalogProduct\[\]\s*=\s*(\[[\s\S]*?\]);/);
let products = JSON.parse(match[1]);

const titleReplacements = {
  'Sonos In-Ceiling Speakers (6.5")': {
    title: 'Sonos In-Ceiling 6.5" | Bocinas de Plafón en México | ALFA',
    desc: 'Cotiza bocinas arquitectónicas Sonos In-Ceiling 6.5 pulgadas fabricadas por Sonance. Sonido envolvente empotrado con calibración Trueplay y garantía oficial ALFA.'
  },
  'Sonos In-Ceiling Speakers (8")': {
    title: 'Sonos In-Ceiling 8" | Bocinas de Plafón en México | ALFA',
    desc: 'Cotiza bocinas arquitectónicas Sonos In-Ceiling 8 pulgadas con mayor respuesta en graves y rango dinámico. Especificación e instalación con garantía oficial ALFA.'
  },
  'Pedestal de piso para Sonos Era 100': {
    title: 'Pedestal de Piso Sonos Era 100 | Accesorios México | ALFA',
    desc: 'Pedestal oficial de piso para bocina Sonos Era 100 con canal para ocultar cables. Suministro oficial y entrega en México con ALFA.'
  },
  'Soporte de pared para Sonos Era 100': {
    title: 'Soporte de Pared Sonos Era 100 | Montaje en México | ALFA',
    desc: 'Soporte giratorio de pared para Sonos Era 100 con diseño discreto y ajuste angular. Suministro e instalación oficial en México con ALFA.'
  },
  'Pedestal de piso para Sonos Era 300': {
    title: 'Pedestal de Piso Sonos Era 300 | Accesorios México | ALFA',
    desc: 'Pedestal oficial de piso para bocina Sonos Era 300 con altura óptima para audio espacial Dolby Atmos. Suministro oficial en México con ALFA.'
  },
  'Soporte de pared para Sonos Era 300': {
    title: 'Soporte de Pared Sonos Era 300 | Montaje en México | ALFA',
    desc: 'Soporte de pared para Sonos Era 300 que optimiza la dispersión de audio espacial Dolby Atmos. Suministro e instalación oficial con ALFA.'
  },
  'Soporte de pared para Sonos Arc Ultra': {
    title: 'Soporte de Pared Sonos Arc Ultra | Montaje Oficial | ALFA',
    desc: 'Soporte de pared oficial casi invisible para barra de sonido Sonos Arc Ultra. Suministro e instalación profesional en México con ALFA.'
  },
  'Soporte de pared para Sonos Beam': {
    title: 'Soporte de Pared Sonos Beam | Montaje Oficial | ALFA',
    desc: 'Soporte de pared empotrable para barra de sonido Sonos Beam (Gen 1 y Gen 2). Suministro e instalación en México con garantía ALFA.'
  },
  'Soporte de pared para Sonos Ray': {
    title: 'Soporte de Pared Sonos Ray | Montaje Oficial | ALFA',
    desc: 'Soporte de pared para barra compacta Sonos Ray. Montaje seguro y elegante bajo tu televisor con suministro oficial ALFA.'
  },
  'Adaptador combo Sonos (entrada de línea + Ethernet)': {
    title: 'Adaptador Combo Sonos Ethernet y Línea 3.5mm | ALFA',
    desc: 'Adaptador combo oficial Sonos para conectar bocinas Era 100 y Era 300 a red cableada Ethernet y entrada de audio 3.5 mm. Suministro oficial ALFA.'
  },
  'Adaptador de entrada de línea Sonos (3.5 mm a USB-C)': {
    title: 'Adaptador de Línea 3.5mm a USB-C Sonos | ALFA',
    desc: 'Adaptador de entrada de línea 3.5 mm a USB-C para conectar tornamesas y fuentes analógicas a Sonos Era 100 y Era 300 con respaldo oficial ALFA.'
  },
  'Adaptador óptico a HDMI para Sonos Beam': {
    title: 'Adaptador Óptico a HDMI Sonos | Audio Digital | ALFA',
    desc: 'Adaptador de audio óptico Toslink a HDMI para conectar barras Sonos Beam o Arc a televisiones sin HDMI ARC. Suministro oficial ALFA.'
  },
  'Cargador inalámbrico para Sonos Roam': {
    title: 'Cargador Inalámbrico Magnético Sonos Roam | ALFA',
    desc: 'Base de carga inalámbrica magnética diseñada a la medida para bocinas portátiles Sonos Roam y Roam 2. Suministro oficial ALFA.'
  },
  'Gancho de pared para Sonos Move': {
    title: 'Gancho de Pared Sonos Move | Soporte Oficial | ALFA',
    desc: 'Gancho de montaje en pared interior o exterior para colgar tu bocina portátil Sonos Move o Move 2. Suministro oficial ALFA.'
  },
  'Estuche de viaje para Sonos Move': {
    title: 'Estuche de Viaje para Sonos Move | Protección | ALFA',
    desc: 'Funda y estuche de viaje resistente con correa ajustable para transportar bocinas Sonos Move y Move 2 de forma segura. Suministro oficial ALFA.'
  }
};

products = products.map(p => {
  if (p.brand_slug === 'sonos' && titleReplacements[p.model]) {
    const rep = titleReplacements[p.model];
    p.seo_title = rep.title;
    p.seo_description = rep.desc;
  }
  return p;
});

// Re-generate catalogData.ts
const brandsMatch = catalogText.match(/export const STATIC_BRANDS:\s*Brand\[\]\s*=\s*(\[[\s\S]*?\]);/);
const brandsText = brandsMatch ? brandsMatch[0] : '';

const newFileContent = `import { Brand, CatalogProduct } from "./catalog";

${brandsText}

export const STATIC_CATALOG_PRODUCTS: CatalogProduct[] = ${JSON.stringify(products, null, 2)};
`;

fs.writeFileSync(catalogPath, newFileContent, 'utf8');
console.log('Successfully optimized Sonos SEO titles and descriptions in catalogData.ts');
