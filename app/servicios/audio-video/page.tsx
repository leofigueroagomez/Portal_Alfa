import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import FaqAccordion, { FaqItem } from "@/components/FaqAccordion";
import WhatsAppLeadButton from "@/components/WhatsAppLeadButton";

export const metadata: Metadata = {
  title: "Audio y Video Profesional | ALFA High End Services",
  description:
    "Diseñamos e implementamos soluciones de audio y video para residencias, salas de juntas, espacios corporativos y proyectos especiales. Experiencias audiovisuales pensadas para disfrutarse todos los días.",
  alternates: {
    canonical: "/servicios/audio-video",
  },
  openGraph: {
    title: "Audio y Video Profesional | ALFA High End Services",
    description:
      "Diseño e integración de audio de alta fidelidad, salas de juntas y Home Cinema.",
    type: "website",
  },
};

const experienceCards = [
  "Audio Residencial",
  "Home Cinema",
  "Videoconferencia",
  "Salas de Juntas",
  "Video Wall",
  "Audio Comercial",
];

const solutions = [
  {
    title: "Residencial",
    items: ["Audio distribuido", "Home Cinema", "Integración arquitectónica"],
  },
  {
    title: "Corporativo",
    items: ["Salas de juntas", "Videoconferencia", "Colaboración"],
  },
  {
    title: "Comercial",
    items: ["Audio ambiental", "Pantallas comerciales", "Experiencias de marca"],
  },
];

const gallery = [
  {
    title: "Salón de Audio VM",
    src: "/portfolio/salon-de-audio-vm/hero.jpg",
    href: "/portafolio/salon-de-audio-vm",
    subtitle: "McIntosh MA352, Denon DP-3000NE y Bowers & Wilkins",
  },
];

const brands = [
  { name: "Sonos", src: "/logos/brands/sonos.png", className: "max-h-8 max-w-[58%] scale-150" },
  { name: "McIntosh", src: "/logos/brands/mcintosh.png", className: "max-h-10 max-w-[70%] scale-125" },
  { name: "Bowers & Wilkins", src: "/logos/brands/bowers-wilkins.png", className: "max-h-12 max-w-[78%]" },
  { name: "Panamax", src: "/logos/brands/panamax.png", className: "max-h-12 max-w-[80%]" },
  { name: "Lutron", src: "/logos/brands/lutron.png", className: "max-h-12 max-w-[78%]" },
  { name: "AudioQuest", src: "/logos/brands/audioquest.png", className: "max-h-12 max-w-[78%]" },
  { name: "KEF", src: "/logos/brands/kef.png", className: "max-h-12 max-w-[70%]" },
];

const faqItems: FaqItem[] = [
  {
    question: "¿En qué etapa de la obra o remodelación se debe planear el audio y video?",
    answer:
      "Lo ideal es intervenir desde la etapa de anteproyecto o diseño arquitectónico para canalizar tuberías ocultas, calcular la acústica y prever nichos o refuerzos para altavoces arquitectónicos antes del cierre de plafones y muros.",
  },
  {
    question: "¿Puedo controlar la música de toda mi casa desde mi celular o iPad?",
    answer:
      "Sí. Diseñamos sistemas de audio multiroom donde puedes reproducir Spotify, Apple Music o Tidal en zonas independientes (sala, terraza, alberca, recámara principal) o agrupar toda la casa para una reunión con un solo toque.",
  },
  {
    question: "¿Qué marcas de audio y video integran en ALFA?",
    answer:
      "Trabajamos con los fabricantes más prestigiosos del mundo como Bowers & Wilkins, McIntosh, Sonos, KEF, Panamax y AudioQuest, garantizando pureza sonora, estética refinada y soporte a largo plazo.",
  },
  {
    question: "¿Cómo optimizan el sonido en espacios con acústica compleja o cristales?",
    answer:
      "Utilizamos calibración acústica digital (DSP y ecualización de sala) y seleccionamos altavoces con dispersión controlada para minimizar reflexiones no deseadas en superficies duras, logrando un sonido cálido y definido.",
  },
];

