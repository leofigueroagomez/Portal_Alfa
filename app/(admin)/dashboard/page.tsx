import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Inbox,
  Plus,
  Users,
  Wrench,
} from "lucide-react";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import { formatCurrency, formatNumber } from "@/lib/format";
import { normalizeSalesStage } from "@/lib/salesStages";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Lead = {
  id: number;
  name: string | null;
  interest: string | null;
  status: string | null;
  created_at: string | null;
};

type Client = {
  id: number;
  name: string | null;
  source?: string | null;
  created_at: string | null;
};

type Quote = {
  id: number;
  quote_number: string | null;
  status: string | null;
  total_mxn?: number | null;
  grand_total?: number | null;
  created_at: string | null;
};

type ClientProject = {
  id: number;
  name: string | null;
  sales_stage?: string | null;
  status?: string | null;
  estimated_value_mxn?: number | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type ServiceReport = {
  id: number;
  status: string | null;
  solution_status?: string | null;
  created_at: string | null;
};

type Contractor = {
  id: number;
  is_active: boolean | null;
};

function isOpenStatus(status: string | null) {
  return !["approved", "archived", "lost", "closed", "convertido"].includes(
    (status || "draft").toLowerCase()
  );
}

function isWonStatus(status: string | null) {
  return ["approved", "won", "closed"].includes((status || "").toLowerCase());
}

function isThisMonth(value: string | null | undefined) {
  if (!value) return false;

  const date = new Date(value);
  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function quoteValue(quote: Quote) {
  return Number(quote.total_mxn ?? quote.grand_total ?? 0);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = createSupabaseAdminClient();

  const [
    leadsResult,
    clientsResult,
    quotesResult,
    projectsResult,
    servicesResult,
    contractorsResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("leads")
      .select("id, name, interest, status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("clients")
      .select("id, name, source, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("quotes")
      .select("id, quote_number, status, total_mxn, grand_total, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("client_projects")
      .select("id, name, sales_stage, status, estimated_value_mxn, updated_at, created_at")
      .order("updated_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("service_reports")
      .select("id, status, solution_status, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("contractors").select("id, is_active"),
  ]);

  const leads = leadsResult.error ? [] : ((leadsResult.data || []) as Lead[]);
  const clients = clientsResult.error ? [] : ((clientsResult.data || []) as Client[]);
  const quotes = quotesResult.error ? [] : ((quotesResult.data || []) as Quote[]);
  const projects = projectsResult.error
    ? []
    : ((projectsResult.data || []) as ClientProject[]);
  const services = servicesResult.error
    ? []
    : ((servicesResult.data || []) as ServiceReport[]);
  const contractors = contractorsResult.error
    ? []
    : ((contractorsResult.data || []) as Contractor[]);

  const newLeads = leads.filter((lead) => (lead.status || "nuevo") === "nuevo");
  const leadsThisMonth = leads.filter((lead) => isThisMonth(lead.created_at));
  const clientsThisMonth = clients.filter((client) => isThisMonth(client.created_at));
  const openQuotes = quotes.filter((quote) => isOpenStatus(quote.status));
  const wonQuotes = quotes.filter((quote) => isWonStatus(quote.status));
  const wonQuotesThisMonth = wonQuotes.filter((quote) => isThisMonth(quote.created_at));
  const quotedThisMonth = quotes
    .filter((quote) => isThisMonth(quote.created_at))
    .reduce((sum, quote) => sum + quoteValue(quote), 0);
  const activeProjectStages = new Set([
    "lead",
    "site_visit",
    "engineering",
    "quoted",
    "negotiation",
    "won",
  ]);
  const activeProjects = projects.filter((project) => {
    const stage = normalizeSalesStage(project.sales_stage);
    const status = (project.status || "").toLowerCase();

    return activeProjectStages.has(stage) && !["archived", "lost", "closed"].includes(status);
  });
  const openServices = services.filter(
    (service) =>
      !["closed", "archived", "cancelled"].includes((service.status || "").toLowerCase()) &&
      service.solution_status !== "solved"
  );
  const activeContractors = contractors.filter((contractor) => contractor.is_active !== false);
  const convertedLeads = leads.filter((lead) => lead.status === "convertido");
  const estimatedConversion =
    leads.length > 0 ? Math.round((convertedLeads.length / leads.length) * 100) : 0;
  const recentActivity = [
    ...leads.slice(0, 4).map((lead) => ({
      key: `lead-${lead.id}`,
      label: "Nuevo lead capturado",
      title: lead.name || "Contacto sin nombre",
      detail: lead.interest || "Landing Web",
      date: lead.created_at,
    })),
    ...clients.slice(0, 3).map((client) => ({
      key: `client-${client.id}`,
      label: "Cliente creado",
      title: client.name || "Cliente sin nombre",
      detail: client.source || "Origen no especificado",
      date: client.created_at,
    })),
    ...quotes.slice(0, 3).map((quote) => ({
      key: `quote-${quote.id}`,
      label: "Cotización creada",
      title: quote.quote_number || `Cotización #${quote.id}`,
      detail: formatCurrency(quoteValue(quote), "MXN"),
      date: quote.created_at,
    })),
    ...projects.slice(0, 3).map((project) => ({
      key: `project-${project.id}`,
      label: "Proyecto actualizado",
      title: project.name || `Proyecto #${project.id}`,
      detail: formatCurrency(project.estimated_value_mxn, "MXN"),
      date: project.updated_at || project.created_at,
    })),
  ]
    .sort((a, b) => {
      const first = a.date ? new Date(a.date).getTime() : 0;
      const second = b.date ? new Date(b.date).getTime() : 0;

      return second - first;
    })
    .slice(0, 7);

  return (
    <main className="min-h-screen bg-[#F7F6F3] text-[#111111]">
      <section className="bg-white px-5 py-16 sm:px-8 lg:px-12 xl:py-20">
        <div className="mx-auto max-w-7xl text-center">
          <Image
            src="/logo-alfa-os.png"
            alt="ALFA OS"
            width={520}
            height={250}
            priority
            className="mx-auto h-auto w-[min(78vw,430px)] object-contain"
          />
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.32em] text-[#7A1F2B]">
            High End Services Operating System
          </p>
          <h1 className="mx-auto mt-8 max-w-5xl text-5xl font-semibold leading-tight sm:text-6xl xl:text-7xl">
            Vista ejecutiva de la operación comercial y proyectos de ALFA.
          </h1>
        </div>
      </section>

      <section className="px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Leads nuevos" value={formatCount(newLeads.length)} href="/leads" />
          <MetricCard label="Leads del mes" value={formatCount(leadsThisMonth.length)} />
          <MetricCard label="Clientes nuevos" value={formatCount(clientsThisMonth.length)} href="/customers" />
          <MetricCard label="Cotizaciones pendientes" value={formatCount(openQuotes.length)} href="/quotes" />
          <MetricCard label="Cotizado este mes" value={formatCurrency(quotedThisMonth, "MXN")} accent />
          <MetricCard label="Proyectos activos" value={formatCount(activeProjects.length)} href="/projects" />
        </div>
      </section>

      <section className="px-5 pb-12 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-2">
          <ExecutiveSection
            eyebrow="Comercial"
            title="Origen, seguimiento y cierre."
            metrics={[
              ["Leads pendientes", formatCount(newLeads.length)],
              ["Cotizaciones abiertas", formatCount(openQuotes.length)],
              ["Cotizaciones ganadas", formatCount(wonQuotes.length)],
              ["Conversión estimada", `${formatCount(estimatedConversion)}%`],
            ]}
            links={[
              { href: "/leads", label: "Leads", icon: Inbox },
              { href: "/quotes/new", label: "Nueva Cotización", icon: Plus },
              { href: "/customers", label: "Clientes", icon: Building2 },
              { href: "/quotes", label: "Cotizaciones", icon: FileText },
            ]}
          />

          <ExecutiveSection
            eyebrow="Operaciones"
            title="Ejecución, servicio y capacidad."
            metrics={[
              ["Proyectos activos", formatCount(activeProjects.length)],
              ["Servicios abiertos", formatCount(openServices.length)],
              ["Contratistas activos", formatCount(activeContractors.length)],
              ["Ganadas este mes", formatCount(wonQuotesThisMonth.length)],
            ]}
            links={[
              { href: "/projects", label: "Proyectos", icon: FolderOpen },
              { href: "/services", label: "Servicios", icon: Wrench },
              { href: "/contractors", label: "Contratistas", icon: Users },
            ]}
            dark
          />
        </div>
      </section>

      <section className="bg-white px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[0.96fr_1.04fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
              Accesos rápidos
            </p>
            <h2 className="mt-4 max-w-xl text-4xl font-semibold leading-tight">
              Acciones clave sin ruido administrativo.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <QuickAction href="/quotes/new" label="Crear cotización" icon={ClipboardCheck} />
            <QuickAction href="/leads" label="Ver leads" icon={Inbox} />
            <QuickAction href="/projects" label="Ver proyectos" icon={BriefcaseBusiness} />
            <QuickAction href="/clients/new" label="Crear cliente" icon={Building2} />
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="bg-[#111111] p-6 text-white sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B84A5A]">
              Actividad reciente
            </p>
            <h2 className="mt-4 text-4xl font-semibold">Pulso de ALFA OS</h2>
            <div className="mt-8 space-y-6">
              {recentActivity.length === 0 ? (
                <p className="text-sm leading-7 text-white/56">
                  Aquí aparecerá la actividad reciente de ALFA OS.
                </p>
              ) : (
                recentActivity.map((activity) => (
                  <div
                    key={activity.key}
                    className="grid gap-3 border-l border-white/14 pl-5 sm:grid-cols-[170px_1fr]"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/42">
                      {activity.label}
                    </p>
                    <div>
                      <h3 className="text-lg font-semibold">{activity.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-white/58">
                        {activity.detail}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border border-black/10 bg-white p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
              Lectura ejecutiva
            </p>
            <h2 className="mt-4 text-4xl font-semibold">Prioridades de hoy</h2>
            <div className="mt-8 space-y-5">
              <PriorityLine label="Seguimiento comercial" value={`${formatCount(newLeads.length)} leads nuevos`} />
              <PriorityLine label="Cotización" value={`${formatCount(openQuotes.length)} pendientes`} />
              <PriorityLine label="Operación" value={`${formatCount(activeProjects.length)} proyectos activos`} />
              <PriorityLine label="Servicio" value={`${formatCount(openServices.length)} abiertos`} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  href,
  accent = false,
}: {
  label: string;
  value: string;
  href?: string;
  accent?: boolean;
}) {
  const content = (
    <div
      className={`min-h-44 border p-6 transition ${
        accent
          ? "border-[#7A1F2B] bg-[#7A1F2B] text-white"
          : "border-black/10 bg-white text-[#111111]"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-[0.24em] ${
          accent ? "text-white/68" : "text-[#7A1F2B]"
        }`}
      >
        {label}
      </p>
      <p className="mt-8 text-4xl font-semibold leading-none">{value}</p>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block hover:-translate-y-0.5">
      {content}
    </Link>
  );
}

function ExecutiveSection({
  eyebrow,
  title,
  metrics,
  links,
  dark = false,
}: {
  eyebrow: string;
  title: string;
  metrics: [string, string][];
  links: { href: string; label: string; icon: React.ElementType }[];
  dark?: boolean;
}) {
  return (
    <div
      className={`p-6 sm:p-8 ${
        dark ? "bg-[#111111] text-white" : "border border-black/10 bg-white text-[#111111]"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-[0.28em] ${
          dark ? "text-[#B84A5A]" : "text-[#7A1F2B]"
        }`}
      >
        {eyebrow}
      </p>
      <h2 className="mt-4 text-4xl font-semibold leading-tight">{title}</h2>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {metrics.map(([label, value]) => (
          <div
            key={label}
            className={dark ? "bg-white/[0.06] p-4" : "bg-[#F7F6F3] p-4"}
          >
            <p className={dark ? "text-sm text-white/52" : "text-sm text-[#666666]"}>
              {label}
            </p>
            <p className="mt-3 text-3xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition ${
                dark
                  ? "bg-white text-[#111111] hover:bg-[#EDEAE4]"
                  : "bg-[#111111] text-white hover:bg-[#7A1F2B]"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-36 items-start justify-between border border-black/10 bg-[#F7F6F3] p-5 transition hover:-translate-y-0.5 hover:border-[#7A1F2B]/40 hover:bg-white"
    >
      <div>
        <Icon className="h-6 w-6 text-[#7A1F2B]" />
        <p className="mt-8 text-xl font-semibold">{label}</p>
      </div>
      <ArrowUpRight className="h-5 w-5 text-[#666666] transition group-hover:text-[#7A1F2B]" />
    </Link>
  );
}

function PriorityLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-black/10 py-4">
      <p className="font-semibold">{label}</p>
      <p className="text-sm text-[#666666]">{value}</p>
    </div>
  );
}
