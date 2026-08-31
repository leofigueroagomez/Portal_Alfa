"use server";

import { revalidatePath } from "next/cache";
import { normalizeRole } from "@/lib/permissions";
import { buildDraftFromTemplate } from "@/lib/quotes/templates";
import type { QuoteTemplateInput } from "@/lib/quotes/templates";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

async function checkManageAuth() {
  const profile = await getCurrentInternalUserProfile();
  if (!profile) throw new Error("No autenticado en ALFA OS.");
  const role = normalizeRole(profile.role);
  if (role !== "admin" && role !== "direccion") {
    throw new Error("Se requiere rol de Direccion o Administrador para editar plantillas.");
  }
  return profile;
}

async function checkUseAuth() {
  const profile = await getCurrentInternalUserProfile();
  if (!profile) throw new Error("No autenticado en ALFA OS.");
  return profile;
}

function sanitizeLines(input: QuoteTemplateInput) {
  const lines = Array.isArray(input.lines) ? input.lines : [];
  const clean = lines
    .map((line, index) => {
      const quantity = Number(line.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) return null;
      if (line.kind === "product") {
        const productId = Number(line.product_id);
        if (!Number.isInteger(productId) || productId <= 0) return null;
        return {
          kind: "product" as const,
          product_id: productId,
          labor_activity_id: null,
          quantity,
          sort_order: index,
        };
      }
      const activityId = Number(line.labor_activity_id);
      if (!Number.isInteger(activityId) || activityId <= 0) return null;
      return {
        kind: "labor" as const,
        product_id: null,
        labor_activity_id: activityId,
        quantity,
        sort_order: index,
      };
    })
    .filter((line): line is NonNullable<typeof line> => line !== null);
  return clean;
}

export async function saveQuoteTemplate(
  input: QuoteTemplateInput,
): Promise<{ ok: boolean; id?: number; error?: string }> {
  let profile;
  try {
    profile = await checkManageAuth();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No autorizado." };
  }

  const name = (input.name || "").trim();
  if (!name) return { ok: false, error: "La plantilla necesita un nombre." };

  const lines = sanitizeLines(input);
  if (lines.length === 0) {
    return { ok: false, error: "Agrega al menos una linea valida (producto o mano de obra con cantidad)." };
  }

  const supabase = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  const payload = {
    name,
    description: input.description?.trim() || null,
    scenario: input.scenario?.trim() || null,
    default_notes: input.default_notes?.trim() || null,
    is_active: input.is_active ?? true,
    sort_order: Number.isFinite(Number(input.sort_order)) ? Number(input.sort_order) : 0,
    updated_at: nowIso,
  };

  let templateId = input.id;
  if (templateId) {
    const { error } = await supabase.from("quote_templates").update(payload).eq("id", templateId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data, error } = await supabase
      .from("quote_templates")
      .insert({ ...payload, created_by: profile.id })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? "No se pudo crear la plantilla." };
    templateId = (data as { id: number }).id;
  }

  // Reemplazo total de lineas (patron del editor de cotizaciones).
  const { error: delError } = await supabase
    .from("quote_template_lines")
    .delete()
    .eq("template_id", templateId);
  if (delError) return { ok: false, error: delError.message };

  const { error: insError } = await supabase
    .from("quote_template_lines")
    .insert(lines.map((line) => ({ ...line, template_id: templateId })));
  if (insError) return { ok: false, error: insError.message };

  revalidatePath("/quotes/templates");
  return { ok: true, id: templateId };
}

export async function deleteQuoteTemplate(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await checkManageAuth();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No autorizado." };
  }
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("quote_templates").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/quotes/templates");
  return { ok: true };
}

export async function setQuoteTemplateActive(
  id: number,
  isActive: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await checkManageAuth();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No autorizado." };
  }
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("quote_templates")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/quotes/templates");
  return { ok: true };
}

export async function createDraftFromTemplateAction(params: {
  templateId: number;
  clientId: number;
  quantityOverrides?: Record<number, number>;
  notes?: string | null;
}): Promise<{
  ok: boolean;
  quoteId?: number;
  grandTotalMxn?: number;
  warnings?: string[];
  skippedBrokenLines?: number;
  error?: string;
}> {
  try {
    await checkUseAuth();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No autorizado." };
  }

  const templateId = Number(params.templateId);
  const clientId = Number(params.clientId);
  if (!Number.isInteger(templateId) || templateId <= 0) {
    return { ok: false, error: "Plantilla invalida." };
  }
  if (!Number.isInteger(clientId) || clientId <= 0) {
    return { ok: false, error: "Elige un cliente." };
  }

  const supabase = createSupabaseAdminClient();
  try {
    const result = await buildDraftFromTemplate(supabase, {
      templateId,
      clientId,
      quantityOverrides: params.quantityOverrides,
      notes: params.notes,
    });
    revalidatePath("/quotes");
    return {
      ok: true,
      quoteId: result.quote_id,
      grandTotalMxn: result.grand_total_mxn,
      warnings: result.warnings,
      skippedBrokenLines: result.skipped_broken_lines,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear el borrador." };
  }
}
