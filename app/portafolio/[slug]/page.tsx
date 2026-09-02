import type { Metadata } from "next";
import { SITE_URL } from "@/lib/siteUrl";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Phone,
  CheckCircle2,
  Sliders,
  Layers,
  Award,
  Volume2,
  Disc3,
  Radio,
  Tv,
  MapPin,
  Calendar,
  UserCheck,
} from "lucide-react";
import {
  getPublicPortfolioProjectBySlug,
  getRelatedPortfolioProjects,
  generateProjectJsonLd,
  generatePortfolioBreadcrumbJsonLd,
} from "@/lib/portfolio";
import PortfolioMediaGallery from "./PortfolioMediaGallery";
import ProjectQuoteModalWrapper from "./ProjectQuoteModalWrapper";

type Props = {
  params: Promise<{ slug: string }>;
};

const siteUrl = SITE_URL;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublicPortfolioProjectBySlug(slug);

  if (!project) {
    return {
      title: "Proyecto no encontrado | ALFA Portafolio",
    };
  }

  const title =
    project.seo_title ||
    `${project.title} | Caso de Estudio de Ingeniería | ALFA`;
  const description =
    project.seo_description ||
    project.summary ||
    `Conoce el caso de estudio del proyecto ${project.title} integrado por ALFA High End Services.`;

  const fullImageUrl = project.hero_image.startsWith("http")
    ? project.hero_image
    : `${siteUrl}${project.hero_image}`;

  return {
    title,
    description,
    keywords: project.seo_keywords || [
      project.title,
      project.category,
      "ALFA proyectos",
      "Audio High End Guadalajara",
    ],
    alternates: {
      canonical: `/portafolio/${project.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/portafolio/${project.slug}`,
      siteName: "ALFA High End Services",
      images: [{ url: fullImageUrl }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [fullImageUrl],
    },
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  const project = await getPublicPortfolioProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  const relatedProjects = await getRelatedPortfolioProjects(project.slug, 2);

  const projectJsonLd = generateProjectJsonLd(project, siteUrl);
  const breadcrumbJsonLd = generatePortfolioBreadcrumbJsonLd([
    { name: "Inicio", url: siteUrl },
    { name: "Portafolio", url: `${siteUrl}/portafolio` },
    { name: project.title, url: `${siteUrl}/portafolio/${project.slug}` },
  ]);

  return (
    <main className="min-h-screen bg-[#0A0A0C] text-white">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(projectJsonLd) }}
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
              href="/portafolio"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Portafolio
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
      <section className="relative px-5 pt-12 pb-16 sm:px-8 sm:pt-16 sm:pb-20 lg:px-12 border-b border-white/5 bg-gradient-to-b from-[#181820] via-[#101014] to-[#0A0A0C]">
        <div className="mx-auto max-w-7xl">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-6 font-medium">
            <Link href="/" className="hover:text-zinc-300 transition">
              Inicio
            </Link>
            <span>/</span>
            <Link href="/portafolio" className="hover:text-zinc-300 transition">
              Portafolio
            </Link>
            <span>/</span>
            <span className="text-zinc-300 font-semibold">{project.title}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 border border-[#9E1B32]/40 bg-[#9E1B32]/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-[#E07A8B] rounded-full">
                <Sparkles className="h-3.5 w-3.5" />
                {project.category}
              </div>

              <h1 className="text-4xl sm:text-6xl font-bold font-serif text-white tracking-tight leading-tight">
                {project.title}
              </h1>

              <p className="text-lg sm:text-xl text-zinc-300 font-light leading-relaxed">
                {project.subtitle}
              </p>

              {/* Meta Pills */}
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3.5 py-2 text-xs text-zinc-300">
                  <UserCheck className="h-3.5 w-3.5 text-[#E07A8B]" />
                  <span>{project.client_type}</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3.5 py-2 text-xs text-zinc-300">
                  <MapPin className="h-3.5 w-3.5 text-[#E07A8B]" />
                  <span>{project.location}</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3.5 py-2 text-xs text-zinc-300">
                  <Calendar className="h-3.5 w-3.5 text-[#E07A8B]" />
                  <span>{project.year}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-white/10 bg-[#141418] p-6 sm:p-8 space-y-5 shadow-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E07A8B]">
                  Ingeniería Residencial
                </p>
                <h2 className="text-xl font-bold font-serif text-white">
                  ¿Deseas concebir un espacio similar?
                </h2>
                <p className="text-xs text-zinc-400 font-light leading-relaxed">
                  Analizamos las dimensiones, acústica y estilo de tu residencia para proyectar una solución a la medida con marcas de referencia mundial.
                </p>

                <ProjectQuoteModalWrapper project={project} />

                <a
                  href={`https://wa.me/523318574884?text=${encodeURIComponent(
                    `Hola ALFA, me interesa consultar sobre el proyecto "${project.title}" y cotizar una solución de audio para mi espacio.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 py-3 text-xs font-semibold uppercase tracking-wider text-white transition"
                >
                  <Phone className="h-4 w-4 text-[#25D366]" />
                  Consultar por WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Sections */}
      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-16">
          {/* Summary & Story */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-10">
              {/* Origin Story */}
              <div className="rounded-2xl border border-white/10 bg-[#121216] p-8 sm:p-10 space-y-4">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[#E07A8B]">
                  El Origen del Proyecto
                </span>
                <h3 className="text-2xl font-bold font-serif text-white">
                  {project.origin_heading || "La Experiencia de un Referente Compartido"}
                </h3>
                <p className="text-base text-zinc-300 font-light leading-relaxed">
                  {project.origin_story}
                </p>
              </div>

              {/* Challenge & Solution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-white/10 bg-[#121216] p-6 sm:p-8 space-y-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/90">
                    El Desafío Técnico
                  </span>
                  <h4 className="text-lg font-bold font-serif text-white">
                    {project.challenge_heading || "Armonía Acústica Dual"}
                  </h4>
                  <p className="text-sm text-zinc-400 font-light leading-relaxed">
                    {project.challenge}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#121216] p-6 sm:p-8 space-y-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#E07A8B]">
                    La Solución de Ingeniería
                  </span>
                  <h4 className="text-lg font-bold font-serif text-white">
                    {project.solution_heading || "Dos Zonas Calibradas"}
                  </h4>
                  <p className="text-sm text-zinc-400 font-light leading-relaxed whitespace-pre-line">
                    {project.solution}
                  </p>
                </div>
              </div>

              {/* Key Results */}
              <div className="rounded-2xl border border-white/10 bg-[#121216] p-8 space-y-5">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-[#E07A8B]">
                  Resultados Alcanzados
                </span>
                <h3 className="text-xl font-bold font-serif text-white">
                  Desempeño y Satisfacción del Cliente
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {project.results.map((res, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-[#E07A8B] flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-zinc-300 font-light leading-relaxed">
                        {res}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Equipment Specifications */}
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-2xl border border-white/10 bg-[#141418] p-6 sm:p-8 space-y-6">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E07A8B]">
                    Ficha Técnica
                  </span>
                  <h3 className="text-xl font-bold font-serif text-white mt-1">
                    Equipamiento Especificado
                  </h3>
                </div>

                {project.equipment_zones.map((zone, zIdx) => (
                  <div key={zIdx} className="space-y-4 border-t border-white/10 pt-4">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider text-[#E07A8B]">
                        {zone.zoneName}
                      </h4>
                      <p className="text-xs text-zinc-400 font-light mt-0.5">
                        {zone.description}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {zone.equipment.map((eq, eIdx) => (
                        <div
                          key={eIdx}
                          className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white font-mono">
                              {eq.brand} {eq.model}
                            </span>
                            {eq.quantity && (
                              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-zinc-300">
                                {eq.quantity} {eq.quantity === 1 ? "unidad" : "unidades"}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-300 font-light">
                            {eq.role}
                          </p>
                          {eq.highlight && (
                            <p className="text-[11px] text-[#E07A8B] font-light italic">
                              ✦ {eq.highlight}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tags */}
              <div className="rounded-2xl border border-white/10 bg-[#121216] p-6 space-y-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Ecosistemas & Tecnologías:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {project.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-white/5 border border-white/10 px-3 py-1 rounded-md text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Media Gallery (Photos & Video) */}
          <div className="border-t border-white/10 pt-16">
            <PortfolioMediaGallery
              gallery={project.gallery}
              projectTitle={project.title}
            />
          </div>

          {/* Related Projects */}
          {relatedProjects.length > 0 && (
            <div className="border-t border-white/10 pt-16 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold font-serif text-white">
                    Otros Proyectos Destacados
                  </h3>
                  <p className="text-xs text-zinc-400 font-light mt-1">
                    Conoce más casos de estudio desarrollados por ALFA.
                  </p>
                </div>
                <Link
                  href="/portafolio"
                  className="text-xs font-semibold uppercase tracking-wider text-[#E07A8B] hover:text-white transition inline-flex items-center gap-1"
                >
                  Ver Todos los Proyectos
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {relatedProjects.map((rel) => (
                  <Link
                    key={rel.id}
                    href={`/portafolio/${rel.slug}`}
                    className="group relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#141418] shadow-xl transition duration-300 hover:border-[#9E1B32]/50"
                  >
                    <Image
                      src={rel.hero_image}
                      alt={rel.title}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-6">
                      <span className="text-[10px] uppercase tracking-widest text-[#E07A8B] font-bold">
                        {rel.category}
                      </span>
                      <h4 className="text-xl font-bold font-serif text-white mt-1 group-hover:text-[#E07A8B] transition">
                        {rel.title}
                      </h4>
                      <p className="text-xs text-zinc-300 font-light mt-1 line-clamp-2">
                        {rel.summary}
                      </p>
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
