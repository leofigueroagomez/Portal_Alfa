import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Camera, Eye, HardDrive, Lock, Phone } from "lucide-react";
import FaqAccordion, { FaqItem } from "@/components/FaqAccordion";
import WhatsAppLeadButton from "@/components/WhatsAppLeadButton";
import LocalBusinessJsonLd from "@/components/LocalBusinessJsonLd";
import { SITE_URL } from "@/lib/siteUrl";

export const metadata: Metadata = {
  // `absolute` evita que el template "%s | ALFA" del layout raiz
  // agregue un segundo sufijo de marca.
  title: { absolute: "CCTV y Cámaras de Seguridad IP | ALFA High End Services" },
  description:
    "Diseño e instalación de CCTV, cámaras de seguridad IP, videovigilancia perimetral inteligente y monitoreo en tiempo real para residencias y empresas en Guadalajara y Zapopan.",
  alternates: {
    canonical: "/servicios/cctv",
  },
  openGraph: {
    title: "CCTV y Cámaras de Seguridad IP | ALFA High End Services",
    description:
      "Sistemas de videovigilancia de alta gama: cámaras 4K, visión nocturna a color y analítica inteligente para residencias y empresas.",
    type: "website",
  },
};

const WHATSAPP_PHONE = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "523318574884";

