import Link from "next/link";
import { notFound } from "next/navigation";
import { formatCurrency, formatNumber } from "@/lib/format";
import { getPublicDocumentLink } from "@/lib/publicDocuments";

export const dynamic = "force-dynamic";

type Quote = {
  id: number;
  quote_number: string | null;
  client_id: number | null;
  client_project_id: number | null;
  status: string | null;
  equipment_total: number | null;
  labor_total: number | null;
  grand_total: number | null;
  subtotal_mxn?: number | null;
  taxable_base_mxn?: number | null;
  iva_mxn?: number | null;
  total_mxn?: number | null;
  exchange_rate: number | null;
  created_at: string | null;
};

type Client = {
  name: string | null;
  company_name?: string | null;
};

type Project = {
  name: string | null;
};

type QuoteSection = {
  id: number;
  name: string | null;
  sort_order: number | null;
  equipment_total: number | null;
  labor_total: number | null;
};

type QuoteItem = {
  id: number;
  quote_section_id: number;
  quantity: number | null;
  sale_currency: string | null;
  unit_equipment_price: number | null;
  unit_equipment_price_usd?: number | null;
  unit_labor_price: number | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  sort_order: number | null;
};

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";

  return new Date(value).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getEquipmentUnitPriceUsd(item: QuoteItem, exchangeRate: number) {
  if (item.unit_equipment_price_usd != null) {
    return Number(item.unit_equipment_price_usd || 0);
  }

  if ((item.sale_currency || "USD").toUpperCase() === "MXN") {
    return exchangeRate > 0 ? Number(item.unit_equipment_price || 0) / exchangeRate : 0;
  }

  return Number(item.unit_equipment_price || 0);
}

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getPublicDocumentLink(token);

  if (!result?.link.quote_id || result.link.document_type !== "approved_quote") {
    notFound();
  }

  const { supabase, link } = result;
  const { data: quote } = await supabase
    .from("quotes")
    .select(
      "id, quote_number, client_id, client_project_id, status, equipment_total, labor_total, grand_total, subtotal_mxn, taxable_base_mxn, iva_mxn, total_mxn, exchange_rate, created_at"
    )
    .eq("id", link.quote_id)
    .eq("client_project_id", link.client_project_id)
    .eq("status", "approved")
    .maybeSingle();

  if (!quote) {
    notFound();
  }

  const quoteData = quote as Quote;
  const [{ data: client }, { data: project }, { data: sections }, { data: items }] =
    await Promise.all([
      quoteData.client_id
        ? supabase
            .from("clients")
            .select("name, company_name")
            .eq("id", quoteData.client_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("client_projects")
        .select("name")
        .eq("id", link.client_project_id)
        .maybeSingle(),
      supabase
        .from("quote_sections")
        .select("id, name, sort_order, equipment_total, labor_total")
        .eq("quote_id", quoteData.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("quote_items")
        .select(
          "id, quote_section_id, quantity, sale_currency, unit_equipment_price, unit_equipment_price_usd, unit_labor_price, product_brand, product_model, product_name, sort_order"
        )
        .eq("quote_id", quoteData.id)
        .order("sort_order", { ascending: true }),
    ]);

  const clientData = client as Client | null;
  const projectData = project as Project | null;
  const quoteSections = (sections || []) as QuoteSection[];
  const quoteItems = (items || []) as QuoteItem[];
  const exchangeRate = Number(quoteData.exchange_rate || 1);
  const subtotalMXN =
    Number(quoteData.subtotal_mxn) ||
    Number(quoteData.equipment_total || 0) * exchangeRate +
      Number(quoteData.labor_total || 0);
  const taxableBaseMXN = Number(quoteData.taxable_base_mxn) || subtotalMXN;
  const ivaMXN = Number(quoteData.iva_mxn) || taxableBaseMXN * 0.16;
  const totalMXN =
    Number(quoteData.total_mxn) || Number(quoteData.grand_total) || taxableBaseMXN + ivaMXN;

  return (
    <main className="min-h-screen bg-white text-[#151518]">
      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-10 flex flex-wrap items-start justify-between gap-6 border-b border-black/10 pb-8">
          <div>
            <p className="mb-3 text-sm font-semibold tracking-[0.28em] text-[#9E1B32]">
              ALFA IT
            </p>
            <h1 className="text-4xl font-semibold">Cotizacion autorizada</h1>
            <p className="mt-3 text-[#5F626A]">
              {projectData?.name || "Proyecto ALFA"}
            </p>
          </div>
          <div className="text-left text-sm md:text-right">
            <p className="font-semibold">{quoteData.quote_number || `Cotizacion #${quoteData.id}`}</p>
            <p className="text-[#5F626A]">{formatDate(quoteData.created_at)}</p>
            <p className="mt-3 text-[#5F626A]">{clientData?.company_name || clientData?.name}</p>
          </div>
        </div>

        <section className="mb-10 grid gap-4 md:grid-cols-3">
          <div className="border border-black/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#77777D]">
              Subtotal
            </p>
            <p className="mt-3 text-2xl font-semibold">{formatCurrency(subtotalMXN, "MXN")}</p>
          </div>
          <div className="border border-black/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#77777D]">
              IVA
            </p>
            <p className="mt-3 text-2xl font-semibold">{formatCurrency(ivaMXN, "MXN")}</p>
          </div>
          <div className="border border-black/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#77777D]">
              Total
            </p>
            <p className="mt-3 text-2xl font-semibold text-[#9E1B32]">
              {formatCurrency(totalMXN, "MXN")}
            </p>
          </div>
        </section>

        <section className="grid gap-6">
          {quoteSections.map((section) => {
            const sectionItems = quoteItems.filter(
              (item) => item.quote_section_id === section.id
            );

            return (
              <div key={section.id} className="border border-black/10">
                <div className="border-b border-black/10 bg-[#F7F6F3] p-4">
                  <h2 className="text-xl font-semibold">{section.name || "Partidas"}</h2>
                </div>
                <div className="divide-y divide-black/10">
                  {sectionItems.map((item) => {
                    const equipmentUnitUsd = getEquipmentUnitPriceUsd(item, exchangeRate);
                    const equipmentTotalMxn =
                      equipmentUnitUsd * Number(item.quantity || 0) * exchangeRate;
                    const laborTotalMxn =
                      Number(item.unit_labor_price || 0) * Number(item.quantity || 0);

                    return (
                      <div
                        key={item.id}
                        className="grid gap-3 p-4 text-sm md:grid-cols-[1fr_0.25fr_0.4fr_0.4fr]"
                      >
                        <div>
                          <p className="font-semibold">
                            {[item.product_brand, item.product_model, item.product_name]
                              .filter(Boolean)
                              .join(" ")}
                          </p>
                        </div>
                        <p>Cant. {formatNumber(item.quantity)}</p>
                        <p>{formatCurrency(equipmentTotalMxn, "MXN")}</p>
                        <p>{formatCurrency(laborTotalMxn, "MXN")}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        <div className="mt-10 border-t border-black/10 pt-6">
          <Link href={`/public/documents/${token}`} className="text-sm font-semibold text-[#9E1B32]">
            Volver a documentos
          </Link>
        </div>
      </section>
    </main>
  );
}
