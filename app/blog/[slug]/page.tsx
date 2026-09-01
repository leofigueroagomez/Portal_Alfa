import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Calendar,
  Bot,
  ShieldCheck,
  CheckCircle2,
  Phone,
  MessageCircle,
  HelpCircle,
  Share2,
  ChevronRight,
  Sparkles,
  Layers,
  Building2,
  Info,
  Check,
} from "lucide-react";
import {
  BlogPost,
  getPublicBlogPostBySlug,
  getRelatedBlogPosts,
  generateBlogArticleJsonLd,
  STATIC_BLOG_POSTS,
} from "@/lib/blog";
import FaqAccordion from "@/components/FaqAccordion";

type Props = {
  params: Promise<{ slug: string }>;
};

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.alfait.com.mx"
).replace(/\/+$/, "");

const WHATSAPP_PHONE =
  process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "523318574884";

export async function generateStaticParams() {
  return STATIC_BLOG_POSTS.map((post: BlogPost) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublicBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Artículo no encontrado | ALFA",
    };
  }

  const postUrl = `${siteUrl}/blog/${post.slug}`;
  const coverImageUrl = post.coverImage.startsWith("http")
    ? post.coverImage
    : `${siteUrl}${post.coverImage}`;

  return {
    title: `${post.title} | ALFA`,
    description: post.metaDescription,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      url: postUrl,
      siteName: "ALFA High End Services",
      type: "article",
      publishedTime: `${post.publishedAt}T08:00:00-06:00`,
      authors: [post.author.name],
      tags: post.tags,
      images: [
        {
          url: coverImageUrl,
          alt: post.coverImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.metaDescription,
      images: [coverImageUrl],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPublicBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedPosts = await getRelatedBlogPosts(post.slug, 2);
  const jsonLd = generateBlogArticleJsonLd(post, siteUrl);

  const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
    post.whatsappQuoteMessage
  )}`;

  return (
    <main className="min-h-screen bg-[#0A0A0C] text-white">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Sticky Header Bar */}
      <header className="border-b border-white/10 px-5 py-5 sm:px-8 lg:px-12 bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
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

          <div className="flex items-center gap-4">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver al Blog</span>
            </Link>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition shadow-sm"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>Pedir Cotización</span>
            </a>

            <Link
              href="/login"
              className="rounded-lg bg-[#7A1F2B] hover:bg-[#5A1320] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition"
            >
              Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Article Hero */}
      <section className="relative px-5 pt-12 pb-14 sm:px-8 sm:pt-16 sm:pb-20 lg:px-12 border-b border-white/5 bg-gradient-to-b from-[#14141A] via-[#0F0F12] to-[#0A0A0C]">
        <div className="mx-auto max-w-4xl">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumbs" className="flex items-center gap-2 text-xs text-zinc-400 mb-6 font-mono">
            <Link href="/" className="hover:text-white transition">
              Inicio
            </Link>
            <ChevronRight className="h-3 w-3 text-zinc-600" />
            <Link href="/blog" className="hover:text-white transition">
              Blog
            </Link>
            <ChevronRight className="h-3 w-3 text-zinc-600" />
            <span className="text-[#F0B8C0] truncate max-w-[200px] sm:max-w-none">
              {post.category}
            </span>
          </nav>

          {/* Category & Read Time Pills */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-[#B84A5A]/40 bg-[#7A1F2B]/20 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#F0B8C0]">
              {post.category}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Calendar className="h-3.5 w-3.5 text-[#B84A5A]" />
              {post.publishedAtFormatted}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Clock className="h-3.5 w-3.5 text-[#B84A5A]" />
              {post.readTime}
            </span>
          </div>

          {/* Title */}
          <h1 className="mt-6 text-3xl font-bold font-serif leading-tight text-white sm:text-5xl lg:text-5xl">
            {post.title}
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-base sm:text-xl text-zinc-300 font-light leading-relaxed">
            {post.subtitle}
          </p>

          {/* Author Card & Transparency Badge */}
          <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/10 pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#7A1F2B] text-white font-bold text-sm">
                LF
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {post.author.name}
                </p>
                <p className="text-xs text-zinc-400 font-light">
                  {post.author.role}
                </p>
              </div>
            </div>

            {/* AI Editorial Badge */}
            {post.aiEditorialDisclosure.isAiAssisted && (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-zinc-300">
                <Bot className="h-4 w-4 text-[#B84A5A] shrink-0" />
                <span>
                  Asistido por IA · <strong className="text-white font-medium">Validado por Ingeniería ALFA</strong>
                </span>
              </div>
            )}
          </div>

          {/* Editorial Transparency Detailed Card (Google E-E-A-T Compliance) */}
          {post.aiEditorialDisclosure.isAiAssisted && (
            <div className="mt-6 rounded-2xl border border-[#B84A5A]/30 bg-[#7A1F2B]/10 p-5 backdrop-blur-sm">
              <div className="flex items-start gap-3.5">
                <div className="rounded-lg bg-[#7A1F2B]/30 p-2 text-[#F0B8C0] shrink-0 mt-0.5">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#F0B8C0]">
                    Transparencia Editorial (Directrices de Calidad Google E-E-A-T)
                  </h2>
                  <p className="text-xs text-zinc-300 font-light leading-relaxed">
                    {post.aiEditorialDisclosure.summary}
                  </p>
                  <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                    {post.aiEditorialDisclosure.guidelinesNote}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Article Cover Image */}
      {post.coverImage && (
        <section className="px-5 pt-10 sm:px-8 lg:px-12">
          <figure className="mx-auto max-w-4xl">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#141418]">
              <Image
                src={post.coverImage}
                alt={post.coverImageAlt}
                fill
                priority
                sizes="(max-width: 896px) 100vw, 896px"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-3 text-center text-xs text-zinc-500 font-light">
              {post.coverImageAlt}
            </figcaption>
          </figure>
        </section>
      )}

      {/* Main Content Layout (2 Columns on Desktop) */}
      <section className="px-5 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="mx-auto max-w-7xl grid gap-12 lg:grid-cols-12">
          {/* Main Article Column (Left, 8 cols) */}
          <article className="lg:col-span-8 space-y-14">
            {/* Quick Specs Highlight Box */}
            <div className="rounded-2xl border border-white/10 bg-[#141418] p-6 sm:p-8 space-y-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F0B8C0]">
                <Sparkles className="h-4 w-4 text-[#B84A5A]" />
                <span>Ficha Técnica Rápida · Hikvision DS-KLM28-12</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {post.technicalSpecs.slice(0, 6).map((spec) => (
                  <div key={spec.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <p className="text-zinc-500 font-medium uppercase text-[10px] tracking-wider">
                      {spec.label}
                    </p>
                    <p className="text-zinc-200 font-semibold mt-1">
                      {spec.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Render Article Sections */}
            {post.sections.map((section) => (
              <section key={section.id} id={section.id} className="space-y-6 scroll-mt-28">
                <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight border-b border-white/10 pb-4">
                  {section.title}
                </h2>

                <div className="space-y-4 text-zinc-300 font-light text-base sm:text-lg leading-relaxed">
                  {section.content.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>

                {/* Section Image if present */}
                {section.image && (
                  <figure className="my-8">
                    <div
                      className={`relative w-full overflow-hidden rounded-2xl border border-white/10 ${
                        section.image.fit === "contain"
                          ? "aspect-[4/3] bg-gradient-to-b from-white to-zinc-100"
                          : "aspect-[16/10] bg-[#141418]"
                      }`}
                    >
                      <Image
                        src={section.image.src}
                        alt={section.image.alt}
                        fill
                        sizes="(max-width: 1024px) 100vw, 720px"
                        className={
                          section.image.fit === "contain"
                            ? "object-contain p-4 sm:p-8"
                            : "object-cover"
                        }
                      />
                    </div>
                    {section.image.caption && (
                      <figcaption className="mt-3 flex items-start gap-2 text-xs text-zinc-500 font-light leading-relaxed">
                        <span className="mt-[3px] h-3 w-px shrink-0 bg-[#B84A5A]" />
                        <span>{section.image.caption}</span>
                      </figcaption>
                    )}
                  </figure>
                )}

                {/* Subsections if present */}
                {section.subsections && (
                  <div className="grid gap-4 mt-6">
                    {section.subsections.map((sub, sIdx) => (
                      <div
                        key={sIdx}
                        className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6 space-y-2"
                      >
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#B84A5A] shrink-0" />
                          <span>{sub.subtitle}</span>
                        </h3>
                        <p className="text-sm text-zinc-400 font-light leading-relaxed">
                          {sub.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Bullets if present */}
                {section.bullets && (
                  <ul className="space-y-3 mt-4">
                    {section.bullets.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-3 text-sm sm:text-base text-zinc-300 font-light">
                        <Check className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Callout if present */}
                {section.callout && (
                  <div className="rounded-2xl border border-[#B84A5A]/40 bg-[#7A1F2B]/15 p-6 my-6">
                    {section.callout.title && (
                      <p className="text-xs font-bold uppercase tracking-wider text-[#F0B8C0] mb-2 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[#B84A5A]" />
                        <span>{section.callout.title}</span>
                      </p>
                    )}
                    <p className="text-sm sm:text-base text-zinc-200 font-light leading-relaxed italic">
                      "{section.callout.text}"
                    </p>
                  </div>
                )}

                {/* Table if present */}
                {section.table && (
                  <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#141418] my-6">
                    {section.table.caption && (
                      <div className="p-4 bg-white/[0.03] border-b border-white/10 text-xs font-bold uppercase tracking-wider text-[#F0B8C0]">
                        {section.table.caption}
                      </div>
                    )}
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="border-b border-white/10 bg-white/5 text-zinc-300 uppercase text-[11px] font-semibold tracking-wider">
                        <tr>
                          {section.table.headers.map((h, hIdx) => (
                            <th key={hIdx} className="px-5 py-3.5">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-zinc-300">
                        {section.table.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-white/[0.02] transition">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="px-5 py-3.5 font-light">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}

            {/* Mid-Article WhatsApp Quote Banner */}
            <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-[#121814] to-[#0A0C0B] p-8 sm:p-10 shadow-2xl space-y-5">
              <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <MessageCircle className="h-4 w-4" />
                <span>Atención Técnica Inmediata</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white">
                ¿Deseas implementar el sistema Hikvision DS-KLM28-12 en tu proyecto?
              </h2>
              <p className="text-sm text-zinc-300 font-light leading-relaxed">
                Cotiza directamente con nuestros ingenieros certificados de ALFA. Evaluamos las dimensiones de tu inmueble, cálculo de usuarios y requerimientos de red sin costo.
              </p>
              <div className="pt-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 text-sm font-semibold uppercase tracking-wider text-white transition shadow-lg shadow-emerald-950"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>Cotizar por WhatsApp Ahora</span>
                </a>
              </div>
            </div>

            {/* Full Technical Specs Section */}
            <section id="especificaciones-completas" className="space-y-6 scroll-mt-28">
              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight border-b border-white/10 pb-4">
                Especificaciones Técnicas Detalladas
              </h2>
              <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#141418] overflow-hidden">
                {post.technicalSpecs.map((spec) => (
                  <div
                    key={spec.label}
                    className="grid grid-cols-1 sm:grid-cols-3 p-4 sm:p-5 text-xs sm:text-sm hover:bg-white/[0.02] transition"
                  >
                    <span className="font-semibold text-zinc-400 sm:col-span-1">
                      {spec.label}
                    </span>
                    <span className="text-zinc-200 font-light sm:col-span-2 mt-1 sm:mt-0">
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* FAQ Accordion */}
            {post.faq.length > 0 && (
              <div className="mt-12">
                <FaqAccordion
                  title="Preguntas Frecuentes Técnicas"
                  eyebrow="Resolviendo Dudas"
                  items={post.faq}
                />
              </div>
            )}

            {/* End of Article Final CTA Card */}
            <div className="rounded-3xl border border-white/15 bg-gradient-to-r from-[#1E1216] via-[#161214] to-[#0E0E10] p-8 sm:p-10 space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#F0B8C0]">
                Integración Oficial en México
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white">
                Solución Llave en Mano para Corporativos y Residencias
              </h2>
              <p className="text-sm text-zinc-300 font-light leading-relaxed">
                En ALFA cubrimos desde la ingeniería de diseño, suministro directo con garantía de fábrica, hasta la instalación física, canalización, configuración en red y soporte en nuestra plataforma ALFA OS.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#7A1F2B] hover:bg-[#5A1320] px-6 text-sm font-semibold uppercase tracking-wider text-white transition shadow-lg shadow-[#7A1F2B]/30"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Pedir Cotización por WhatsApp</span>
                </a>
                <Link
                  href="/servicios/control-de-acceso"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-white/10"
                >
                  <span>Ver Control de Acceso</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </article>

          {/* Sticky Desktop Sidebar (Right, 4 cols) */}
          <aside className="hidden lg:block lg:col-span-4 space-y-8">
            <div className="sticky top-28 space-y-6">
              {/* WhatsApp Quick Action Card */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  <Phone className="h-4 w-4" />
                  <span>Cotización Inmediata</span>
                </div>
                <h3 className="text-lg font-bold font-serif text-white">
                  Hikvision DS-KLM28-12
                </h3>
                <p className="text-xs text-zinc-300 font-light leading-relaxed">
                  Solicita presupuesto personalizado con módulos adicionales o programación a la medida.
                </p>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold uppercase tracking-wider text-white transition shadow-md"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Contactar por WhatsApp</span>
                </a>
              </div>

              {/* Table of Contents */}
              <div className="rounded-2xl border border-white/10 bg-[#121216] p-6 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#F0B8C0]">
                  Tabla de Contenidos
                </p>
                <nav className="space-y-2">
                  {post.tableOfContents.map((toc) => (
                    <a
                      key={toc.id}
                      href={`#${toc.id}`}
                      className="block text-xs text-zinc-400 hover:text-white transition font-light leading-normal py-1 border-l border-white/10 pl-3 hover:border-[#B84A5A]"
                    >
                      {toc.title}
                    </a>
                  ))}
                  <a
                    href="#especificaciones-completas"
                    className="block text-xs text-zinc-400 hover:text-white transition font-light leading-normal py-1 border-l border-white/10 pl-3 hover:border-[#B84A5A]"
                  >
                    Especificaciones Detalladas
                  </a>
                </nav>
              </div>

              {/* Related Solution */}
              {post.relatedSolutionHref && (
                <div className="rounded-2xl border border-white/10 bg-[#141418] p-6 space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Solución Relacionada
                  </p>
                  <Link
                    href={post.relatedSolutionHref}
                    className="group flex items-center justify-between text-sm font-semibold text-white hover:text-[#F0B8C0] transition"
                  >
                    <span>{post.relatedSolutionLabel}</span>
                    <ArrowRight className="h-4 w-4 text-[#B84A5A] group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0A0A0A] px-5 py-12 text-center text-xs text-zinc-500 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-alfa.png"
              alt="ALFA High End Services"
              width={120}
              height={60}
              className="h-8 w-auto object-contain"
            />
            <span className="text-zinc-400">© {new Date().getFullYear()} ALFA High End Services.</span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/" className="hover:text-zinc-300 transition">
              Inicio
            </Link>
            <Link href="/blog" className="hover:text-zinc-300 transition text-[#F0B8C0]">
              Blog
            </Link>
            <Link href="/servicios/control-de-acceso" className="hover:text-zinc-300 transition">
              Control de Acceso
            </Link>
            <Link href="/servicios/cctv" className="hover:text-zinc-300 transition">
              CCTV
            </Link>
            <Link href="/servicios/iluminacion" className="hover:text-zinc-300 transition">
              Iluminación
            </Link>
            <Link href="/alfa-os" className="hover:text-zinc-300 transition">
              ALFA OS
            </Link>
            <Link href="/aviso-de-privacidad" className="hover:text-zinc-300 transition">
              Aviso de Privacidad
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
