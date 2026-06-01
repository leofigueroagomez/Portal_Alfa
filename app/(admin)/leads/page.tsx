import Link from "next/link";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Lead = {
  id: number;
  name: string | null;
  customer_type: string | null;
  company: string | null;
  phone: string | null;
  service: string | null;
  message: string | null;
  interest: string | null;
  budget_range: string | null;
  timeline: string | null;
  status: string | null;
  created_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";

  return new Date(value).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(value: string | null) {
  const status = value || "nuevo";

  const labels: Record<string, string> = {
    nuevo: "Nuevo",
    contactado: "Contactado",
    calificado: "Calificado",
    descartado: "Descartado",
  };

  return labels[status] || status;
}

export default async function LeadsPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, name, customer_type, company, phone, service, message, interest, budget_range, timeline, status, created_at"
    )
    .order("created_at", { ascending: false });

  const leads = error ? [] : ((data || []) as Lead[]);
  const newLeads = leads.filter((lead) => (lead.status || "nuevo") === "nuevo");

  return (
    <main className="min-h-screen bg-[#F7F6F3] px-5 py-10 text-[#111111] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <section className="mb-10 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
              Comercial
            </p>
            <h1 className="mt-4 text-5xl font-semibold tracking-normal sm:text-6xl">
              Leads
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#666666]">
              Primer punto del flujo comercial: lead, cliente, cotización y
              proyecto.
            </p>
          </div>

          <div className="border border-black/10 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7A1F2B]">
              Nuevos
            </p>
            <p className="mt-5 text-5xl font-semibold">{newLeads.length}</p>
          </div>
        </section>

        {error ? (
          <div className="border border-[#7A1F2B]/30 bg-white p-6 text-sm text-[#666666]">
            Ejecuta la migración de leads para habilitar este módulo.
          </div>
        ) : leads.length === 0 ? (
          <div className="border border-black/10 bg-white p-8 text-[#666666]">
            Todavía no hay leads capturados.
          </div>
        ) : (
          <section className="grid gap-4">
            {leads.map((lead) => (
              <article
                key={lead.id}
                className="border border-black/10 bg-white p-6 transition hover:border-[#7A1F2B]/40 hover:shadow-2xl hover:shadow-black/[0.05]"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-[#7A1F2B] px-3 py-1 text-xs font-semibold text-white">
                        {statusLabel(lead.status)}
                      </span>
                      <span className="text-sm text-[#777777]">
                        {formatDate(lead.created_at)}
                      </span>
                    </div>
                    <h2 className="mt-5 text-2xl font-semibold">
                      {lead.name || "Contacto sin nombre"}
                    </h2>
                    <p className="mt-2 text-sm text-[#666666]">
                      {[lead.company, lead.customer_type].filter(Boolean).join(" · ") ||
                        "Sin empresa"}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm text-[#444444] sm:grid-cols-3 lg:min-w-[560px]">
                    <LeadMeta label="Interés" value={lead.interest} />
                    <LeadMeta label="Proyecto" value={lead.budget_range} />
                    <LeadMeta label="Inicio" value={lead.timeline} />
                  </div>
                </div>

                <div className="mt-6 grid gap-4 border-t border-black/10 pt-5 lg:grid-cols-[1fr_260px]">
                  <p className="text-sm leading-7 text-[#555555]">
                    {lead.service || lead.message || "Sin objetivo capturado."}
                  </p>
                  <div className="flex flex-wrap items-start gap-3 lg:justify-end">
                    {lead.phone ? (
                      <a
                        href={`tel:${lead.phone}`}
                        className="inline-flex min-h-10 items-center rounded-full border border-black/10 px-4 text-sm font-semibold transition hover:border-[#7A1F2B] hover:text-[#7A1F2B]"
                      >
                        {lead.phone}
                      </a>
                    ) : null}
                    <Link
                      href="/customers"
                      className="inline-flex min-h-10 items-center rounded-full bg-[#111111] px-4 text-sm font-semibold text-white transition hover:bg-[#7A1F2B]"
                    >
                      Clientes
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function LeadMeta({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bg-[#F7F6F3] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7A1F2B]">
        {label}
      </p>
      <p className="mt-2 font-semibold">{value || "Sin dato"}</p>
    </div>
  );
}
