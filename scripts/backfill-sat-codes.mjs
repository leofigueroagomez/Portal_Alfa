/**
 * Backfill de la clave SAT de producto y unidad en el catalogo.
 *
 * Contexto: la facturacion lee SOLO `sat_product_service_code` y `sat_unit_code`
 * (lib/productFiscalData.ts, sin fallback). Las columnas `sat_product_key` /
 * `sat_unit_key` son las viejas: los productos cargados antes de que existiera la
 * validacion contra el catalogo SAT se quedaron con la llave y sin el codigo, y por
 * eso no se pueden timbrar sin corregir el concepto a mano.
 *
 * Misma semantica que ya aplica QuickCreateProductButton.tsx:
 *   sat_product_service_code = sat_product_service_code || sat_product_key
 *
 * Fase A  llave -> codigo, solo si la llave existe y esta activa en el catalogo SAT.
 * Fase B  para lo que quedo sin codigo, cruza el modelo contra la columna
 *         "Codigo Fiscal" de la lista de precios de Syscom y valida igual.
 *
 * Nunca pisa un `sat_product_service_code` que ya tenga valor.
 * Toda clave se valida contra sat_product_service_catalog / sat_unit_catalog activos:
 * si no valida, el producto se reporta como pendiente y no se toca.
 *
 * Uso:
 *   node scripts/backfill-sat-codes.mjs --dry
 *   node scripts/backfill-sat-codes.mjs
 *   node scripts/backfill-sat-codes.mjs --dry --sin-csv    (solo fase A)
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const CSV = process.env.SYSCOM_CSV ||
  "C:/Users/Leo Figueroa/OneDrive/Desktop/ProductosHora.csv";
const DRY = process.argv.includes("--dry");
const SIN_CSV = process.argv.includes("--sin-csv");

const UNIDAD_DEFAULT = { code: "H87", name: "PZA" };

const env = Object.fromEntries(
  fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const limpio = (v) => (v == null ? "" : String(v).trim());
const cmpModel = (m) => limpio(m).toUpperCase().replace(/\s+/g, "");

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

async function traerTodo(tabla, columnas) {
  const filas = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(tabla).select(columnas)
      .order("code", { ascending: true }).range(from, from + 999);
    if (error) throw new Error(`${tabla}: ${error.message}`);
    filas.push(...data);
    if (data.length < 1000) break;
  }
  return filas;
}

async function main() {
  // Catalogos SAT vigentes: nada se escribe sin pasar por aqui.
  const [productos, unidades] = await Promise.all([
    traerTodo("sat_product_service_catalog", "code, is_active"),
    traerTodo("sat_unit_catalog", "code, is_active"),
  ]);
  const codigoValido = new Set(productos.filter((c) => c.is_active).map((c) => c.code));
  const unidadValida = new Set(unidades.filter((c) => c.is_active).map((c) => c.code));
  console.log(`Catalogo SAT activo: ${codigoValido.size} claves de producto, ${unidadValida.size} unidades`);

  const catalogo = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("products")
      .select("id, brand, model, name, sat_product_key, sat_product_service_code, sat_unit_key, sat_unit_code, sat_unit_name, unit_name")
      .order("id").range(from, from + 999);
    if (error) throw new Error(error.message);
    catalogo.push(...data);
    if (data.length < 1000) break;
  }
  console.log(`Productos en catalogo: ${catalogo.length}`);

  const res = { faseA: [], faseB: [], pendientes: [], errores: [] };
  const plan = new Map(); // id -> patch

  const parche = (id) => {
    if (!plan.has(id)) plan.set(id, {});
    return plan.get(id);
  };

  // --- Fase A: la llave vieja, si es valida, se copia al campo que lee la factura.
  for (const p of catalogo) {
    const code = limpio(p.sat_product_service_code);
    const key = limpio(p.sat_product_key);
    if (!code && key && codigoValido.has(key)) {
      parche(p.id).sat_product_service_code = key;
      res.faseA.push({ id: p.id, modelo: p.model, code: key, via: "sat_product_key" });
    }

    const uCode = limpio(p.sat_unit_code);
    const uKey = limpio(p.sat_unit_key);
    if (!uCode && uKey && unidadValida.has(uKey)) {
      const patch = parche(p.id);
      patch.sat_unit_code = uKey;
      if (!limpio(p.sat_unit_name)) patch.sat_unit_name = limpio(p.unit_name) || UNIDAD_DEFAULT.name;
    }
  }

  // --- Fase B: lo que sigue sin codigo, se busca en la lista de precios de Syscom.
  const sinCodigo = catalogo.filter(
    (p) => !limpio(p.sat_product_service_code) && !plan.get(p.id)?.sat_product_service_code
  );

  if (sinCodigo.length && !SIN_CSV) {
    if (!fs.existsSync(CSV)) throw new Error(`No encuentro el CSV de Syscom: ${CSV}`);
    const buscados = new Map(sinCodigo.map((p) => [cmpModel(p.model), p]));
    const texto = fs.readFileSync(CSV, "utf8").replace(/^\uFEFF/, "");
    const it = filas(texto);
    const cols = it.next().value;
    const ix = Object.fromEntries(cols.map((c, i) => [c, i]));

    for (const row of it) {
      if (row.length < cols.length) continue;
      const p = buscados.get(cmpModel(row[ix["Modelo"]]));
      if (!p) continue;
      const fiscal = limpio(row[ix["Código Fiscal"]]);
      if (!fiscal || !codigoValido.has(fiscal)) continue;
      const patch = parche(p.id);
      patch.sat_product_service_code = fiscal;
      // La llave vieja se rellena si venia vacia, y se corrige si traia basura
      // (hay renglones con el modelo capturado en el campo de clave SAT).
      const llave = limpio(p.sat_product_key);
      if (!llave || !codigoValido.has(llave)) patch.sat_product_key = fiscal;
      res.faseB.push({ id: p.id, modelo: p.model, code: fiscal, via: "csv Syscom" });
      buscados.delete(cmpModel(p.model));
    }
  }

  // Unidad por omision para lo que ni llave tenia: PZA es la unidad del catalogo.
  for (const p of catalogo) {
    // Aplica a todo el que termine con clave de producto, la traiga ya o se la demos:
    // sin unidad el timbrado se cae igual.
    const conClave = limpio(p.sat_product_service_code) || plan.get(p.id)?.sat_product_service_code;
    if (!conClave) continue;
    if (limpio(p.sat_unit_code) || plan.get(p.id)?.sat_unit_code) continue;
    const patch = parche(p.id);
    if (!unidadValida.has(UNIDAD_DEFAULT.code)) continue;
    patch.sat_unit_code = UNIDAD_DEFAULT.code;
    if (!limpio(p.sat_unit_key)) patch.sat_unit_key = UNIDAD_DEFAULT.code;
    if (!limpio(p.sat_unit_name)) patch.sat_unit_name = limpio(p.unit_name) || UNIDAD_DEFAULT.name;
  }

  // Lo que sigue sin clave de producto: se reporta, no se inventa.
  for (const p of catalogo) {
    if (limpio(p.sat_product_service_code)) continue;
    if (plan.get(p.id)?.sat_product_service_code) continue;
    res.pendientes.push({
      id: p.id, marca: p.brand, modelo: p.model, nombre: limpio(p.name).slice(0, 70),
      llave_invalida: limpio(p.sat_product_key) || null,
    });
  }

  console.log(`${DRY ? "[DRY] " : ""}Fase A (llave->codigo): ${res.faseA.length}  Fase B (CSV): ${res.faseB.length}  Productos a tocar: ${plan.size}  Pendientes: ${res.pendientes.length}`);

  if (!DRY) {
    // Respaldo del estado previo de los renglones que se van a tocar: es el rollback.
    const previo = catalogo.filter((p) => plan.has(p.id)).map((p) => ({
      id: p.id,
      sat_product_service_code: p.sat_product_service_code,
      sat_product_key: p.sat_product_key,
      sat_unit_code: p.sat_unit_code,
      sat_unit_key: p.sat_unit_key,
      sat_unit_name: p.sat_unit_name,
    }));
    const bak = path.join(process.env.TEMP || ".", `backfill-sat-previo-${Date.now()}.json`);
    fs.writeFileSync(bak, JSON.stringify(previo, null, 2), "utf8");
    console.log(`Respaldo previo (${previo.length} renglones):`, bak);

    // Se agrupa por parche identico para no mandar mil updates de un renglon.
    const grupos = new Map();
    for (const [id, patch] of plan) {
      const k = JSON.stringify(patch);
      if (!grupos.has(k)) grupos.set(k, { patch, ids: [] });
      grupos.get(k).ids.push(id);
    }
    console.log(`Aplicando en ${grupos.size} grupos...`);
    for (const { patch, ids } of grupos.values()) {
      for (let i = 0; i < ids.length; i += 200) {
        const lote = ids.slice(i, i + 200);
        const { error } = await supabase.from("products").update(patch).in("id", lote);
        if (error) res.errores.push({ ids: lote, patch, why: error.message });
      }
    }
    console.log(`Errores: ${res.errores.length}`);
  }

  const out = path.join(process.env.TEMP || ".", `backfill-sat-${DRY ? "dry" : "run"}.json`);
  fs.writeFileSync(out, JSON.stringify(res, null, 2), "utf8");
  console.log("Detalle:", out);
}

main().catch((e) => { console.error(e); process.exit(1); });
