import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { resolveServicePhotoUrl } from "@/lib/serviceReports";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import ServiceReportForm, {
  ExistingServicePhoto,
  ServiceClient,
  ServiceProject,
  ServiceReportInitial,
} from "../../ServiceReportForm";

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;
  const [{ data: report }, { data: clients }, { data: projects }, { data: rawPhotos }] =
    await Promise.all([
      supabase.from("service_reports").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("clients")
        .select("id, client_number, name")
        .order("client_number", { ascending: true }),
      supabase
        .from("client_projects")
        .select("id, client_id, project_number, name")
        .order("project_number", { ascending: true }),
      supabase
        .from("service_report_photos")
        .select("id, image_url, caption, sort_order")
        .eq("service_report_id", id)
        .order("sort_order", { ascending: true }),
    ]);

  const reportData = report as ServiceReportInitial | null;
  const photos = await Promise.all(
    ((rawPhotos || []) as ExistingServicePhoto[]).map(async (photo) => ({
      ...photo,
      displayUrl: await resolveServicePhotoUrl(supabase.storage, photo.image_url),
    }))
  );

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link href={`/services/${id}`} className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
        <ArrowLeft size={18} />
        Volver al servicio
      </Link>
      <section className="mb-10">
        <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA OS</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Editar servicio</h1>
      </section>
      {reportData && ["draft", "pending"].includes(reportData.status || "draft") ? (
        <ServiceReportForm
          mode="edit"
          clients={(clients || []) as ServiceClient[]}
          projects={(projects || []) as ServiceProject[]}
          initialReport={reportData}
          existingPhotos={photos}
        />
      ) : (
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8 text-[#B3B3B8]">
          Este reporte ya no se puede editar.
        </section>
      )}
    </main>
  );
}
