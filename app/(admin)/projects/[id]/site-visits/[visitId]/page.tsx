import Link from "next/link";
import { ArrowLeft, CalendarDays, FileText, Pencil, UserRound } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";

type ServerSupabaseStorage = Awaited<ReturnType<typeof createSupabaseServerClient>>["storage"];

type ClientProject = {
  id: number;
  name: string | null;
  client_id: number | null;
};

type Client = {
  name: string | null;
};

type SiteVisit = {
  id: number;
  client_project_id: number;
  created_by_user_id: string | null;
  visit_date: string | null;
  title: string | null;
  general_notes: string | null;
  created_at: string | null;
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

type Profile = {
  full_name: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX");
}

async function resolvePhotoUrl(storage: ServerSupabaseStorage, imageUrl: string | null) {
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

export default async function SiteVisitDetailPage({
  params,
}: {
  params: Promise<{ id: string; visitId: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id, visitId } = await params;

  const { data: visit, error } = await supabase
    .from("project_site_visits")
    .select("id, client_project_id, created_by_user_id, visit_date, title, general_notes, created_at")
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

  const visitData = visit as SiteVisit;
  const [{ data: project }, { data: notes }, { data: profile }] = await Promise.all([
    supabase
      .from("client_projects")
      .select("id, name, client_id")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("project_site_visit_notes")
      .select("id, note_text, informed_to, commitment_date")
      .eq("project_site_visit_id", visitId)
      .order("created_at", { ascending: true }),
    visitData.created_by_user_id
      ? supabase
          .from("profiles")
          .select("full_name")
          .eq("id", visitData.created_by_user_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const projectData = project as ClientProject | null;
  const { data: client } = projectData?.client_id
    ? await supabase
        .from("clients")
        .select("name")
        .eq("id", projectData.client_id)
        .maybeSingle()
    : { data: null };
  const clientData = client as Client | null;
  const noteList = (notes || []) as SiteVisitNote[];
  const profileData = profile as Profile | null;
  const noteIds = noteList.map((note) => note.id);
  const { data: rawPhotos } = noteIds.length
    ? await supabase
        .from("project_site_visit_note_photos")
        .select("id, project_site_visit_note_id, image_url, caption, sort_order")
        .in("project_site_visit_note_id", noteIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const photoList = await Promise.all(
    ((rawPhotos || []) as Omit<SiteVisitPhoto, "displayUrl">[]).map(async (photo) => ({
      ...photo,
      displayUrl: await resolvePhotoUrl(supabase.storage, photo.image_url),
    }))
  );
  const photosByNote = new Map<number, SiteVisitPhoto[]>();
  photoList.forEach((photo) => {
    const existing = photosByNote.get(photo.project_site_visit_note_id) || [];
    photosByNote.set(photo.project_site_visit_note_id, [...existing, photo]);
  });

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link
        href={`/projects/${id}/site-visits`}
        className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]"
      >
        <ArrowLeft size={18} />
        Volver a visitas
      </Link>

      <section className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
            {formatDate(visitData.visit_date)}
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            {visitData.title || "Visita de obra"}
          </h1>
          <p className="mt-3 text-[#B3B3B8]">
            {clientData?.name || "Sin cliente"} / {projectData?.name || "Sin proyecto"}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/projects/${id}/site-visits/${visitId}/edit`}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
          >
            <Pencil size={18} />
            Editar reporte
          </Link>
          <Link
            href={`/projects/${id}/site-visits/${visitId}/print`}
            className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
          >
            <FileText size={18} />
            Imprimir / PDF
          </Link>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 flex items-center gap-2 text-sm text-[#B3B3B8]">
            <CalendarDays size={16} />
            Fecha
          </p>
          <p className="text-xl font-semibold">{formatDate(visitData.visit_date)}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 flex items-center gap-2 text-sm text-[#B3B3B8]">
            <UserRound size={16} />
            Realizo visita
          </p>
          <p className="text-xl font-semibold">
            {profileData?.full_name || "Usuario ALFA"}
          </p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="mb-2 text-sm text-[#B3B3B8]">Notas</p>
          <p className="text-xl font-semibold">{noteList.length}</p>
        </div>
      </section>

      {visitData.general_notes?.trim() ? (
        <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
          <h2 className="mb-3 text-2xl font-semibold">Notas generales</h2>
          <p className="whitespace-pre-line leading-relaxed text-[#B3B3B8]">
            {visitData.general_notes}
          </p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <h2 className="mb-5 text-2xl font-semibold">Notas de visita</h2>
        <div className="space-y-4">
          {noteList.map((note, index) => (
            <article
              key={note.id}
              className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4"
            >
              <p className="mb-2 text-xs uppercase tracking-[0.16em] text-[#9E1B32]">
                Nota {index + 1}
              </p>
              <p className="whitespace-pre-line leading-relaxed">
                {note.note_text || "Sin descripcion"}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <div>
                  <p className="text-[#77777D]">Informado a</p>
                  <p className="font-semibold">{note.informed_to || "Sin responsable"}</p>
                </div>
                <div>
                  <p className="text-[#77777D]">Fecha compromiso</p>
                  <p className="font-semibold">{formatDate(note.commitment_date)}</p>
                </div>
              </div>
              {(photosByNote.get(note.id) || []).length > 0 ? (
                <div className="mt-4 border-t border-[#2A2A30] pt-4">
                  <p className="mb-3 text-sm font-semibold text-[#B3B3B8]">
                    Fotos de evidencia
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {(photosByNote.get(note.id) || []).map((photo, photoIndex) => (
                      <figure
                        key={photo.id}
                        className="overflow-hidden rounded-xl border border-[#2A2A30] bg-[#151518]"
                      >
                        <img
                          src={photo.displayUrl}
                          alt={photo.caption || `Evidencia ${photoIndex + 1}`}
                          className="h-44 w-full object-cover"
                        />
                        {photo.caption?.trim() ? (
                          <figcaption className="px-3 py-2 text-sm text-[#B3B3B8]">
                            {photo.caption}
                          </figcaption>
                        ) : null}
                      </figure>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      {/* TODO: Integrar envio por WhatsApp cuando exista el canal aprobado. */}
    </main>
  );
}
