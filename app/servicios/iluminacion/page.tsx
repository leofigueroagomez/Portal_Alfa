import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Lightbulb, Sparkles, SunDim, Sliders, Layers, ShieldCheck, Phone } from "lucide-react";
import FaqAccordion, { FaqItem } from "@/components/FaqAccordion";

export const metadata: Metadata = {
  title: "Control de Iluminación Arquitectónica y Persianas | Lutron & Shelly | ALFA",
  description:
    "Especialistas en control de iluminación Lutron (HomeWorks / RadioRA 3), botoneras de diseño Palladiom y Alisse, persianas motorizadas ultra silenciosas y automatización Shelly para residencias de alto nivel.",
  alternates: {
    canonical: "/servicios/iluminacion",
  },
  openGraph: {
    title: "Control de Iluminación Arquitectónica y Persianas | Lutron & Shelly | ALFA",
    description:
      "Transformamos espacios a través de la luz: sistemas Lutron y distribución oficial Shelly para residencias que exigen perfección.",
    type: "website",
  },
};

const WHATSAPP_PHONE = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "523318574884";

const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
  "Hola ALFA, me interesa solicitar un diagnóstico para un proyecto de Control de Iluminación Arquitectónica y Automatización (Lutron / Shelly)."
)}`;

const experienceCards = [
  {
    title: "Escenas de Iluminación y Confort",
    desc: "Atenuación suave y profunda (hasta 0.1%) con transiciones imperceptibles. Configura ambientes únicos con una sola pulsación.",
    icon: SunDim,
  },
  {
    title: "Botoneras y Teclados de Autor",
    desc: "Lutron Palladiom, Alisse y Sunnata en acabados metálicos cepillados y cristal. Elimina las filas de apagadores plásticos convencionales.",
    icon: Sliders,
  },
  {
    title: "Persianas Motorizadas Ultra Silenciosas",
    desc: "Sincronización milimétrica para control solar, protección de muebles y obras de arte, y privacidad total con telas exclusivas.",
    icon: Layers,
  },
  {
    title: "Distribución Internacional Shelly",
    desc: "Representación y distribución oficial de soluciones Shelly para automatización inteligente modular y monitoreo energético.",
    icon: Sparkles,
  },
  {
    title: "Iluminación Circadiana y Tunable White",
    desc: "Luz que cambia dinámicamente de temperatura de color a lo largo del día para sincronizarse con tu ritmo biológico natural.",
    icon: Lightbulb,
  },
  {
    title: "Ingeniería Documentada en ALFA OS",
    desc: "Cálculo de cargas, tableros centralizados, planos unifilares y programación respaldada en la nube para soporte de por vida.",
    icon: ShieldCheck,
  },
];

const solutions = [
  {
    title: "Residencias de Alto Nivel & Villas",
    desc: "La iluminación es el elemento que realza los acabados, las texturas y la arquitectura de tu hogar, elevando el confort diario a un estándar de hospitalidad de ultra lujo.",
    items: [
      "Tableros centralizados Lutron HomeWorks QSX / RadioRA 3.",
      "Teclados grabados personalizados con retroiluminación inteligente.",
      "Escenas automáticas: Bienvenida, Cena, Noche, Fiesta y Salida.",
      "Integración invisible con audio, video y seguridad.",
    ],
  },
  {
    title: "Penthouses & Desarrollos de Lujo",
    desc: "Control integral de ventanales monumentales de doble altura y áreas sociales con persianas motorizadas y circuitos de luz regulados con precisión.",
    items: [
      "Persianas Lutron Palladiom sin cables a la vista.",
      "Aprovechamiento térmico automático según la posición del sol.",
      "Control de áreas sociales y terrazas con escenas personalizadas.",
      "Operación desde teclados de pared, smartphone o comandos discretos.",
    ],
  },
  {
    title: "Corporativo & Hospitality Premium",
    desc: "Espacios de trabajo, salas de consejo y restaurantes de alta gama donde la iluminación debe transmitir exclusividad y operar con absoluta confiabilidad.",
    items: [
      "Atenuación programada por horarios para ambientación impecable.",
      "Monitoreo y eficiencia energética en tiempo real con Shelly.",
      "Manejo intuitivo para personal sin necesidad de capacitación técnica.",
      "Cero mantenimiento correctivo con tecnología de estado sólido.",
    ],
  },
];

const brands = [
  { name: "Lutron", src: "/logos/brands/lutron.png", className: "max-h-14 max-w-[80%]" },
  { name: "Shelly", src: "/logos/brands/shelly.png", className: "max-h-12 max-w-[80%]" },
];

const faqItems: FaqItem[] = [
  {
    question: "¿Por qué el control de iluminación representa el núcleo de la inversión en proyectos de alto nivel?",
    answer:
      "En residencias de alto nivel, la iluminación ya no se limita a 'encender o apagar focos'. Representa la columna vertebral del diseño interior, la calidez del espacio y el confort diario. Un sistema centralizado Lutron reemplaza decenas de apagadores visibles por botoneras elegantes de autor, protege acabados y obras de arte con persianas automáticas, y asegura que cada espacio luzca exactamente como fue concebido por el arquitecto.",
  },
  {
    question: "¿Qué diferencia existe entre Lutron y los sistemas domóticos convencionales?",
    answer:
      "Lutron es el estándar mundial indiscutible en iluminación de lujo. A diferencia de soluciones de consumo que dependen de WiFi inestable o nubes comerciales, Lutron opera con protocolos propietarios de ultra baja latencia (Clear Connect), atenuación analógica y digital perfecta sin parpadeos (flicker-free), y acabados en metales sólidos diseñados para durar décadas.",
  },
  {
    question: "¿Cuál es el papel de Shelly en el catálogo de ALFA?",
    answer:
      "Contamos con la distribución internacional oficial de Shelly, una marca europea líder en automatización modular y monitoreo de energía. Shelly complementa proyectos que requieren versatilidad, integración de sensores y control inteligente accesible con protocolos abiertos y alta confiabilidad técnica.",
  },
  {
    question: "¿En qué etapa del proyecto se debe diseñar el sistema de iluminación?",
    answer:
      "Recomendamos intervenir durante el anteproyecto o etapa de diseño eléctrico y plafonería. Esto nos permite centralizar las cargas en tableros técnicos, coordinar nichos de persianas con el interiorista y eliminar cajas de apagadores innecesarias en los muros principales.",
  },
];

export default function IluminacionPage() {
  return (
    <main className="min-h-screen bg-[#0F0F0F] text-white">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] overflow-hidden bg-[#0A0A0A]">
        <Image
          src="/projects/residencia-premium.jpeg"
          alt="Control de iluminación arquitectónica Lutron por ALFA"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-black/40" />
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
              <Sparkles className="h-4 w-4" />
              Lutron & Shelly | Arquitectura de Luz
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.08] text-white sm:text-5xl lg:text-6xl">
              La luz como elemento arquitectónico. Control sin concesiones.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
              Diseñamos e implementamos sistemas de control de iluminación Lutron y Shelly para residencias y espacios que exigen precisión, estética de autor y un nivel de confort absoluto.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/#diagnostico"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-[#7A1F2B] px-6 text-sm font-semibold text-white transition hover:bg-[#5A1320]"
              >
                Solicitar asesoría en iluminación
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded border border-white/15 px-6 text-sm font-semibold text-white transition hover:border-[#B84A5A] hover:bg-white/5"
              >
                <Phone className="h-4 w-4" />
                WhatsApp Directo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Value Pillars */}
      <section className="border-t border-white/10 bg-white px-5 py-20 text-[#0F0F0F] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
                Filosofía de Iluminación
              </p>
              <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
                Donde la tecnología desaparece y el diseño toma el protagonismo.
              </h2>
            </div>
            <p className="text-base leading-8 text-zinc-700 sm:text-lg">
              En los proyectos más exigentes, la iluminación representa el núcleo de la experiencia y la mayor inversión en tecnología. Sustituimos paneles de apagadores por teclados de autor, regulamos la luz con precisión milimétrica y creamos atmósferas que realzan cada espacio.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {experienceCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-2xl border border-zinc-200 bg-[#F9F9F8] p-7 transition duration-200 hover:border-[#7A1F2B]/40 hover:shadow-md"
                >
                  <Icon className="h-8 w-8 text-[#7A1F2B]" />
                  <h3 className="mt-5 text-xl font-semibold text-[#0F0F0F]">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-600">
                    {card.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Solutions by Environment */}
      <section className="border-t border-white/10 bg-[#121212] px-5 py-20 text-white sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#B84A5A]">
              Aplicaciones de Alto Nivel
            </p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl text-white">
              Sistemas diseñados a la medida de tu arquitectura.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {solutions.map((sol) => (
              <article
                key={sol.title}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-8"
              >
                <div>
                  <h3 className="text-2xl font-semibold text-white">
                    {sol.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-zinc-300">
                    {sol.desc}
                  </p>
                  <ul className="mt-8 space-y-3">
                    {sol.items.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-zinc-300">
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#B84A5A] mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Partners / Brands */}
      <section className="bg-white px-5 py-20 text-[#0F0F0F] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
              Distribución & Certificación
            </p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
              El respaldo de los líderes globales en iluminación.
            </h2>
            <p className="mt-4 text-base text-zinc-600">
              Integradores certificados en Lutron y distribuidores internacionales autorizados de Shelly.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-6 max-w-2xl mx-auto">
            {brands.map((brand) => (
              <div
                key={brand.name}
                className="flex h-32 items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm transition hover:border-[#7A1F2B]"
              >
                <Image
                  src={brand.src}
                  alt={brand.name}
                  width={220}
                  height={90}
                  className={`${brand.className} h-auto w-auto object-contain opacity-85 grayscale transition hover:opacity-100 hover:grayscale-0`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <FaqAccordion
        title="Preguntas Frecuentes sobre Iluminación Lutron y Shelly"
        eyebrow="Criterio e Inversión"
        items={faqItems}
      />

      {/* Next Step CTA */}
      <section className="border-t border-white/10 bg-[#5A1320] px-5 py-20 text-white sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#F0B8C0]">
              Siguiente paso
            </p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
              Diseñemos la experiencia de iluminación para tu proyecto.
            </h2>
            <p className="mt-4 text-base text-zinc-200">
              Coordinamos directamente con tu arquitecto, diseñador de interiores o equipo de obra. Solicita un diagnóstico en Guadalajara, Zapopan o cualquier punto de México.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/#diagnostico"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-white px-6 text-sm font-semibold text-[#5A1320] transition hover:bg-zinc-100"
            >
              Solicitar diagnóstico
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded border border-white/20 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <Phone className="h-4 w-4" />
              WhatsApp
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
            <Link href="/servicios/audio-video" className="hover:text-zinc-300 transition">
              Audio & Video
            </Link>
            <Link href="/servicios/redes" className="hover:text-zinc-300 transition">
              Redes
            </Link>
            <Link href="/servicios/cctv" className="hover:text-zinc-300 transition">
              CCTV
            </Link>
            <Link href="/servicios/control-de-acceso" className="hover:text-zinc-300 transition">
              Control de Acceso
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
