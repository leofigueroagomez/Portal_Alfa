import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardCheck, Camera, FileStack, Wrench, Shield, Lock, Phone } from "lucide-react";
import FaqAccordion, { FaqItem } from "@/components/FaqAccordion";

export const metadata: Metadata = {
  title: "ALFA OS | Seguimiento Transparente de Proyectos Tecnológicos",
  description:
    "Conoce ALFA OS: la plataforma exclusiva de ALFA que te brinda visibilidad en tiempo real, evidencias fotográficas, documentos y soporte centralizado en cada proyecto.",
  alternates: {
    canonical: "/alfa-os",
  },
  openGraph: {
    title: "ALFA OS | Seguimiento de Proyectos Tecnológicos",
    description:
      "Transparencia total antes, durante y después de la entrega de tu proyecto tecnológico con ALFA OS.",
    type: "website",
  },
};

const WHATSAPP_PHONE = process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "523310000000";

const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
  "Hola ALFA, me gustaría conocer más sobre cómo dan seguimiento a los proyectos mediante ALFA OS."
)}`;

const alfaOsPillars = [
  {
    title: "Seguimiento en Tiempo Real",
    desc: "Visualiza el porcentaje de avance de tu proyecto, las fases completadas y las fechas estimadas de entrega.",
    icon: ClipboardCheck,
  },
  {
    title: "Evidencias Fotográficas Diarias",
    desc: "Registro fotográfico de canalizaciones, cableado oculto, peinado de racks e instalación de equipos.",
    icon: Camera,
  },
  {
    title: "Documentación Centralizada",
    desc: "Tus cotizaciones, alcances aprobados, diagramas unifilares y actas de entrega siempre a la mano en PDF.",
    icon: FileStack,
  },
  {
    title: "Soporte y Garantías Postventa",
    desc: "Solicita asistencia técnica, reporta incidencias y consulta el estado de garantía de cada equipo instalado.",
    icon: Wrench,
  },
  {
    title: "Acceso Seguro Multiusuario",
    desc: "Permisos diferenciados para propietarios, arquitectos, directores de obra o administradores de inmuebles.",
    icon: Lock,
  },
  {
    title: "Certeza y Respaldo Técnico",
    desc: "Un historial digital permanente que respalda la plusvalía de tu propiedad o activo corporativo.",
    icon: Shield,
  },
];

const faqItems: FaqItem[] = [
  {
    question: "¿ALFA OS tiene un costo adicional para los clientes?",
    answer:
      "No. ALFA OS está incluido de forma gratuita en todos los proyectos de integración ejecutados por ALFA. Es nuestro compromiso con la transparencia, la calidad y el servicio postventa.",
  },
  {
    question: "¿Quiénes de mi equipo o familia pueden tener acceso al portal?",
    answer:
      "Tú defines los usuarios autorizados. Puedes dar acceso de consulta a tu arquitecto, diseñador de interiores, project manager o administrador de mantenimiento para coordinar entregas sin fricción.",
  },
  {
    question: "¿Cómo consulto las evidencias fotográficas de lo que quedó oculto en obra?",
    answer:
      "Durante la etapa de ejecución, nuestros instaladores suben fotografías de canalizaciones, tuberías en muros y pasos de losa antes del cierre de plafones y pintura. Estas fotografías quedan guardadas permanentemente en tu expediente digital de ALFA OS.",
  },
  {
    question: "¿Cómo reporto una falla o solicito un servicio de mantenimiento?",
    answer:
      "Directamente desde el portal de ALFA OS puedes levantar una solicitud de servicio técnico. Nuestro equipo recibe la notificación de inmediato con el historial de tus equipos y agenda la visita o asistencia remota.",
  },
];

export default function AlfaOsPage() {
  return (
    <main className="min-h-screen bg-[#0F0F0F] text-white">
      {/* Hero Section */}
      <section className="relative min-h-[88vh] overflow-hidden bg-[#0A0A0A]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(184,74,90,0.28),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(122,31,43,0.3),transparent_40%)]" />

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
              Acceso al Portal
            </Link>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative mx-auto flex min-h-[calc(88vh-80px)] max-w-7xl flex-col justify-center px-5 py-16 sm:px-8 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="inline-flex items-center gap-2 border border-[#B84A5A]/40 bg-[#7A1F2B]/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#F0B8C0]">
                <ClipboardCheck className="h-4 w-4" />
                Operación Transparente
              </p>
              <h1 className="mt-6 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                Nunca tendrás que preguntar: <br />
                <span className="text-[#F0B8C0]">¿Cómo va mi proyecto?</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
                ALFA OS es nuestra plataforma exclusiva de seguimiento. Centraliza avances en tiempo real, evidencias fotográficas, documentos de ingeniería y mesa de ayuda postventa para darte certeza absoluta en cada etapa.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/#diagnostico"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-[#7A1F2B] px-6 text-sm font-semibold text-white transition hover:bg-[#5A1320]"
                >
                  Iniciar proyecto con ALFA
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded border border-white/15 px-6 text-sm font-semibold text-white transition hover:border-[#B84A5A] hover:bg-white/5"
                >
                  Acceso a clientes
                </Link>
              </div>
            </div>

            {/* Dashboard Mockup Card */}
            <div className="rounded-3xl border border-white/15 bg-white/[0.04] p-4 shadow-2xl backdrop-blur sm:p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#B84A5A] font-semibold">
                    Portal Cliente
                  </p>
                  <h2 className="text-lg font-semibold text-white">
                    Residencia Puerta de Hierro
                  </h2>
                </div>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                  En Ejecución
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                  <p className="text-xs text-zinc-400">Avance General</p>
                  <p className="mt-2 text-3xl font-semibold text-white">85%</p>
                  <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full w-[85%] rounded-full bg-[#7A1F2B]" />
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                  <p className="text-xs text-zinc-400">Evidencias en Obra</p>
                  <p className="mt-2 text-3xl font-semibold text-white">56 fotos</p>
                  <p className="mt-1 text-xs text-zinc-400">Clasificadas por área</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-5">
                <p className="text-xs text-zinc-400 mb-3">Documentación de Entrega</p>
                <div className="flex flex-wrap gap-2">
                  {["Cotización Aprobada", "Planos de Red", "Póliza de Garantía", "Manual de Usuario"].map((doc) => (
                    <span
                      key={doc}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300"
                    >
                      {doc}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars Grid */}
      <section className="border-t border-white/10 bg-white px-5 py-20 text-[#0F0F0F] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
              Experiencia de Servicio
            </p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
              La diferencia entre una instalación y un servicio High End.
            </h2>
            <p className="mt-4 text-base text-zinc-600">
              Desarrollamos nuestra propia tecnología para asegurarnos de que disfrutes tanto el proceso de integración como el resultado final.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {alfaOsPillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="rounded-2xl border border-zinc-200 bg-[#F9F9F8] p-7 transition duration-200 hover:border-[#7A1F2B]/40 hover:shadow-md"
                >
                  <Icon className="h-8 w-8 text-[#7A1F2B]" />
                  <h3 className="mt-5 text-xl font-semibold text-[#0F0F0F]">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-600">
                    {pillar.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <FaqAccordion
        title="Preguntas Frecuentes sobre ALFA OS"
        eyebrow="Certeza y transparencia"
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
              Vive una experiencia de integración tecnológica sin sorpresas.
            </h2>
            <p className="mt-4 text-base text-zinc-200">
              Hablemos de tu proyecto residencial o empresarial. Te mostraremos cómo ALFA OS mantendrá todo bajo control.
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
            <Link href="/aviso-de-privacidad" className="hover:text-zinc-300 transition">
              Aviso de Privacidad
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
