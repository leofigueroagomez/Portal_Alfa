import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, Cpu, FileText, Package } from "lucide-react";
import { createSupabaseServerClient } from "@/services/supabaseServer";

const modules = [
  {
    name: "CRM",
    description: "Seguimiento comercial y cartera de clientes.",
    icon: Building2,
  },
  {
    name: "Cotizaciones",
    description: "Propuestas, versiones y aprobación interna.",
    icon: FileText,
  },
  {
    name: "Ingenierías",
    description: "Control técnico de alcances y entregables.",
    icon: Cpu,
  },
  {
    name: "Productos",
    description: "Catálogo para soluciones y proyectos.",
    icon: Package,
  },
];

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  return (
    <main className="min-h-screen overflow-hidden bg-[#07080A] text-white">
      <section className="relative flex min-h-screen items-center px-6 py-10 sm:px-10 lg:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(158,27,50,0.28),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_32%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#9E1B32] to-transparent" />

        <div className="relative mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded border border-white/10 bg-white p-2 shadow-2xl shadow-[#9E1B32]/20">
                <Image
                  src="/logo-alfa.png"
                  alt="ALFA OS"
                  width={72}
                  height={72}
                  priority
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#E05062]">
                  ALFA OS
                </p>
                <p className="mt-1 text-sm text-white/55">Sistema interno</p>
              </div>
            </div>

            <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              Bienvenido a ALFA OS
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#B9BAC2] sm:text-lg">
              Sistema interno para gestión comercial, cotizaciones,
              ingenierías y proyectos.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded bg-[#9E1B32] px-6 text-sm font-semibold text-white shadow-lg shadow-[#9E1B32]/25 transition hover:bg-[#B8243E] focus:outline-none focus:ring-2 focus:ring-[#E05062] focus:ring-offset-2 focus:ring-offset-[#07080A]"
              >
                Iniciar sesión
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>

              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded border border-white/15 bg-white/8 px-6 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/12 focus:outline-none focus:ring-2 focus:ring-white/35 focus:ring-offset-2 focus:ring-offset-[#07080A]"
                >
                  Ir al dashboard
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {modules.map((module) => {
              const Icon = module.icon;

              return (
                <article
                  key={module.name}
                  className="rounded border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur"
                >
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded border border-[#9E1B32]/35 bg-[#9E1B32]/14 text-[#F07182]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">
                    {module.name}
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-white/60">
                    {module.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
