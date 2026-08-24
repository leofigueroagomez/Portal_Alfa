"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export async function getContractBySigningToken(token: string) {
  const adminClient = createSupabaseAdminClient();

  const { data: contract, error } = await adminClient
    .from("project_contracts")
    .select(`
      *,
      quotes:quote_id (quote_number),
      client_projects:client_project_id (name, site_address),
      clients:client_id (name, company_name, email, phone, tax_business_name, tax_rfc, tax_regime, tax_zip_code, address)
    `)
    .eq("signing_token", token)
    .maybeSingle();

  if (error || !contract) {
    throw new Error("El enlace de firma no es válido o ha expirado.");
  }

  // Traer partidas de la cotización para la vista previa
  let quoteItems: Array<{ id: number; title?: string | null; description: string | null; brand: string | null; model: string | null; quantity: number; unit_price: number; subtotal: number; area?: string | null }> = [];
  if (contract.quote_id) {
    const { data: qItems } = await adminClient
      .from("quote_items")
      .select("id, title, description, brand, model, quantity, unit_price, subtotal, area")
      .eq("quote_id", contract.quote_id)
      .order("id", { ascending: true });
    quoteItems = qItems || [];
  }

  return { contract, quoteItems };
}

export async function submitClientContractSignatureAction(
  token: string,
  payload: {
    signerName: string;
    signatureDataUrl: string;
    latitude?: number | null;
    longitude?: number | null;
  }
) {
  const adminClient = createSupabaseAdminClient();

  // 1. Obtener IP
  const headersList = await headers();
  const clientIp =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ||
    headersList.get("x-real-ip") ||
    "Desconocida";

  // 2. Verificar contrato
  const { data: contract, error: findError } = await adminClient
    .from("project_contracts")
    .select("id, status")
    .eq("signing_token", token)
    .maybeSingle();

  if (findError || !contract) {
    return { ok: false, error: "Contrato no encontrado o token inválido." };
  }

  // 3. Registrar firma
  const { error: updateError } = await adminClient
    .from("project_contracts")
    .update({
      client_signature_image_url: payload.signatureDataUrl,
      client_signer_name: payload.signerName,
      client_signed_at: new Date().toISOString(),
      client_signature_ip: clientIp,
      client_signature_latitude: payload.latitude || null,
      client_signature_longitude: payload.longitude || null,
      status: "signed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", contract.id);

  if (updateError) {
    console.error("Error guardando firma de contrato:", updateError);
    return { ok: false, error: "No se pudo guardar la firma digital." };
  }

  return { ok: true, message: "Contrato firmado digitalmente con éxito." };
}
