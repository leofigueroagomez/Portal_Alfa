"use server";

import { revalidatePath } from "next/cache";
import { normalizeRole } from "@/lib/permissions";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export type BrandRuleInput = {
  id?: number | null;
  brand: string;
  max_client_discount_percent: string;
  partner_discount_percent: string;
  notes: string;
};

async function checkManageAuth() {
  const profile = await getCurrentInternalUserProfile();
  if (!profile) throw new Error("No autenticado en ALFA OS.");
  const role = normalizeRole(profile.role);
  if (role !== "admin" && role !== "direccion") {
    throw new Error("Se requiere rol de Direccion o Administrador para editar reglas por marca.");
  }
  return profile;
}

function parsePercent(value: string, label: string): number | null {
  const trimmed = (value || "").trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new Error(`${label} debe ser un numero entre 0 y 100.`);
  }
  return parsed;
}

export async function saveBrandRule(
  input: BrandRuleInput
): Promise<{ ok: boolean; error?: string }> {
  let profile;
  try {
    profile = await checkManageAuth();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No autorizado." };
  }

  const brand = (input.brand || "").trim();
  if (!brand) return { ok: false, error: "Indica la marca." };

  let maxClient: number | null;
  let partner: number | null;
  try {
    maxClient = parsePercent(input.max_client_discount_percent, "El tope al cliente");
    partner = parsePercent(input.partner_discount_percent, "El % del aliado");
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Valor invalido." };
  }

  const supabase = createSupabaseAdminClient();
  const payload = {
    brand,
    max_client_discount_percent: maxClient,
    partner_discount_percent: partner,
    notes: input.notes?.trim() || null,
    is_active: true,
    updated_by: profile.id,
    updated_at: new Date().toISOString(),
  };

  let id = Number(input.id);

  // El indice unico incluye reglas desactivadas: si la marca ya existio, se
  // reactiva esa fila en lugar de insertar otra.
  if (!Number.isInteger(id) || id <= 0) {
    const { data: existing, error: existingError } = await supabase
      .from("brand_commercial_rules")
      .select("id, brand, is_active");
    if (existingError) return { ok: false, error: existingError.message };
    const match = (existing || []).find(
      (row) => (row.brand || "").trim().toLowerCase() === brand.toLowerCase()
    );
    if (match?.is_active) {
      return { ok: false, error: `Ya existe una regla para ${brand}.` };
    }
    if (match) id = Number(match.id);
  }

  const result =
    Number.isInteger(id) && id > 0
      ? await supabase.from("brand_commercial_rules").update(payload).eq("id", id)
      : await supabase.from("brand_commercial_rules").insert(payload);

  if (result.error) {
    if (result.error.code === "23505") {
      return { ok: false, error: `Ya existe una regla para ${brand}.` };
    }
    return { ok: false, error: result.error.message };
  }

  revalidatePath("/quotes/brand-rules");
  return { ok: true };
}

export async function deleteBrandRule(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await checkManageAuth();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No autorizado." };
  }

  const ruleId = Number(id);
  if (!Number.isInteger(ruleId) || ruleId <= 0) {
    return { ok: false, error: "Regla invalida." };
  }

  // Solo se desactiva, para conservar historial.
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("brand_commercial_rules")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", ruleId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/quotes/brand-rules");
  return { ok: true };
}
