/**
 * Alta de Ubiquiti desde la lista de Syscom (misma logica que scripts/import-syscom.mjs).
 * Diferencias: marca normalizada a "Ubiquiti", categorias para toda la linea (sin nulls),
 * y los existentes solo se actualizan si su costo es anterior a la fecha del CSV.
 *
 * Uso (desde la raiz del repo):
 *   node scripts/import-ubiquiti.mjs --dry
 *   node scripts/import-ubiquiti.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const DRY = process.argv.includes("--dry");
const CSV = process.env.SYSCOM_CSV ||
  "C:/Users/Leo Figueroa/OneDrive/Desktop/ProductosHora.csv";
const CSV_FECHA = new Date(fs.statSync(CSV).mtime);

const TARGET_MARGIN = 30, BUCKET = "product-images", SUPPLIER_ID = 1, SUPPLIER_NAME = "Syscom", BRAND = "Ubiquiti";

const env = Object.fromEntries(fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split("\n")
  .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
  .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function* filas(texto) {
  let row = [], field = "", quoted = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (quoted) { if (c === '"') { if (texto[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += c; }
    else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); yield row; row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
}

/** Protect -> CCTV, Access -> Control de Acceso, rack -> Site, energia -> UPS, resto -> Voz y Datos. */
function categoria(modelo, titulo) {
  const t = titulo.toLowerCase(), m = modelo.toUpperCase();
  if (/^UPS-/.test(m) || /\bups\b|no ?break/.test(t)) return 13;
  if (/^USL-|^UP-ALARMHUB|^UP-SIREN/.test(m)) return 6;                       // SuperLink = alarma
  if (/^UPL-|^UACC-IN-(CEILING|WALL)-SPEAKER/.test(m)) return 2;               // UniFi Play
  if (/^UACC-LOCK-STRIKE/.test(m)) return 8;
  if (/^USW-FLEX-UTILITY/.test(m)) return 12;
  if (/^(USW|UDM|UCG|UX|UNAS|UACC-SSD|UACC-UTS|UACC-ETH-SP-(DIN|PRO)|ETH-SP|UC-EV)/.test(m)) return 1;
  if (/^UVC-G6-(PRO-)?ENTRY|^UA-|^EAH-|^UACC-(READER|INTERCOM|JUNCTION)/.test(m)) return 8;
  if (/^UVC-|^UP-|^UNVR|^UACC-(AI|CAMERA|CHIME)|^AI-|c[aá]mara|videoportero|unifi protect/.test(m + " " + t)) return 7;
  if (/rack|gabinete|organizador|charola/.test(t)) return 12;
  return 1;
}

const normModel = (m) => m.replace(/\s+/g, " ").trim();
const cmpModel = (m) => normModel(m).toUpperCase().replace(/\s+/g, "");
const slugify = (v) => String(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const venta = (c, m) => Number((c / (1 - (m || TARGET_MARGIN) / 100)).toFixed(2));

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

const texto = fs.readFileSync(CSV, "utf8").replace(/^\uFEFF/, "");
const it = filas(texto);
const cols = it.next().value;
const ix = Object.fromEntries(cols.map((c, i) => [c, i]));
const g = (row, c) => (row[ix[c]] || "").trim();

const seleccion = new Map();
for (const row of it) {
  if (row.length < cols.length || !/^ubiquiti/i.test(g(row, "Marca"))) continue;
  const modelo = normModel(g(row, "Modelo")), titulo = g(row, "Título"), costo = Number(g(row, "Su Precio"));
  if (!modelo || !titulo || !(costo > 0)) continue;
  seleccion.set(cmpModel(modelo), { modelo, titulo, costo, sat: g(row, "Código Fiscal"), img: g(row, "Imagen Principal") });
}

const existentes = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase.from("products")
    .select("id, model, target_margin, pricing_method, cost_currency, cost_updated_at").order("id").range(from, from + 999);
  if (error) throw new Error(error.message);
  existentes.push(...data);
  if (data.length < 1000) break;
}
const porModelo = new Map(existentes.map((p) => [cmpModel(p.model || ""), p]));

