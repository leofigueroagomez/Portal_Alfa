#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SOURCE_BASE =
  "https://raw.githubusercontent.com/phpcfdi/resources-sat-catalogs/master/database/data";

const TABLES = {
  productServices: "cfdi_40_productos_servicios",
  units: "cfdi_40_claves_unidades",
  fiscalRegimes: "cfdi_40_regimenes_fiscales",
  cfdiUses: "cfdi_40_usos_cfdi",
  taxObjects: "cfdi_40_objetos_impuestos",
};

const OUTPUT_FILE = path.join("sql", "generated", "sat_catalog_seed.sql");
const APPLY = process.argv.includes("--apply");
const DRY_RUN = process.argv.includes("--dry-run");
const WRITE_SQL = !DRY_RUN && (process.argv.includes("--write-sql") || !APPLY);
const today = new Date().toISOString().slice(0, 10);

function isActive(vigenciaHasta) {
  const clean = String(vigenciaHasta || "").trim();
  return !clean || clean >= today;
}

function truthyCatalogFlag(value) {
  return String(value || "").trim() === "1";
}

function personType(aplicaFisica, aplicaMoral) {
  const physical = truthyCatalogFlag(aplicaFisica);
  const moral = truthyCatalogFlag(aplicaMoral);

  if (physical && moral) return "both";
  if (moral) return "moral";
  return "physical";
}

async function fetchCatalogSql(table) {
  const response = await fetch(`${SOURCE_BASE}/${table}.sql`);

  if (!response.ok) {
    throw new Error(`No se pudo descargar ${table}: HTTP ${response.status}`);
  }

  return response.text();
}

function parseSqlValues(valuesText) {
  const values = [];
  let current = "";
  let inString = false;

  for (let index = 0; index < valuesText.length; index += 1) {
    const char = valuesText[index];
    const next = valuesText[index + 1];

    if (inString) {
      if (char === "'" && next === "'") {
        current += "'";
        index += 1;
        continue;
      }

      if (char === "'") {
        inString = false;
        continue;
      }

      current += char;
      continue;
    }

    if (char === "'") {
      inString = true;
      continue;
    }

    if (char === ",") {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function extractRows(sql, table) {
  const marker = `INSERT INTO ${table} VALUES(`;
  const rows = [];
  let cursor = 0;

  while (cursor < sql.length) {
    const start = sql.indexOf(marker, cursor);
    if (start === -1) break;

    let index = start + marker.length;
    let inString = false;

    for (; index < sql.length; index += 1) {
      const char = sql[index];
      const next = sql[index + 1];

      if (inString) {
        if (char === "'" && next === "'") {
          index += 1;
          continue;
        }

        if (char === "'") {
          inString = false;
        }

        continue;
      }

      if (char === "'") {
        inString = true;
        continue;
      }

      if (char === ")" && next === ";") {
        rows.push(parseSqlValues(sql.slice(start + marker.length, index)));
        cursor = index + 2;
        break;
      }
    }
  }

  return rows;
}

function normalizeCatalogs(rowsByTable) {
  return {
    sat_product_service_catalog: rowsByTable.productServices.map((row) => ({
      code: row[0],
      description: row[1],
      is_active: isActive(row[6]),
    })),
    sat_unit_catalog: rowsByTable.units.map((row) => ({
      code: row[0],
      name: row[1],
      description: row[2] || row[3] || row[6] || null,
      is_active: isActive(row[5]),
    })),
    fiscal_regime_catalog: rowsByTable.fiscalRegimes.map((row) => ({
      code: row[0],
      name: row[1],
      applies_to_person_type: personType(row[2], row[3]),
      is_active: isActive(row[5]),
    })),
    cfdi_use_catalog: rowsByTable.cfdiUses.map((row) => ({
      code: row[0],
      name: row[1],
      applies_to_person_type: personType(row[2], row[3]),
      is_active: isActive(row[5]),
    })),
    tax_object_catalog: rowsByTable.taxObjects.map((row) => ({
      code: row[0],
      name: row[1],
      is_active: isActive(row[3]),
    })),
  };
}

function sqlValue(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildInsertSql(table, rows) {
  if (rows.length === 0) return "";

  const columns = Object.keys(rows[0]);
  const updateColumns = columns.filter((column) => column !== "code");
  const values = rows
    .map(
      (row) =>
        `(${columns.map((column) => sqlValue(row[column])).join(", ")})`
    )
    .join(",\n");

  return [
    `update public.${table} set is_active = false;`,
    `insert into public.${table} (${columns.join(", ")})`,
    `values\n${values}`,
    "on conflict (code) do update",
    `set ${updateColumns
      .map((column) => `${column} = excluded.${column}`)
      .join(", ")};`,
  ].join("\n");
}

async function loadCatalogs() {
  const entries = await Promise.all(
    Object.entries(TABLES).map(async ([key, table]) => {
      const sql = await fetchCatalogSql(table);
      return [key, extractRows(sql, table)];
    })
  );

  return normalizeCatalogs(Object.fromEntries(entries));
}

async function writeSeedSql(catalogs) {
  const chunks = [
    "-- Generated by scripts/import-sat-catalogs.mjs",
    "-- Source: phpcfdi/resources-sat-catalogs generated from SAT CFDI 4.0 catalogs.",
    ...Object.entries(catalogs).map(([table, rows]) => buildInsertSql(table, rows)),
  ];

  await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, `${chunks.join("\n\n")}\n`, "utf8");
  console.log(`Seed SQL escrito en ${OUTPUT_FILE}`);
}

async function applyToSupabase(catalogs) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Para --apply configura SUPABASE_URL o NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const [table, rows] of Object.entries(catalogs)) {
    console.log(`Importando ${table}: ${rows.length} registros`);

    const { error: deactivateError } = await supabase
      .from(table)
      .update({ is_active: false })
      .neq("code", "__never__");

    if (deactivateError) throw deactivateError;

    for (let index = 0; index < rows.length; index += 1000) {
      const batch = rows.slice(index, index + 1000);
      const { error } = await supabase.from(table).upsert(batch, {
        onConflict: "code",
      });

      if (error) throw error;
    }
  }
}

const catalogs = await loadCatalogs();

if (WRITE_SQL) await writeSeedSql(catalogs);
if (APPLY && !DRY_RUN) await applyToSupabase(catalogs);

console.log(
  Object.entries(catalogs)
    .map(([table, rows]) => `${table}: ${rows.length}`)
    .join(" | ")
);
