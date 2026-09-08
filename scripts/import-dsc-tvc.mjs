/**
 * Alta / actualizacion de catalogo DSC desde la lista de precios de TVC.
 *
 * Criterio (el mismo de la carga de Tiandy):
 *   - costo = "Precio de Distribuidor USD" (lo que ALFA paga), en USD
 *   - pricing_method target_margin al 30% -> venta = costo / (1 - 0.30)
 *   - clave SAT por producto, tomada del archivo (todas validadas contra
 *     sat_product_service_catalog)
 *   - unidad H87 / PZA, objeto de impuesto 02, IVA 16
 *   - categoria "Alarma de Intrusion" (6), proveedor "TVC en Linea" (2)
 *   - mano de obra en 0: se arma por partida con las actividades de MO
 *   - imagen descargada del CDN de TVC y subida a Supabase Storage
 *
 * Duplicados (mismo modelo normalizado): NO se reescribe el producto, solo se
 * actualiza costo -> se recalcula la venta con SU margen y se sella
 * cost_updated_at. Se respetan nombre, categoria y mano de obra ya curados.
 *
 * Uso:
 *   node scripts/import-dsc-tvc.mjs --dry     (no escribe nada)
 *   node scripts/import-dsc-tvc.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { parse } from "node:path";
import { createClient } from "@supabase/supabase-js";

const CSV = process.env.DSC_CSV ||
  "C:/Users/Leo Figueroa/OneDrive/Desktop/products (1).csv";
const DRY = process.argv.includes("--dry");

const CATEGORY_ID = 6; // Alarma de Intrusion
const SUPPLIER_ID = 2; // TVC en Linea
const SUPPLIER_NAME = "TVC en Línea";
const TARGET_MARGIN = 30;
const BUCKET = "product-images";

const env = Object.fromEntries(
  fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

/** Parser CSV minimo con soporte de comillas y saltos dentro de campo. */
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const normModel = (m) => m.replace(/\s+/g, " ").trim();
const cmpModel = (m) => normModel(m).toUpperCase().replace(/\s+/g, "");

/** Quita el prefijo de marca/clave del proveedor: "DSC HS2032 - ...", "AV GMX001 - ..." */
function cleanName(raw, model) {
  let n = raw.replace(/\s+/g, " ").trim();
  n = n.replace(/^(DSC|AV)\s+[^\s]+\s*-\s*/i, "");
  n = n.replace(/^DSC[-\s]+/i, "");
  if (!n) n = `DSC ${model}`;
  return n;
}

function slugify(v) {
  return String(v).toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function uploadImage(url, slug) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = (url.split(".").pop() || "png").split("?")[0].toLowerCase();
  const filePath = `products/dsc-${slug}.${ext.length <= 4 ? ext : "png"}`;

  const { error } = await supabase.storage.from(BUCKET)
    .upload(filePath, buf, { contentType: res.headers.get("content-type") || "image/png", upsert: true });
  if (error) throw new Error(error.message);

  return supabase.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;
}

