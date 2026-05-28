import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import EditSiteVisitForm from "./EditSiteVisitForm";

type ServerSupabaseStorage = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>["storage"];

type ClientProject = {
  id: number;
  name: string | null;
};

type SiteVisit = {
  id: number;
  visit_date: string | null;
  title: string | null;
  general_notes: string | null;
};

type SiteVisitNote = {
  id: number;
  note_text: string | null;
  informed_to: string | null;
  commitment_date: string | null;
};

type SiteVisitPhoto = {
  id: number;
  project_site_visit_note_id: number;
  image_url: string | null;
  caption: string | null;
  sort_order: number | null;
  displayUrl: string;
};

async function resolvePhotoUrl(
  storage: ServerSupabaseStorage,
  imageUrl: string | null
) {
  if (!imageUrl) return "";
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  const bucket = storage.from("project-photos");
  const { data: signedData } = await bucket.createSignedUrl(imageUrl, 60 * 60);

  if (signedData?.signedUrl) {
    return signedData.signedUrl;
  }

  const { data: publicData } = bucket.getPublicUrl(imageUrl);
  return publicData.publicUrl || imageUrl;
}

export default async function EditSiteVisitPage({
  params,
}: {
  params: Promise<{ id: string; visitId: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id, visitId } = await params;

  const { data: visit, error } = await supabase
    .from("project_site_visits")
    .select("id, visit_date, title, general_notes")
    .eq("id", visitId)
    .eq("client_project_id", id)
    .maybeSingle();

  if (error || !visit) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <Link
          href={`/projects/${id}/site-visits`}
          className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]"
        >
          <ArrowLeft size={18} />
          Volver a visitas
        </Link>
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8">
          Visita de obra no encontrada.
        </section>
      </main>
    );
  }

  const [{ data: project }, { data: notes }] = await Promise.all([
    supabase
      .from("client_projects")
      .select("id, name")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("project_site_visit_notes")
      .select("id, note_text, informed_to, commitment_date")
      .eq("project_site_visit_id", visitId)
      .order("created_at", { ascending: true }),
  ]);

  const noteList = (notes || []) as SiteVisitNote[];
  const noteIds = noteList.map((note) => note.id);
  const { data: rawPhotos } = noteIds.length
    ? await supabase
        .from("project_site_visit_note_photos")
        .select("id, project_site_visit_note_id, image_url, caption, sort_order")
        .in("project_site_visit_note_id", noteIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const photoList = await Promise.all(
    ((rawPhotos || []) as Omit<SiteVisitPhoto, "displayUrl">[]).map(
      async (photo) => ({
        ...photo,
        displayUrl: await resolvePhotoUrl(supabase.storage, photo.image_url),
      })
    )
  );
  const photosByNote = new Map<number, SiteVisitPhoto[]>();
  photoList.forEach((photo) => {
    const existing = photosByNote.get(photo.project_site_visit_note_id) || [];
    photosByNote.set(photo.project_site_visit_note_id, [...existing, photo]);
  });

  const visitData = visit as SiteVisit;
  const projectData = project as ClientProject | null;

  const initialVisit = {
    title: visitData.title || "",
    visit_date:
      visitData.visit_date || new Date().toISOString().slice(0, 10),
    general_notes: visitData.general_notes || "",
    notes: noteList.map((note) => ({
      id: note.id,
      note_text: note.note_text || "",
      informed_to: note.informed_to || "",
      commitment_date: note.commitment_date || "",
      photos: (photosByNote.get(note.id) || []).map((photo) => ({
        id: photo.id,
        image_url: photo.image_url,
        caption: photo.caption || "",
        sort_order: photo.sort_order,
        displayUrl: photo.displayUrl,
      })),
    })),
  };

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link
        href={`/projects/${id}/site-visits/${visitId}`}
        className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]"
      >
        <ArrowLeft size={18} />
        Volver al reporte
      </Link>

      <section className="mb-10">
        <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA OS</p>
        <h1 className="text-3xl font-bold sm:text-4xl">
          Editar visita de obra
        </h1>
        <p className="mt-3 text-[#B3B3B8]">
          {projectData?.name || "Proyecto operativo"}
        </p>
      </section>

      <EditSiteVisitForm
        projectId={Number(id)}
        visitId={Number(visitId)}
        initialVisit={initialVisit}
      />
    </main>
  );
}
