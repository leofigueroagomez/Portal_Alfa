/**
 * Alta / actualizacion de catalogo desde la lista de precios de Syscom.
 *
 * Mismo criterio que el importador de DSC/TVC:
 *   - costo = columna "Su Precio" (validada contra el catalogo: coincide exacto)
 *   - target_margin 30% -> venta = costo / 0.70
 *   - clave SAT por producto ("Codigo Fiscal"), validada contra el catalogo SAT
 *   - unidad H87 / PZA, objeto de impuesto 02, IVA 16
 *   - mano de obra en 0: se arma por partida con las actividades
 *   - imagen descargada del CDN de Syscom y subida a Supabase Storage
 *
 * Duplicados por modelo normalizado: solo actualiza costo, recalcula la venta
 * con SU margen y sella cost_updated_at. Respeta nombre, categoria y MO curados.
 *
 * Uso:
 *   node scripts/import-syscom.mjs --marca HIKVISION --dry
 *   node scripts/import-syscom.mjs --marca HIKVISION
 *   node scripts/import-syscom.mjs --alarma --dry
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const CSV = process.env.SYSCOM_CSV ||
  "C:/Users/Leo Figueroa/OneDrive/Desktop/ProductosHora.csv";
const DRY = process.argv.includes("--dry");
const MARCA = (() => {
  const i = process.argv.indexOf("--marca");
  return i >= 0 ? (process.argv[i + 1] || "").toUpperCase() : null;
})();
const MODO_ALARMA = process.argv.includes("--alarma");

const TARGET_MARGIN = 30;
const BUCKET = "product-images";
const SUPPLIER_ID = 1;            // Syscom
const SUPPLIER_NAME = "Syscom";

const env = Object.fromEntries(
  fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/** Parser CSV en streaming: el archivo pesa ~175 MB por el HTML de Descripcion. */
