import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Ruler,
  ShieldCheck,
  Sparkles,
  SunDim,
} from "lucide-react";
import FaqAccordion, { FaqItem } from "@/components/FaqAccordion";
import WhatsAppLeadButton from "@/components/WhatsAppLeadButton";
import LocalBusinessJsonLd from "@/components/LocalBusinessJsonLd";
import { SITE_URL } from "@/lib/siteUrl";
import { COVERAGE_LINE, NAP, formatAddressOneLine } from "@/lib/localBusiness";

const pageUrl = `${SITE_URL}/lutron-guadalajara`;

export const metadata: Metadata = {
  // `absolute` evita que el template "%s | ALFA" del layout raiz agregue un
  // segundo sufijo de marca al titulo.
  title: {
    absolute: "Instalación de Sistemas Lutron en Guadalajara y Zapopan | ALFA IT",
  },
  description:
    "Distribuidor e instalador certificado Lutron para la Zona Metropolitana de Guadalajara: RadioRA 3, persianas motorizadas, escenas de iluminación.",
  keywords: [
    "Lutron Guadalajara",
    "Lutron Zapopan",
    "instalador Lutron Guadalajara",
    "RadioRA 3 Guadalajara",
    "persianas motorizadas Guadalajara",
    "control de iluminación Guadalajara",
  ],
  alternates: {
    canonical: "/lutron-guadalajara",
  },
  openGraph: {
    title: "Instalación de Sistemas Lutron en Guadalajara y Zapopan | ALFA IT",
    description:
      "Integradores certificados Lutron en la ZMG. RadioRA 3, HomeWorks QSX, botoneras Palladiom y persianas motorizadas, con obra y soporte locales.",
    url: pageUrl,
    type: "website",
  },
};

const whatsappUrl = `https://wa.me/${NAP.whatsapp}?text=${encodeURIComponent(
  "Hola ALFA, busco instalación de un sistema Lutron en Guadalajara / Zapopan. Me gustaría agendar un diagnóstico."
)}`;

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Instalación de sistemas de control de iluminación Lutron",
  serviceType: "Instalación de control de iluminación y persianas motorizadas",
  url: pageUrl,
  provider: { "@id": `${SITE_URL}/#localbusiness` },
  areaServed: [
    { "@type": "City", name: "Guadalajara" },
    { "@type": "City", name: "Zapopan" },
    { "@type": "Place", name: "Zona Metropolitana de Guadalajara" },
  ],
  brand: { "@type": "Brand", name: "Lutron" },
  description:
    "Diseño, programación e instalación de sistemas Lutron RadioRA 3 y HomeWorks QSX, botoneras Palladiom y Sunnata, y persianas motorizadas para residencias en Guadalajara, Zapopan y la Zona Metropolitana.",
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
    {
      "@type": "ListItem",
      position: 2,
      name: "Control de Iluminación",
      item: `${SITE_URL}/servicios/iluminacion`,
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "Lutron en Guadalajara",
      item: pageUrl,
    },
  ],
};

const zones = [
  "Puerta de Hierro",
  "Valle Real",
  "Andares",
  "Virreyes Residencial",
  "Colinas de San Javier",
  "Providencia",
  "Chapalita",
  "Santa Anita",
  "Bosques de San Isidro",
  "El Cielo Country Club",
  "Pontevedra",
  "La Rioja / Solares",
];

const systems = [
  {
    icon: SunDim,
    title: "RadioRA 3",
    desc: "El sistema inalámbrico de Lutron para residencias que ya están construidas o en remodelación. No exige romper muros: los teclados reemplazan apagadores existentes y el procesador se aloja en el tablero.",
    fit: "Casas terminadas · remodelaciones",
  },
  {
    icon: Ruler,
    title: "HomeWorks QSX",
    desc: "La plataforma cableada de máximo alcance, para obra nueva donde el proyecto eléctrico todavía se puede diseñar. Tableros centralizados, cargas de todo tipo y control integral de persianas.",
    fit: "Obra nueva · proyecto ejecutivo",
  },
  {
    icon: Sparkles,
    title: "Persianas motorizadas",
    desc: "Palladiom y Sivoia QS con telas seleccionadas por transmisión solar. En Guadalajara importan: la orientación poniente castiga acabados y obras de arte buena parte del año.",
    fit: "Control solar · privacidad",
  },
];

