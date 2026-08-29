import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles, Phone, ShieldCheck, Layers, Award } from "lucide-react";
import { getPublicPortfolioProjects } from "@/lib/portfolio";
import PortfolioDirectoryClient from "./PortfolioDirectoryClient";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.alfait.com.mx"
).replace(/\/+$/, "");

export const metadata: Metadata = {
  title: "Portafolio de Proyectos | Audio Hi-Fi, Iluminación Lutron y Domótica | ALFA",
  description:
    "Explora los casos de estudio y proyectos de integración residencial y corporativa desarrollados por ALFA High End Services: audio audiófilo McIntosh, iluminación Lutron RadioRA 3 y salas de cine Dolby Atmos.",
  alternates: {
    canonical: "/portafolio",
  },
  openGraph: {
    title: "Portafolio de Proyectos de Ingeniería y Audio High End | ALFA",
    description:
      "Casos de estudio reales en residencias y corporativos con equipamiento de referencia: McIntosh, Denon, Bowers & Wilkins, Lutron y Sonos.",
    url: `${siteUrl}/portafolio`,
    siteName: "ALFA High End Services",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Portafolio de Proyectos | ALFA High End Services",
    description:
      "Explora nuestros casos de estudio de audio de referencia, iluminación arquitectónica y control de espacios en México.",
  },
};

export default async function PortafolioPage() {
  const projects = await getPublicPortfolioProjects();

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
              href="/marcas"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 transition hover:text-white hidden sm:block"
            >
              Marcas
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
            Casos de Estudio de Ingeniería
          </p>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl text-white font-serif leading-tight">
            Proyectos que Hablan por Sí Mismos
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base text-zinc-400 sm:text-lg font-light leading-relaxed">
            Cada espacio es una sinfonía entre arquitectura, pureza acústica e ingeniería invisible. Conoce cómo transformamos requerimientos audiófilos y lumínicos en realidades extraordinarias.
          </p>
        </div>
      </section>

      {/* Main Portfolio Directory Section */}
      <section className="px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <PortfolioDirectoryClient projects={projects} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-white/10 bg-[#0E0E12] px-5 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl text-center space-y-6">
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-[#E07A8B]">
            ¿Tienes un espacio en mente?
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold font-serif text-white">
            Diseñemos juntos la experiencia acústica y lumínica de tu proyecto.
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base max-w-2xl mx-auto font-light">
            Colaboramos estrechamente con propietarios, despachos de arquitectura e interioristas para proyectar sistemas que combinan tecnología de referencia y discreción absoluta.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-4">
            <Link
              href="/#diagnostico"
              className="rounded-xl bg-[#9E1B32] hover:bg-[#B91C3C] px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-white transition shadow-lg shadow-[#9E1B32]/25"
            >
              Solicitar Diagnóstico
            </Link>
            <a
              href="https://wa.me/523318574884?text=Hola%20ALFA,%20estoy%20viendo%20su%20portafolio%20y%20me%20gustaría%20asesoría%20para%20un%20proyecto."
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-white transition"
            >
              Hablar por WhatsApp
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
