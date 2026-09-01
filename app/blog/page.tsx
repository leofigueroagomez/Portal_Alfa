import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  MessageCircle,
  Phone,
  Clock,
  Calendar,
  Bot,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { getPublicBlogPosts, BLOG_CATEGORIES } from "@/lib/blog";
import BlogDirectoryClient from "./BlogDirectoryClient";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.alfait.com.mx"
).replace(/\/+$/, "");

const WHATSAPP_PHONE =
  process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "523318574884";

export const metadata: Metadata = {
  title: "Blog Técnico & Novedades en Automatización y Seguridad | ALFA",
  description:
    "Artículos especializados, análisis de hardware y guías de ingeniería sobre control de acceso, videovigilancia, iluminación arquitectónica, audio de alta fidelidad y ALFA OS.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Blog de Ingeniería & Seguridad Electrónica | ALFA High End Services",
    description:
      "Descubre análisis técnicos profundos sobre lockers inteligentes, sistemas Lutron, audio Hi-Fi y automatización de espacios residenciales y corporativos en México.",
    url: `${siteUrl}/blog`,
    siteName: "ALFA High End Services",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog Técnico | ALFA High End Services",
    description:
      "Análisis técnicos, especificaciones y soluciones de automatización y seguridad de alta gama.",
  },
};

export default async function BlogPage() {
  const posts = await getPublicBlogPosts();
  const featuredPost = posts[0];

  const featuredWhatsappUrl = featuredPost
    ? `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
        featuredPost.whatsappQuoteMessage
      )}`
    : "";

  const generalWhatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
    "Hola ALFA, me interesa consultar con un ingeniero sobre sus soluciones de automatización y seguridad."
  )}`;

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
              href="/portafolio"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 transition hover:text-white hidden sm:block"
            >
              Portafolio
            </Link>
            <Link
              href="/marcas"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 transition hover:text-white hidden sm:block"
            >
              Marcas
            </Link>
            <Link
              href="/alfa-os"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 transition hover:text-white hidden md:block"
            >
              ALFA OS
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-[#7A1F2B] hover:bg-[#5A1320] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition"
            >
              Portal ALFA OS
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-5 pt-16 pb-12 sm:px-8 sm:pt-24 sm:pb-16 lg:px-12 border-b border-white/5 bg-gradient-to-b from-[#141418] to-[#0A0A0C]">
        <div className="mx-auto max-w-5xl text-center">
          <p className="inline-flex items-center gap-2 border border-[#B84A5A]/40 bg-[#7A1F2B]/15 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-[#F0B8C0] rounded-full">
            <Sparkles className="h-3.5 w-3.5" />
            ALFA Insights & Ingeniería
          </p>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl text-white font-serif leading-tight">
            Tecnología, Control y Automatización de Alta Gama
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base text-zinc-400 sm:text-lg font-light leading-relaxed">
            Publicaciones técnicas, guías de especificación y análisis de equipos diseñados para arquitectos, desarrolladores, directores de TI y propietarios exigentes.
          </p>
        </div>

        {/* Featured Article Spotlight Banner */}
        {featuredPost && (
          <div className="mx-auto mt-14 max-w-6xl">
            <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#181820] via-[#121216] to-[#0D0D10] p-6 sm:p-10 shadow-2xl">
              <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
                {/* Left Content */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#7A1F2B] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                      Artículo Destacado
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
                      {featuredPost.category}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                      <Clock className="h-3 w-3 text-[#B84A5A]" />
                      {featuredPost.readTime}
                    </span>
                  </div>

                  <Link href={`/blog/${featuredPost.slug}`} className="block group">
                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif text-white group-hover:text-[#F0B8C0] transition leading-tight">
                      {featuredPost.title}
                    </h2>
                  </Link>

                  <p className="text-sm text-zinc-300 font-light leading-relaxed">
                    {featuredPost.subtitle}
                  </p>

                  {/* AI & Engineering Badges */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 pt-2 border-t border-white/10">
                    <div className="flex items-center gap-1.5">
                      <Bot className="h-4 w-4 text-[#B84A5A]" />
                      <span className="text-zinc-300">Redactado con asistencia de IA</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <span className="text-zinc-300">Validado por Ingeniería ALFA</span>
                    </div>
                  </div>

                  {/* CTAs */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <Link
                      href={`/blog/${featuredPost.slug}`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#7A1F2B] px-6 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-[#5A1320]"
                    >
                      <span>Leer artículo completo</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>

                    <a
                      href={featuredWhatsappUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-5 text-xs font-semibold uppercase tracking-wider text-emerald-300 transition hover:bg-emerald-900/50 hover:border-emerald-400"
                    >
                      <MessageCircle className="h-4 w-4 text-emerald-400" />
                      <span>Pedir cotización</span>
                    </a>
                  </div>
                </div>

                {/* Right Image / Graphic */}
                <div className="lg:col-span-5">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-xl">
                    <Image
                      src={featuredPost.coverImage}
                      alt={featuredPost.coverImageAlt}
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      className="object-cover opacity-85"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/10 bg-black/70 backdrop-blur-md p-3.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#F0B8C0]">
                        Modelo DS-KLM28-12
                      </p>
                      <p className="text-xs text-zinc-300 mt-0.5 font-light">
                        12 puertas · Pantalla táctil 8" · Reconocimiento facial 20K rostros
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Directory Section */}
      <section className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B84A5A]">
              Biblioteca de Artículos
            </p>
            <h2 className="mt-3 text-3xl font-bold font-serif text-white sm:text-4xl">
              Explora por Categoría
            </h2>
          </div>

          <BlogDirectoryClient posts={posts} categories={BLOG_CATEGORIES} />
        </div>
      </section>

      {/* Consultation & WhatsApp CTA Banner */}
      <section className="border-t border-white/10 bg-[#5A1320] px-5 py-20 text-white sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#F0B8C0]">
              Asesoría Técnica y Suministro
            </p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
              ¿Tienes un proyecto en puerta o requieres especificar equipamiento?
            </h2>
            <p className="mt-4 text-base text-zinc-200 font-light leading-relaxed">
              Nuestros ingenieros certificados te asesoran en el dimensionamiento, planos de canalización, compatibilidad de marcas y cotización de equipos.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/#diagnostico"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-[#5A1320] transition hover:bg-zinc-100"
            >
              <span>Solicitar diagnóstico</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={generalWhatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              <Phone className="h-4 w-4" />
              <span>WhatsApp Directo</span>
            </a>
          </div>
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
            <Link href="/servicios/iluminacion" className="hover:text-zinc-300 transition">
              Iluminación
            </Link>
            <Link href="/marcas" className="hover:text-zinc-300 transition">
              Marcas
            </Link>
            <Link href="/portafolio" className="hover:text-zinc-300 transition">
              Portafolio
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