export default function AudioVideoPage() {
  return (
    <main className="bg-[#F7F6F3] text-[#111111]">
      <section className="relative min-h-[92vh] overflow-hidden bg-[#0F0F0F] text-white">
        <Image
          src="/projects/audio-hifi-bw-mcintosh.jpeg"
          alt="Sistema de audio de referencia integrado por ALFA"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/55 to-black/18" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

        <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-between px-5 py-7 sm:px-8 lg:px-12">
          <Link
            href="/"
            className="w-fit text-sm font-semibold uppercase tracking-[0.26em] text-white/72 transition hover:text-white"
          >
            ALFA High End Services
          </Link>

          <div className="max-w-4xl pb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#F0B8C0]">
              Audio y video profesional
            </p>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
              Audio y video diseñado para disfrutarse.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/76 sm:text-xl">
              Desde salas de juntas hasta residencias de alto nivel, diseñamos
              experiencias audiovisuales donde la tecnología desaparece y la
              experiencia toma protagonismo.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/#diagnostico"
                className="inline-flex min-h-12 items-center justify-center bg-[#7A1F2B] px-6 text-sm font-semibold text-white transition hover:bg-[#5A1320]"
              >
                Solicitar diagnóstico
              </Link>
              <Link
                href="#proyectos"
                className="inline-flex min-h-12 items-center justify-center border border-white/24 px-6 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
              >
                Ver proyectos
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
              Filosofía
            </p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
              No vendemos equipos. Diseñamos experiencias.
            </h2>
          </div>
          <p className="max-w-3xl text-lg leading-9 text-[#555555]">
            La diferencia entre una instalación y una experiencia está en cómo se
            integra cada componente al espacio, a las personas y a la forma en
            que será utilizado. Por eso en ALFA analizamos cada proyecto antes
            de recomendar una solución.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {experienceCards.map((card) => (
            <div key={card} className="min-h-36 border border-black/10 bg-[#F7F6F3] p-6">
              <p className="text-2xl font-semibold">{card}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#0F0F0F] px-5 py-20 text-white sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B84A5A]">
              Soluciones
            </p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
              Soluciones audiovisuales para cada entorno.
            </h2>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {solutions.map((solution) => (
              <article key={solution.title} className="border border-white/10 bg-white/[0.04] p-7">
                <h3 className="text-3xl font-semibold">{solution.title}</h3>
                <div className="mt-9 space-y-4">
                  {solution.items.map((item) => (
                    <p
                      key={item}
                      className="border-t border-white/10 pt-4 text-base text-white/70"
                    >
                      {item}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="proyectos" className="bg-[#F7F6F3] px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
                Galería & Casos de Estudio
              </p>
              <h2 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
                Proyectos que reflejan nuestra forma de trabajar.
              </h2>
            </div>
            <Link
              href="/portafolio"
              className="inline-flex items-center gap-2 bg-[#7A1F2B] hover:bg-[#5A1320] px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-white transition shadow-md flex-shrink-0"
            >
              <span>Ver Todo el Portafolio</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {gallery.map((project, index) => (
              <Link
                key={project.title}
                href={project.href || "/portafolio"}
                className={`group relative min-h-[360px] overflow-hidden bg-[#111111] block ${
                  index === 0 ? "lg:min-h-[560px]" : ""
                }`}
              >
                <Image
                  src={project.src}
                  alt={project.title}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover transition duration-500 ease-out group-hover:scale-[1.035]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/28 to-black/0" />
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <h3 className="text-3xl font-semibold text-white group-hover:text-[#F0B8C0] transition">
                    {project.title}
                  </h3>
                  {project.subtitle && (
                    <p className="mt-2 text-sm text-zinc-300 font-light">
                      {project.subtitle}
                    </p>
                  )}
                  <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#F0B8C0]">
                    <span>Ver caso de estudio</span>
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
              Marcas
            </p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
              Tecnología respaldada por fabricantes líderes.
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {brands.map((brand) => {
              const brandLower = brand.name.toLowerCase();
              const href =
                brandLower === "sonos"
                  ? "/marcas/sonos"
                  : brandLower === "lutron"
                  ? "/marcas/lutron"
                  : null;

              const content = (
                <Image
                  src={brand.src}
                  alt={brand.name}
                  width={220}
                  height={90}
                  className={`${brand.className} h-auto w-auto object-contain opacity-75 grayscale transition hover:opacity-100 hover:grayscale-0`}
                />
              );

              if (href) {
                return (
                  <Link
                    key={brand.name}
                    href={href}
                    title={`Ver catálogo de ${brand.name}`}
                    className="flex h-28 items-center justify-center overflow-hidden border border-black/10 bg-white p-6 transition hover:border-[#7A1F2B] hover:shadow-md sm:h-32 group"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <div
                  key={brand.name}
                  className="flex h-28 items-center justify-center overflow-hidden border border-black/10 bg-white p-6 transition hover:border-[#7A1F2B]/40 sm:h-32"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <FaqAccordion
        title="Preguntas Frecuentes sobre Audio y Video"
        eyebrow="Experiencias Acústicas"
        items={faqItems}
      />

      <section className="bg-[#111111] px-5 py-20 text-white sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B84A5A]">
              Siguiente paso
            </p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
              Hablemos de tu proyecto.
            </h2>
            <p className="mt-6 text-lg leading-8 text-white/68">
              Ya sea una residencia, una sala de juntas o un espacio comercial,
              podemos ayudarte a diseñar una solución a la altura de tus
              expectativas.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/#diagnostico"
              className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#7A1F2B] px-6 text-sm font-semibold text-white transition hover:bg-[#5A1320]"
            >
              Solicitar diagnóstico
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <WhatsAppLeadButton
              href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "523318574884"}?text=${encodeURIComponent(
                "Hola ALFA, me interesa solicitar un diagnóstico para un proyecto de Audio y Video Profesional."
              )}`}
              service="audio_video"
              placement="cta_section"
              className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/20 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <Phone className="h-4 w-4" />
              WhatsApp
            </WhatsAppLeadButton>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#0A0A0A] px-5 py-8 text-center text-xs text-zinc-500 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p>© {new Date().getFullYear()} ALFA High End Services. Todos los derechos reservados.</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-zinc-300 transition">
              Inicio
            </Link>
            <Link href="/marcas/sonos" className="hover:text-zinc-300 transition text-[#F0B8C0]">
              Catálogo Sonos
            </Link>
            <Link href="/servicios/iluminacion" className="hover:text-zinc-300 transition">
              Iluminación (Lutron)
            </Link>
            <Link href="/servicios/redes" className="hover:text-zinc-300 transition">
              Redes
            </Link>
            <Link href="/servicios/cctv" className="hover:text-zinc-300 transition">
              CCTV
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