function* filas(texto) {
  let row = [], field = "", quoted = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (quoted) {
      if (c === '"') { if (texto[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); yield row; row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); yield row; }
}

/** Categorias del catalogo interno, por palabra clave del titulo. */
function categoriaPara(titulo) {
  const t = titulo.toLowerCase();
  if (/ax pro|ax hybrid|alarma|intrusi|detector pir|\bpir\b|contacto magn|sirena|estrobo|p[aá]nico|rotura de cristal/.test(t)) return 6;   // Alarma de Intrusión
  if (/c[aá]mara|domo|bala|turret|nvr|dvr|turbohd|videoportero/.test(t)) return 7;  // CCTV
  if (/control de acceso|biom[eé]tric|huella|cerradura|torniquete/.test(t)) return 8;
  if (/switch|router|access point|patch|utp|cat ?[56]/.test(t)) return 1;
  return null;
}

/** Filtro para "lo que sirve en cotizaciones de alarma de intrusion". */
const ALARMA_INCLUIR = [
  /\bax pro\b/i, /\bax hybrid\b/i, /panel de alarma/i, /detector pir/i, /\bpir\b/i,
  /doble tecnolog/i, /contacto magn/i, /sirena/i, /estrobo/i, /bot[oó]n de p[aá]nico/i,
  /rotura de cristal/i, /detector de humo/i, /teclado.*alarma|alarma.*teclado/i,
  /comunicador.*alarma|alarma.*comunicador/i, /bater[ií]a de respaldo/i, /sensor de movimiento/i,
];
const ALARMA_EXCLUIR = [
  /c[aá]mara|domo ip|bala ip|turret|nvr|dvr|turbohd|videoportero/i,
  /rack|patch panel|fibra|jack|keystone|charola|canaleta/i,
  /taladro|martillo|desarmador|broca|pinza|escalera/i,
  /sem[aá]foro|torreta|baliza|luz de obstrucci/i,
  /antena|radio|repetidor|microondas de enlace/i,
];
const MARCAS_ALARMA = new Set([
  "HIKVISION", "DSC", "HONEYWELL HOME RESIDEO", "OPTEX", "BOSCH", "SFIRE",
  "SECO-LARM", "EPCOM", "EPCOM POWERLINE", "ACCESSPRO", "POWER SONIC",
]);

function sirveParaAlarma(marca, titulo) {
  if (!MARCAS_ALARMA.has(marca.toUpperCase())) return false;
  if (ALARMA_EXCLUIR.some((re) => re.test(titulo))) return false;
  return ALARMA_INCLUIR.some((re) => re.test(titulo));
}

const normModel = (m) => m.replace(/\s+/g, " ").trim();
const cmpModel = (m) => normModel(m).toUpperCase().replace(/\s+/g, "");
const slugify = (v) => String(v).toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

async function subirImagen(url, slug) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = ((url.split("?")[0].split(".").pop() || "jpg").toLowerCase().match(/^[a-z]{3,4}$/) || ["jpg"])[0];
  const filePath = `products/syscom-${slug}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET)
    .upload(filePath, buf, { contentType: res.headers.get("content-type") || "image/jpeg", upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;
}

async function main() {
  if (!MARCA && !MODO_ALARMA) throw new Error("Usa --marca <MARCA> o --alarma");

  const texto = fs.readFileSync(CSV, "utf8").replace(/^\uFEFF/, "");
  const it = filas(texto);
  const cols = it.next().value;
  const ix = Object.fromEntries(cols.map((c, i) => [c, i]));
  const g = (row, c) => (row[ix[c]] || "").trim();

  const seleccion = [];
  for (const row of it) {
    if (row.length < cols.length) continue;
    const marca = g(row, "Marca");
    const titulo = g(row, "Título");
    const modelo = normModel(g(row, "Modelo"));
    const costo = Number(g(row, "Su Precio"));
    if (!modelo || !titulo || !(costo > 0)) continue;
    if (MARCA && marca.toUpperCase() !== MARCA) continue;
    if (MODO_ALARMA && !sirveParaAlarma(marca, titulo)) continue;
    seleccion.push({ marca, modelo, titulo, costo,
      sat: g(row, "Código Fiscal"), img: g(row, "Imagen Principal") });
  }
  console.log(`Seleccionados del archivo: ${seleccion.length}`);

  // catalogo actual (paginado: el API corta en 1000)
  const existentes = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("products")
      .select("id, brand, model, target_margin, pricing_method")
      .order("id").range(from, from + 999);
    if (error) throw new Error(error.message);
    existentes.push(...data);
    if (data.length < 1000) break;
  }
  const porModelo = new Map(existentes.map((p) => [cmpModel(p.model || ""), p]));

  const res = { nuevos: [], actualizados: [], errores: [] };

  for (const p of seleccion) {
    const hit = porModelo.get(cmpModel(p.modelo));
    const venta = (c, m) => Number((c / (1 - (m || TARGET_MARGIN) / 100)).toFixed(2));

    if (hit) {
      if (hit.pricing_method !== "target_margin") { res.actualizados.push({ ...p, nota: "precio manual, solo costo" }); }
      const nueva = venta(p.costo, Number(hit.target_margin));
      res.actualizados.push({ id: hit.id, modelo: p.modelo, costo: p.costo, venta: nueva });
      if (DRY) continue;
      const patch = { cost_price: p.costo, cost_currency: "USD", cost_updated_at: new Date().toISOString() };
      if (hit.pricing_method === "target_margin") patch.calculated_sale_price = nueva;
      const { error } = await supabase.from("products").update(patch).eq("id", hit.id);
      if (error) res.errores.push({ modelo: p.modelo, why: error.message });
      continue;
    }

    res.nuevos.push({ modelo: p.modelo, marca: p.marca, costo: p.costo, venta: venta(p.costo), titulo: p.titulo.slice(0, 60) });
    if (DRY) continue;

    let imageUrl = null;
    if (p.img) { try { imageUrl = await subirImagen(p.img, slugify(p.modelo)); } catch (e) { res.errores.push({ modelo: p.modelo, why: `imagen: ${e.message}` }); } }

    const { error } = await supabase.from("products").insert({
      sku: "", brand: p.marca, model: p.modelo, name: p.titulo, description: "",
      category_id: categoriaPara(p.titulo), supplier: SUPPLIER_NAME, supplier_id: SUPPLIER_ID,
      image_url: imageUrl,
      cost_price: p.costo, cost_currency: "USD", cost_updated_at: new Date().toISOString(),
      pricing_method: "target_margin", target_margin: TARGET_MARGIN,
      calculated_sale_price: venta(p.costo), sale_currency: "USD",
      labor_unit_cost: 0, labor_sale_multiplier: 2, labor_unit_sale_price: 0,
      sat_product_key: p.sat, sat_product_service_code: p.sat,
      sat_unit_key: "H87", sat_unit_code: "H87", sat_unit_name: "PZA", unit_name: "PZA",
      fiscal_object: "02", tax_rate: 16,
      is_favorite: false, partner_discount_eligible: true, is_active: true,
    });
    if (error) res.errores.push({ modelo: p.modelo, why: error.message });
  }

  console.log(`${DRY ? "[DRY] " : ""}Nuevos: ${res.nuevos.length}  Actualizados: ${res.actualizados.length}  Errores: ${res.errores.length}`);
  const out = path.join(process.env.TEMP || ".", `syscom-${MARCA || "alarma"}-${DRY ? "dry" : "run"}.json`);
  fs.writeFileSync(out, JSON.stringify(res, null, 2), "utf8");
  console.log("Detalle:", out);
}

main().catch((e) => { console.error(e); process.exit(1); });
