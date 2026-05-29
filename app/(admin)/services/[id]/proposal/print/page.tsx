import Link from "next/link";
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
import PrintServiceProposalButton from "./PrintServiceProposalButton";

type ServiceProposalReport = {
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

export default async function ServiceProposalPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;
  const { data: report, error } = await supabase
    .from("service_reports")
    .select(
      "id, service_number, service_location, google_maps_url, performed_by_name, service_date, background, diagnosis, solution_status, solution_description, requires_parts, required_parts_notes, labor_sale_mxn, related_quote_id, service_discount_mxn, service_discount_percent, service_discount_type, service_discount_reason, clients(name, company_name), client_projects(name), quotes:related_quote_id(quote_number)"
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
  const serviceNumber =
    reportData.service_number || `SERV-${String(reportData.id).padStart(4, "0")}`;

  return (
    <main className="print-root min-h-screen bg-[#EDEBE6] py-5 text-[#111318]">
      <style>{`
        @page { size: letter; margin: 12mm; }
        .print-root { font-family: Arial, Helvetica, sans-serif; }
        .summary-box, .text-box, .photo-card, .totals-box, tr { break-inside: avoid; page-break-inside: avoid; }
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
            width: 100% !important;
            min-height: auto !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .quote-print-logo { max-height: 28px !important; max-width: 112px !important; }
          .photo-grid { gap: 6px !important; }
          .photo-card img { max-height: 165px !important; }
        }
      `}</style>

      <div className="print-actions mx-auto mb-4 flex w-[8.5in] max-w-[calc(100vw-32px)] items-center justify-between">
        <Link href={`/services/${id}/proposal`} className="text-xs text-[#5F626A]">
          Volver a propuesta
        </Link>
        <PrintServiceProposalButton />
      </div>

      <article className="document mx-auto w-[8.5in] min-h-[11in] max-w-[calc(100vw-32px)] bg-white px-10 py-8 shadow-xl">
        <header className="quote-print-header mb-5 flex items-start justify-between border-b border-[#D6D1C8] pb-4">
          <div>
            <div className="mb-3 flex h-11 items-center">
              <img src="/logo-print.png" alt="ALFA OS" className="quote-print-logo max-h-11 max-w-36" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9E1B32]">
              Propuesta de reparacion
            </p>
          </div>
          <div className="text-right text-[11px] leading-5 text-[#555963]">
            <p>Fecha: {formatServiceDate(reportData.service_date)}</p>
            <p className="mt-2 text-xl font-semibold text-[#111318]">{serviceNumber}</p>
          </div>
        </header>

        <section className="summary-box mb-5 grid grid-cols-2 gap-4 text-xs">
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">Cliente</p>
            <p className="text-base font-semibold">{reportData.clients?.name || "Sin cliente"}</p>
            <p className="mt-1 text-[#555963]">{reportData.clients?.company_name || ""}</p>
          </div>
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">Servicio</p>
            <p className="text-base font-semibold">{reportData.client_projects?.name || "Sin proyecto"}</p>
            <p className="mt-1 text-[#555963]">Tecnico: {reportData.performed_by_name || "-"}</p>
          </div>
        </section>

        <section className="summary-box mb-5 grid grid-cols-2 gap-4 text-xs">
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
          <section key={title} className="text-box mb-4 border-t border-[#D6D1C8] pt-3">
            <h2 className="mb-1 text-sm font-semibold">{title}</h2>
            <p className="whitespace-pre-line text-[11px] leading-5 text-[#555963]">{text || "-"}</p>
          </section>
        ))}

        <section className="mb-5">
          <h2 className="mb-2 border-b border-[#D6D1C8] pb-2 text-sm font-semibold">Refacciones requeridas</h2>
          {reportData.required_parts_notes ? (
            <p className="mb-3 whitespace-pre-line text-[11px] leading-5 text-[#555963]">
              {reportData.required_parts_notes}
            </p>
          ) : null}
          {items.length === 0 ? (
            <p className="text-[11px] text-[#555963]">Sin refacciones cotizadas.</p>
          ) : (
            <table className="w-full border-collapse text-[10.5px]">
              <thead>
                <tr className="bg-[#F7F5F1] text-left uppercase tracking-[0.12em] text-[#555963]">
                  <th className="border border-[#E1DDD5] p-2">Descripcion</th>
                  <th className="border border-[#E1DDD5] p-2">Cantidad</th>
                  <th className="border border-[#E1DDD5] p-2">Precio</th>
                  <th className="border border-[#E1DDD5] p-2">MO asociada</th>
                  <th className="border border-[#E1DDD5] p-2 text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="border border-[#E1DDD5] p-2">{itemDescription(item) || "Refaccion"}</td>
                    <td className="border border-[#E1DDD5] p-2">{Number(item.quantity || 0)}</td>
                    <td className="border border-[#E1DDD5] p-2">{formatCurrency(item.equipment_total, "MXN")}</td>
                    <td className="border border-[#E1DDD5] p-2">{formatCurrency(item.labor_total, "MXN")}</td>
                    <td className="border border-[#E1DDD5] p-2 text-right font-semibold">
                      {formatCurrency(item.line_total, "MXN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {reportData.quotes?.quote_number ? (
            <p className="mt-2 text-[10px] text-[#555963]">
              Refacciones cotizadas en: {reportData.quotes.quote_number}
            </p>
          ) : null}
        </section>

        <section className="totals-box ml-auto mb-5 w-80 border border-[#D6D1C8] p-4 text-[11px]">
          <h2 className="mb-3 text-sm font-semibold">Resumen economico</h2>
          <div className="space-y-2">
            <div className="flex justify-between gap-4">
              <span>Subtotal servicio</span>
              <strong>{formatCurrency(totals.serviceSubtotal, "MXN")}</strong>
            </div>
            <div className="flex justify-between gap-4">
              <span>Subtotal refacciones</span>
              <strong>{formatCurrency(totals.partsSubtotal, "MXN")}</strong>
            </div>
            {totals.discount > 0 ? (
              <div className="border-y border-[#E1DDD5] py-2">
                <p className="mb-1 text-[10px] text-[#555963]">
                  En caso de contratar las refacciones y la reparacion completa del servicio, se otorgara el siguiente descuento:
                </p>
                <div className="flex justify-between gap-4 font-semibold text-[#9E1B32]">
                  <span>Descuento</span>
                  <span>-{formatCurrency(totals.discount, "MXN")}</span>
                </div>
                {reportData.service_discount_reason ? (
                  <p className="mt-1 text-[10px] text-[#555963]">{reportData.service_discount_reason}</p>
                ) : null}
              </div>
            ) : null}
            <div className="flex justify-between gap-4">
              <span>IVA</span>
              <strong>{formatCurrency(totals.iva, "MXN")}</strong>
            </div>
            <div className="flex justify-between gap-4 border-t border-[#D6D1C8] pt-2 text-base">
              <span>Total</span>
              <strong>{formatCurrency(totals.total, "MXN")}</strong>
            </div>
          </div>
        </section>

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
                  <img src={photo.displayUrl} alt={photo.caption || "Evidencia"} className="block max-h-[210px] w-full object-contain" />
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
