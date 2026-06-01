import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Audio y Video Profesional | ALFA High End Services",
  description:
    "Diseñamos e implementamos soluciones de audio y video para residencias, salas de juntas, espacios corporativos y proyectos especiales. Experiencias audiovisuales pensadas para disfrutarse todos los días.",
  keywords: [
    "audio y video profesional",
    "salas de juntas",
    "videoconferencia",
    "audio residencial",
    "home cinema",
    "video wall",
    "audio distribuido",
    "pantallas comerciales",
    "integración audiovisual",
  ],
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
    title: "Residencias integradas",
    src: "/projects/residencia-premium.jpeg",
  },
  {
    title: "Home Cinema",
    src: "/projects/cine-bw-yamaha.jpeg",
  },
  {
    title: "Audio de referencia",
    src: "/projects/audio-hifi-bw-mcintosh.jpeg",
  },
  {
    title: "Espacios de escucha",
    src: "/projects/estudio-hifi.jpeg",
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
          <div className="mb-10 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
              Galería
            </p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
              Proyectos que reflejan nuestra forma de trabajar.
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {gallery.map((project, index) => (
              <article
                key={project.title}
                className={`group relative min-h-[360px] overflow-hidden bg-[#111111] ${
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
                <h3 className="absolute inset-x-0 bottom-0 p-6 text-3xl font-semibold text-white sm:p-8">
                  {project.title}
                </h3>
              </article>
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
            {brands.map((brand) => (
              <div
                key={brand.name}
                className="flex h-28 items-center justify-center overflow-hidden border border-black/10 bg-white p-6 transition hover:border-[#7A1F2B]/40 sm:h-32"
              >
                <Image
                  src={brand.src}
                  alt={brand.name}
                  width={220}
                  height={90}
                  className={`${brand.className} h-auto w-auto object-contain opacity-75 grayscale transition hover:opacity-100 hover:grayscale-0`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

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

          <Link
            href="/#diagnostico"
            className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#7A1F2B] px-6 text-sm font-semibold text-white transition hover:bg-[#5A1320]"
          >
            Solicitar diagnóstico
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
