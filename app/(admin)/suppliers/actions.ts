"use server";

import { revalidatePath } from "next/cache";
import { canManagePurchases } from "@/lib/permissions";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export type SupplierInput = {
  id?: number;
  name: string;
  legal_business_name: string;
  rfc: string;
  account_number: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_position: string;
  website_url: string;
  credit_days: string;
  credit_limit_mxn: string;
  discount_terms_notes: string;
  address: string;
  brands_distributed: string;
};

type ActionResult = { ok: boolean; error?: string };

// Antes la pagina mutaba `suppliers` desde el navegador sin revisar rol. Ahora
// la escritura pasa por aqui: perfil interno activo + canManagePurchases. Se usa
// el cliente de sesion (no service_role) para que RLS siga aplicando encima.
async function checkManageAuth() {
  const profile = await getCurrentInternalUserProfile();
  if (!profile) throw new Error("No autenticado en ALFA OS.");
  if (!canManagePurchases(profile.role)) {
    throw new Error("No tienes permiso para editar proveedores.");
  }
  return profile;
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function buildPayload(input: SupplierInput) {
  const brandsArray = cleanText(input.brands_distributed)
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);

  return {
    name: cleanText(input.name),
    legal_business_name: cleanText(input.legal_business_name) || null,
    rfc: cleanText(input.rfc).toUpperCase() || null,
    account_number: cleanText(input.account_number) || null,
    contact_name: cleanText(input.contact_name) || null,
    contact_email: cleanText(input.contact_email) || null,
    contact_phone: cleanText(input.contact_phone) || null,
    contact_position: cleanText(input.contact_position) || null,
    website_url: cleanText(input.website_url) || null,
    credit_days: Number(input.credit_days) || 0,
    credit_limit_mxn: Number(input.credit_limit_mxn) || 0,
    discount_terms_notes: cleanText(input.discount_terms_notes) || null,
    address: cleanText(input.address) || null,
    brands_distributed: brandsArray,
    updated_at: new Date().toISOString(),
  };
}

export async function saveSupplierAction(input: SupplierInput): Promise<ActionResult> {
  try {
    await checkManageAuth();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No autorizado." };
  }

  const payload = buildPayload(input);
  if (!payload.name) {
    return { ok: false, error: "El nombre comercial del proveedor es obligatorio." };
  }

  const supabase = await createSupabaseServerClient();
  const id = Number(input.id);

  if (input.id !== undefined && input.id !== null) {
    if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Proveedor invalido." };
    // Actualizar
    const { error } = await supabase.from("suppliers").update(payload).eq("id", id);
    if (error) return { ok: false, error: "Error actualizando proveedor: " + error.message };
  } else {
    // Crear: mismo criterio de orden que tenia la pagina (ultimo + 10).
    const { data: last, error: lastError } = await supabase
      .from("suppliers")
      .select("sort_order")
      .order("sort_order", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (lastError) return { ok: false, error: "Error creando proveedor: " + lastError.message };
    const maxSortOrder = last ? (Number(last.sort_order) || 0) + 10 : 10;

    const { error } = await supabase.from("suppliers").insert({
      ...payload,
      is_active: true,
      sort_order: maxSortOrder,
    });
    if (error) return { ok: false, error: "Error creando proveedor: " + error.message };
  }

  revalidatePath("/suppliers");
  return { ok: true };
}

export async function setSupplierActiveAction(
  supplierId: number,
  isActive: boolean
): Promise<ActionResult> {
  try {
    await checkManageAuth();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No autorizado." };
  }

  const id = Number(supplierId);
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Proveedor invalido." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("suppliers")
    .update({
      is_active: Boolean(isActive),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { ok: false, error: "Error actualizando estado del proveedor: " + error.message };
  }

  revalidatePath("/suppliers");
  return { ok: true };
}
