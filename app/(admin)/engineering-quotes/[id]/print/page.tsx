import Link from "next/link";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatDate, formatMoneyMXN } from "../../constants";
import PrintEngineeringQuoteButton from "./PrintEngineeringQuoteButton";

type EngineeringQuote = {
  id: number;
  quote_number: string | null;
  status: string | null;
  client_id: number | null;
  client_project_id: number | null;
  attention_to: string | null;
  project_name: string | null;
  intro_text: string | null;
  selected_systems: string[] | null;
  deliverables: string[] | null;
  requirements: string[] | null;
  commercial_terms: string[] | null;
  delivery_time: string | null;
  total_mxn: number | null;
  notes: string | null;
  created_at: string | null;
};

type Client = {
  name: string | null;
  company_name: string | null;
};

function NumberedList({ items }: { items: string[] | null }) {
  if (!items || items.length === 0) {
    return <p className="text-[#6A6D75]">Sin información.</p>;
  }

  return (
    <ol className="list-decimal space-y-1 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ol>
  );
}

export default async function EngineeringQuotePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;
  const { data: quote, error } = await supabase
    .from("engineering_quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !quote) {
    return (
      <main className="min-h-screen bg-white p-10 text-[#151518]">
        <h1 className="text-2xl font-semibold">Ingeniería no encontrada</h1>
      </main>
    );
  }

  const quoteData = quote as EngineeringQuote;
  const { data: client } = quoteData.client_id
    ? await supabase
        .from("clients")
        .select("name, company_name")
        .eq("id", quoteData.client_id)
        .maybeSingle()
    : { data: null };
  const clientData = client as Client | null;

  return (
    <main className="print-root min-h-screen bg-[#EDEBE6] py-5 text-[#111318]">
      <style>{`
        @page {
          size: letter;
          margin: 14mm;
        }

        .print-root {
          font-family: Arial, Helvetica, sans-serif;
        }

        @media print {
          html,
          body {
            background: white !important;
          }

          body > div > aside,
          body aside,
          nav,
          .print-actions {
            display: none !important;
          }

          body > div,
          main {
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

          .section {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="print-actions mx-auto mb-4 flex w-[8.5in] max-w-[calc(100vw-32px)] items-center justify-between">
        <Link href={`/engineering-quotes/${quoteData.id}`} className="text-xs text-[#5F626A]">
          Volver a ingeniería
        </Link>
        <PrintEngineeringQuoteButton />
      </div>

      <article className="document mx-auto w-[8.5in] min-h-[11in] max-w-[calc(100vw-32px)] bg-white px-10 py-8 shadow-xl">
        <header className="mb-6 flex items-start justify-between border-b border-[#D6D1C8] pb-4">
          <div>
            <div className="mb-3 flex h-11 items-center">
              <img src="/logo-print.png" alt="ALFA" className="max-h-11 max-w-36" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9E1B32]">
              Propuesta de ingeniería
            </p>
          </div>

          <div className="text-right text-[11px] leading-5 text-[#555963]">
            <p>Guadalajara, Jalisco</p>
            <p>{formatDate(quoteData.created_at)}</p>
            <p className="mt-2 text-xl font-semibold text-[#111318]">
              {quoteData.quote_number || "Sin folio"}
            </p>
            <p>Status: {quoteData.status || "draft"}</p>
          </div>
        </header>

        <section className="section mb-6 grid grid-cols-2 gap-4 text-xs">
          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
              Atención a
            </p>
            <p className="text-base font-semibold">
              {quoteData.attention_to || clientData?.name || "Sin cliente"}
            </p>
            <p className="mt-1 text-[#555963]">{clientData?.company_name || ""}</p>
          </div>

          <div className="border border-[#E1DDD5] p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9E1B32]">
              Proyecto
            </p>
            <p className="text-base font-semibold">
              {quoteData.project_name || "Sin proyecto"}
            </p>
          </div>
        </section>

        <section className="section mb-5 text-[12px] leading-5 text-[#3D4047]">
          <p>{quoteData.intro_text}</p>
        </section>

        <section className="section mb-5">
          <h2 className="mb-2 border-b border-[#D6D1C8] pb-1 text-sm font-semibold">
            Sistemas contemplados
          </h2>
          <div className="text-[11px] leading-5 text-[#555963]">
            <NumberedList items={quoteData.selected_systems} />
          </div>
        </section>

        <section className="section mb-5">
          <h2 className="mb-2 border-b border-[#D6D1C8] pb-1 text-sm font-semibold">
            Entregables
          </h2>
          <div className="text-[11px] leading-5 text-[#555963]">
            <NumberedList items={quoteData.deliverables} />
          </div>
        </section>

        <section className="section my-6 flex justify-end">
          <div className="w-72 border border-[#D6D1C8] bg-[#F7F5F1] p-4 text-xs">
            <div className="flex justify-between text-base font-semibold">
              <span>Total del proyecto</span>
              <span>{formatMoneyMXN(quoteData.total_mxn)}</span>
            </div>
            <p className="mt-2 text-[10px] text-[#555963]">
              Precio expresado en Pesos Mexicanos.
            </p>
            {quoteData.delivery_time ? (
              <p className="mt-1 text-[10px] text-[#555963]">
                Tiempo de entrega: {quoteData.delivery_time}
              </p>
            ) : null}
          </div>
        </section>

        <section className="section mb-5">
          <h2 className="mb-2 border-b border-[#D6D1C8] pb-1 text-sm font-semibold">
            Requisitos
          </h2>
          <div className="text-[11px] leading-5 text-[#555963]">
            <NumberedList items={quoteData.requirements} />
          </div>
        </section>

        <section className="section mb-8">
          {quoteData.notes?.trim() ? (
            <>
              <h2 className="mb-2 border-b border-[#D6D1C8] pb-1 text-sm font-semibold">
                Notas y aclaraciones
              </h2>
              <div className="mb-5 whitespace-pre-line text-[11px] leading-5 text-[#555963]">
                {quoteData.notes}
              </div>
            </>
          ) : null}

          <h2 className="mb-2 border-b border-[#D6D1C8] pb-1 text-sm font-semibold">
            Condiciones comerciales
          </h2>
          <div className="text-[11px] leading-5 text-[#555963]">
            <NumberedList items={quoteData.commercial_terms} />
          </div>
        </section>

        <footer className="section mt-10 text-[11px] leading-5 text-[#111318]">
          <p className="mb-10">Quedamos atentos a sus comentarios.</p>
          <p className="font-semibold">LIC. LEONARDO FIGUEROA GÃ“MEZ</p>
          <p>DIRECTOR COMERCIAL</p>
          <p className="text-[#9E1B32]">www.alfa-av.com</p>
        </footer>
      </article>
    </main>
  );
}
