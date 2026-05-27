import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Cpu,
  FilePlus2,
  FileText,
  LayoutDashboard,
  Package,
} from "lucide-react";
import HomeLoginForm from "@/components/HomeLoginForm";
import HomeLogoutButton from "@/components/HomeLogoutButton";
import { createSupabaseServerClient } from "@/services/supabaseServer";

const internalLinks = [
  {
    title: "Dashboard",
    href: "/dashboard",
    description: "Vista general del sistema comercial y operativo.",
    icon: LayoutDashboard,
  },
  {
    title: "Clientes",
    href: "/clients",
    description: "Cuentas, contactos, oportunidades y actividad comercial.",
    icon: Building2,
  },
  {
    title: "Productos",
    href: "/products",
    description: "Catálogo técnico-comercial para armar propuestas.",
    icon: Package,
  },
  {
    title: "Cotizaciones",
    href: "/quotes",
    description: "Consulta propuestas, versiones y aprobaciones.",
    icon: FileText,
  },
  {
    title: "Nueva cotización",
    href: "/quotes/new",
    description: "Inicia una propuesta comercial desde cero.",
    icon: FilePlus2,
  },
  {
    title: "Ingenierías",
    href: "/engineering-quotes",
    description: "Gestiona levantamientos, alcances y entregables.",
    icon: Cpu,
  },
  {
    title: "Proyectos",
    href: "/dashboard",
    description: "Da seguimiento a proyectos desde el panel operativo.",
    icon: BriefcaseBusiness,
  },
];

const publicHighlights = [
  "CRM",
  "Cotizaciones",
  "Ingenierías",
  "Proyectos",
];

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  return isAuthenticated ? <AuthenticatedHome /> : <PublicLanding />;
}

function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={`flex items-center justify-center rounded border border-white/10 bg-white shadow-2xl shadow-[#9E1B32]/20 ${
          compact ? "h-12 w-12 p-1.5" : "h-16 w-16 p-2"
        }`}
      >
        <Image
          src="/logo-alfa-os.png"
          alt="ALFA OS"
          width={96}
          height={96}
          priority
          className="h-full w-full object-contain"
        />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#F06B7D]">
          ALFA OS
        </p>
        <p className="mt-1 text-sm text-white/50">Sistema interno</p>
      </div>
    </div>
  );
}

function PublicLanding() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07080A] text-white">
      <section className="relative flex min-h-screen items-center px-6 py-10 sm:px-10 lg:px-16">
        <PageAtmosphere />

        <div className="relative mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[1.05fr_0.82fr] lg:items-center">
          <div>
            <LogoMark />

            <div className="mt-14 max-w-3xl">
              <p className="mb-5 text-sm font-medium text-white/45">
                Entrada principal de plataforma
              </p>
              <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                Bienvenido a ALFA OS
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-[#B9BAC2] sm:text-lg">
                Sistema interno para CRM, cotizaciones, ingenierías y
                proyectos.
              </p>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              {publicHighlights.map((item) => (
                <div
                  key={item}
                  className="rounded border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-medium text-white/70"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <HomeLoginForm />
        </div>
      </section>
    </main>
  );
}

function AuthenticatedHome() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07080A] text-white">
      <section className="relative min-h-screen px-6 py-6 sm:px-10 lg:px-16">
        <PageAtmosphere />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-12">
          <nav className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <LogoMark compact />
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center justify-center gap-2 rounded bg-white px-4 text-sm font-semibold text-[#08090B] transition hover:bg-[#F4F4F5]"
              >
                Ir al dashboard
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <HomeLogoutButton />
            </div>
          </nav>

          <header className="max-w-4xl pt-4">
            <p className="mb-5 text-sm font-medium text-white/45">
              Accesos rápidos
            </p>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Bienvenido a ALFA OS
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/58">
              Elige el módulo que necesitas para continuar. Esta pantalla no
              muestra métricas ni datos privados.
            </p>
          </header>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {internalLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={`${item.title}-${item.href}`}
                  href={item.href}
                  className="group min-h-44 rounded border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/20 backdrop-blur transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.075]"
                >
                  <div className="flex items-start justify-between gap-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded border border-[#9E1B32]/35 bg-[#9E1B32]/14 text-[#F07182] transition group-hover:border-[#F07182]/55 group-hover:bg-[#9E1B32]/22">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <ArrowRight
                      className="h-5 w-5 text-white/28 transition group-hover:translate-x-1 group-hover:text-white"
                      aria-hidden="true"
                    />
                  </div>
                  <h2 className="mt-7 text-xl font-semibold text-white">
                    {item.title}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-white/56">
                    {item.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

function PageAtmosphere() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(158,27,50,0.26),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.065),transparent_34%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#9E1B32] to-transparent" />
      <div className="absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </>
  );
}
