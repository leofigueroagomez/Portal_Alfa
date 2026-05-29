import Link from "next/link";
import { ArrowLeft, Edit, FileText, Printer } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import {
  formatServiceDate,
  getSolutionLabel,
  resolveServicePhotoUrl,
} from "@/lib/serviceReports";
import { createSupabaseServerClient } from "@/services/supabaseServer";

type ServiceReport = {
  id: number;
  service_number: string | null;
  client_id: number | null;
  client_project_id: number | null;
  service_location: string | null;
  google_maps_url: string | null;
  performed_by_name: string | null;
  service_date: string | null;
  background: string | null;
  diagnosis: string | null;
  solution_status: string | null;
  solution_description: string | null;
  requires_parts: boolean | null;
  required_parts_notes: string | null;
  technician_cost_mxn: number | null;
  labor_sale_mxn: number | null;
  status: string | null;
  related_quote_id: number | null;
  clients: { name: string | null } | null;
  client_projects: { name: string | null } | null;
  quotes: { quote_number: string | null } | null;
};

type ServicePhoto = {
  id: number;
  image_url: string | null;
  caption: string | null;
  sort_order: number | null;
  displayUrl: string;
};

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;
  const { data: report, error } = await supabase
    .from("service_reports")
    .select(
      "*, clients(name), client_projects(name), quotes:related_quote_id(quote_number)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !report) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <Link href="/services" className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
          <ArrowLeft size={18} />
          Volver a servicios
        </Link>
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8">
          Servicio no encontrado.
        </section>
      </main>
    );
  }

  const reportData = report as ServiceReport;
  const { data: rawPhotos } = await supabase
    .from("service_report_photos")
    .select("id, image_url, caption, sort_order")
    .eq("service_report_id", id)
    .order("sort_order", { ascending: true });
  const photos = await Promise.all(
    ((rawPhotos || []) as Omit<ServicePhoto, "displayUrl">[]).map(async (photo) => ({
      ...photo,
      displayUrl: await resolveServicePhotoUrl(supabase.storage, photo.image_url),
    }))
  );
  const quoteUrl = `/quotes/new?clientId=${reportData.client_id || ""}&projectId=${
    reportData.client_project_id || ""
  }&serviceReportId=${reportData.id}`;

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link href="/services" className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
        <ArrowLeft size={18} />
        Volver a servicios
      </Link>

      <section className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
            {reportData.service_number || `SERV-${String(reportData.id).padStart(4, "0")}`}
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Reporte de servicio</h1>
          <p className="mt-3 text-[#B3B3B8]">
            {reportData.clients?.name || "Sin cliente"} /{" "}
            {reportData.client_projects?.name || "Sin proyecto"}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/services/${id}/edit`}
            className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:text-white"
          >
            <Edit size={18} />
            Editar
          </Link>
          <Link
            href={`/services/${id}/print`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
          >
            <Printer size={18} />
            Imprimir
          </Link>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="text-sm text-[#B3B3B8]">Fecha</p>
          <p className="mt-2 text-xl font-semibold">{formatServiceDate(reportData.service_date)}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="text-sm text-[#B3B3B8]">Tecnico</p>
          <p className="mt-2 text-xl font-semibold">{reportData.performed_by_name || "-"}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="text-sm text-[#B3B3B8]">Solucion</p>
          <p className="mt-2 text-xl font-semibold">{getSolutionLabel(reportData.solution_status)}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="text-sm text-[#B3B3B8]">Cargo cliente</p>
          <p className="mt-2 text-xl font-semibold text-[#8CE0B6]">
            {formatCurrency(reportData.labor_sale_mxn, "MXN")}
          </p>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
          <h2 className="mb-4 text-2xl font-semibold">Diagnostico</h2>
          <p className="mb-4 whitespace-pre-line text-[#B3B3B8]">{reportData.background || "Sin antecedentes"}</p>
          <p className="whitespace-pre-line">{reportData.diagnosis || "Sin diagnostico"}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
          <h2 className="mb-4 text-2xl font-semibold">Solucion</h2>
          <p className="whitespace-pre-line text-[#B3B3B8]">
            {reportData.solution_description || "Sin descripcion"}
          </p>
        </div>
      </section>

      {reportData.requires_parts ? (
        <section className="mb-8 rounded-2xl border border-[#614620] bg-[#322514] p-5 text-[#F4C66A]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Requiere refacciones</h2>
              <p className="mt-2 whitespace-pre-line">{reportData.required_parts_notes || "Sin notas"}</p>
              {reportData.related_quote_id ? (
                <p className="mt-2 text-sm">
                  Cotizacion relacionada: {reportData.quotes?.quote_number || `#${reportData.related_quote_id}`}
                </p>
              ) : null}
            </div>
            {!reportData.related_quote_id ? (
              <Link
                href={quoteUrl}
                className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold text-white hover:bg-[#B91C3C]"
              >
                <FileText size={18} />
                Crear cotizacion de refaccion
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <h2 className="mb-5 text-2xl font-semibold">Evidencia fotografica</h2>
        {photos.length === 0 ? (
          <p className="text-[#77777D]">Sin fotos.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => (
              <figure key={photo.id} className="overflow-hidden rounded-xl border border-[#2A2A30] bg-[#222228]">
                <img src={photo.displayUrl} alt={photo.caption || "Evidencia"} className="h-56 w-full object-cover" />
                {photo.caption ? <figcaption className="p-3 text-sm text-[#B3B3B8]">{photo.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
