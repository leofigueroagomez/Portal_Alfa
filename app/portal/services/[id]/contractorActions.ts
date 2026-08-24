"use server";

import { revalidatePath } from "next/cache";
import { getContractorPortalContext } from "@/lib/contractorPortal";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export async function updateContractorServiceAction(
  serviceId: number,
  formData: FormData
) {
  const context = await getContractorPortalContext();
  if (!context) {
    throw new Error("No tienes autorización como contratista.");
  }

  const { supabase, portalUser } = context;

  // Verify service ownership
  const { data: service, error: serviceError } = await supabase
    .from("service_reports")
    .select("id, contractor_id, status")
    .eq("id", serviceId)
    .eq("contractor_id", portalUser.contractor_id)
    .maybeSingle();

  if (serviceError || !service) {
    throw new Error("Servicio no encontrado o no asignado a tu cuenta.");
  }

  const status = String(formData.get("status") || "in_progress");
  const solutionStatus = String(formData.get("solution_status") || "pending");
  const diagnosis = String(formData.get("diagnosis") || "").trim();
  const solutionDescription = String(formData.get("solution_description") || "").trim();
  const recommendations = String(formData.get("recommendations") || "").trim();
  const requiresParts = formData.get("requires_parts") === "on";
  const requiredPartsNotes = String(formData.get("required_parts_notes") || "").trim();

  const updateData: Record<string, any> = {
    status,
    solution_status: solutionStatus,
    diagnosis: diagnosis || null,
    solution_description: solutionDescription || null,
    recommendations: recommendations || null,
    requires_parts: requiresParts,
    required_parts_notes: requiredPartsNotes || null,
    updated_at: new Date().toISOString(),
  };

  if (status === "completed" && service.status !== "completed") {
    updateData.completed_at = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from("service_reports")
    .update(updateData)
    .eq("id", serviceId)
    .eq("contractor_id", portalUser.contractor_id);

  if (updateError) {
    throw new Error(`Error al actualizar el servicio: ${updateError.message}`);
  }

  revalidatePath(`/portal/services/${serviceId}`);
  revalidatePath("/portal");

  return { ok: true };
}

export async function addContractorServicePhotoAction(
  serviceId: number,
  formData: FormData
) {
  const context = await getContractorPortalContext();
  if (!context) {
    throw new Error("No tienes autorización como contratista.");
  }

  const { supabase, portalUser } = context;

  // Verify ownership
  const { data: service, error: serviceError } = await supabase
    .from("service_reports")
    .select("id, contractor_id")
    .eq("id", serviceId)
    .eq("contractor_id", portalUser.contractor_id)
    .maybeSingle();

  if (serviceError || !service) {
    throw new Error("Servicio no encontrado o no asignado.");
  }

  const file = formData.get("photo") as File | null;
  const caption = String(formData.get("caption") || "").trim();

  if (!file || file.size === 0) {
    throw new Error("No se seleccionó ningún archivo.");
  }

  const admin = createSupabaseAdminClient();
  const fileExt = file.name.split(".").pop() || "jpg";
  const fileName = `${serviceId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `evidence/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await admin.storage
    .from("service_reports")
    .upload(filePath, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Error al subir la imagen: ${uploadError.message}`);
  }

  const { error: insertPhotoError } = await admin
    .from("service_report_photos")
    .insert({
      service_report_id: serviceId,
      image_url: filePath,
      caption: caption || null,
      sort_order: 0,
    });

  if (insertPhotoError) {
    throw new Error(`Error al registrar foto: ${insertPhotoError.message}`);
  }

  revalidatePath(`/portal/services/${serviceId}`);
  return { ok: true };
}
