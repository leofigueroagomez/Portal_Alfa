import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { RawFinding } from "./types";

/**
 * Anade nombres legibles a los hallazgos: en vez de "proyecto 48" el brief
 * muestra "Marsella 4064 - Eduardo Venzor". Resuelve en lote por tipo de entidad
 * y reescribe titulo y resumen para no dejar el numero pelon.
 */

type Entry = { label: string; short: string };

function uniqueIds(findings: RawFinding[], entityType: string): string[] {
  return Array.from(
    new Set(
      findings
        .filter((finding) => finding.entityType === entityType && finding.entityId)
        .map((finding) => finding.entityId as string),
    ),
  );
}

async function resolveProjects(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, Entry>> {
  const map = new Map<string, Entry>();
  const numericIds = ids.map(Number).filter((value) => Number.isFinite(value));
  if (numericIds.length === 0) return map;

  const { data: projects, error } = await supabase
    .from("client_projects")
    .select("id, name, client_id")
    .in("id", numericIds);
  if (error) throw error;

  const rows = (projects ?? []) as { id: number; name: string | null; client_id: number | null }[];
  const clientIds = Array.from(
    new Set(rows.map((row) => row.client_id).filter((value): value is number => Boolean(value))),
  );

  const GENERIC_COMPANY = new Set(["personas fisicas", "personas físicas", "persona fisica", "persona física"]);
  const clientNames = new Map<number, string>();
  if (clientIds.length > 0) {
    const { data: clients, error: clientError } = await supabase
      .from("clients")
      .select("id, name, company_name")
      .in("id", clientIds);
    if (clientError) throw clientError;
    for (const client of (clients ?? []) as {
      id: number;
      name: string | null;
      company_name: string | null;
    }[]) {
      const company = (client.company_name || "").trim();
      const person = (client.name || "").trim();
      const useCompany = company && !GENERIC_COMPANY.has(company.toLowerCase());
      clientNames.set(client.id, useCompany ? company : person);
    }
  }

  for (const row of rows) {
    const short = (row.name || "").trim() || `Proyecto ${row.id}`;
    const client = row.client_id ? clientNames.get(row.client_id) || "" : "";
    const redundant =
      client &&
      short.toLowerCase().replace(/[^a-z0-9]+/g, "").includes(client.toLowerCase().replace(/[^a-z0-9]+/g, ""));
    map.set(String(row.id), {
      short,
      label: client && !redundant ? `${short} · ${client}` : short,
    });
  }
  return map;
}

async function resolveProducts(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, Entry>> {
  const map = new Map<string, Entry>();
  const numericIds = ids.map(Number).filter((value) => Number.isFinite(value));
  if (numericIds.length === 0) return map;

  const { data, error } = await supabase
    .from("products")
    .select("id, brand, model, name")
    .in("id", numericIds);
  if (error) throw error;

  for (const row of (data ?? []) as {
    id: number;
    brand: string | null;
    model: string | null;
    name: string | null;
  }[]) {
    const short =
      `${(row.brand || "").trim()} ${(row.model || "").trim()}`.trim() ||
      (row.name || "").trim() ||
      `Producto ${row.id}`;
    map.set(String(row.id), { short, label: short });
  }
  return map;
}

async function resolveQuotes(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, Entry>> {
  const map = new Map<string, Entry>();
  const numericIds = ids.map(Number).filter((value) => Number.isFinite(value));
  if (numericIds.length === 0) return map;

  const { data, error } = await supabase
    .from("quotes")
    .select("id, version")
    .in("id", numericIds);
  if (error) throw error;

  for (const row of (data ?? []) as { id: number; version: number | null }[]) {
    const short = row.version ? `Cotizacion ${row.id} v${row.version}` : `Cotizacion ${row.id}`;
    map.set(String(row.id), { short, label: short });
  }
  return map;
}

async function resolveLeads(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, Entry>> {
  const map = new Map<string, Entry>();
  const numericIds = ids.map(Number).filter((value) => Number.isFinite(value));
  if (numericIds.length === 0) return map;

  const { data, error } = await supabase
    .from("leads")
    .select("id, name, company")
    .in("id", numericIds);
  if (error) return map;

  for (const row of (data ?? []) as { id: number; name: string | null; company: string | null }[]) {
    const person = (row.name || "").trim() || `Lead ${row.id}`;
    const comp = (row.company || "").trim();
    const short = comp ? `${person} (${comp})` : person;
    map.set(String(row.id), { short, label: short });
  }
  return map;
}

async function resolveServiceReports(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, Entry>> {
  const map = new Map<string, Entry>();
  const numericIds = ids.map(Number).filter((value) => Number.isFinite(value));
  if (numericIds.length === 0) return map;

  const { data, error } = await supabase
    .from("service_reports")
    .select("id, service_number")
    .in("id", numericIds);
  if (error) return map;

  for (const row of (data ?? []) as { id: number; service_number: string | null }[]) {
    const short = (row.service_number || "").trim() || `Servicio #${row.id}`;
    map.set(String(row.id), { short, label: short });
  }
  return map;
}

export async function enrichFindings(
  supabase: SupabaseClient,
  findings: RawFinding[],
): Promise<void> {
  if (findings.length === 0) return;

  const [projects, products, quotes, leads, services] = await Promise.all([
    resolveProjects(supabase, uniqueIds(findings, "client_project")),
    resolveProducts(supabase, uniqueIds(findings, "product")),
    resolveQuotes(supabase, uniqueIds(findings, "quote")),
    resolveLeads(supabase, uniqueIds(findings, "lead")),
    resolveServiceReports(supabase, uniqueIds(findings, "service_report")),
  ]);

  for (const finding of findings) {
    if (!finding.entityId) continue;

    if (finding.entityType === "client_project") {
      const entry = projects.get(finding.entityId);
      if (!entry) continue;
      finding.entityLabel = entry.label;
      const pattern = new RegExp(`\\b(proyecto)\\s+${finding.entityId}\\b`, "gi");
      const replacer = (_match: string, word: string) => `${word} ${entry.short}`;
      finding.title = finding.title.replace(pattern, replacer);
      finding.summary = finding.summary.replace(pattern, replacer);
    } else if (finding.entityType === "product") {
      finding.entityLabel = products.get(finding.entityId)?.label ?? null;
    } else if (finding.entityType === "quote") {
      const entry = quotes.get(finding.entityId);
      if (!entry) continue;
      finding.entityLabel = entry.label;
      const pattern = new RegExp(`\\b([Cc]otizacion)\\s+${finding.entityId}\\b`, "g");
      finding.title = finding.title.replace(pattern, entry.short);
      finding.summary = finding.summary.replace(pattern, entry.short);
    } else if (finding.entityType === "lead") {
      finding.entityLabel = leads.get(finding.entityId)?.label ?? null;
    } else if (finding.entityType === "service_report") {
      finding.entityLabel = services.get(finding.entityId)?.label ?? null;
    }
  }
}
