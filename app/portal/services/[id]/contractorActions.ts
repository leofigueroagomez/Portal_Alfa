"use server";

import { revalidatePath } from "next/cache";
import { getContractorPortalContext } from "@/lib/contractorPortal";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { PHOTO_UPLOAD_TYPES, validateUploadFile } from "@/lib/uploadValidation";

// El contratista solo mueve el servicio entre estos estados (los de la UI).
// `draft` y `cancelled` los decide ALFA; un servicio cancelado o ya firmado por
// el cliente esta cerrado y no se modifica desde el portal.
const CONTRACTOR_SETTABLE_STATUSES = new Set(["pending", "in_progress", "completed"]);
const CONTRACTOR_SOLUTION_STATUSES = new Set(["pending", "solved", "not_solved"]);
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_PHOTOS_PER_CALL = 1;
const MAX_TEXT_LENGTH = 5_000;
const MAX_CAPTION_LENGTH = 300;

type ContractorServiceState = {
  status: string | null;
  client_signed_at: string | null;
};

function isClosedService(service: ContractorServiceState) {
  return service.status === "cancelled" || Boolean(service.client_signed_at);
}

function canTransitionStatus(current: string | null, next: string) {
  if (!CONTRACTOR_SETTABLE_STATUSES.has(next)) return false;
  // Ya finalizado: se permite corregir el reporte sin reabrirlo.
  if (current === "completed") return next === "completed";
  return true;
}

function boundedText(value: FormDataEntryValue | null, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

export async function updateContractorServiceAction(
  serviceId: number,
  formData: FormData
) {
  const context = await getContractorPortalContext();
  if (!context) {
    throw new Error("No tienes autorización como contratista.");
  }

  // service_role: service_reports es solo interna por RLS; la propiedad se
  // valida con contractor_id del contexto en el select y en el update.
  const { db, portalUser } = context;

  // Verify service ownership
  const { data: service, error: serviceError } = await db
    .from("service_reports")
    .select("id, contractor_id, status, client_signed_at")
    .eq("id", serviceId)
    .eq("contractor_id", portalUser.contractor_id)
    .maybeSingle<ContractorServiceState & { id: number; contractor_id: number }>();

  if (serviceError || !service) {
    throw new Error("Servicio no encontrado o no asignado a tu cuenta.");
  }
  if (isClosedService(service)) {
    throw new Error("El servicio ya está cerrado (firmado o cancelado) y no puede modificarse.");
  }

  const status = String(formData.get("status") || "in_progress");
  const solutionStatus = String(formData.get("solution_status") || "pending");
  if (!canTransitionStatus(service.status, status)) {
    throw new Error("Cambio de estado no permitido para este servicio.");
  }
  if (!CONTRACTOR_SOLUTION_STATUSES.has(solutionStatus)) {
    throw new Error("Estado de solución no válido.");
  }
  const diagnosis = boundedText(formData.get("diagnosis"), MAX_TEXT_LENGTH);
  const solutionDescription = boundedText(formData.get("solution_description"), MAX_TEXT_LENGTH);
  const recommendations = boundedText(formData.get("recommendations"), MAX_TEXT_LENGTH);
  const requiresParts = formData.get("requires_parts") === "on";
  const requiredPartsNotes = boundedText(formData.get("required_parts_notes"), MAX_TEXT_LENGTH);

  const updateData: Record<string, string | boolean | null> = {
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

  // UPDATE condicionado al estado leido: no pisa un cierre concurrente.
  let updateQuery = db
    .from("service_reports")
    .update(updateData)
    .eq("id", serviceId)
    .eq("contractor_id", portalUser.contractor_id)
    .is("client_signed_at", null);
  updateQuery = service.status == null
    ? updateQuery.is("status", null)
    : updateQuery.eq("status", service.status);
  const { error: updateError } = await updateQuery;

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

  // service_role: service_reports es solo interna por RLS; la propiedad se
  // valida con contractor_id del contexto en el select y en el update.
  const { db, portalUser } = context;

  // Verify ownership
  const { data: service, error: serviceError } = await db
    .from("service_reports")
    .select("id, contractor_id, status, client_signed_at")
    .eq("id", serviceId)
    .eq("contractor_id", portalUser.contractor_id)
    .maybeSingle<ContractorServiceState & { id: number; contractor_id: number }>();

  if (serviceError || !service) {
    throw new Error("Servicio no encontrado o no asignado.");
  }
  if (isClosedService(service)) {
    throw new Error("El servicio ya está cerrado (firmado o cancelado); no se pueden agregar fotos.");
  }

  const files = formData.getAll("photo");
  const caption = boundedText(formData.get("caption"), MAX_CAPTION_LENGTH);

  if (!files.length) {
    throw new Error("No se seleccionó ningún archivo.");
  }
  if (files.length > MAX_PHOTOS_PER_CALL) {
    throw new Error("Sube una fotografía a la vez.");
  }

  // Tipo real por magic bytes; la extension nunca sale del nombre del usuario.
  const photo = await validateUploadFile(files[0], {
    allowed: PHOTO_UPLOAD_TYPES,
    maxBytes: MAX_PHOTO_BYTES,
  });
  if (!photo) {
    throw new Error("La fotografía debe ser JPG, PNG, WebP o HEIC de hasta 10 MB.");
  }

  const admin = createSupabaseAdminClient();
  const fileName = `${serviceId}/${Date.now()}_${crypto.randomUUID()}.${photo.ext}`;
  const filePath = `evidence/${fileName}`;

  const { error: uploadError } = await admin.storage
    .from("service_reports")
    .upload(filePath, photo.buffer, {
      contentType: photo.mime,
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
    await admin.storage.from("service_reports").remove([filePath]);
    throw new Error(`Error al registrar foto: ${insertPhotoError.message}`);
  }

  revalidatePath(`/portal/services/${serviceId}`);
  return { ok: true };
}
