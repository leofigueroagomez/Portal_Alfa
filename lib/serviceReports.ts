import { createSupabaseServerClient } from "@/services/supabaseServer";

type ServerSupabaseStorage = Awaited<ReturnType<typeof createSupabaseServerClient>>["storage"];

export function formatServiceDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX");
}

export function getSolutionLabel(status: string | null | undefined) {
  if (status === "solved") return "Solucionado";
  if (status === "not_solved") return "No solucionado";
  return "Pendiente";
}

export async function resolveServicePhotoUrl(
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
