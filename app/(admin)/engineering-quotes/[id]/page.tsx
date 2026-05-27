import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import {
  formatDate,
  formatMoneyMXN,
} from "../constants";
import CreateEngineeringVersionButton from "./CreateEngineeringVersionButton";
import ApproveEngineeringQuoteButton from "./ApproveEngineeringQuoteButton";

type EngineeringQuote = {
  id: number;
  quote_number: string | null;
  client_id: number | null;
  client_project_id: number | null;
  version: number | null;
  version_letter: string | null;
  status: string | null;
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
  is_latest: boolean | null;
  created_at: string | null;
};

type Client = {
  name: string | null;
  client_number: number | null;
};

type ClientProject = {
  name: string | null;
  project_number: number | null;
};

function ListBlock({ title, items }: { title: string; items: string[] | null }) {
  return (
    <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-6">
      <h2 className="mb-4 text-2xl font-semibold">{title}</h2>
      {items && items.length > 0 ? (
        <ol className="list-decimal space-y-2 pl-5 text-[#B3B3B8]">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      ) : (
        <p className="text-[#77777D]">Sin información.</p>
      )}
    </section>
  );
}

export default async function EngineeringQuoteDetailPage({
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
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <Link href="/engineering-quotes" className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
          <ArrowLeft size={18} />
          Volver a ingenierías
        </Link>
        <h1 className="text-3xl font-bold">Ingeniería no encontrada</h1>
      </main>
    );
  }

  const quoteData = quote as EngineeringQuote;
  const { data: client } = quoteData.client_id
    ? await supabase
        .from("clients")
        .select("name, client_number")
        .eq("id", quoteData.client_id)
        .maybeSingle()
    : { data: null };
  const { data: project } = quoteData.client_project_id
    ? await supabase
        .from("client_projects")
        .select("name, project_number")
        .eq("id", quoteData.client_project_id)
        .maybeSingle()
    : { data: null };

  const clientData = client as Client | null;
  const projectData = project as ClientProject | null;

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link href="/engineering-quotes" className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]">
        <ArrowLeft size={18} />
        Volver a ingenierías
      </Link>

      <section className="mb-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">
              {quoteData.quote_number || "Sin folio"}
            </p>
            <h1 className="mb-3 text-4xl font-bold">Ingeniería #{quoteData.id}</h1>
            <p className="text-[#B3B3B8]">
              Creada el {formatDate(quoteData.created_at)}
            </p>
            <div className="mt-5 space-y-1 text-[#B3B3B8]">
              <p>
                Atención a: <span className="text-white">{quoteData.attention_to || clientData?.name || "Sin cliente"}</span>
              </p>
              <p>
                Proyecto: <span className="text-white">{quoteData.project_name || projectData?.name || "Sin proyecto"}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            <span className={`rounded-full border px-4 py-2 text-sm ${quoteData.status === "approved" ? "border-[#1F7A4D] bg-[#143D2A] text-[#8CE0B6]" : "border-[#2A2A30] bg-[#222228] text-[#B3B3B8]"}`}>
              {quoteData.status || "draft"}
            </span>
            {quoteData.status === "draft" ? (
              <Link href={`/engineering-quotes/${quoteData.id}/edit`} className="rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30]">
                Editar
              </Link>
            ) : null}
            <Link href={`/engineering-quotes/${quoteData.id}/print`} className="rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30]">
              Imprimir / PDF
            </Link>
            <CreateEngineeringVersionButton
              quoteId={quoteData.id}
              clientNumber={clientData?.client_number || null}
              projectNumber={projectData?.project_number || null}
            />
            <ApproveEngineeringQuoteButton
              quoteId={quoteData.id}
              clientId={quoteData.client_id}
              projectId={quoteData.client_project_id}
              status={quoteData.status}
            />
          </div>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-6">
          <p className="mb-2 text-[#B3B3B8]">Versión</p>
          <h2 className="text-2xl font-bold">{quoteData.version_letter || "A"}</h2>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-6">
          <p className="mb-2 text-[#B3B3B8]">Última versión</p>
          <h2 className="text-2xl font-bold">{quoteData.is_latest ? "Sí" : "No"}</h2>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-6">
          <p className="mb-2 text-[#B3B3B8]">Tiempo de entrega</p>
          <h2 className="text-xl font-bold">{quoteData.delivery_time || "Por definir"}</h2>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-6">
          <p className="mb-2 text-[#B3B3B8]">Total MXN</p>
          <h2 className="text-2xl font-bold text-[#9E1B32]">
            {formatMoneyMXN(quoteData.total_mxn)}
          </h2>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-6">
        <h2 className="mb-4 text-2xl font-semibold">Texto introductorio</h2>
        <p className="leading-relaxed text-[#B3B3B8]">{quoteData.intro_text || "Sin texto introductorio."}</p>
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-2">
        <ListBlock title="Sistemas contemplados" items={quoteData.selected_systems} />
        <ListBlock title="Entregables" items={quoteData.deliverables} />
        <ListBlock title="Requisitos" items={quoteData.requirements} />
        {quoteData.notes?.trim() ? (
          <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-6">
            <h2 className="mb-4 text-2xl font-semibold">
              Aclaraciones / Notas especiales
            </h2>
            <div className="whitespace-pre-line leading-relaxed text-[#B3B3B8]">
              {quoteData.notes}
            </div>
          </section>
        ) : null}
        <ListBlock title="Condiciones comerciales" items={quoteData.commercial_terms} />
      </section>
    </main>
  );
}
