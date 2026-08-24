import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, SlidersHorizontal, KeyRound, Smartphone, ShieldCheck, DoorClosed, Phone } from "lucide-react";
import FaqAccordion, { FaqItem } from "@/components/FaqAccordion";

export const metadata: Metadata = {
  title: "Control de Acceso y Automatización | ALFA High End Services",
  description:
    "Soluciones de control de acceso vehicular y peatonal, videointercomunicadores IP, chapas inteligentes y automatización Lutron para residencias y corporativos en Guadalajara y Zapopan.",
  alternates: {
    canonical: "/servicios/control-de-acceso",
  },
  openGraph: {
    title: "Control de Acceso y Automatización | ALFA High End Services",
    description:
      "Control de accesos inteligente: cerraduras digitales, intercomunicación IP, plumas vehiculares y automatización integrada.",
    type: "website",
  },
};

const WHATSAPP_PHONE = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "523310000000";

const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
  "Hola ALFA, me interesa solicitar un diagnóstico para un proyecto de Control de Acceso o Automatización."
)}`;

const experienceCards = [
  {
    title: "Videointercomunicadores IP",
    desc: "Contesta y abre la puerta desde tu smartphone estés donde estés, con video en alta definición y audio bidireccional.",
    icon: Smartphone,
  },
  {
    title: "Cerraduras Digitales y Biometría",
    desc: "Apertura por huella digital, código temporal para visitas o credencial digital en Apple Wallet y Google Wallet.",
    icon: KeyRound,
  },
  {
    title: "Control de Acceso Vehicular",
    desc: "Plumas automáticas con tags UHF de largo alcance y cámaras LPR para lectura automática de placas.",
    icon: DoorClosed,
  },
  {
    title: "Automatización e Iluminación Lutron",
    desc: "Escenas inteligentes que integran control de accesos, luces, persianas y seguridad en una sola pulsación.",
    icon: SlidersHorizontal,
  },
  {
    title: "Gestión de Permisos y Horarios",
    desc: "Software administrativo para programar accesos a personal de servicio, proveedores o colaboradores por horario.",
    icon: ShieldCheck,
  },
  {
    title: "Bitácora Digital en ALFA OS",
    desc: "Registro de usuarios autorizados, diagramas de conexión y soporte postventa centralizado en tu portal.",
    icon: CheckCircle2,
  },
];

const solutions = [
  {
    title: "Residencial de Lujo",
    desc: "Acceso sin llaves y sin fricción, diseñado para proteger a tu familia mientras mantiene una estética limpia en fachadas y puertas principales.",
    items: [
      "Intercomunicador discreto en placa de acero o aluminio.",
      "Apertura remota para paquetes de paquetería o visitas.",
      "Integración con iluminación de bienvenida al entrar.",
      "Cerraduras invisibles o de diseño minimalista de alta seguridad.",
    ],
  },
  {
    title: "Corporativo y Oficinas",
    desc: "Control estricto de accesos por zonas, torniquetes y registro de asistencias para edificios comerciales y centros de trabajo.",
    items: [
      "Torniquetes ópticos y puertas de cristal automatizadas.",
      "Acceso por credencial móvil con tecnología NFC / Bluetooth.",
      "Zonificación de áreas restringidas (servidores, directiva).",
      "Reportes de ingreso para auditorías de seguridad.",
    ],
  },
  {
    title: "Fraccionamientos y Privadas",
    desc: "Infraestructura de control vehicular y peatonal para condominios residenciales que buscan agilidad y seguridad en caseta.",
    items: [
      "Lectores RFID / Tags para residentes sin bajar ventanilla.",
      "Códigos QR dinámicos para acceso express de visitas.",
      "Integración con barreras vehiculares de alto ciclo de apertura.",
      "Cámaras de foto-evidencia de ingreso vehicular.",
    ],
  },
];

const brands = [
  { name: "Lutron", src: "/logos/brands/lutron.png", className: "max-h-14 max-w-[76%]" },
  { name: "Hikvision", src: "/logos/brands/hikvision.png", className: "max-h-14 max-w-[82%]" },
  { name: "Grandstream", src: "/logos/brands/grandstream.png", className: "max-h-14 max-w-[84%] scale-110" },
  { name: "DSC", src: "/logos/brands/dsc.png", className: "max-h-14 max-w-[76%]" },
];

const faqItems: FaqItem[] = [
  {
    question: "¿Qué sucede si se interrumpe la conexión a internet o la energía eléctrica?",
    answer:
      "Los sistemas de control de acceso conservan la base de datos de usuarios localmente en sus controladoras, por lo que siguen abriendo normalmente. Además, instalamos baterías de respaldo y chapas con llave física de emergencia de alta seguridad.",
  },
  {
    question: "¿Puedo generar accesos temporales para invitados o personal de servicio?",
    answer:
      "Sí. Puedes generar códigos temporales o enlaces de acceso con fecha y hora de vencimiento desde la aplicación móvil, garantizando que nadie ingrese fuera de su horario autorizado.",
  },
  {
    question: "¿Se puede integrar el interfón y las chapas con la automatización del hogar?",
    answer:
      "Totalmente. Integramos sistemas como Lutron para que al abrir la puerta o ingresar tu código en la noche, se active una escena de bienvenida que enciende las luces del pasillo y desactiva la alarma perimetral automáticamente.",
  },
  {
    question: "¿Qué garantía tienen los equipos y la instalación?",
    answer:
      "Todos los equipos cuentan con garantía directa de fabricante y ALFA ofrece póliza de soporte técnico y mantenimiento documentado en ALFA OS para asegurar una operación continua.",
  },
];

export default function ControlDeAccesoPage() {
  return (
    <main className="min-h-screen bg-[#0F0F0F] text-white">
      {/* Hero Section */}
      <section className="relative min-h-[88vh] overflow-hidden bg-[#0A0A0A]">
        <Image
          src="/projects/estudio-hifi.jpeg"
          alt="Control de acceso y automatización residencial ALFA"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-transparent to-black/40" />

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
        <div className="relative mx-auto flex min-h-[calc(88vh-80px)] max-w-7xl flex-col justify-center px-5 py-16 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 border border-[#B84A5A]/40 bg-[#7A1F2B]/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#F0B8C0]">
              <SlidersHorizontal className="h-4 w-4" />
              Control de Acceso & Automatización
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              Accesos inteligentes y automatización que ordenan tu espacio.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
              Intercomunicación IP, cerraduras biométricas, control vehicular y automatización Lutron integrados en una experiencia sin fricción para residencias de lujo y empresas.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/#diagnostico"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-[#7A1F2B] px-6 text-sm font-semibold text-white transition hover:bg-[#5A1320]"
              >
                Solicitar diagnóstico
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
                Confort & Seguridad
              </p>
              <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
                Control total sin llaves tradicionales ni complicaciones.
              </h2>
            </div>
            <p className="text-base leading-8 text-zinc-700 sm:text-lg">
              Un sistema de acceso moderno elimina la vulnerabilidad de las llaves duplicadas, permitiéndote saber quién entra, a qué hora y abrir puertas desde cualquier parte del mundo con total certeza.
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
              Aplicaciones Reales
            </p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl text-white">
              Control de acceso diseñado para cada tipo de inmueble.
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
              Partners Tecnológicos
            </p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
              Marcas líderes en automatización y control.
            </h2>
            <p className="mt-4 text-base text-zinc-600">
              Integración certificada con protocolos abiertos y compatibilidad con sistemas residenciales y corporativos.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4 max-w-4xl mx-auto">
            {brands.map((brand) => (
              <div
                key={brand.name}
                className="flex h-28 items-center justify-center rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-[#7A1F2B]"
              >
                <Image
                  src={brand.src}
                  alt={brand.name}
                  width={200}
                  height={80}
                  className={`${brand.className} h-auto w-auto object-contain opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <FaqAccordion
        title="Preguntas Frecuentes sobre Control de Acceso"
        eyebrow="Resolviendo dudas"
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
              Diseña un acceso seguro y moderno para tu proyecto.
            </h2>
            <p className="mt-4 text-base text-zinc-200">
              Contáctanos para una asesoría técnica personalizada en Guadalajara o Zapopan.
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
            <Link href="/servicios/iluminacion" className="hover:text-zinc-300 transition text-[#F0B8C0]">
              Iluminación (Lutron)
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
