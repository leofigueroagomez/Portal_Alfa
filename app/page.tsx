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
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Clientes", href: "/clients", icon: Building2 },
  { title: "Productos", href: "/products", icon: Package },
  { title: "Cotizaciones", href: "/quotes", icon: FileText },
  { title: "Nueva cotización", href: "/quotes/new", icon: FilePlus2 },
  { title: "Ingenierías", href: "/engineering-quotes", icon: Cpu },
  { title: "Proyectos", href: "/dashboard", icon: BriefcaseBusiness },
];

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);

  return isAuthenticated ? <AuthenticatedHome /> : <PublicLanding />;
}

function AlfaLogo({ priority = false }: { priority?: boolean }) {
  return (
    <Image
      src="/logo-alfa-os.png"
      alt="ALFA OS"
      width={420}
      height={220}
      priority={priority}
      className="mx-auto h-auto w-full max-w-[230px] object-contain sm:max-w-[320px] lg:max-w-[380px]"
    />
  );
}

function MinimalCopy() {
  return (
    <div className="text-center">
      <p className="text-sm font-medium text-white/62">Sistema interno</p>
      <p className="mt-2 text-sm text-white/42">
        CRM · Cotizaciones · Ingenierías · Proyectos
      </p>
    </div>
  );
}

function PublicLanding() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07080A] text-white">
      <section className="relative flex min-h-screen items-center px-4 py-8 sm:px-8 lg:px-12">
        <PageAtmosphere />

        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-8">
          <div className="w-full max-w-xl">
            <AlfaLogo priority />
            <div className="mt-5">
              <MinimalCopy />
            </div>
          </div>

          <div className="w-full max-w-md">
            <HomeLoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}

function AuthenticatedHome() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07080A] text-white">
      <section className="relative min-h-screen px-4 py-5 sm:px-8 lg:px-12">
        <PageAtmosphere />

        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10">
          <nav className="flex justify-center gap-3 sm:justify-end">
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center gap-2 rounded border border-white/10 bg-white/[0.07] px-4 text-sm font-medium text-white/78 transition hover:border-white/20 hover:bg-white/[0.12] hover:text-white"
            >
              Dashboard
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <HomeLogoutButton />
          </nav>

          <header className="pt-6 text-center sm:pt-10">
            <AlfaLogo priority />
            <div className="mt-5">
              <MinimalCopy />
            </div>
          </header>

          <section className="mx-auto grid w-full max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {internalLinks.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={`${item.title}-${item.href}`}
                  href={item.href}
                  className="group flex min-h-32 flex-col justify-between rounded border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded border border-[#9E1B32]/30 bg-[#9E1B32]/12 text-[#F07182]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <ArrowRight
                      className="h-4 w-4 text-white/28 transition group-hover:translate-x-1 group-hover:text-white"
                      aria-hidden="true"
                    />
                  </div>
                  <h2 className="mt-7 text-lg font-semibold text-white">
                    {item.title}
                  </h2>
                </Link>
              );
            })}
          </section>
        </div>
      </section>
    </main>
  );
}

function PageAtmosphere() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(158,27,50,0.25),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_34%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#9E1B32] to-transparent" />
    </>
  );
}
