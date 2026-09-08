/**
 * Genera los archivos estaticos del catalogo publico /marcas para las marcas
 * de CCTV que ya viven en public.products (Tiandy y Hikvision).
 *
 * Sigue el mismo patron que Lutron y Sonos: emite objetos CatalogProduct hacia
 * lib/catalogData/<slug>.ts. NUNCA escribe precios ni costos: el catalogo
 * publico es SEO + lead, no tienda.
 *
 * Uso:  node scripts/generate-cctv-catalog.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const envPath = path.join(process.cwd(), ".env.local");
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    })
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

/** Accesorios de instalacion: no son objetivo de busqueda, generan paginas flacas. */
const ACCESSORY_PATTERNS = [
  /montaje/i,
  /soporte/i,
  /adaptador/i,
  /gabinete/i,
  /brazo/i,
  /poste/i,
  /housing/i,
  /bracket/i,
  /^chapa /i,
  /fuente de/i,
  /^cable /i,
  /caja de conexi/i,
  /antena .*repuesto/i,
  /^conector /i,
  /bot[oó]n de salida/i,
  /^base tipo/i,
];

/** Filas cuyo "nombre" es en realidad otro codigo de modelo (dato sucio). */
function hasJunkName(name) {
  return !/\s/.test(name.trim()) || /^[A-Z0-9][A-Z0-9\-/().]{5,}$/.test(name.trim());
}

const BRANDS = [
  {
    id: 3,
    name: "Hikvision",
    slug: "hikvision",
    startId: 2000,
    // Solo modelos genuinos Hikvision. Se dejan fuera THC- (epcom TurboHD),
    // IPC-/DVR-/PTZ- (HiLook) y HM- (HIKMICRO): son marcas hermanas, no Hikvision.
    modelPrefixes: [/^DS-/i, /^IDS-/i],
  },
  {
    id: 4,
    name: "Tiandy",
    slug: "tiandy",
    startId: 1000,
    modelPrefixes: null,
  },
];

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Categoria fina derivada del nombre: el campo category_id es demasiado grueso
 *  (casi todo cae en "Camaras de Seguridad (CCTV)") y dejaria una sola pestana. */
function deriveCategory(name) {
  const n = name.toLowerCase();
  if (/fisheye|panoram|multisensor/.test(n)) return "Panorámicas y Fisheye";
  if (/ptz/.test(n)) return "PTZ y Domos Motorizados";
  if (/nvr/.test(n)) return "NVR y Grabadores IP";
  if (/dvr/.test(n)) return "DVR y TurboHD";
  if (/videoportero|frente de calle|intercom/.test(n)) return "Videoporteros";
  if (/control de acceso|huella|biometric|lector|torniquete/.test(n)) {
    return "Control de Acceso";
  }
  if (/ax pro|ax hybrid|alarma|\bpir\b|magnetico|magnético/.test(n)) {
    return "Alarma de Intrusión";
  }
  if (/switch|extensor poe|\bups\b|inyector/.test(n)) return "Redes y Energía";
  if (/codificador|decodificador|encoder|tarjeta de (entrada|salida)|procesador de audio/.test(n)) {
    return "Video Profesional";
  }
  if (/bala|bullet/.test(n)) return "Cámaras Bala";
  if (/domo/.test(n)) return "Cámaras Domo";
  if (/turret|torre|eyeball/.test(n)) return "Cámaras Turret";
  if (/pinhole|oculta|box ip|panovu|doble lente|\bpt\b|anpr|solar/.test(n)) {
    return "Cámaras Especializadas";
  }
  return "Otros Equipos";
}

