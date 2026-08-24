import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  FileCode,
  Layers,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";
import FaqAccordion, { FaqItem } from "@/components/FaqAccordion";
import WhatsAppLeadButton from "@/components/WhatsAppLeadButton";

export const metadata: Metadata = {
  title: "Alianzas para Arquitectos e Interioristas | ALFA High End Services",
  description:
    "Programa de alianzas para despachos de arquitectura e interiorismo en la Zona Metropolitana de Guadalajara (Zapopan y Guadalajara). Especificación técnica en planos, ingeniería Lutron invisible y supervisión en ALFA OS.",
  alternates: {
    canonical: "/arquitectos",
  },
  openGraph: {
    title: "Alianzas para Arquitectos e Interioristas | ALFA High End Services",
    description:
      "Tu visión arquitectónica intacta. Ingeniería de iluminación Lutron, acústica y automatización invisible para proyectos residenciales de lujo en la ZMG.",
    type: "website",
  },
};

const WHATSAPP_PHONE = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "523318574884";

const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
  "Hola ALFA, soy arquitecto / diseñador de interiores y me interesa coordinar una asesoría técnica para un proyecto en anteproyecto en la ZMG."
)}`;

const partnershipPillars = [
  {
    title: "Especificación Técnica en Planos (Sin Costo)",
    desc: "Desarrollamos planos de canalizaciones, diagramas unifilares y cálculo de cargas Lutron listos para insertar en tu paquete ejecutivo de AutoCAD o Revit.",
    icon: FileCode,
  },
  {
    title: "Muestrario Físico en tu Despacho",
    desc: "Llevamos a tu estudio el maletín de acabados reales Lutron Palladiom y Alisse (metales macizos, cristales y telas de persianas) para presentaciones de alto impacto con tus clientes.",
    icon: Layers,
  },
  {
    title: "Supervisión en Obra con ALFA OS",
    desc: "Coordinamos directamente con tu contratista eléctrico y albañilería. Bitácora fotográfica de avances en tiempo real para evitar errores de corte o cables visibles.",
    icon: Wrench,
  },
  {
    title: "Cero Responsabilidad Postventa",
    desc: "Al concluir la obra, el cliente final recibe garantía directa y soporte postventa a través de ALFA OS, liberando a tu despacho de llamadas o ajustes técnicos futuros.",
    icon: ShieldCheck,
  },
];

const workPhases = [
  {
    phase: "01",
    title: "Anteproyecto & Criterio de Diseño",
    desc: "Analizamos tu concepto arquitectónico, definimos circuitos de luz, escenas, acústica y nichos de persianas. Entregamos planos técnicos compatibles con tu proyecto ejecutivo sin costo para tu despacho.",
  },
  {
    phase: "02",
    title: "Coordinación en Obra Negra y Gris",
    desc: "Supervisamos en sitio el tendido de tuberías, registros y tableros centralizados con tu contratista de obra para asegurar que ningún cable rompa la estética de tus acabados.",
  },
  {
    phase: "03",
    title: "Montaje Milimétrico & Calibración",
    desc: "Instalación de botoneras de autor, altavoces arquitectónicos rasantes y persianas motorizadas ultra silenciosas. Programación fina de escenas de iluminación circadiana.",
  },
  {
    phase: "04",
    title: "Entrega 'As-Built' y Soporte ALFA OS",
    desc: "Entregamos planos finales 'as-built', manuales de usuario y acceso a la plataforma ALFA OS para garantizar el mantenimiento y póliza de soporte del cliente final.",
  },
];

const faqItems: FaqItem[] = [
  {
    question: "¿Tiene algún costo para el despacho el servicio de especificación técnica en anteproyecto?",
    answer:
      "No. Para nuestros despachos aliados en la Zona Metropolitana de Guadalajara, la asesoría técnica, planos unifilares, tablas de cargas Lutron y diagramas de canalización para anteproyecto no tienen costo.",
  },
  {
    question: "¿Cómo se coordina ALFA con el equipo de obra o contratista eléctrico del arquitecto?",
    answer:
      "Nos integramos como consultores especialistas. Proveemos las guías mecánicas exactas, revisamos tuberías antes del colado o cierre de plafones y documentamos todo en ALFA OS para evitar reprocesos o retrasos en la obra.",
  },
  {
    question: "¿Qué marcas y sistemas de diseño integran en sus proyectos?",
    answer:
      "Trabajamos exclusivamente con las marcas de referencia mundial para proyectos de ultra lujo: Lutron (HomeWorks QSX, RadioRA 3, Palladiom, Alisse), Bowers & Wilkins, McIntosh, Sonos, Shelly, Panduit y Ubiquiti.",
  },
  {
    question: "¿Cómo protegen comercialmente al despacho de arquitectura o interiorismo?",
    answer:
      "Manejamos esquemas de honorarios por especificación técnica / comisión comercial o precios de mayoreo preferenciales protegidos por proyecto registrado, garantizando transparencia absoluta.",
  },
  {
    question: "¿Cuál es la cobertura territorial de su programa de alianzas?",
    answer:
      "Atendemos de forma exclusiva proyectos en la Zona Metropolitana de Guadalajara (Zapopan, Guadalajara, Andares, Puerta de Hierro, Valle Real, Colinas de San Javier, Providencia, Bugambilias y zonas residenciales de alta plusvalía).",
  },
];

export default function ArquitectosPage() {
  return (
    <main className="min-h-screen bg-[#0F0F0F] text-white">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] overflow-hidden bg-[#0A0A0A]">
        <Image
          src="/projects/estudio-hifi.jpeg"
          alt="Alianzas con arquitectos e interioristas ALFA"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/85 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-transparent to-black/50" />

        {/* Header Bar */}
        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8 lg:px-12 border-b border-white/10">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-alfa.png"
              alt="ALFA High End Services"
              width={150}
              height={75}
              priority
              className="h-11 w-auto object-contain"
            />
            <span className="hidden text-xs font-semibold uppercase tracking-[0.24em] text-zinc-300 sm:block">
              High End Services
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden rounded border border-white/10 px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider text-zinc-300 transition hover:border-[#B84A5A] hover:text-white sm:inline-flex"
            >
              Inicio
            </Link>
            <Link
              href="/#diagnostico"
              className="hidden rounded border border-white/15 px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider text-zinc-200 transition hover:border-[#B84A5A] hover:text-white sm:inline-flex"
            >
              Diagnóstico
            </Link>
            <Link
              href="/login"
              className="rounded bg-[#7A1F2B] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-[#5A1320]"
            >
              Portal
            </Link>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative mx-auto flex min-h-[calc(90vh-80px)] max-w-7xl flex-col justify-center px-5 py-16 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 border border-[#B84A5A]/40 bg-[#7A1F2B]/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#F0B8C0]">
              <Compass className="h-4 w-4" />
              Alianzas Estratégicas | ZMG · Zapopan · Guadalajara
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.08] text-white sm:text-5xl lg:text-6xl">
              Tu visión arquitectónica intacta. La ingeniería que tu proyecto necesita.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
              Nos integramos con tu despacho desde anteproyecto para resolver planos, cargas Lutron, audio invisible y automatización centralizada sin alterar la pureza de tu diseño interior.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <WhatsAppLeadButton
                href={whatsappUrl}
                service="alianza_arquitectos"
                placement="hero"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-[#7A1F2B] px-6 text-sm font-semibold text-white transition hover:bg-[#5A1320]"
              >
                <Phone className="h-4 w-4" />
                Agendar sesión con un especialista
              </WhatsAppLeadButton>
              <Link
                href="/#diagnostico"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded border border-white/15 px-6 text-sm font-semibold text-white transition hover:border-[#B84A5A] hover:bg-white/5"
              >
                Registrar proyecto en anteproyecto
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Value Pillars for Architects */}
      <section className="border-t border-white/10 bg-white px-5 py-20 text-[#0F0F0F] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
                Programa de Alianzas
              </p>
              <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
                Tecnología invisible al servicio del diseño interior.
              </h2>
            </div>
            <p className="text-base leading-8 text-zinc-700 sm:text-lg">
              Sabemos que los cables visibles, los apagadores genéricos y los contratistas no certificados arruinan la experiencia de un proyecto de lujo. En ALFA asumimos la responsabilidad técnica completa para que tú te enfoques en diseñar.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {partnershipPillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="rounded-2xl border border-zinc-200 bg-[#F9F9F8] p-7 transition duration-200 hover:border-[#7A1F2B]/40 hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7A1F2B]/10 text-[#7A1F2B]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-6 text-lg font-semibold text-[#0F0F0F]">
                      {pillar.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Workflow / Phases */}
      <section className="border-t border-white/10 bg-[#121212] px-5 py-20 text-white sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B84A5A]">
              Metodología de Colaboración
            </p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
              Cómo trabajamos con tu despacho paso a paso.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {workPhases.map((phase) => (
              <div
                key={phase.phase}
                className="relative flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-8"
              >
                <div>
                  <span className="text-3xl font-bold text-[#B84A5A]/60 font-mono">
                    {phase.phase}
                  </span>
                  <h3 className="mt-4 text-xl font-semibold text-white">
                    {phase.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                    {phase.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brands Reference */}
      <section className="bg-white px-5 py-20 text-[#0F0F0F] sm:px-8 lg:px-12 border-t border-zinc-200">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
              Marcas de Grado Arquitectónico
            </p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
              Equipamiento a la altura de tus acabados.
            </h2>
            <p className="mt-4 text-base text-zinc-600">
              Teclados en metales macizos, altavoces que desaparecen en plafones y persianas con telas europeas.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4 max-w-4xl mx-auto">
            {[
              { name: "Lutron", src: "/logos/brands/lutron.png", className: "max-h-12" },
              { name: "Bowers & Wilkins", src: "/logos/brands/bowers-wilkins.png", className: "max-h-10" },
              { name: "McIntosh", src: "/logos/brands/mcintosh.png", className: "max-h-10" },
              { name: "Sonos", src: "/logos/brands/sonos.png", className: "max-h-8 scale-125" },
            ].map((brand) => (
              <div
                key={brand.name}
                className="flex h-28 items-center justify-center rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-[#7A1F2B]"
              >
                <Image
                  src={brand.src}
                  alt={brand.name}
                  width={180}
                  height={80}
                  className={`${brand.className} h-auto w-auto object-contain opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs for Architects */}
      <FaqAccordion
        title="Preguntas Frecuentes para Despachos de Arquitectura e Interiorismo"
        eyebrow="Consultoría B2B"
        items={faqItems}
      />

      {/* Next Step CTA */}
      <section className="border-t border-white/10 bg-[#5A1320] px-5 py-20 text-white sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#F0B8C0]">
              Iniciemos la colaboración
            </p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
              Coordinemos una sesión técnica o un café en tu despacho.
            </h2>
            <p className="mt-4 text-base text-zinc-200">
              Llevamos muestras físicas de botoneras Lutron Palladiom / Alisse y revisamos tus proyectos en etapa de anteproyecto en cualquier punto de Zapopan o Guadalajara.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <WhatsAppLeadButton
              href={whatsappUrl}
              service="alianza_arquitectos"
              placement="cta_section"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-white px-6 text-sm font-semibold text-[#5A1320] transition hover:bg-zinc-100"
            >
              <Phone className="h-4 w-4" />
              WhatsApp Directo
            </WhatsAppLeadButton>
            <Link
              href="/#diagnostico"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded border border-white/20 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Solicitar diagnóstico
              <ArrowRight className="h-4 w-4" />
            </Link>
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
            <Link href="/servicios/iluminacion" className="hover:text-zinc-300 transition">
              Iluminación Lutron
            </Link>
            <Link href="/servicios/audio-video" className="hover:text-zinc-300 transition">
              Audio & Video
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
