import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Phone,
  Layers,
  Wrench,
} from "lucide-react";
import {
  getPublicProductBySlug,
  getRelatedCatalogProducts,
  generateProductJsonLd,
  generateCatalogBreadcrumbJsonLd,
} from "@/lib/catalog";
import ProductQuoteModal from "./ProductQuoteModal";
import ProductDetailImage from "./ProductDetailImage";

type Props = {
  params: Promise<{ marca: string; modelo: string }>;
};

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.alfait.com.mx"
).replace(/\/+$/, "");

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { marca, modelo } = await params;
  const product = await getPublicProductBySlug(marca, modelo);

  if (!product) {
    return {
      title: "Producto no encontrado | ALFA",
    };
  }

  const title =
    product.seo_title ||
    `${product.brand_name} ${product.model} | Cotización e Integración en México | ALFA`;
  const description =
    product.seo_description ||
    product.short_description ||
    `Especificación y cotización oficial del equipo ${product.brand_name} ${product.model} en México. Respaldo técnico y garantía oficial con ALFA OS.`;

  return {
    title,
    description,
    keywords: product.seo_keywords || [
      product.brand_name,
      product.model || "",
      "Lutron RadioRA 3",
      "Cotización México",
    ],
    alternates: {
      canonical: `/marcas/${product.brand_slug}/${product.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/marcas/${product.brand_slug}/${product.slug}`,
      siteName: "ALFA High End Services",
      images: product.image_url ? [{ url: product.image_url }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.image_url ? [product.image_url] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { marca, modelo } = await params;
  const product = await getPublicProductBySlug(marca, modelo);

  if (!product) {
    notFound();
  }

  const relatedProducts = await getRelatedCatalogProducts(
    product.id,
    product.category,
    product.brand_slug,
    4
  );

  const productJsonLd = generateProductJsonLd(product, siteUrl);
  const breadcrumbJsonLd = generateCatalogBreadcrumbJsonLd([
    { name: "Inicio", url: siteUrl },
    { name: "Marcas", url: `${siteUrl}/marcas` },
    { name: product.brand_name, url: `${siteUrl}/marcas/${product.brand_slug}` },
    { name: product.model || product.name || "Equipo", url: `${siteUrl}/marcas/${product.brand_slug}/${product.slug}` },
  ]);

  return (
    <main className="min-h-screen bg-[#0A0A0C] text-white">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
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
              href={`/marcas/${product.brand_slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Catálogo {product.brand_name}
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

      {/* Main Product Container */}
      <section className="px-5 py-10 sm:px-8 sm:py-16 lg:px-12">
        <div className="mx-auto max-w-7xl">
          {/* Breadcrumbs */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 mb-8 font-medium">
            <Link href="/" className="hover:text-zinc-300 transition">
              Inicio
            </Link>
            <span>/</span>
            <Link href="/marcas" className="hover:text-zinc-300 transition">
              Marcas
            </Link>
            <span>/</span>
            <Link
              href={`/marcas/${product.brand_slug}`}
              className="hover:text-zinc-300 transition"
            >
              {product.brand_name}
            </Link>
            <span>/</span>
            <span className="text-zinc-300 font-semibold">{product.model}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left: Product Image */}
            <div className="lg:col-span-5 space-y-4">
              <ProductDetailImage
                src={product.image_url || `/products/lutron/${(product.model || '').toLowerCase()}.png`}
                alt={`${product.brand_name} ${product.model}`}
                brandName={product.brand_name}
              />

              {/* Service Badges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                  <p className="text-[10px] uppercase font-bold text-[#E07A8B]">Garantía</p>
                  <p className="text-xs font-semibold text-zinc-200 mt-0.5">Oficial en México</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
                  <p className="text-[10px] uppercase font-bold text-[#E07A8B]">Integración</p>
                  <p className="text-xs font-semibold text-zinc-200 mt-0.5">ALFA OS Cloud</p>
                </div>
              </div>
            </div>

            {/* Right: Product Info & Actions */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#E07A8B]">
                    {product.brand_name} • {product.category || "RadioRA 3"}
                  </span>
                  <span className="text-xs text-zinc-600">•</span>
                  <span className="text-xs font-mono text-zinc-400">SKU: {product.sku || product.model}</span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-bold font-serif text-white tracking-tight leading-tight">
                  {product.name}
                </h1>

                <p className="mt-4 text-sm sm:text-base text-zinc-300 font-light leading-relaxed">
                  {product.description || product.short_description}
                </p>
              </div>

              {/* Key Highlights */}
              <div className="rounded-2xl border border-white/10 bg-[#121216] p-6 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
                  Aspectos Clave de Integración
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {product.highlights && product.highlights.length > 0 ? (
                    product.highlights.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                        <CheckCircle2 className="h-4 w-4 text-[#E07A8B] shrink-0 mt-0.5" />
                        <span className="font-light">{item}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-start gap-2 text-xs text-zinc-300">
                        <CheckCircle2 className="h-4 w-4 text-[#E07A8B] shrink-0 mt-0.5" />
                        <span>Tecnología RF Clear Connect Type X nativa</span>
                      </div>
                      <div className="flex items-start gap-2 text-xs text-zinc-300">
                        <CheckCircle2 className="h-4 w-4 text-[#E07A8B] shrink-0 mt-0.5" />
                        <span>Integración con procesador RadioRA 3 y ALFA OS</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons & Quote Modal */}
              <ProductQuoteModal product={product} />

              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex items-center justify-between text-xs text-zinc-400">
                <span>¿Deseas asesoría para tu despacho o proyecto?</span>
                <span className="font-semibold text-zinc-200">Asesoría de ingeniería incluida</span>
              </div>
            </div>
          </div>

          {/* Technical Specifications Section */}
          <div className="mt-16 pt-12 border-t border-white/10 space-y-8">
            <div>
              <h2 className="text-2xl font-bold font-serif text-white">
                Especificaciones Técnicas ({product.model})
              </h2>
              <p className="text-xs text-zinc-400 mt-1 font-light">
                Datos de ingeniería y compatibilidad de instalación en campo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(product.specifications || {}).map(([key, value], idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/5 bg-[#121216] p-4 space-y-1"
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                    {key.replace(/_/g, " ")}
                  </span>
                  <p className="text-xs font-semibold text-zinc-200">
                    {Array.isArray(value) ? value.join(", ") : String(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Related / Complementary Products */}
          {relatedProducts.length > 0 && (
            <div className="mt-20 pt-12 border-t border-white/10 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold font-serif text-white">
                    Equipos Complementarios {product.brand_name}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Componentes que forman parte del mismo ecosistema de automatización.
                  </p>
                </div>
                <Link
                  href={`/marcas/${product.brand_slug}`}
                  className="text-xs font-semibold uppercase tracking-wider text-[#E07A8B] hover:underline hidden sm:inline-flex items-center gap-1"
                >
                  Ver todo el catálogo
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/marcas/${rel.brand_slug}/${rel.slug}`}
                    className="group rounded-2xl border border-white/10 bg-[#121216] p-4 transition duration-300 hover:border-[#9E1B32]/50 hover:bg-[#16161B] flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-square w-full rounded-xl bg-gradient-to-b from-white/[0.06] to-black/40 border border-white/5 p-2 flex items-center justify-center overflow-hidden mb-3">
                        {rel.image_url ? (
                          <img
                            src={rel.image_url}
                            alt={rel.model || ""}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover rounded-lg group-hover:scale-105 transition duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-xs text-zinc-600">Fotografía en calibración</span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 font-bold">
                        {rel.model}
                      </span>
                      <h4 className="text-xs font-semibold text-white line-clamp-2 mt-1 group-hover:text-white">
                        {rel.name}
                      </h4>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-[#E07A8B] font-semibold">
                      <span>Ver ficha</span>
                      <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