/** Especificaciones parseadas del nombre comercial. */
function deriveSpecifications(name, model) {
  const specs = {};

  const resolution =
    name.match(/(\d+(?:\.\d+)?)\s*(?:MP|Megap[ií]xel(?:es)?)/i) ||
    name.match(/\b(3K|4K|5K|8K)\b/i);
  if (resolution) {
    specs["Resolución"] = /^\d/.test(resolution[1])
      ? `${resolution[1]} MP`
      : resolution[1].toUpperCase();
  }

  const lens = name.match(/(\d+(?:\.\d+)?(?:\s*[-a]\s*\d+(?:\.\d+)?)?)\s*mm/i);
  if (lens) specs["Lente"] = `${lens[1].replace(/\s+/g, "")} mm`;
  if (/motorizad|lente mot\./i.test(name)) specs["Tipo de lente"] = "Motorizado";
  else if (/lente fijo/i.test(name)) specs["Tipo de lente"] = "Fijo";

  const ir = name.match(/(?:IR\s*(\d+)\s*m|(\d+)\s*mts?\s*IR|DORI\s*(\d+)\s*m)/i);
  if (ir) specs["Alcance IR"] = `${ir[1] || ir[2] || ir[3]} m`;

  const zoom = name.match(/(\d+)\s*X\s*Zoom/i);
  if (zoom) specs["Zoom óptico"] = `${zoom[1]}X`;

  const channels = name.match(/(\d+)\s*(?:CH|canales)/i);
  if (channels) specs["Canales"] = channels[1];

  const wdr = name.match(/WDR\s*(\d+)\s*dB/i);
  if (wdr) specs["WDR"] = `${wdr[1]} dB`;

  const ip = name.match(/\bIP6\d\b/i);
  if (ip) specs["Protección"] = ip[0].toUpperCase();
  const ik = name.match(/\bIK\d{2}\b/i);
  if (ik) specs["Antivandálico"] = ik[0].toUpperCase();

  if (/\bPoE\+?\b/i.test(name)) {
    specs["Alimentación"] = /PoE\+/i.test(name) ? "PoE+" : "PoE";
  }
  if (/micro\s*sd/i.test(name)) specs["Almacenamiento local"] = "Ranura microSD";
  if (/onvif/i.test(name)) specs["Estándar"] = "ONVIF";
  if (/h\.?265/i.test(name)) specs["Compresión"] = "H.265";
  if (/wifi|wi-fi/i.test(name)) specs["Conectividad"] = "Wi-Fi";
  if (/interior/i.test(name)) specs["Uso"] = "Interior";
  else if (/exterior/i.test(name)) specs["Uso"] = "Exterior";

  specs["Modelo"] = model;
  return specs;
}

/** Tecnologias destacadas que la gente busca por nombre. */
const HIGHLIGHT_RULES = [
  [/colorvu/i, "ColorVu: color 24/7"],
  [/colormaker/i, "ColorMaker: color en baja luz"],
  [/acusense/i, "AcuSense: filtra falsas alarmas"],
  [/acuseek/i, "AcuSeek: búsqueda inteligente"],
  [/darkfighter/i, "DarkFighter: visión nocturna extrema"],
  [/dual\s*light/i, "Dual Light: IR + luz blanca"],
  [/starlight/i, "Starlight: alta sensibilidad"],
  [/polar\s*day/i, "Polar Day: color en oscuridad"],
  [/audio bidireccional/i, "Audio bidireccional"],
  [/reconocimiento facial/i, "Reconocimiento facial"],
  [/placa|lpr/i, "Lectura de placas"],
  [/t[eé]rmica|bi-espectral/i, "Imagen térmica"],
  [/anti.?explosi/i, "Certificación anti-explosión"],
];

/** Ventajas derivadas de las specs, para que la ficha no caiga al texto generico. */
function deriveSpecHighlights(specs) {
  const extra = [];
  if (specs["Alimentación"]) {
    extra.push(`Alimentación ${specs["Alimentación"]}: datos y corriente en un cable`);
  }
  if (specs["Protección"]) extra.push(`Uso a la intemperie ${specs["Protección"]}`);
  if (specs["Alcance IR"]) extra.push(`Visión nocturna hasta ${specs["Alcance IR"]}`);
  if (specs["Zoom óptico"]) extra.push(`Zoom óptico ${specs["Zoom óptico"]}`);
  if (specs["Almacenamiento local"]) extra.push("Grabación local en microSD");
  if (specs["Tipo de lente"] === "Motorizado") {
    extra.push("Lente motorizado: encuadre remoto");
  }
  return extra;
}

function deriveHighlights(name, specs) {
  const fromTech = HIGHLIGHT_RULES.filter(([re]) => re.test(name)).map(
    ([, label]) => label
  );
  // Las tecnologias de marca primero; se rellena con specs hasta 4.
  return [...fromTech, ...deriveSpecHighlights(specs)].slice(0, 4);
}