async function main() {
  const rows = parseCsv(fs.readFileSync(CSV, "utf8").replace(/^\uFEFF/, ""));
  const h = rows.findIndex((r) => r[0] === "ID");
  const cols = rows[h];
  const all = rows.slice(h + 1)
    .filter((r) => r.length === cols.length && /^\d+$/.test((r[0] || "").trim()))
    .map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]])));

  const esDsc = all.filter((d) => (d.Marca || "").trim().toUpperCase() === "DSC");

  // "Material POP" son artículos promocionales con logo (bolsa, mochila,
  // flexómetro). No son equipo cotizable, no entran al catálogo.
  const pop = esDsc.filter((d) => /material pop/i.test(d["Categoría 2"] || ""));
  const dsc = esDsc.filter((d) => !/material pop/i.test(d["Categoría 2"] || ""));

  console.log(`Filas DSC en el archivo: ${esDsc.length}`);
  console.log(`Excluidos por material promocional: ${pop.length} (${pop.map((d) => normModel(d.Modelo)).join(", ")})`);
  console.log(`A procesar: ${dsc.length}`);

  const { data: existing, error: exErr } = await supabase
    .from("products").select("id, model, cost_price, target_margin, pricing_method, image_url")
    .ilike("brand", "DSC");
  if (exErr) throw new Error(exErr.message);

  const byModel = new Map(existing.map((p) => [cmpModel(p.model || ""), p]));
  const result = { nuevos: [], actualizados: [], errores: [] };

  for (const d of dsc) {
    const model = normModel(d.Modelo);
    const cost = Number(d["Precio de Distribuidor USD"]) || 0;
    if (cost <= 0) { result.errores.push({ model, why: "sin costo" }); continue; }

    const hit = byModel.get(cmpModel(model));

    if (hit) {
      const margin = Number(hit.target_margin) || TARGET_MARGIN;
      const sale = Number((cost / (1 - margin / 100)).toFixed(2));
      result.actualizados.push({
        id: hit.id, model, costo_antes: Number(hit.cost_price), costo_nuevo: cost, venta_nueva: sale,
      });
      if (DRY) continue;
      const { error } = await supabase.from("products").update({
        cost_price: cost, cost_currency: "USD",
        calculated_sale_price: sale, cost_updated_at: new Date().toISOString(),
      }).eq("id", hit.id);
      if (error) result.errores.push({ model, why: error.message });
      continue;
    }

    const sale = Number((cost / (1 - TARGET_MARGIN / 100)).toFixed(2));
    const sat = (d["Clave SAT"] || "").trim();
    const name = cleanName(d.Nombre, model);

    let imageUrl = null;
    if (!DRY) {
      try { imageUrl = await uploadImage((d["Foto del Producto"] || "").trim(), slugify(model)); }
      catch (e) { result.errores.push({ model, why: `imagen: ${e.message}` }); }
    }

    result.nuevos.push({ model, name: name.slice(0, 60), costo: cost, venta: sale, sat });
    if (DRY) continue;

    const { data, error } = await supabase.from("products").insert({
      sku: "", brand: "DSC", model, name,
      description: (d["Categoría 2"] || "").replace(/^\s*>\s*/, "").trim(),
      category: "Alarma de Intrusión", category_id: CATEGORY_ID,
      supplier: SUPPLIER_NAME, supplier_id: SUPPLIER_ID,
      image_url: imageUrl,
      cost_price: cost, cost_currency: "USD", cost_updated_at: new Date().toISOString(),
      pricing_method: "target_margin", target_margin: TARGET_MARGIN,
      public_price: Number(d["Precio de Lista USD"]) || 0,
      calculated_sale_price: sale, sale_currency: "USD",
      labor_unit_cost: 0, labor_sale_multiplier: 2, labor_unit_sale_price: 0,
      sat_product_key: sat, sat_product_service_code: sat,
      sat_unit_key: "H87", sat_unit_code: "H87", sat_unit_name: "PZA", unit_name: "PZA",
      fiscal_object: "02", tax_rate: 16,
      is_favorite: false, partner_discount_eligible: true, is_active: true,
    }).select("id").single();

    if (error) result.errores.push({ model, why: error.message });
    else result.nuevos[result.nuevos.length - 1].id = data.id;
  }

  console.log(`\n${DRY ? "[DRY RUN] " : ""}Nuevos: ${result.nuevos.length}   Actualizados: ${result.actualizados.length}   Errores: ${result.errores.length}`);
  console.log("\n--- Actualizados (costo) ---");
  for (const a of result.actualizados) {
    console.log(`  #${a.id} ${a.model.padEnd(20)} ${String(a.costo_antes).padStart(8)} -> ${String(a.costo_nuevo).padStart(8)}   venta ${a.venta_nueva}`);
  }
  if (result.errores.length) {
    console.log("\n--- Errores ---");
    for (const e of result.errores) console.log(`  ${e.model}: ${e.why}`);
  }

  const outPath = path.join(process.env.TEMP || ".", `dsc-import-${DRY ? "dry" : "run"}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
  console.log(`\nDetalle completo: ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
