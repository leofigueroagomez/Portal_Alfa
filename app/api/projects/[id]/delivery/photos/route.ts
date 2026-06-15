import { NextResponse } from "next/server";
import {
  createRequestId,
  jsonError,
  logApiError,
  parsePositiveInteger,
  requireWorkOrderRole,
} from "@/lib/apiAuth";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";

export const dynamic = "force-dynamic";

const maxImageSize = 50 * 1024 * 1024;

function getExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

async function assertAccess() {
  return requireWorkOrderRole();
}

type DeliveryPhotoRow = {
  id: number;
  file_url: string | null;
  file_path?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  caption: string | null;
  sort_order?: number | null;
  created_at?: string | null;
};

async function withDisplayUrls(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  rows: DeliveryPhotoRow[]
) {
  return Promise.all(
    rows.map(async (row) => {
      const storagePath = row.file_path || row.file_url;
      if (!storagePath) return { ...row, displayUrl: "" };
      if (/^https?:\/\//i.test(storagePath)) return { ...row, displayUrl: storagePath };

      const { data } = await supabase.storage
        .from("project-photos")
        .createSignedUrl(storagePath, 60 * 60);

      return { ...row, displayUrl: data?.signedUrl || "" };
    })
  );
}

async function assertDeliveryBelongsToProject(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  projectId: number,
  deliveryId: number
) {
  const { data, error } = await supabase
    .from("project_deliveries")
    .select("id")
    .eq("id", deliveryId)
    .eq("client_project_id", projectId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = createRequestId();
  const { response } = await assertAccess();
  if (response) return response;

  const { id } = await params;
  const projectId = parsePositiveInteger(id);
  const deliveryId = parsePositiveInteger(new URL(request.url).searchParams.get("deliveryId"));

  if (!projectId || !deliveryId) {
    return jsonError("Bad Request", 400);
  }

  const supabase = createSupabaseAdminClient();
  const belongs = await assertDeliveryBelongsToProject(supabase, projectId, deliveryId).catch((error) => {
    logApiError(requestId, "delivery photo project access check failed", error);
    return null;
  });
  if (belongs === null) {
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }
  if (!belongs) return NextResponse.json({ error: "Entrega no encontrada." }, { status: 404 });

  const result = await supabase
    .from("project_delivery_evidences")
    .select("id, file_url, file_path, file_name, file_type, file_size, caption, sort_order, created_at")
    .eq("project_delivery_id", deliveryId)
    .order("sort_order", { ascending: true });

  if (result.error) {
    const fallbackResult = await supabase
      .from("project_delivery_evidences")
      .select("id, file_url, caption, sort_order, created_at")
      .eq("project_delivery_id", deliveryId)
      .order("sort_order", { ascending: true });
    if (fallbackResult.error) {
      logApiError(requestId, "delivery photo fallback lookup failed", fallbackResult.error);
      return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
    }
    const photos = await withDisplayUrls(supabase, (fallbackResult.data || []) as DeliveryPhotoRow[]);
    return NextResponse.json({ photos });
  }

  const photos = await withDisplayUrls(supabase, (result.data || []) as DeliveryPhotoRow[]);

  return NextResponse.json({ photos });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = createRequestId();
  const { profile, response } = await assertAccess();
  if (response) return response;
  if (!profile) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const projectId = parsePositiveInteger(id);
  const formData = await request.formData();
  const deliveryId = parsePositiveInteger(formData.get("deliveryId"));
  const files = formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File);

  if (!projectId || !deliveryId) {
    return jsonError("Bad Request", 400);
  }
  if (files.length === 0) {
    return NextResponse.json({ error: "Agrega al menos una foto." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const belongs = await assertDeliveryBelongsToProject(supabase, projectId, deliveryId).catch((error) => {
    logApiError(requestId, "delivery photo upload project access check failed", error);
    return null;
  });
  if (belongs === null) {
    return NextResponse.json({ error: "Unable to process request", requestId }, { status: 500 });
  }
  if (!belongs) return NextResponse.json({ error: "Entrega no encontrada." }, { status: 404 });

  const { count } = await supabase
    .from("project_delivery_evidences")
    .select("id", { count: "exact", head: true })
    .eq("project_delivery_id", deliveryId);
  const startOrder = count || 0;
  const timestamp = Date.now();
  const rows = [];
  const errors = [];

  for (const [index, file] of files.entries()) {
    if (!file.type.startsWith("image/")) {
      errors.push({ fileName: file.name, error: "No es imagen." });
      continue;
    }
    if (file.size > maxImageSize) {
      errors.push({ fileName: file.name, error: "Supera 50 MB." });
      continue;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `project-deliveries/${projectId}/${deliveryId}/${timestamp}-${index}-${safeName || `evidence.${getExtension(file)}`}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("project-photos")
      .upload(path, bytes, {
        cacheControl: "3600",
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      logApiError(requestId, "delivery photo upload failed", uploadError);
      errors.push({ fileName: file.name, error: "No se pudo subir la imagen." });
      continue;
    }

    rows.push({
      project_delivery_id: deliveryId,
      file_url: path,
      file_path: path,
      file_name: file.name,
      file_type: file.type || null,
      file_size: file.size,
      uploaded_by: profile.id,
      caption: `Evidencia ${startOrder + rows.length + 1}`,
      sort_order: startOrder + rows.length,
    });
  }

  let inserted: DeliveryPhotoRow[] = [];
  if (rows.length > 0) {
    let insertResult = await supabase
      .from("project_delivery_evidences")
      .insert(rows)
      .select("id, file_url, file_path, file_name, file_type, file_size, caption, sort_order, created_at");
    if (insertResult.error) {
      insertResult = await supabase
        .from("project_delivery_evidences")
        .insert(
          rows.map((row) => ({
            project_delivery_id: row.project_delivery_id,
            file_url: row.file_url,
            caption: row.caption,
            sort_order: row.sort_order,
          }))
        )
        .select("id, file_url, caption, sort_order, created_at");
    }
    if (insertResult.error) {
      logApiError(requestId, "delivery photo insert failed", insertResult.error);
      return NextResponse.json(
        { error: "Unable to process request", requestId, errors },
        { status: 500 }
      );
    }
    inserted = (insertResult.data || []) as DeliveryPhotoRow[];
  }

  const photos = await withDisplayUrls(supabase, inserted);

  return NextResponse.json(
    { photos, errors },
    { status: photos.length > 0 ? 200 : 400 }
  );
}
