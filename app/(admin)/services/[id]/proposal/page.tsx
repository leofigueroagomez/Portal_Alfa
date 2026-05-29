import Link from "next/link";
import { ArrowLeft, Edit, FileText, Printer, Wrench } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import {
  getServiceProposalTotals,
  type ServiceProposalQuoteItem,
} from "@/lib/serviceProposal";
import {
  formatServiceDate,
  getSolutionLabel,
  resolveServicePhotoUrl,
} from "@/lib/serviceReports";
import { createSupabaseServerClient } from "@/services/supabaseServer";

type ServiceProposalReport = {
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
  labor_sale_mxn: number | null;
  related_quote_id: number | null;
  service_discount_mxn: number | null;
  service_discount_percent: number | null;
  service_discount_type: string | null;
  service_discount_reason: string | null;
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

function itemDescription(item: ServiceProposalQuoteItem) {
  return [item.product_brand, item.product_model, item.product_name]
    .filter(Boolean)
    .join(" / ");
}

export default async function ServiceProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  const { data: report, error } = await supabase
    .from("service_reports")
    .select(
      "id, service_number, client_id, client_project_id, service_location, google_maps_url, performed_by_name, service_date, background, diagnosis, solution_status, solution_description, requires_parts, required_parts_notes, labor_sale_mxn, related_quote_id, service_discount_mxn, service_discount_percent, service_discount_type, service_discount_reason, clients(name, company_name), client_projects(name), quotes:related_quote_id(quote_number)"
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

  const reportData = report as unknown as ServiceProposalReport;
  const [{ data: rawPhotos }, { data: quoteItems }] = await Promise.all([
    supabase
      .from("service_report_photos")
      .select("id, image_url, caption, sort_order")
      .eq("service_report_id", id)
      .order("sort_order", { ascending: true }),
    reportData.related_quote_id
      ? supabase
          .from("quote_items")
          .select(
            "id, quantity, unit_equipment_price, sale_currency, unit_labor_price, equipment_total, labor_total, line_total, product_brand, product_model, product_name"
          )
          .eq("quote_id", reportData.related_quote_id)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const photos = await Promise.all(
    ((rawPhotos || []) as Omit<ServicePhoto, "displayUrl">[]).map(async (photo) => ({
      ...photo,
      displayUrl: await resolveServicePhotoUrl(supabase.storage, photo.image_url),
    }))
  );
  const items = (quoteItems || []) as ServiceProposalQuoteItem[];
  const totals = getServiceProposalTotals(reportData, items);
  const quoteUrl = `/quotes/new?clientId=${reportData.client_id || ""}&projectId=${
    reportData.client_project_id || ""
  }&serviceReportId=${reportData.id}`;

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link href={`/services/${id}`} className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
        <ArrowLeft size={18} />
        Volver al servicio
      </Link>

      <section className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
            {reportData.service_number || `SERV-${String(reportData.id).padStart(4, "0")}`}
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Propuesta de reparacion</h1>
          <p className="mt-3 text-[#B3B3B8]">
            Documento unificado para cliente con diagnostico, refacciones y total.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {reportData.requires_parts && reportData.related_quote_id ? (
            <Link
              href={`/quotes/${reportData.related_quote_id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:text-white"
            >
              <Wrench size={18} />
              Editar refacciones
            </Link>
          ) : null}
          {reportData.requires_parts && !reportData.related_quote_id ? (
            <Link
              href={quoteUrl}
              className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:text-white"
            >
              <Wrench size={18} />
              Agregar refacciones
            </Link>
          ) : null}
          {reportData.related_quote_id ? (
            <Link
              href={`/quotes/${reportData.related_quote_id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:text-white"
            >
              <FileText size={18} />
              Cotizacion interna
            </Link>
          ) : null}
          <Link
            href={`/services/${id}/proposal/print`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
          >
            <Printer size={18} />
            Ver print
          </Link>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 md:col-span-2">
          <p className="text-sm text-[#B3B3B8]">Cliente</p>
          <p className="mt-2 text-xl font-semibold">{reportData.clients?.name || "Sin cliente"}</p>
          <p className="mt-1 text-sm text-[#77777D]">{reportData.client_projects?.name || "Sin proyecto"}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="text-sm text-[#B3B3B8]">Fecha</p>
          <p className="mt-2 text-xl font-semibold">{formatServiceDate(reportData.service_date)}</p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="text-sm text-[#B3B3B8]">Estado</p>
          <p className="mt-2 text-xl font-semibold">{getSolutionLabel(reportData.solution_status)}</p>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
            <h2 className="mb-4 text-xl font-semibold">Reporte tecnico</h2>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div>
                <p className="mb-1 text-sm text-[#B3B3B8]">Antecedentes</p>
                <p className="whitespace-pre-line text-sm">{reportData.background || "-"}</p>
              </div>
              <div>
                <p className="mb-1 text-sm text-[#B3B3B8]">Diagnostico</p>
                <p className="whitespace-pre-line text-sm">{reportData.diagnosis || "-"}</p>
              </div>
              <div>
                <p className="mb-1 text-sm text-[#B3B3B8]">Solucion</p>
                <p className="whitespace-pre-line text-sm">{reportData.solution_description || "-"}</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#1F1F24] bg-[#151518]">
            <div className="flex flex-col gap-2 border-b border-[#1F1F24] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Refacciones requeridas</h2>
                <p className="mt-1 text-sm text-[#B3B3B8]">
                  {reportData.required_parts_notes || "Sin notas adicionales."}
                </p>
              </div>
              {reportData.quotes?.quote_number ? (
                <span className="text-sm text-[#77777D]">Base interna {reportData.quotes.quote_number}</span>
              ) : null}
            </div>
            {items.length === 0 ? (
              <p className="p-5 text-sm text-[#77777D]">Sin refacciones cotizadas todavia.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-[#101114] text-xs uppercase tracking-[0.16em] text-[#77777D]">
                    <tr>
                      <th className="px-4 py-3">Refaccion</th>
                      <th className="px-4 py-3">Cantidad</th>
                      <th className="px-4 py-3">Precio</th>
                      <th className="px-4 py-3">Mano de obra</th>
                      <th className="px-4 py-3 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F1F24]">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <p className="font-semibold">{itemDescription(item) || "Refaccion"}</p>
                        </td>
                        <td className="px-4 py-3">{Number(item.quantity || 0)}</td>
                        <td className="px-4 py-3">
                          {formatCurrency(Number(item.equipment_total || 0), "MXN")}
                        </td>
                        <td className="px-4 py-3">
                          {formatCurrency(Number(item.labor_total || 0), "MXN")}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatCurrency(item.line_total, "MXN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
          <h2 className="mb-5 text-xl font-semibold">Resumen economico</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#B3B3B8]">Subtotal servicio</span>
              <strong>{formatCurrency(totals.serviceSubtotal, "MXN")}</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#B3B3B8]">Subtotal refacciones</span>
              <strong>{formatCurrency(totals.partsSubtotal, "MXN")}</strong>
            </div>
            {totals.discount > 0 ? (
              <div className="rounded-xl border border-[#614620] bg-[#322514] p-3 text-[#F4C66A]">
                <p className="mb-2 text-xs">
                  En caso de contratar las refacciones y la reparacion completa del servicio, se otorgara el siguiente descuento:
                </p>
                <div className="flex items-center justify-between gap-4 font-semibold">
                  <span>Descuento</span>
                  <span>-{formatCurrency(totals.discount, "MXN")}</span>
                </div>
                {reportData.service_discount_reason ? (
                  <p className="mt-2 text-xs">{reportData.service_discount_reason}</p>
                ) : null}
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-4 border-t border-[#2A2A30] pt-3">
              <span className="text-[#B3B3B8]">IVA</span>
              <strong>{formatCurrency(totals.iva, "MXN")}</strong>
            </div>
            <div className="flex items-center justify-between gap-4 text-xl">
              <span>Total</span>
              <strong className="text-[#8CE0B6]">{formatCurrency(totals.total, "MXN")}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6">
        <h2 className="mb-5 text-xl font-semibold">Evidencia fotografica</h2>
        {photos.length === 0 ? (
          <p className="text-sm text-[#77777D]">Sin evidencia fotografica.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {photos.map((photo) => (
              <figure key={photo.id} className="overflow-hidden rounded-xl border border-[#2A2A30] bg-[#222228]">
                <img src={photo.displayUrl} alt={photo.caption || "Evidencia"} className="h-44 w-full object-cover" />
                {photo.caption ? <figcaption className="p-3 text-sm text-[#B3B3B8]">{photo.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