const res = { csv_fecha: CSV_FECHA.toISOString(), nuevos: [], actualizados: [], omitidos: [], errores: [] };
const altas = [];
for (const p of seleccion.values()) {
  const hit = porModelo.get(cmpModel(p.modelo));
  if (hit) {
    const masNuevo = hit.cost_updated_at && new Date(hit.cost_updated_at) >= CSV_FECHA;
    if (masNuevo || hit.cost_currency !== "USD" || hit.pricing_method !== "target_margin") {
      res.omitidos.push({ id: hit.id, modelo: p.modelo, motivo: masNuevo ? "costo mas nuevo que el CSV" : "moneda/metodo distinto" });
      continue;
    }
    const nueva = venta(p.costo, Number(hit.target_margin));
    res.actualizados.push({ id: hit.id, modelo: p.modelo, costo: p.costo, venta: nueva });
    if (DRY) continue;
    const { error } = await supabase.from("products").update({ cost_price: p.costo, cost_currency: "USD",
      sale_currency: "USD", calculated_sale_price: nueva, cost_updated_at: CSV_FECHA.toISOString() }).eq("id", hit.id);
    if (error) res.errores.push({ modelo: p.modelo, why: error.message });
    continue;
  }
  res.nuevos.push({ modelo: p.modelo, costo: p.costo, venta: venta(p.costo), categoria: categoria(p.modelo, p.titulo), titulo: p.titulo.slice(0, 70) });
  if (!DRY) altas.push(p);
}

async function alta(p) {
  let imageUrl = null;
  if (p.img) { try { imageUrl = await subirImagen(p.img, slugify(p.modelo)); } catch (e) { res.errores.push({ modelo: p.modelo, why: `imagen: ${e.message}` }); } }
  const { data, error } = await supabase.from("products").insert({
    sku: "", brand: BRAND, model: p.modelo, name: p.titulo, description: "",
    category_id: categoria(p.modelo, p.titulo), supplier: SUPPLIER_NAME, supplier_id: SUPPLIER_ID, image_url: imageUrl,
    cost_price: p.costo, cost_currency: "USD", cost_updated_at: CSV_FECHA.toISOString(),
    pricing_method: "target_margin", target_margin: TARGET_MARGIN, calculated_sale_price: venta(p.costo), sale_currency: "USD",
    labor_unit_cost: 0, labor_sale_multiplier: 2, labor_unit_sale_price: 0,
    sat_product_key: p.sat, sat_product_service_code: p.sat,
    sat_unit_key: "H87", sat_unit_code: "H87", sat_unit_name: "PZA", unit_name: "PZA",
    fiscal_object: "02", tax_rate: 16, is_favorite: false, partner_discount_eligible: true, is_active: true,
  }).select("id").single();
  if (error) res.errores.push({ modelo: p.modelo, why: error.message });
  else res.nuevos.find((n) => n.modelo === p.modelo).id = data.id;
}
const cola = [...altas];
await Promise.all(Array.from({ length: 8 }, async () => { while (cola.length) await alta(cola.shift()); }));

const cats = {};
for (const n of res.nuevos) cats[n.categoria] = (cats[n.categoria] || 0) + 1;
console.log(`${DRY ? "[DRY] " : ""}Nuevos: ${res.nuevos.length}  Actualizados: ${res.actualizados.length}  Omitidos: ${res.omitidos.length}  Errores: ${res.errores.length}`);
console.log("Categorias de los nuevos:", cats);
const out = path.join(process.env.TEMP || ".", `ubiquiti-${DRY ? "dry" : "run"}.json`);
fs.writeFileSync(out, JSON.stringify(res, null, 2), "utf8");
console.log("Detalle:", out);
