import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Network, ShieldCheck, Wifi, Server, Cpu, Phone } from "lucide-react";
import FaqAccordion, { FaqItem } from "@/components/FaqAccordion";

export const metadata: Metadata = {
  title: "Redes Empresariales y Cableado Estructurado | ALFA High End Services",
  description:
    "Diseño e instalación de redes empresariales, WiFi profesional de alta densidad, cableado estructurado Cat6A/Fibra Óptica y racks de telecomunicaciones en Guadalajara y Zapopan.",
  alternates: {
    canonical: "/servicios/redes",
  },
  openGraph: {
    title: "Redes Empresariales y Cableado Estructurado | ALFA High End Services",
    description:
      "Infraestructura tecnológica confiable: WiFi profesional sin zonas muertas, cableado estructurado y racks organizados para residencias y empresas.",
    type: "website",
  },
};

const WHATSAPP_PHONE = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "523310000000";

const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
  "Hola ALFA, me interesa solicitar un diagnóstico para un proyecto de Redes, Cableado Estructurado o WiFi profesional."
)}`;

const experienceCards = [
  {
    title: "WiFi Profesional de Alta Densidad",
    desc: "Cobertura total sin zonas muertas con roaming transparente para cientos de dispositivos simultáneos.",
    icon: Wifi,
  },
  {
    title: "Cableado Estructurado Cat6A y Fibra",
    desc: "Canalización ordenada, peinado profesional y certificación de puntos para máxima velocidad.",
    icon: Network,
  },
  {
    title: "Racks y Centros de Cómputo",
    desc: "Gabinetes organizados, patch panels etiquetados, sistemas de enfriamiento y respaldo de energía UPS.",
    icon: Server,
  },
  {
    title: "Segmentación y Seguridad de Red",
    desc: "VLANs dedicadas para aislar sistemas de seguridad, domótica, red corporativa e internet de invitados.",
    icon: ShieldCheck,
  },
  {
    title: "Enlaces Inalámbricos y Fibra Óptica",
    desc: "Interconexión de edificios, naves industriales o residencias con enlaces de alta capacidad.",
    icon: Cpu,
  },
  {
    title: "Monitoreo y Soporte con ALFA OS",
    desc: "Trazabilidad de equipos, diagramas de red digitalizados y soporte técnico continuo.",
    icon: CheckCircle2,
  },
];

const solutions = [
  {
    title: "Residencial Premium",
    desc: "Para residencias de gran escala que requieren streaming 4K/8K, audio multiroom, domótica y home office sin interrupciones ni desconexiones.",
    items: [
      "Roaming WiFi continuo en interiores, terrazas y jardines.",
      "Aislamiento de red para dispositivos inteligentes (IoT).",
      "Racks residenciales compactos, limpios y silenciosos.",
      "Redundancia de enlace (doble proveedor de internet).",
    ],
  },
  {
    title: "Corporativo y Oficinas",
    desc: "Conectividad robusta para salas de juntas, videoconferencias de alta definición y operación crítica diaria.",
    items: [
      "Priorización de tráfico (QoS) para VoIP y Zoom/Teams.",
      "Portal cautivo para visitas y control de accesos a red.",
      "Switches PoE administrables de alta capacidad.",
      "Certificación técnica de nodos de red para auditorías.",
    ],
  },
  {
    title: "Industrial y Comercial",
    desc: "Infraestructura pesada y enlaces confiables diseñados para entornos industriales, naves y centros de distribución.",
    items: [
      "Cableado blindado resistente a interferencia electromagnética.",
      "Tiradas de fibra óptica monomodo/multimodo.",
      "Access Points industriales para almacenes de gran altura.",
      "Racks de piso con control térmico y PDU inteligente.",
    ],
  },
];

const brands = [
  { name: "Panduit", src: "/logos/brands/panduit.png", className: "max-h-11 max-w-[78%]" },
  { name: "Ubiquiti", src: "/logos/brands/ubiquiti.png", className: "max-h-10 max-w-[46%] scale-[1.8]" },
  { name: "Ruijie", src: "/logos/brands/ruijie.png", className: "max-h-12 max-w-[78%]" },
  { name: "LinkedPro", src: "/logos/brands/linkedpro.png", className: "max-h-12 max-w-[78%]" },
  { name: "Grandstream", src: "/logos/brands/grandstream.png", className: "max-h-14 max-w-[84%] scale-110" },
];

const faqItems: FaqItem[] = [
  {
    question: "¿Cómo garantizan que no haya zonas sin señal de WiFi en propiedades grandes?",
    answer:
      "Realizamos un estudio de cobertura inalámbrica (Site Survey) considerando los materiales de construcción (muros de concreto, cristales térmicos, acabados) para ubicar estratégicamente Access Points empresariales interconectados por cable. Esto permite que tus dispositivos cambien de antena sin cortar videollamadas ni transmisiones.",
  },
  {
    question: "¿Qué diferencia hay entre un cableado comercial y uno certificado por ALFA?",
    answer:
      "En ALFA utilizamos cable 100% cobre en categorías Cat6 y Cat6A con canalizaciones ordenadas, peinado en rack y pruebas de reflectometría y atenuación. Esto garantiza velocidades reales de hasta 10 Gbps, durabilidad a largo plazo y evita fallas intermitentes.",
  },
  {
    question: "¿Pueden organizar un rack o centro de cómputo que ya está desordenado?",
    answer:
      "Sí. Realizamos servicios de reingeniería de racks: identificación de nodos, parcheo, etiquetado normativo, reemplazo de patch cords a la medida y optimización del flujo de aire y energía para que tu sistema sea fácil de mantener y visualmente impecable.",
  },
  {
    question: "¿Cómo se gestiona el soporte y mantenimiento después de la instalación?",
    answer:
      "A través de ALFA OS tienes acceso al diagrama de tu red, inventario de equipos y bitácora técnica. Además, configuramos monitoreo en la nube para recibir alertas preventivas ante caídas de enlace o fallas eléctricas.",
  },
];

export default function RedesPage() {
  return (
    <main className="min-h-screen bg-[#0F0F0F] text-white">
      {/* Hero Section */}
      <section className="relative min-h-[88vh] overflow-hidden bg-[#0A0A0A]">
        <Image
          src="/projects/rack-panduit.jpeg"
          alt="Infraestructura de telecomunicaciones y rack instalado por ALFA"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-35"
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
              <Network className="h-4 w-4" />
              Infraestructura & Conectividad
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              Redes que nunca fallan. Conectividad invisible y veloz.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
              Diseñamos e implementamos redes WiFi empresariales, cableado estructurado y racks de telecomunicaciones para residencias de lujo y empresas que no toleran interrupciones.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/#diagnostico"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-[#7A1F2B] px-6 text-sm font-semibold text-white transition hover:bg-[#5A1320]"
              >
                Solicitar diagnóstico de red
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
                Criterio Técnico
              </p>
              <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
                La base invisible que permite que todo funcione.
              </h2>
            </div>
            <p className="text-base leading-8 text-zinc-700 sm:text-lg">
              Una red deficiente compromete la domótica, las cámaras de seguridad, el audio distribuido y el trabajo remoto. En ALFA calculamos anchos de banda, atenuación y redundancia para entregar sistemas de datos de grado empresarial.
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
              Soluciones Especializadas
            </p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl text-white">
              Arquitectura de red adaptada a cada entorno.
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
              Equipamiento líder en telecomunicaciones.
            </h2>
            <p className="mt-4 text-base text-zinc-600">
              Instalamos únicamente marcas probadas con soporte directo de fábrica y altos estándares de seguridad.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-5">
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
        title="Preguntas Frecuentes sobre Redes y WiFi"
        eyebrow="Resolviendo dudas técnicas"
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
              ¿Listo para modernizar la conectividad de tu espacio?
            </h2>
            <p className="mt-4 text-base text-zinc-200">
              Solicita un levantamiento técnico en Guadalajara o Zapopan. Un especialista de ALFA analizará tus requerimientos.
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
