import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import {
  formatServiceDate,
  getSolutionLabel,
  resolveServicePhotoUrl,
} from "@/lib/serviceReports";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import PrintServiceButton from "./PrintServiceButton";

type ServiceReport = {
  id: number;
  service_number: string | null;
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
  labor_sale_mxn: number | null;
  related_quote_id: number | null;
  clients: { name: string | null; company_name: string | null } | null;
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

export default async function ServicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;
  const { data: report, error } = await supabase
    .from("service_reports")
    .select(
      "id, service_number, service_location, google_maps_url, performed_by_name, service_date, background, diagnosis, solution_status, solution_description, requires_parts, required_parts_notes, labor_sale_mxn, related_quote_id, clients(name, company_name), client_projects(name), quotes:related_quote_id(quote_number)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !report) {
    return (
      <main className="min-h-screen bg-white p-10 text-[#111318]">
        <h1 className="text-2xl font-semibold">Servicio no encontrado</h1>
      </main>
    );
  }

  const reportData = report as unknown as ServiceReport;
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

  return (
    <main className="print-root min-h-screen bg-[#EDEBE6] py-5 text-[#111318]">
      <style>{`
        @page { size: letter; margin: 12mm; }
        .print-root { font-family: Arial, Helvetica, sans-serif; }
        .summary-box, .text-box, .photo-card { break-inside: avoid; page-break-inside: avoid; }
        @media print {
          html, body { background: white !important; font-size: 10.5px !important; }
          body > div > aside, body aside, body header:not(.quote-print-header), nav,
          .admin-sidebar, .admin-nav, .mobile-admin-header, .admin-menu-button,
          .admin-menu-overlay, .admin-user-card, .no-print, .print-actions {
            display: none !important;
          }
          body > div, .admin-print-route, main {
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
          .quote-print-logo { max-height: 28px !important; max-width: 112px !important; }
          .photo-grid { gap: 6px !important; }
          .photo-card img { max-height: 190px !important; }
        }
      `}</style>

      <div className="print-actions mx-auto mb-4 flex w-[816px] max-w-none items-center justify-between">
        <Link href={`/services/${id}`} className="text-xs text-[#5F626A]">
          Volver a servicio
        </Link>
        <PrintServiceButton />
      </div>

      <article className="document mx-auto w-[816px] min-h-[1056px] max-w-none bg-white px-10 py-8 shadow-xl">
        <header className="quote-print-header mb-5 flex items-start justify-between border-b border-[#D6D1C8] pb-4">
          <div>
            <div className="mb-3 flex h-11 items-center">
              <img src="/logo-print.png" alt="ALFA OS" className="quote-print-logo max-h-11 max-w-36" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9E1B32]">
              Reporte de servicio tecnico
            </p>
          </div>
          <div className="text-right text-[11px] leading-5 text-[#555963]">
            <p>Fecha: {formatServiceDate(reportData.service_date)}</p>
            <p className="mt-2 text-xl font-semibold text-[#111318]">
              {reportData.service_number || `SERV-${String(reportData.id).padStart(4, "0")}`}
            </p>
          </div>
        </header>

        <section className="summary-box mb-6 grid grid-cols-2 gap-4 text-xs">
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">Cliente</p>
            <p className="text-base font-semibold">{reportData.clients?.name || "Sin cliente"}</p>
            <p className="mt-1 text-[#555963]">{reportData.clients?.company_name || ""}</p>
          </div>
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">Proyecto</p>
            <p className="text-base font-semibold">{reportData.client_projects?.name || "Sin proyecto"}</p>
            <p className="mt-1 text-[#555963]">Tecnico: {reportData.performed_by_name || "-"}</p>
          </div>
        </section>

        <section className="summary-box mb-6 grid grid-cols-2 gap-4 text-xs">
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">Ubicacion</p>
            <p>{reportData.service_location || "-"}</p>
            <p className="mt-1 break-all text-[#555963]">{reportData.google_maps_url || ""}</p>
          </div>
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">Estado</p>
            <p className="text-base font-semibold">{getSolutionLabel(reportData.solution_status)}</p>
            <p className="mt-1 text-[#555963]">Cargo de servicio: {formatCurrency(reportData.labor_sale_mxn, "MXN")}</p>
          </div>
        </section>

        {[
          ["Antecedentes", reportData.background],
          ["Diagnostico", reportData.diagnosis],
          ["Solucion", reportData.solution_description],
        ].map(([title, text]) => (
          <section key={title} className="text-box mb-5 border-t border-[#D6D1C8] pt-4">
            <h2 className="mb-2 text-sm font-semibold">{title}</h2>
            <p className="whitespace-pre-line text-[11px] leading-5 text-[#555963]">{text || "-"}</p>
          </section>
        ))}

        {reportData.requires_parts ? (
          <section className="text-box mb-5 border border-[#E1DDD5] bg-[#F7F5F1] p-4 text-[11px]">
            <h2 className="mb-2 text-sm font-semibold">Refacciones requeridas</h2>
            <p className="whitespace-pre-line text-[#555963]">{reportData.required_parts_notes || "-"}</p>
            {reportData.related_quote_id ? (
              <p className="mt-2 font-semibold">
                Refacciones cotizadas en: {reportData.quotes?.quote_number || `#${reportData.related_quote_id}`}
              </p>
            ) : null}
          </section>
        ) : null}

        <section>
          <h2 className="mb-3 border-b border-[#D6D1C8] pb-2 text-sm font-semibold">
            Evidencia fotografica
          </h2>
          {photos.length === 0 ? (
            <p className="text-[11px] text-[#555963]">Sin evidencia fotografica.</p>
          ) : (
            <div className="photo-grid grid grid-cols-2 gap-3">
              {photos.map((photo) => (
                <figure key={photo.id} className="photo-card">
                  <img src={photo.displayUrl} alt={photo.caption || "Evidencia"} className="block max-h-[230px] w-full object-contain" />
                  {photo.caption ? <figcaption className="mt-1 text-[10px] text-[#555963]">{photo.caption}</figcaption> : null}
                </figure>
              ))}
            </div>
          )}
        </section>
      </article>
    </main>
  );
}
