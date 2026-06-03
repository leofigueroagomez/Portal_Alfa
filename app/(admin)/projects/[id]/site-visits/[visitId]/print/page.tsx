import Link from "next/link";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import PrintSiteVisitButton from "./PrintSiteVisitButton";

type ServerSupabaseStorage = Awaited<ReturnType<typeof createSupabaseServerClient>>["storage"];

type ClientProject = {
  id: number;
  name: string | null;
  client_id: number | null;
};

type Client = {
  name: string | null;
  company_name: string | null;
};

type SiteVisit = {
  id: number;
  created_by_user_id: string | null;
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

type Profile = {
  full_name: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

export default async function SiteVisitPrintPage({
  params,
}: {
  params: Promise<{ id: string; visitId: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id, visitId } = await params;

  const { data: visit, error } = await supabase
    .from("project_site_visits")
    .select("id, created_by_user_id, visit_date, title, general_notes")
    .eq("id", visitId)
    .eq("client_project_id", id)
    .maybeSingle();

  if (error || !visit) {
    return (
      <main className="min-h-screen bg-white p-10 text-[#111318]">
        <h1 className="text-2xl font-semibold">Visita no encontrada</h1>
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
        .select("name, company_name")
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
    <main className="print-root min-h-screen bg-[#EDEBE6] py-5 text-[#111318]">
      <style>{`
        @page {
          size: letter;
          margin: 12mm;
        }

        .print-root {
          font-family: Arial, Helvetica, sans-serif;
        }

        .note-row,
        .photo-card,
        .summary-box,
        .notes-box {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .photo-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .photo-card img {
          display: block;
          width: 100%;
          max-height: 220px;
          object-fit: contain;
          background: #F8F7F4;
          border: 1px solid #E1DDD5;
        }

        @media print {
          html,
          body {
            background: white !important;
            font-size: 10.5px !important;
          }

          body > div > aside,
          body aside,
          body header:not(.quote-print-header),
          nav,
          .admin-sidebar,
          .admin-nav,
          .mobile-admin-header,
          .admin-menu-button,
          .admin-menu-overlay,
          .admin-user-card,
          .no-print,
          .print-actions {
            display: none !important;
          }

          body > div,
          .admin-print-route,
          main {
            display: block !important;
            min-height: auto !important;
            background: white !important;
            padding: 0 !important;
          }

          .document {
            width: 816px !important;
            max-width: none !important;
            min-height: auto !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }

          .quote-print-header {
            margin-bottom: 10px !important;
            padding-bottom: 8px !important;
          }

          .quote-print-logo {
            max-height: 28px !important;
            max-width: 112px !important;
          }

          .note-row {
            padding: 8px !important;
          }

          .photo-grid {
            gap: 6px !important;
          }

          .photo-card img {
            max-height: 190px !important;
          }
        }
      `}</style>

      <div className="print-actions mx-auto mb-4 flex w-[816px] max-w-none items-center justify-between">
        <Link
          href={`/projects/${id}/site-visits/${visitId}`}
          className="text-xs text-[#5F626A]"
        >
          Volver a visita
        </Link>
        <PrintSiteVisitButton />
      </div>

      <article className="document mx-auto w-[816px] min-h-[1056px] max-w-none bg-white px-10 py-8 shadow-xl">
        <header className="quote-print-header mb-5 flex items-start justify-between border-b border-[#D6D1C8] pb-4">
          <div>
            <div className="mb-3 flex h-11 items-center">
              <img
                src="/logo-print.png"
                alt="ALFA OS"
                className="quote-print-logo max-h-11 max-w-36"
              />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9E1B32]">
              Reporte de visita de obra
            </p>
          </div>

          <div className="text-right text-[11px] leading-5 text-[#555963]">
            <p>{formatDate(visitData.visit_date)}</p>
            <p className="mt-2 text-xl font-semibold text-[#111318]">
              {visitData.title || "Visita de obra"}
            </p>
          </div>
        </header>

        <section className="summary-box mb-6 grid grid-cols-2 gap-4 text-xs">
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
              Cliente
            </p>
            <p className="text-base font-semibold">
              {clientData?.name || "Sin cliente"}
            </p>
            <p className="mt-1 text-[#555963]">
              {clientData?.company_name || ""}
            </p>
          </div>

          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
              Proyecto
            </p>
            <p className="text-base font-semibold">
              {projectData?.name || "Sin proyecto"}
            </p>
            <p className="mt-1 text-[#555963]">
              Realizo visita: {profileData?.full_name || "Usuario ALFA"}
            </p>
          </div>
        </section>

        {visitData.general_notes?.trim() ? (
          <section className="notes-box mb-6 border-t border-[#D6D1C8] pt-4">
            <h2 className="mb-2 text-sm font-semibold">Notas generales</h2>
            <div className="whitespace-pre-line text-[11px] leading-5 text-[#555963]">
              {visitData.general_notes}
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="mb-3 border-b border-[#D6D1C8] pb-2 text-sm font-semibold">
            Notas y compromisos
          </h2>
          <div className="space-y-3">
            {noteList.map((note, index) => (
              <article
                key={note.id}
                className="note-row border border-[#E1DDD5] p-3 text-[11px]"
              >
                <p className="mb-2 font-semibold text-[#111318]">
                  Nota {index + 1}
                </p>
                <p className="whitespace-pre-line leading-5 text-[#555963]">
                  {note.note_text || "Sin descripcion"}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#EFECE6] pt-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#9E1B32]">
                      Informado a
                    </p>
                    <p>{note.informed_to || "Sin responsable"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.12em] text-[#9E1B32]">
                      Fecha compromiso
                    </p>
                    <p>{formatDate(note.commitment_date)}</p>
                  </div>
                </div>
                {(photosByNote.get(note.id) || []).length > 0 ? (
                  <div className="mt-3 border-t border-[#EFECE6] pt-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9E1B32]">
                      Fotos de evidencia
                    </p>
                    <div className="photo-grid">
                      {(photosByNote.get(note.id) || []).map((photo, photoIndex) => (
                        <figure key={photo.id} className="photo-card">
                          <img
                            src={photo.displayUrl}
                            alt={photo.caption || `Evidencia ${photoIndex + 1}`}
                          />
                          {photo.caption?.trim() ? (
                            <figcaption className="mt-1 text-[10px] leading-4 text-[#555963]">
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
      </article>
    </main>
  );
}