const process = [
  {
    step: "01",
    title: "Visita técnica en sitio",
    desc: "Recorremos el proyecto contigo, tu arquitecto o tu interiorista. Levantamos circuitos, orientación solar y expectativa de uso por espacio.",
  },
  {
    step: "02",
    title: "Ingeniería y propuesta",
    desc: "Entregamos cálculo de cargas, ubicación de teclados, plano unifilar y la lista de escenas por área — con precio cerrado, no estimado.",
  },
  {
    step: "03",
    title: "Instalación y programación",
    desc: "Coordinamos con el electricista de obra. Programamos escenas en sitio contigo presente, ajustando niveles hasta que la luz se vea como la imaginaste.",
  },
  {
    step: "04",
    title: "Soporte local de por vida",
    desc: "Toda la ingeniería queda documentada en ALFA OS. Si algo cambia — un mueble nuevo, una escena que ya no acomoda — venimos a reprogramarlo.",
  },
];

const faqItems: FaqItem[] = [
  {
    question: "¿ALFA instala Lutron en Guadalajara o solo en Zapopan?",
    answer:
      "Instalamos en toda la Zona Metropolitana de Guadalajara. Nuestra base está en Zapopan (Col. La Estancia), y atendemos Guadalajara, Zapopan, Tlaquepaque y Tlajomulco sin cargo adicional por traslado. Para proyectos fuera de la ZMG — Chapala, Puerto Vallarta, Manzanillo — lo evaluamos caso por caso.",
  },
  {
    question: "¿Cuánto cuesta un sistema Lutron para una casa en Guadalajara?",
    answer:
      "Depende del número de circuitos de luz y de si la casa está construida o en obra. Un RadioRA 3 para las áreas sociales de una residencia parte de una inversión considerablemente menor que un HomeWorks QSX en toda una casa nueva. No damos precios de catálogo: hacemos visita técnica y entregamos propuesta con precio cerrado, porque el costo real lo define el tablero, no la lista de productos.",
  },
  {
    question: "Mi casa ya está terminada. ¿Se puede instalar Lutron sin romper muros?",
    answer:
      "Sí, para eso existe RadioRA 3. Los teclados y atenuadores se instalan en las cajas de los apagadores que ya tienes, y se comunican por Clear Connect, el protocolo propietario de Lutron — no por WiFi. En la mayoría de las residencias terminadas de la ZMG la instalación no requiere obra civil.",
  },
  {
    question: "¿Trabajan directamente con arquitectos y diseñadores de interiores?",
    answer:
      "Es como preferimos trabajar. Entramos desde el proyecto ejecutivo para que la ubicación de los teclados, los acabados y las escenas se decidan junto con el resto del diseño, y no se resuelvan a las prisas al final de la obra. Coordinamos con el electricista y respetamos el calendario de obra.",
  },
  {
    question: "¿Qué pasa si se cae el internet? ¿Deja de funcionar la iluminación?",
    answer:
      "No. Los sistemas Lutron operan localmente: teclados, procesador y cargas se comunican entre sí sin depender de internet ni de una nube comercial. El internet solo se necesita para el control remoto desde la app fuera de casa. Sin red, todo en la casa sigue funcionando igual.",
  },
  {
    question: "¿Son distribuidores autorizados o revendedores?",
    answer:
      "Somos integradores certificados Lutron, con acceso directo a la línea residencial de alto nivel y a soporte técnico de fábrica. Eso importa para la garantía: un equipo comprado en un canal informal puede quedar sin respaldo del fabricante.",
  },
];