/** Descripcion corta legible a partir del nombre comercial del distribuidor. */
function deriveShortDescription(name) {
  // Hikvision separa atributos con " / "; Tiandy con " - ". Se toman los
  // primeros tres para que la tarjeta y el meta description no se desborden.
  return name
    .replace(/^\[[^\]]*\]\s*/, "")
    .replace(/^\([^)]*\)\s*/, "")
    .split(/\s+\/\s+|\s+-\s+/)
    .slice(0, 3)
    .join(" · ")
    .trim();
}

function buildDescription(brandName, name, category) {
  const clean = name.replace(/\s*\/\s*/g, " · ");
  return (
    `${brandName} ${clean}. Equipo de la línea ${category.toLowerCase()} ` +
    `distribuido, instalado y configurado por ALFA en Guadalajara, Zapopan y toda la ` +
    `República Mexicana, con garantía oficial, puesta en marcha e integración a ALFA OS.`
  );
}

async function fetchBrand(brand) {
  const rows = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("products")
      .select("id, brand, model, name, image_url, category_id")
      .eq("brand", brand.name)
      .eq("is_active", true)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(`${brand.name}: ${error.message}`);
    rows.push(...data);
    if (data.length < pageSize) break;
  }

  return rows.filter((row) => {
    const name = row.name || "";
    if (!name.trim() || !row.model) return false;
    if (hasJunkName(name)) return false;
    if (ACCESSORY_PATTERNS.some((re) => re.test(name))) return false;
    if (brand.modelPrefixes && !brand.modelPrefixes.some((re) => re.test(row.model))) {
      return false;
    }
    return true;
  });
}

function buildProduct(brand, row, index) {
  const name = row.name.trim();
  const model = row.model.trim();
  const category = deriveCategory(name);
  const specifications = deriveSpecifications(name, model);
  const shortDescription = deriveShortDescription(name);
  const now = "2026-09-05T00:00:00.000Z";

  return {
    id: brand.startId + index,
    slug: `${brand.slug}-${slugify(model)}`,
    brand_id: brand.id,
    brand_name: brand.name,
    brand_slug: brand.slug,
    brand_logo_url: `/logos/brands/${brand.slug}.png`,
    brand_partner_tier: brand.partnerTier,
    model,
    name: `${brand.name} ${model}`,
    sku: null,
    short_description: shortDescription,
    description: buildDescription(brand.name, name, category),
    category,
    category_id: row.category_id ?? null,
    image_url: row.image_url || null,
    specifications,
    highlights: deriveHighlights(name, specifications),
    warranty_years: 1,
    is_favorite: false,
    is_public: true,
    is_active: true,
    seo_title: `${brand.name} ${model} | ${category} | Distribuidor ALFA México`,
    seo_description: `${shortDescription}. Suministro, instalación y garantía oficial ${brand.name} con ALFA en Guadalajara y toda México.`,
    seo_keywords: [
      `${brand.name} ${model}`,
      `${brand.name} México`,
      `${brand.name} Guadalajara`,
      category,
      `${brand.name} distribuidor`,
    ],
    created_at: now,
    updated_at: now,
  };
}

const PARTNER_TIERS = {
  hikvision: "Distribuidor Autorizado e Integrador Certificado",
  tiandy: "Distribuidor Autorizado e Integrador Certificado",
};

async function main() {
  for (const brand of BRANDS) {
    brand.partnerTier = PARTNER_TIERS[brand.slug];

    const rows = await fetchBrand(brand);
    const products = rows.map((row, index) => buildProduct(brand, row, index));

    const byCategory = {};
    for (const product of products) {
      byCategory[product.category] = (byCategory[product.category] || 0) + 1;
    }

    const header =
      `// GENERADO por scripts/generate-cctv-catalog.mjs — no editar a mano.\n` +
      `// Fuente: public.products (marca ${brand.name}, is_active).\n` +
      `// Sin precios ni costos: el catalogo publico es SEO + lead, no tienda.\n` +
      `// ${products.length} productos.\n\n` +
      `import { CatalogProduct } from "../catalog";\n\n` +
      `export const ${brand.slug.toUpperCase()}_CATALOG_PRODUCTS: CatalogProduct[] = `;

    const outPath = path.join("lib", "catalogData", `${brand.slug}.ts`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(
      outPath,
      `${header}${JSON.stringify(products, null, 2)};\n`,
      "utf8"
    );

    console.log(`${brand.name}: ${products.length} productos -> ${outPath}`);
    console.log(
      Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `   ${v.toString().padStart(4)}  ${k}`)
        .join("\n")
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
