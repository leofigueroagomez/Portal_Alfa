import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles, ShieldCheck } from "lucide-react";
import { getPublicBrands, getPublicBrandProducts } from "@/lib/catalog";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.alfait.com.mx"
).replace(/\/+$/, "");

export const metadata: Metadata = {
  title: "Marcas y Sistemas de Automatización de Lujo en México | ALFA",
  description:
    "Distribución, especificación e integración oficial de las marcas líderes en control de iluminación, audio de alta fidelidad y automatización residencial: Lutron, Sonos, Shelly y más.",
  alternates: {
    canonical: "/marcas",
  },
  openGraph: {
    title: "Marcas Oficiales y Equipamiento High End | ALFA",
    description:
      "Catálogo oficial de marcas premium integradas por ALFA con garantía directa y respaldo de ingeniería.",
    url: `${siteUrl}/marcas`,
    siteName: "ALFA High End Services",
    type: "website",
  },
};

export default async function MarcasPage() {
  const brands = await getPublicBrands();
  const productCounts = await Promise.all(
    brands.map((brand) => getPublicBrandProducts(brand.slug))
  );
  const countByBrandId = new Map(
    brands.map((brand, idx) => [brand.id, productCounts[idx].length])
  );
  const gridClass =
    brands.length > 1
      ? "md:grid-cols-2 max-w-5xl"
      : "md:grid-cols-1 lg:grid-cols-1 max-w-2xl";

  return (
    <main className="min-h-screen bg-[#0A0A0C] text-white">
      {/* Header Bar */}
      <header className="border-b border-white/10 px-5 py-6 sm:px-8 lg:px-12 bg-black/60 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-alfa.png"
              alt="ALFA High End Services"
              width={140}
              height={70}
              priority
              className="h-10 w-auto object-contain"
            />
            <span className="hidden text-xs font-semibold uppercase tracking-[0.24em] text-zinc-300 sm:block">
              High End Services
            </span>
          </Link>
          <div className="flex items-center gap-5">
            <Link
              href="/"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 transition hover:text-white"
            >
              Inicio
            </Link>
            <Link
              href="/servicios/iluminacion"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 transition hover:text-white hidden md:block"
            >
              Iluminación
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-[#9E1B32] hover:bg-[#B91C3C] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition"
            >
              Portal ALFA OS
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-5 pt-20 pb-16 sm:px-8 sm:pt-28 sm:pb-20 lg:px-12 border-b border-white/5 bg-gradient-to-b from-[#141418] to-[#0A0A0C]">
        <div className="mx-auto max-w-5xl text-center">
          <p className="inline-flex items-center gap-2 border border-[#9E1B32]/40 bg-[#9E1B32]/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-[#E07A8B] rounded-full">
            <Sparkles className="h-3.5 w-3.5" />
            Equipamiento & Ecosistemas Oficiales
          </p>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl text-white font-serif leading-tight">
            Marcas Líderes en Integración Residencial y Corporativa
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base text-zinc-400 sm:text-lg font-light leading-relaxed">
            Representamos y especificamos los estándares mundiales en iluminación arquitectónica, audio de alta fidelidad y control inteligente en México, con garantía oficial y soporte de ingeniería en ALFA OS.
          </p>
        </div>
      </section>

      {/* Brands Grid */}
      <section className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className={`grid grid-cols-1 gap-8 mx-auto ${gridClass}`}>
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#121216] p-8 sm:p-10 transition duration-300 hover:border-[#9E1B32]/50 hover:bg-[#16161B] hover:shadow-2xl hover:shadow-[#9E1B32]/10"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <span className="text-3xl font-bold tracking-tight text-white font-serif">
                      {brand.name}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E07A8B] bg-[#9E1B32]/15 px-3 py-1.5 rounded-md border border-[#9E1B32]/30">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {brand.authorized_partner_tier || "Distribuidor e Integrador Oficial"}
                    </span>
                  </div>

                  <p className="text-base font-medium text-zinc-200 mb-4">
                    {brand.tagline}
                  </p>

                  <p className="text-sm text-zinc-400 leading-relaxed mb-6 font-light">
                    {brand.description}
                  </p>

                  <div className="space-y-2 mb-8">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      Ecosistemas y Líneas Disponibles:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {brand.focus_areas.map((area, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-white/5 border border-white/10 px-3 py-1 rounded-md text-zinc-300"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <Link
                  href={`/marcas/${brand.slug}`}
                  className="mt-4 flex items-center justify-between rounded-xl bg-white/5 group-hover:bg-[#9E1B32] border border-white/10 group-hover:border-[#9E1B32] px-6 py-4 text-xs font-semibold uppercase tracking-wider text-white transition duration-200 shadow-md"
                >
                  <span>
                    Explorar Catálogo y Modelos {brand.name}
                    {countByBrandId.get(brand.id)
                      ? ` (${countByBrandId.get(brand.id)} equipos)`
                      : ""}
                  </span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Banner */}
      <section className="border-t border-white/10 bg-[#0E0E12] px-5 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white mb-4">
            ¿Requieres especificación para un proyecto arquitectónico?
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base max-w-2xl mx-auto mb-8 font-light">
            Nuestro equipo de ingeniería diseña, especifica e integra sistemas de iluminación, audio, video y control para despachos de arquitectura, interioristas y clientes finales.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/marcas/${brand.slug}`}
                className="rounded-xl bg-[#9E1B32] hover:bg-[#B91C3C] px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-white transition shadow-lg shadow-[#9E1B32]/20"
              >
                Ver Catálogo {brand.name}
              </Link>
            ))}
            <a
              href="https://wa.me/523318574884?text=Hola%20ALFA,%20me%20interesa%20asesoría%20técnica%20para%20un%20proyecto%20de%20iluminación%20y%20automatización."
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-white transition"
            >
              Contactar por WhatsApp
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