export default function LutronGuadalajaraPage() {
  return (
    <main className="min-h-screen bg-[#0F0F0F] text-white">
      <LocalBusinessJsonLd
        pageUrl={pageUrl}
        description="Integradores certificados Lutron en Guadalajara y Zapopan: RadioRA 3, HomeWorks QSX, botoneras Palladiom y persianas motorizadas para residencias de alto nivel en la Zona Metropolitana de Guadalajara."
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0A0A0A]">
        <Image
          src="/projects/residencia-premium.jpeg"
          alt="Instalación de control de iluminación Lutron en una residencia de Guadalajara"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-transparent to-black/50" />

        {/* Header Bar */}
        <div className="relative mx-auto flex max-w-7xl items-center justify-between border-b border-white/10 px-5 py-6 sm:px-8 lg:px-12">
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
              href="/servicios/iluminacion"
              className="hidden rounded border border-white/10 px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider text-zinc-300 transition hover:border-[#B84A5A] hover:text-white sm:inline-flex"
            >
              Iluminación
            </Link>
            <Link
              href="/marcas/lutron"
              className="hidden rounded border border-white/15 px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider text-zinc-200 transition hover:border-[#B84A5A] hover:text-white sm:inline-flex"
            >
              Catálogo Lutron
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
        <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 border border-[#B84A5A]/40 bg-[#7A1F2B]/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#F0B8C0]">
              <MapPin className="h-4 w-4" />
              Integradores Lutron · Zona Metropolitana de Guadalajara
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.08] text-white sm:text-5xl lg:text-6xl">
              Control de Iluminación Lutron en Guadalajara
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
              Diseñamos, instalamos y programamos sistemas Lutron para
              residencias de alto nivel en Guadalajara, Zapopan y toda la ZMG.
              Visita técnica en sitio, precio cerrado y soporte local — no un
              distribuidor a distancia.
            </p>

            <dl className="mt-9 grid max-w-2xl gap-x-8 gap-y-3 border-l-2 border-[#7A1F2B] pl-5 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-[#B84A5A]" />
                <dt className="sr-only">Dirección</dt>
                <dd className="text-zinc-300">{formatAddressOneLine()}</dd>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-[#B84A5A]" />
                <dt className="sr-only">Teléfono</dt>
                <dd>
                  <a
                    href={`tel:${NAP.telephone}`}
                    className="text-zinc-300 transition hover:text-white"
                  >
                    {NAP.telephoneDisplay}
                  </a>
                </dd>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 shrink-0 text-[#B84A5A]" />
                <dt className="sr-only">Horario</dt>
                <dd className="text-zinc-300">Lunes a viernes, 9:00 a 19:00</dd>
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#B84A5A]" />
                <dt className="sr-only">Certificación</dt>
                <dd className="text-zinc-300">Integradores certificados Lutron</dd>
              </div>
            </dl>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/#diagnostico"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-[#7A1F2B] px-6 text-sm font-semibold text-white transition hover:bg-[#5A1320]"
              >
                Agendar visita técnica
                <ArrowRight className="h-4 w-4" />
              </Link>
              <WhatsAppLeadButton
                href={whatsappUrl}
                service="lutron-guadalajara"
                placement="hero"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded border border-white/15 px-6 text-sm font-semibold text-white transition hover:border-[#B84A5A] hover:bg-white/5"
              >
                <Phone className="h-4 w-4" />
                WhatsApp Directo
              </WhatsAppLeadButton>
            </div>
          </div>
        </div>
      </section>

      {/* Por qué local importa */}
      <section className="border-t border-white/10 bg-white px-5 py-20 text-[#0F0F0F] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
                Por qué importa que estemos aquí
              </p>
              <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
                Un sistema Lutron no se compra: se diseña, se instala y se
                acompaña.
              </h2>
            </div>
            <p className="text-base leading-8 text-zinc-700 sm:text-lg">
              La parte difícil de un sistema de iluminación no es el equipo —
              es la ingeniería previa y la programación posterior. Por eso
              trabajamos con obra en la ZMG: podemos ir a la casa antes de
              cotizar, coordinar con el electricista durante la instalación y
              volver a ajustar escenas cuando el proyecto ya está habitado.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {systems.map((system) => {
              const Icon = system.icon;
              return (
                <div
                  key={system.title}
                  className="rounded-2xl border border-zinc-200 bg-[#F9F9F8] p-7 transition duration-200 hover:border-[#7A1F2B]/40 hover:shadow-md"
                >
                  <Icon className="h-8 w-8 text-[#7A1F2B]" />
                  <h3 className="mt-5 text-xl font-semibold text-[#0F0F0F]">
                    {system.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-600">
                    {system.desc}
                  </p>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-[#7A1F2B]">
                    {system.fit}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cobertura */}
      <section className="border-t border-white/10 bg-[#0F0F0F] px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#F0B8C0]">
              Cobertura
            </p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
              {COVERAGE_LINE}
            </h2>
            <p className="mt-5 text-base leading-8 text-zinc-400">
              Hemos trabajado en residencias, penthouses y desarrollos en los
              corredores residenciales de la zona. Si tu proyecto está en la
              ZMG, la visita técnica no tiene costo de traslado.
            </p>
          </div>

          <ul className="mt-12 flex flex-wrap gap-2.5">
            {zones.map((zone) => (
              <li
                key={zone}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-300"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-[#B84A5A]" />
                {zone}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Proceso */}
      <section className="border-t border-white/10 bg-white px-5 py-20 text-[#0F0F0F] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
              Cómo trabajamos
            </p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
              De la visita técnica al soporte de por vida.
            </h2>
          </div>

          <ol className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {process.map((item) => (
              <li key={item.step} className="border-t-2 border-[#7A1F2B] pt-5">
                <p className="font-mono text-xs font-semibold tracking-widest text-[#7A1F2B]">
                  {item.step}
                </p>
                <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2.5 text-sm leading-7 text-zinc-600">
                  {item.desc}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-14 flex flex-wrap gap-4">
            <Link
              href="/marcas/lutron"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#7A1F2B] transition hover:border-[#7A1F2B]/40 hover:text-[#5A1320]"
            >
              <span>Ver catálogo Lutron RadioRA 3</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/servicios/iluminacion"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#7A1F2B] transition hover:border-[#7A1F2B]/40 hover:text-[#5A1320]"
            >
              <span>Todo sobre control de iluminación</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <FaqAccordion
        title="Preguntas frecuentes sobre Lutron en Guadalajara"
        eyebrow="Antes de cotizar"
        items={faqItems}
      />

      {/* CTA */}
      <section className="border-t border-white/10 bg-[#5A1320] px-5 py-20 text-white sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#F0B8C0]">
              Siguiente paso
            </p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
              Agenda una visita técnica en tu proyecto.
            </h2>
            <p className="mt-4 text-base text-zinc-200">
              Vamos a tu casa u obra en Guadalajara o Zapopan, levantamos el
              proyecto y te entregamos una propuesta con precio cerrado. Sin
              costo y sin compromiso.
            </p>
            <p className="mt-5 text-sm text-zinc-300">
              {formatAddressOneLine()} ·{" "}
              <a
                href={`tel:${NAP.telephone}`}
                className="font-semibold text-white underline-offset-4 hover:underline"
              >
                {NAP.telephoneDisplay}
              </a>{" "}
              · Lunes a viernes, 9:00 a 19:00
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
            <WhatsAppLeadButton
              href={whatsappUrl}
              service="lutron-guadalajara"
              placement="cta_section"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded border border-white/20 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <Phone className="h-4 w-4" />
              WhatsApp
            </WhatsAppLeadButton>
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
            <span className="text-zinc-400">
              © {new Date().getFullYear()} ALFA High End Services.
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link href="/" className="transition hover:text-zinc-300">
              Inicio
            </Link>
            <Link
              href="/servicios/iluminacion"
              className="transition hover:text-zinc-300"
            >
              Iluminación
            </Link>
            <Link href="/marcas/lutron" className="transition hover:text-zinc-300">
              Lutron
            </Link>
            <Link href="/portafolio" className="transition hover:text-zinc-300">
              Portafolio
            </Link>
            <Link href="/blog" className="transition hover:text-zinc-300">
              Blog
            </Link>
            <Link
              href="/aviso-de-privacidad"
              className="transition hover:text-zinc-300"
            >
              Aviso de Privacidad
            </Link>
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-7xl text-[11px] text-zinc-600">
          {COVERAGE_LINE}.
        </p>
      </footer>
    </main>
  );
}
