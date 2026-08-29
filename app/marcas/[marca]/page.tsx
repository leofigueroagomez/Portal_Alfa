import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck, Sparkles, Phone, FileCheck } from "lucide-react";
import {
  getPublicBrandBySlug,
  getPublicBrandProducts,
  generateBrandJsonLd,
  generateCatalogBreadcrumbJsonLd,
} from "@/lib/catalog";
import { brandLineLabel, brandAdvisoryCopy } from "@/lib/catalogBrandUi";
import BrandCatalogClient from "./BrandCatalogClient";

type Props = {
  params: Promise<{ marca: string }>;
};

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.alfait.com.mx"
).replace(/\/+$/, "");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { marca } = await params;
  const brand = await getPublicBrandBySlug(marca);

  if (!brand) {
    return {
      title: "Marca no encontrada | ALFA",
    };
  }

  const title =
    brand.seo_title ||
    `${brand.name} México | Catálogo Oficial y Cotizaciones | ALFA`;
  const description =
    brand.seo_description ||
    `Catálogo oficial de productos ${brand.name} en México. Especificación, suministro e integración con garantía y respaldo de ingeniería ALFA OS.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/marcas/${brand.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/marcas/${brand.slug}`,
      siteName: "ALFA High End Services",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function BrandPage({ params }: Props) {
  const { marca } = await params;
  const brand = await getPublicBrandBySlug(marca);

  if (!brand) {
    notFound();
  }

  const products = await getPublicBrandProducts(brand.slug);
  const lineLabel = brandLineLabel(brand.slug);

  const brandJsonLd = generateBrandJsonLd(brand, siteUrl);
  const breadcrumbJsonLd = generateCatalogBreadcrumbJsonLd([
    { name: "Inicio", url: siteUrl },
    { name: "Marcas", url: `${siteUrl}/marcas` },
    { name: brand.name, url: `${siteUrl}/marcas/${brand.slug}` },
  ]);

  return (
    <main className="min-h-screen bg-[#0A0A0C] text-white">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(brandJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

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
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/marcas"
              className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Marcas
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-[#9E1B32] hover:bg-[#B91C3C] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition"
            >
              Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Brand Hero */}
      <section className="relative px-5 pt-16 pb-16 sm:px-8 sm:pt-24 sm:pb-20 lg:px-12 border-b border-white/5 bg-gradient-to-b from-[#16161C] via-[#101014] to-[#0A0A0C]">
        <div className="mx-auto max-w-7xl">
          {/* Breadcrumb nav */}
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-6 font-medium">
            <Link href="/" className="hover:text-zinc-300 transition">
              Inicio
            </Link>
            <span>/</span>
            <Link href="/marcas" className="hover:text-zinc-300 transition">
              Marcas
            </Link>
            <span>/</span>
            <span className="text-zinc-300 font-semibold">{brand.name}</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 border border-[#9E1B32]/40 bg-[#9E1B32]/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-[#E07A8B] rounded-full mb-4">
                <ShieldCheck className="h-4 w-4" />
                {brand.authorized_partner_tier || "Distribuidor e Integrador Certificado"}
              </div>

              <h1 className="text-4xl sm:text-6xl font-bold font-serif text-white tracking-tight">
                {brand.name}
                {lineLabel ? ` ${lineLabel}` : ""} en México
              </h1>

              <p className="mt-4 text-lg text-zinc-300 font-light leading-relaxed">
                {brand.tagline || brand.description}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {brand.focus_areas.map((area, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-xs bg-white/5 border border-white/10 px-3 py-1 rounded-full text-zinc-300"
                  >
                    <Sparkles className="h-3 w-3 text-[#E07A8B]" />
                    {area}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Contact Card */}
            <div className="rounded-2xl border border-white/10 bg-[#121216]/80 backdrop-blur-md p-6 sm:p-8 lg:max-w-sm w-full space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E07A8B]">
                Ingeniería & Suministro ALFA
              </p>
              <h2 className="text-xl font-bold text-white font-serif">
                ¿Necesitas cotizar un proyecto {brand.name}?
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed font-light">
                {brandAdvisoryCopy(brand.slug)}
              </p>
              <a
                href={`https://wa.me/523318574884?text=${encodeURIComponent(
                  `Hola ALFA, me interesa asesoría y cotización para un proyecto con sistemas ${brand.name}${
                    lineLabel ? ` (${lineLabel})` : ""
                  }.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#9E1B32] hover:bg-[#B91C3C] py-3 text-xs font-semibold uppercase tracking-wider text-white transition shadow-lg shadow-[#9E1B32]/20"
              >
                <Phone className="h-4 w-4" />
                Hablar con un Especialista
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Section */}
      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white">
              Catálogo de Modelos y Equipos {brand.name}
            </h2>
            <p className="text-sm text-zinc-400 font-light mt-1">
              Selecciona cualquier modelo para ver sus especificaciones técnicas completas o solicitar una cotización directa.
            </p>
          </div>

          <BrandCatalogClient brand={brand} products={products} />
        </div>
      </section>
    </main>
  );
}