const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
  "Hola ALFA, me interesa solicitar un diagnóstico para un proyecto de CCTV y Cámaras de Seguridad."
)}`;

const experienceCards = [
  {
    title: "Cámaras IP 4K y Visión Nocturna",
    desc: "Resolución ultra nítida con tecnología ColorVu para capturar detalles a color incluso en completa oscuridad.",
    icon: Camera,
  },
  {
    title: "Analítica Perimetral con IA",
    desc: "Detección inteligente de cruce de línea y clasificación de personas y vehículos, eliminando falsas alarmas.",
    icon: Eye,
  },
  {
    title: "Almacenamiento Local y Redundante",
    desc: "Grabadores NVR de alta capacidad con discos duros grado vigilancia para semanas continuas de grabación.",
    icon: HardDrive,
  },
  {
    title: "Visualización Remota Segura",
    desc: "Acceso instantáneo desde iPhone, Android o computadoras con transmisión encriptada de punto a punto.",
    icon: Lock,
  },
  {
    title: "Integración con Alarma y Acceso",
    desc: "Sinergia total entre cámaras, sensores perimetrales DSC, iluminación disuasiva y chapas electrónicas.",
    icon: ShieldCheck,
  },
  {
    title: "Evidencias y Soporte ALFA OS",
    desc: "Planos de ubicación de cámaras, historial de servicio y gestión de garantías en nuestra plataforma.",
    icon: CheckCircle2,
  },
];

const solutions = [
  {
    title: "Residencial de Alta Gama",
    desc: "Protección perimetral e interior con cámaras estéticamente integradas a la arquitectura sin cables visibles.",
    items: [
      "Cámaras discretas empotradas o minidomos.",
      "Visión nocturna a color en jardines y accesos.",
      "Notificaciones instantáneas de detección a tu celular.",
      "Privacidad protegida: control absoluto sobre quién tiene acceso.",
    ],
  },
  {
    title: "Corporativo y Comercial",
    desc: "Monitoreo continuo para recepción, áreas operativas, salas de juntas, estacionamientos y puntos de cobro.",
    items: [
      "Cámaras de 360° (Fisheye) y domos antivandálicos IK10.",
      "Monitoreo centralizado para guardias o empresas de seguridad.",
      "Conteo de personas y mapas de calor para retail.",
      "Respaldo de video para auditorías y control interno.",
    ],
  },
  {
    title: "Industrial y Perímetros Críticos",
    desc: "Sistemas robustos de videovigilancia para naves industriales, patios de maniobra y bardas perimetrales extensas.",
    items: [
      "Cámaras térmicas para detección perimetral a larga distancia.",
      "Domos PTZ motorizados con zoom óptico 32x y seguimiento automático.",
      "Enlaces inalámbricos o fibra óptica para cámaras remotas.",
      "Gabinetes NEMA para intemperie con respaldo UPS.",
    ],
  },
];

const brands = [
  { name: "Hikvision", src: "/logos/brands/hikvision.png", className: "max-h-14 max-w-[82%]" },
  { name: "DSC", src: "/logos/brands/dsc.png", className: "max-h-14 max-w-[76%]" },
  { name: "Ubiquiti", src: "/logos/brands/ubiquiti.png", className: "max-h-10 max-w-[46%] scale-[1.8]" },
  { name: "LinkedPro", src: "/logos/brands/linkedpro.png", className: "max-h-12 max-w-[78%]" },
];

const faqItems: FaqItem[] = [
  {
    question: "¿Es seguro ver mis cámaras de seguridad por internet?",
    answer:
      "Totalmente. En ALFA no utilizamos configuraciones inseguras de puertos abiertos. Implementamos autenticación de dos factores (2FA), contraseñas robustas y cifrado de extremo a extremo para que únicamente tú y las personas autorizadas puedan ver las transmisiones en vivo y grabaciones.",
  },
  {
    question: "¿Qué pasa con la grabación si se corta el internet o la energía eléctrica?",
    answer:
      "Las cámaras y el NVR continúan grabando localmente sin interrupción aunque se corte el internet. Para cortes de energía, integramos sistemas de respaldo UPS que mantienen el sistema operando durante horas.",
  },
  {
    question: "¿Cuánto tiempo de grabación puedo almacenar?",
    answer:
      "Depende de tus requerimientos y el número de cámaras. Calculamos el almacenamiento para ofrecer desde 15 hasta 60+ días de grabación continua o por evento inteligente con discos duros diseñados para operación 24/7.",
  },
  {
    question: "¿Cómo cuidan la estética de la casa durante la instalación?",
    answer:
      "Nuestros ingenieros cuidan minuciosamente las trayectorias de cableado para ocultar cualquier línea visible, coordinando con plafones, tuberías ocultas y seleccionando cámaras que armonicen con el diseño arquitectónico de tu inmueble.",
  },
];

export default function CctvPage() {
  return (
    <main className="min-h-screen bg-[#0F0F0F] text-white">
      <LocalBusinessJsonLd pageUrl={`${SITE_URL}/servicios/cctv`} />
      {/* Hero Section */}
      <section className="relative min-h-[88vh] overflow-hidden bg-[#0A0A0A]">
        <Image
          src="/projects/residencia-premium.jpeg"
          alt="Sistema de seguridad electrónica y videovigilancia ALFA"
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
              <ShieldCheck className="h-4 w-4" />
              Seguridad Electrónica & CCTV
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              Cámaras y videovigilancia inteligente para proteger lo que más importa.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
              Sistemas de videovigilancia IP de alta resolución, detección perimetral con inteligencia artificial y visualización remota ultrasegura para residencias de alta gama y corporativos.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/#diagnostico"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-[#7A1F2B] px-6 text-sm font-semibold text-white transition hover:bg-[#5A1320]"
              >
                Solicitar diagnóstico de seguridad
                <ArrowRight className="h-4 w-4" />
              </Link>
              <WhatsAppLeadButton
                href={whatsappUrl}
                service="cctv"
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

      {/* Value Pillars */}
      <section className="border-t border-white/10 bg-white px-5 py-20 text-[#0F0F0F] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
                Criterio de Seguridad
              </p>
              <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
                Tranquilidad total con tecnología de grado profesional.
              </h2>
            </div>
            <p className="text-base leading-8 text-zinc-700 sm:text-lg">
              La videovigilancia moderna va más allá de solo grabar imágenes: se trata de prevenir intrusiones antes de que ocurran mediante analítica inteligente, calidad óptica superior y una interfaz intuitiva en tu mano.
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
              Cobertura a tu Medida
            </p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl text-white">
              Sistemas de videovigilancia diseñados por entorno.
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
              Fabricantes líderes en seguridad electrónica.
            </h2>
            <p className="mt-4 text-base text-zinc-600">
              Garantizamos compatibilidad, soporte técnico y equipos originales respaldados por garantía de fábrica.
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
        title="Preguntas Frecuentes sobre CCTV y Seguridad"
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
              Protege tu propiedad con un sistema diseñado para durar.
            </h2>
            <p className="mt-4 text-base text-zinc-200">
              Solicita una evaluación técnica de tu inmueble en Guadalajara o Zapopan sin compromiso.
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
              service="cctv"
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
            <span className="text-zinc-400">© {new Date().getFullYear()} ALFA High End Services.</span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/" className="hover:text-zinc-300 transition">
              Inicio
            </Link>
            <Link href="/blog" className="hover:text-zinc-300 transition text-[#F0B8C0]">
              Blog
            </Link>
            <Link href="/servicios/iluminacion" className="hover:text-zinc-300 transition">
              Iluminación (Lutron)
            </Link>
            <Link href="/servicios/audio-video" className="hover:text-zinc-300 transition">
              Audio & Video
            </Link>
            <Link href="/servicios/redes" className="hover:text-zinc-300 transition">
              Redes
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
