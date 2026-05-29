import { createSupabaseServerClient } from "@/services/supabaseServer";

type ServerSupabaseStorage = Awaited<ReturnType<typeof createSupabaseServerClient>>["storage"];

export function formatWorkOrderDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX");
}

export function getWorkOrderStatusLabel(status: string | null | undefined) {
  if (status === "assigned") return "Asignada";
  if (status === "in_progress") return "En proceso";
  if (status === "completed") return "Completada";
  if (status === "validated") return "Validada";
  if (status === "cancelled") return "Cancelada";
  return "Borrador";
}

export function getWorkOrderActivityStatusLabel(status: string | null | undefined) {
  if (status === "in_progress") return "En proceso";
  if (status === "completed") return "Completada";
  if (status === "validated") return "Validada";
  if (status === "cancelled") return "Cancelada";
  return "Pendiente";
}

export function getWorkOrderProgress(
  activities: { quantity_assigned: number | null; quantity_completed: number | null; status?: string | null }[]
) {
  const activeActivities = activities.filter((activity) => activity.status !== "cancelled");
  const assigned = activeActivities.reduce(
    (sum, activity) => sum + Number(activity.quantity_assigned || 0),
    0
  );
  const completed = activeActivities.reduce(
    (sum, activity) => sum + Number(activity.quantity_completed || 0),
    0
  );

  return {
    assigned,
    completed,
    percent: assigned > 0 ? Math.min((completed / assigned) * 100, 100) : 0,
  };
}

export async function resolveWorkOrderPhotoUrl(
  storage: ServerSupabaseStorage,
  imageUrl: string | null
) {
  if (!imageUrl) return "";
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  const bucket = storage.from("project-photos");
  const { data: signedData } = await bucket.createSignedUrl(imageUrl, 60 * 60);

  if (signedData?.signedUrl) return signedData.signedUrl;

  const { data: publicData } = bucket.getPublicUrl(imageUrl);
  return publicData.publicUrl || imageUrl;
}
