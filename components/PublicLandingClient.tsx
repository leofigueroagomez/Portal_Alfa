"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { getStoredAttribution } from "@/lib/utmTracking";
import {
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileStack,
  Headphones,
  KeyRound,
  Lightbulb,
  Menu,
  MessageCircle,
  MonitorSpeaker,
  Network,
  Phone,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  SunDim,
  Wrench,
  X,
} from "lucide-react";

const WHATSAPP_PHONE =
  process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "523318574884";

const experienceAreas = [
  {
    title: "Residencial de Alta Gama",
    copy: "Control de iluminación arquitectónica, persianas motorizadas, audio de referencia y redes para residencias que exigen estética impecable y confort absoluto.",
  },
  {
    title: "Corporativo & Hospitality",
    copy: "Salas de consejo, espacios de trabajo, restaurantes y hoteles con tecnología estable, gestión energética y operación intuitiva.",
  },
  {
    title: "Industrial & Infraestructura",
    copy: "Cableado estructurado, centros de cómputo, seguridad electrónica y soporte donde la continuidad operativa y la trazabilidad son críticas.",
  },
];

const highEndSolutions = [
  {
    title: "Iluminación arquitectónica & control",
    highlight: "Lutron & Shelly",
    badge: "Sistema Insignia",
    icon: SunDim,
    href: "/servicios/iluminacion",
    desc: "Escenas de confort, botoneras de diseño Palladiom y persianas ultra silenciosas.",
  },
  {
    title: "Audio y video profesional",
    highlight: "Bowers & Wilkins · McIntosh · Sonos",
    icon: MonitorSpeaker,
    href: "/servicios/audio-video",
    desc: "Sistemas Hi-Fi acústicamente calibrados, salas de juntas y cine en casa.",
  },
  {
    title: "Infraestructura & redes de alta velocidad",
    highlight: "Panduit · Ubiquiti · Ruijie",
    icon: Network,
    href: "/servicios/redes",
    desc: "WiFi empresarial sin zonas muertas, cableado Cat6A/Fibra y racks organizados.",
  },
  {
    title: "Seguridad electrónica & CCTV",
    highlight: "Hikvision · DSC · UniFi Protect",
    icon: ShieldCheck,
    href: "/servicios/cctv",
    desc: "Cámaras 4K, visión nocturna a color y analítica perimetral con IA.",
  },
  {
    title: "Control de acceso & automatización",
    highlight: "Lutron · Hikvision · Grandstream",
    icon: SlidersHorizontal,
    href: "/servicios/control-de-acceso",
    desc: "Intercomunicadores IP, cerraduras biométricas y control vehicular.",
  },
  {
    title: "ALFA OS (Gestión de proyectos)",
    highlight: "Plataforma Propietaria",
    icon: Headphones,
    href: "/alfa-os",
    desc: "Seguimiento en tiempo real, bitácora fotográfica de obra y soporte postventa.",
  },
];

const navSystems = [
  {
    title: "Iluminación Arquitectónica & Persianas",
    subtitle: "Lutron HomeWorks, RadioRA 3 y Shelly",
    href: "/servicios/iluminacion",
    icon: SunDim,
    badge: "Insignia",
  },
  {
    title: "Audio de Referencia & Home Cinema",
    subtitle: "McIntosh, Bowers & Wilkins, Sonos",
    href: "/servicios/audio-video",
    icon: MonitorSpeaker,
  },
  {
    title: "Redes e Infraestructura de Alta Velocidad",
    subtitle: "WiFi profesional, cableado Cat6A y racks",
    href: "/servicios/redes",
    icon: Network,
  },
  {
    title: "CCTV & Seguridad Inteligente",
    subtitle: "Videovigilancia 4K y analítica perimetral IA",
    href: "/servicios/cctv",
    icon: ShieldCheck,
  },
  {
    title: "Control de Acceso & Automatización",
    subtitle: "Intercomunicación IP y cerraduras digitales",
    href: "/servicios/control-de-acceso",
    icon: SlidersHorizontal,
  },
  {
    title: "ALFA OS (Seguimiento de Proyectos)",
    subtitle: "Plataforma cliente, evidencias y garantías",
    href: "/alfa-os",
    icon: Headphones,
  },
];

const alfaOsItems = [
  { title: "Seguimiento en tiempo real", icon: ClipboardCheck },
  { title: "Evidencias organizadas", icon: Camera },
  { title: "Historial completo", icon: FileStack },
  { title: "Soporte centralizado", icon: Wrench },
];

const projectGallery = [
  {
    title: "Salón de Audio VM",
    description:
      "Escucha crítica audiófila con McIntosh MA352, tornamesa Denon DP-3000NE, Bowers & Wilkins Serie 600 y zona de billar con Sonos Amp.",
    src: "/portfolio/salon-de-audio-vm/hero.jpg",
    href: "/portafolio/salon-de-audio-vm",
    category: "Audio Hi-Fi & Entretenimiento",
  },
];

const brandLogos = [
  {
    name: "Lutron",
    src: "/logos/brands/lutron.png",
    category: "Control e iluminación",
    logoClassName: "max-h-14 max-w-[76%]",
  },
  {
    name: "Shelly",
    src: "/logos/brands/shelly.png",
    category: "Distribución internacional",
    logoClassName: "max-h-12 max-w-[78%]",
  },
  {
    name: "Sonos",
    src: "/logos/brands/sonos.png",
    category: "Experiencias audiovisuales",
    logoClassName: "max-h-10 max-w-[58%] scale-150",
  },
  {
    name: "McIntosh",
    src: "/logos/brands/mcintosh.png",
    category: "Experiencias audiovisuales",
    logoClassName: "max-h-11 max-w-[67%] scale-125",
  },
  {
    name: "Bowers & Wilkins",
    src: "/logos/brands/bowers-wilkins.png",
    category: "Experiencias audiovisuales",
    logoClassName: "max-h-12 max-w-[78%]",
  },
  {
    name: "Panduit",
    src: "/logos/brands/panduit.png",
    category: "Infraestructura",
    logoClassName: "max-h-11 max-w-[78%]",
  },
  {
    name: "Ubiquiti",
    src: "/logos/brands/ubiquiti.png",
    category: "Conectividad",
    logoClassName: "max-h-10 max-w-[46%] scale-[2]",
  },
  {
    name: "Hikvision",
    src: "/logos/brands/hikvision.png",
    category: "Seguridad",
    logoClassName: "max-h-14 max-w-[82%]",
  },
  {
    name: "DSC",
    src: "/logos/brands/dsc.png",
    category: "Seguridad",
    logoClassName: "max-h-14 max-w-[76%]",
  },
  {
    name: "Ruijie",
    src: "/logos/brands/ruijie.png",
    category: "Infraestructura",
    logoClassName: "max-h-12 max-w-[78%]",
  },
  {
    name: "LinkedPro",
    src: "/logos/brands/linkedpro.png",
    category: "Infraestructura",
    logoClassName: "max-h-12 max-w-[78%]",
  },
  {
    name: "Grandstream",
    src: "/logos/brands/grandstream.png",
    category: "Conectividad",
    logoClassName: "max-h-14 max-w-[84%] scale-110",
  },
  {
    name: "Panamax",
    src: "/logos/brands/panamax.png",
    category: "Protección de energía",
    logoClassName: "max-h-14 max-w-[80%]",
  },
];

const processSteps = [
  "Diagnóstico y levantamiento",
  "Diseño técnico y alcance",
  "Implementación coordinada",
  "Entrega, documentación y soporte",
];

const interestOptions = [
  "Iluminación y persianas (Lutron / Shelly)",
  "Audio de referencia y video profesional",
  "Redes e infraestructura de alta velocidad",
  "CCTV y seguridad electrónica",
  "Control de acceso y automatización",
  "Proyecto integral llave en mano",
  "Alianza para despacho / Arquitectura",
  "Soporte y póliza ALFA OS",
  "Otro",
];

const budgetRangeOptions = [
  "Menos de $150,000",
  "$150,000 – $500,000",
  "$500,000 – $1,500,000",
  "Más de $1,500,000",
  "Aún no lo sé",
];

const timelineOptions = [
  "Lo antes posible",
  "Este mes",
  "1 a 3 meses",
  "Solo estoy explorando",
];

const initialForm = {
  name: "",
  customerType: "residencial",
  company: "",
  phone: "",
  service: "",
  message: "",
  interest: "",
  budgetRange: "",
  timeline: "",
};

type SubmitState = "idle" | "sending" | "success" | "error";

export default function PublicLanding() {
  const [form, setForm] = useState(initialForm);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [isServicesMenuOpen, setIsServicesMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const updateField = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (submitState !== "idle") setSubmitState("idle");
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("sending");

    const attribution = getStoredAttribution();
    const payload = {
      ...form,
      attribution,
      source: "Landing Web",
      status: "nuevo",
    };

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Lead request failed");

      trackEvent("generate_lead", {
        customer_type: form.customerType,
        interest: form.interest || "General",
        budget_range: form.budgetRange || "No especificado",
        service: form.service,
        source: "Landing Web",
        utm_source: attribution.utm_source,
        utm_campaign: attribution.utm_campaign,
      });

      setForm(initialForm);
      setSubmitState("success");
    } catch (error) {
      console.error("lead submit failed:", error);
      setSubmitState("error");
    }
  }

  const whatsappMessage = [
    "Hola, me gustaría solicitar un diagnóstico para un proyecto con ALFA High End Services.",
    form.name ? `Nombre: ${form.name}` : null,
    form.customerType ? `Tipo de proyecto: ${form.customerType}` : null,
    form.company ? `Empresa, negocio o residencia: ${form.company}` : null,
    form.phone ? `Teléfono: ${form.phone}` : null,
    form.interest ? `Principal interés: ${form.interest}` : null,
    form.budgetRange
      ? `Tamaño aproximado del proyecto: ${form.budgetRange}`
      : null,
    form.timeline
      ? `Tiempo estimado para iniciar: ${form.timeline}`
      : null,
    form.service ? `Objetivo: ${form.service}` : null,
    form.message ? `Mensaje: ${form.message}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
    whatsappMessage
  )}`;

  return (
    <main className="min-h-screen overflow-hidden bg-[#0F0F0F] text-white">
      {/* Header Bar */}
      <header className="relative border-b border-white/10 px-5 py-5 sm:px-8 lg:px-12 z-40 bg-[#0F0F0F]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-alfa.png"
              alt="ALFA High End Services"
              width={160}
              height={80}
              priority
              className="h-11 w-auto object-contain"
            />
            <span className="hidden text-xs font-semibold uppercase tracking-[0.24em] text-zinc-300 sm:block">
              High End Services
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-2 lg:flex">
            {/* Services Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsServicesMenuOpen(!isServicesMenuOpen)}
                onMouseEnter={() => setIsServicesMenuOpen(true)}
                className="inline-flex items-center gap-1.5 rounded border border-white/10 px-3.5 py-2 text-xs font-medium uppercase tracking-wider text-zinc-200 transition hover:border-[#B84A5A] hover:text-white"
              >
                <span>Sistemas & Soluciones</span>
                <ChevronDown className={`h-3.5 w-3.5 text-[#B84A5A] transition-transform ${isServicesMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {isServicesMenuOpen ? (
                <div
                  onMouseLeave={() => setIsServicesMenuOpen(false)}
                  className="absolute left-0 top-full mt-2 w-80 rounded-2xl border border-white/15 bg-[#141414] p-3 shadow-2xl backdrop-blur z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="space-y-1">
                    {navSystems.map((sys) => {
                      const Icon = sys.icon;
                      return (
                        <Link
                          key={sys.title}
                          href={sys.href}
                          onClick={() => setIsServicesMenuOpen(false)}
                          className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-white/[0.06]"
                        >
                          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-[#B84A5A] shrink-0 mt-0.5">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-white">
                                {sys.title}
                              </p>
                              {sys.badge ? (
                                <span className="rounded bg-[#7A1F2B] px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                                  {sys.badge}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5">
                              {sys.subtitle}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <Link
              href="/portafolio"
              className="rounded border border-white/10 px-3.5 py-2 text-xs font-medium uppercase tracking-wider text-zinc-300 transition hover:border-[#B84A5A] hover:text-white"
            >
              Portafolio
            </Link>
            <Link
              href="/marcas"
              className="rounded border border-white/10 px-3.5 py-2 text-xs font-medium uppercase tracking-wider text-zinc-300 transition hover:border-[#B84A5A] hover:text-white"
            >
              Marcas
            </Link>
            <Link
              href="/blog"
              className="rounded border border-white/10 px-3.5 py-2 text-xs font-medium uppercase tracking-wider text-zinc-300 transition hover:border-[#B84A5A] hover:text-white"
            >
              Blog
            </Link>
            <Link
              href="/alfa-os"
              className="rounded border border-white/10 px-3.5 py-2 text-xs font-medium uppercase tracking-wider text-zinc-300 transition hover:border-[#B84A5A] hover:text-white"
            >
              ALFA OS
            </Link>
            <Link
              href="/arquitectos"
              className="rounded border border-white/10 px-3.5 py-2 text-xs font-medium uppercase tracking-wider text-zinc-300 transition hover:border-[#B84A5A] hover:text-white"
            >
              Arquitectos
            </Link>
            <a
              href="#diagnostico"
              className="rounded border border-white/15 px-3.5 py-2 text-xs font-medium uppercase tracking-wider text-zinc-200 transition hover:border-[#B84A5A] hover:text-white"
            >
              Diagnóstico
            </a>
            <Link
              href="/login"
              className="rounded bg-[#7A1F2B] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-[#5A1320]"
            >
              Portal
            </Link>
          </nav>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center justify-center rounded border border-white/15 p-2 text-white transition hover:border-[#B84A5A] lg:hidden"
            aria-label="Abrir menú"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen ? (
          <div className="mt-4 border-t border-white/10 pt-4 lg:hidden">
            <p className="px-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#B84A5A] mb-2">
              Sistemas Especializados
            </p>
            <div className="space-y-1">
              {navSystems.map((sys) => {
                const Icon = sys.icon;
                return (
                  <Link
                    key={sys.title}
                    href={sys.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
                  >
                    <Icon className="h-4 w-4 text-[#B84A5A]" />
                    <span className="font-medium">{sys.title}</span>
                  </Link>
                );
              })}
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
              <Link
                href="/portafolio"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
              >
                <span>Portafolio de Proyectos</span>
                <ArrowRight className="h-4 w-4 text-[#B84A5A]" />
              </Link>
              <Link
                href="/marcas"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
              >
                <span>Catálogo de Marcas & Equipos</span>
                <ArrowRight className="h-4 w-4 text-[#B84A5A]" />
              </Link>
              <Link
                href="/blog"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
              >
                <span>Blog & Artículos Especializados</span>
                <ArrowRight className="h-4 w-4 text-[#B84A5A]" />
              </Link>
              <Link
                href="/alfa-os"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
              >
                <span>Plataforma ALFA OS</span>
                <ArrowRight className="h-4 w-4 text-[#B84A5A]" />
              </Link>
              <Link
                href="/arquitectos"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-200 hover:bg-white/5"
              >
                <span>Alianzas para Arquitectos</span>
                <ArrowRight className="h-4 w-4 text-[#B84A5A]" />
              </Link>
              <a
                href="#diagnostico"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center rounded bg-white/5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white"
              >
                Solicitar diagnóstico
              </a>
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center rounded bg-[#7A1F2B] py-2.5 text-xs font-semibold uppercase tracking-wider text-white"
              >
                Acceso Portal
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      {/* Hero Section */}
      <section className="relative px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_72%_42%,rgba(122,31,43,0.38),transparent_32%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 border border-[#B84A5A]/40 bg-[#7A1F2B]/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#F0B8C0]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Lutron · McIntosh · Bowers & Wilkins · Panduit
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold leading-[1.08] text-white sm:text-5xl lg:text-6xl">
              Ingeniería e integración tecnológica para proyectos que no admiten concesiones.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300 sm:text-lg">
              Especialistas en control de iluminación Lutron, audio de referencia, infraestructura de red y seguridad crítica. Proyectos llave en mano con seguimiento transparente en ALFA OS.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#diagnostico"
                className="inline-flex items-center justify-center gap-2 rounded bg-[#7A1F2B] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#5A1320]"
              >
                Solicita un diagnóstico
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() =>
                  trackEvent("click_whatsapp", {
                    service: "home",
                    placement: "hero",
                  })
                }
                className="inline-flex items-center justify-center gap-2 rounded border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-[#B84A5A] hover:bg-white/5"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                WhatsApp Directo
              </a>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden rounded border border-white/10 bg-zinc-950 shadow-2xl shadow-black/40">
            <Image
              src="/logo-alfa-os.png"
              alt="ALFA OS"
              width={760}
              height={460}
              priority
              className="absolute inset-x-0 top-8 mx-auto h-auto w-[78%] max-w-[520px] object-contain"
            />
            <div className="absolute inset-x-6 bottom-6 border border-white/10 bg-black/55 p-5 backdrop-blur">
              <p className="text-sm font-semibold text-white">
                Soluciones High End con operación clara
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-300">
                <span className="border border-white/10 bg-white/5 p-3">
                  Audio, video y control
                </span>
                <span className="border border-white/10 bg-white/5 p-3">
                  Redes e infraestructura
                </span>
                <span className="border border-white/10 bg-white/5 p-3">
                  Seguridad electrónica
                </span>
                <span className="border border-white/10 bg-white/5 p-3">
                  Soporte especializado
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-zinc-100 px-5 py-16 text-[#0F0F0F] sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#7A1F2B]">
              Por qué ALFA
            </p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
              Un aliado técnico que cuida el proyecto completo.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              "Criterio técnico desde el diagnóstico hasta la entrega.",
              "Comunicación clara para tomar decisiones con confianza.",
              "Soporte posterior para mantener la solución funcionando.",
            ].map((item) => (
              <div key={item} className="border border-zinc-200 bg-white p-5">
                <CheckCircle2
                  className="mb-5 h-6 w-6 text-[#7A1F2B]"
                  aria-hidden="true"
                />
                <p className="text-sm leading-6 text-zinc-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#F8F7F5] px-5 py-16 text-[#0F0F0F] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Experiencia comprobada"
            title="Tres contextos, una misma exigencia: que la tecnología funcione."
            darkText
          />
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {experienceAreas.map((area) => (
              <article
                key={area.title}
                className="border border-zinc-200 bg-white p-6 shadow-sm shadow-black/[0.03]"
              >
                <Building2
                  className="mb-8 h-7 w-7 text-[#B84A5A]"
                  aria-hidden="true"
                />
                <h3 className="text-xl font-semibold">{area.title}</h3>
                <p className="mt-4 text-sm leading-7 text-zinc-700">
                  {area.copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#151515] px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Sistemas de Especialidad"
            title="Diseñados e integrados para residencias y espacios que no admiten fallas."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {highEndSolutions.map((solution) => {
              const Icon = solution.icon;
              return (
                <Link
                  key={solution.title}
                  href={solution.href}
                  className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0F0F0F] p-7 transition duration-[250ms] ease-in-out hover:-translate-y-1 hover:border-[#B84A5A] hover:bg-white/[0.04] hover:shadow-xl hover:shadow-black/40"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-[#B84A5A] transition group-hover:bg-[#7A1F2B] group-hover:text-white">
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </div>
                      {solution.badge ? (
                        <span className="rounded-full border border-[#B84A5A]/50 bg-[#7A1F2B]/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#F0B8C0]">
                          {solution.badge}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      {solution.highlight}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-white">
                      {solution.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                      {solution.desc}
                    </p>
                  </div>

                  <span className="mt-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#F0B8C0] transition group-hover:text-white">
                    Explorar sistema
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 text-[#0F0F0F] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#B84A5A]">
              Partners tecnológicos
            </p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
              Tecnología respaldada por marcas líderes.
            </h2>
            <p className="mt-5 text-base leading-8 text-zinc-700">
              Seleccionamos cada solución considerando desempeño, confiabilidad
              y experiencia de uso para entregar proyectos a la altura de las
              expectativas de nuestros clientes.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {brandLogos.map((brand) => {
              const brandLower = brand.name.toLowerCase();
              const brandHref =
                brandLower === "lutron"
                  ? "/marcas/lutron"
                  : brandLower === "sonos"
                  ? "/marcas/sonos"
                  : "/marcas";

              return (
                <Link
                  key={brand.name}
                  href={brandHref}
                  className="group flex h-28 items-center justify-center overflow-hidden rounded-[24px] border border-black/[0.08] bg-white p-6 shadow-sm shadow-black/[0.03] transition duration-[250ms] ease-in-out hover:-translate-y-0.5 hover:border-[#7A1F2B] sm:h-32"
                >
                  <Image
                    src={brand.src}
                    alt={brand.name}
                    width={220}
                    height={90}
                    title={brand.category}
                    className={`${brand.logoClassName} h-auto w-auto object-contain opacity-[.85] grayscale transition duration-[250ms] ease-in-out group-hover:opacity-100 group-hover:grayscale-0`}
                  />
                </Link>
              );
            })}
          </div>

          <p className="mt-8 max-w-3xl text-sm leading-7 text-zinc-600">
            Trabajamos con fabricantes reconocidos por su calidad, confiabilidad
            y desempeño para construir soluciones pensadas para durar.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#240A10] px-5 py-16 text-white sm:px-8 sm:py-20 lg:px-12">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(122,31,43,0.92),rgba(15,15,15,0.98)_58%,rgba(90,19,32,0.88)),radial-gradient(circle_at_18%_20%,rgba(184,74,90,0.34),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="relative min-h-[360px] overflow-hidden rounded-[28px] border border-white/10 shadow-2xl shadow-black/40 sm:min-h-[520px]">
            <Image
              src="/projects/audio-hifi-bw-mcintosh.jpeg"
              alt="Sistema de audio de referencia Bowers & Wilkins y McIntosh"
              fill
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="object-cover"
              onError={() =>
                console.warn(
                  "Falta imagen de proyecto: /projects/audio-hifi-bw-mcintosh.jpeg"
                )
              }
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-black/50 via-black/18 to-[#7A1F2B]/18" />
          </div>

          <div className="lg:pl-4">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#B84A5A]">
              Audio premium
            </p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
              Para quienes saben apreciar los detalles.
            </h2>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              Un sistema de alto desempeño no se trata solamente de volumen. Se
              trata de precisión, diseño, integración y una experiencia que se
              siente desde el primer momento.
            </p>
            <p className="mt-5 border-l-2 border-[#7A1F2B] pl-5 text-base font-semibold leading-8 text-zinc-100">
              Audio de referencia, video, automatización e infraestructura
              trabajando como una sola experiencia.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#diagnostico"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-[#7A1F2B] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#5A1320]"
              >
                Hablemos de tu proyecto
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <Link
                href="/servicios/audio-video"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-[#B84A5A] hover:bg-white/5"
              >
                Conocer audio y video
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-white/10 bg-[#0F0F0F] px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(184,74,90,0.22),transparent_30%),radial-gradient(circle_at_88%_48%,rgba(122,31,43,0.26),transparent_34%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#F0B8C0]">
              ALFA OS
            </p>
            <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Nunca tendrás que preguntar: ¿Cómo va mi proyecto?
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
              Con ALFA OS tendrás acceso a la información más importante de tu
              proyecto desde un solo lugar, con la transparencia y el
              seguimiento que nuestros clientes esperan.
            </p>
            <p className="mt-8 border-l-2 border-[#B84A5A] pl-5 text-base font-medium leading-8 text-zinc-200">
              ALFA OS forma parte de nuestra filosofía de trabajo: mantener a
              nuestros clientes informados, respaldados y acompañados durante
              todo el ciclo de vida de cada proyecto.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#151515] p-3 shadow-2xl shadow-black/40 sm:p-4">
            <div className="overflow-hidden rounded-[22px] border border-white/10 bg-[#0F0F0F]">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#B84A5A]">
                    Proyecto
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">
                    Sala de Juntas Corporativa
                  </h3>
                </div>
                <span className="rounded-full border border-[#B84A5A]/40 bg-[#7A1F2B]/20 px-3 py-1 text-xs font-semibold text-[#F0B8C0]">
                  En ejecución
                </span>
              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-[1fr_0.78fr]">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm text-zinc-400">Progreso</p>
                      <p className="mt-2 text-4xl font-semibold text-white">
                        80%
                      </p>
                    </div>
                    <ClipboardCheck
                      className="h-8 w-8 text-[#B84A5A]"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-4/5 rounded-full bg-[#7A1F2B]" />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-sm text-zinc-400">Evidencias</p>
                  <p className="mt-3 text-3xl font-semibold text-white">
                    42
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">fotografías</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:col-span-2">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-zinc-400">Documentos</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {["Cotización", "Alcances", "Entrega"].map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-200"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                    <FileStack
                      className="h-8 w-8 text-[#B84A5A]"
                      aria-hidden="true"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:col-span-2 sm:grid-cols-4">
                  {alfaOsItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.title}
                        className="min-h-32 rounded-2xl border border-white/10 bg-white/[0.035] p-4"
                      >
                        <Icon
                          className="h-5 w-5 text-[#B84A5A]"
                          aria-hidden="true"
                        />
                        <h3 className="mt-5 text-sm font-semibold leading-5 text-white">
                          {item.title}
                        </h3>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F8F7F5] px-5 py-16 text-[#0F0F0F] sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#B84A5A]">
                Portafolio de Proyectos
              </p>
              <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
                Proyectos que reflejan nuestra forma de trabajar.
              </h2>
              <p className="mt-5 text-base leading-8 text-zinc-700">
                Cada proyecto es una combinación de ingeniería, diseño y
                acompañamiento. Desde residencias de alto nivel hasta
                infraestructura tecnológica crítica.
              </p>
            </div>
            <Link
              href="/portafolio"
              className="inline-flex items-center gap-2 rounded-xl bg-[#7A1F2B] hover:bg-[#5A1320] px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-white transition shadow-lg shadow-[#7A1F2B]/20 flex-shrink-0"
            >
              <span>Explorar Portafolio</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-10">
            {projectGallery.map((project) => (
              <Link
                key={project.title}
                href={project.href || "/portafolio"}
                className="group relative min-h-[440px] sm:min-h-[520px] overflow-hidden rounded-[24px] border border-white/10 bg-[#141414] shadow-2xl shadow-black/20 block transition duration-300 hover:border-[#7A1F2B]"
              >
                <Image
                  src={project.src}
                  alt={project.title}
                  fill
                  sizes="100vw"
                  className="object-cover transition duration-500 ease-in-out group-hover:scale-[1.03]"
                  onError={() =>
                    console.warn(`Falta imagen de proyecto: ${project.src}`)
                  }
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                
                {project.category && (
                  <div className="absolute top-6 left-6">
                    <span className="rounded-md bg-black/80 backdrop-blur-md px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#F0B8C0] border border-[#7A1F2B]/40">
                      {project.category}
                    </span>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
                  <h3 className="text-3xl sm:text-4xl font-semibold text-white group-hover:text-[#F0B8C0] transition">
                    {project.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-200 sm:text-base font-light">
                    {project.description}
                  </p>
                  <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#7A1F2B] group-hover:bg-[#5A1320] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition shadow-lg shadow-[#7A1F2B]/25">
                    <span>Explorar Caso de Estudio</span>
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0F0F0F] px-5 py-16 text-white sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Proceso"
            title="Orden técnico, comunicación clara y ejecución documentada."
          />
          <div className="mt-9 grid gap-4 md:grid-cols-4">
            {processSteps.map((step, index) => (
              <div key={step} className="border border-white/10 bg-white/[0.04] p-6">
                <span className="text-sm font-semibold text-[#B84A5A]">
                  0{index + 1}
                </span>
                <h3 className="mt-8 text-lg font-semibold">{step}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="diagnostico"
        className="relative overflow-hidden bg-[#5A1320] px-5 py-16 text-white sm:px-8 sm:py-20 lg:px-12"
      >
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(90,19,32,0.98),rgba(15,15,15,0.96)_70%),radial-gradient(circle_at_85%_20%,rgba(184,74,90,0.28),transparent_34%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#F0B8C0]">
              Solicita un diagnóstico
            </p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
              Hablemos de tu proyecto.
            </h2>
            <p className="mt-5 text-base leading-8 text-zinc-200">
              Cuéntanos qué necesitas lograr y un especialista de ALFA te
              ayudará a definir el siguiente paso.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid gap-4 border border-white/10 bg-black/20 p-5 shadow-2xl shadow-black/25 backdrop-blur sm:grid-cols-2 sm:p-7"
          >
            <Field label="Nombre">
              <input
                required
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                className={fieldClassName}
                placeholder="Tu nombre"
              />
            </Field>

            <Field label="Tipo de proyecto">
              <select
                value={form.customerType}
                onChange={(event) =>
                  updateField("customerType", event.target.value)
                }
                className={fieldClassName}
              >
                <option value="residencial">Residencial</option>
                <option value="arquitecto_interiorista">
                  Despacho de Arquitectura / Interiorismo
                </option>
                <option value="comercial">Comercial</option>
                <option value="corporativo">Corporativo</option>
                <option value="industrial">Industrial</option>
              </select>
            </Field>

            <Field label="Empresa, negocio o residencia">
              <input
                value={form.company}
                onChange={(event) => updateField("company", event.target.value)}
                className={fieldClassName}
                placeholder="Nombre del lugar o empresa"
              />
            </Field>

            <Field label="Teléfono">
              <input
                required
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                className={fieldClassName}
                placeholder="Número de contacto"
                type="tel"
              />
            </Field>

            <Field label="Principal interés">
              <select
                required
                value={form.interest}
                onChange={(event) => updateField("interest", event.target.value)}
                className={fieldClassName}
              >
                <option value="">Selecciona una opción</option>
                {interestOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Tamaño aproximado del proyecto">
              <select
                required
                value={form.budgetRange}
                onChange={(event) =>
                  updateField("budgetRange", event.target.value)
                }
                className={fieldClassName}
              >
                <option value="">Selecciona una opción</option>
                {budgetRangeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="¿Qué tan pronto necesitas iniciar?" wide>
              <select
                required
                value={form.timeline}
                onChange={(event) => updateField("timeline", event.target.value)}
                className={fieldClassName}
              >
                <option value="">Selecciona una opción</option>
                {timelineOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="¿Qué te gustaría lograr o resolver?" wide>
              <textarea
                required
                value={form.service}
                onChange={(event) => updateField("service", event.target.value)}
                className={`${fieldClassName} min-h-28 resize-y`}
                placeholder="Ej. mejorar red, automatizar, seguridad, audio/video..."
              />
            </Field>

            <Field label="Mensaje" wide>
              <textarea
                value={form.message}
                onChange={(event) => updateField("message", event.target.value)}
                className={`${fieldClassName} min-h-28 resize-y`}
                placeholder="Comparte detalles, ubicación aproximada o etapa del proyecto."
              />
            </Field>

            <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
              <button
                type="submit"
                disabled={submitState === "sending"}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-[#7A1F2B] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#5A1320] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitState === "sending" ? "Enviando..." : "Enviar solicitud"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() =>
                  trackEvent("click_whatsapp", {
                    service: "home",
                    placement: "form_diagnostic",
                  })
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-[#B84A5A] hover:bg-white/5"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                WhatsApp
              </a>
            </div>

            {submitState === "success" ? (
              <p className="text-sm text-[#F0B8C0] sm:col-span-2">
                Solicitud recibida. Gracias por contactarnos.
              </p>
            ) : null}
            {submitState === "error" ? (
              <p className="text-sm text-[#F0B8C0] sm:col-span-2">
                No pudimos enviar la solicitud. Intenta nuevamente o escríbenos
                por WhatsApp.
              </p>
            ) : null}
          </form>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#0A0A0A] px-5 py-16 text-white sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo-alfa.png"
                alt="ALFA High End Services"
                width={140}
                height={70}
                className="h-10 w-auto object-contain"
              />
            </Link>
            <p className="mt-5 text-sm leading-6 text-zinc-400">
              Integración tecnológica premium llave en mano para residencias,
              empresas e industria.
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#B84A5A]">
              Zapopan, Jalisco, México
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white">
              Soluciones
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-zinc-400">
              <li>
                <Link
                  href="/servicios/iluminacion"
                  className="transition hover:text-white flex items-center gap-2"
                >
                  <span>Iluminación Arquitectónica (Lutron)</span>
                  <span className="text-[10px] text-[#F0B8C0] bg-[#7A1F2B]/40 px-1.5 py-0.2 rounded font-semibold">Top</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/servicios/audio-video"
                  className="transition hover:text-white"
                >
                  Audio & Video Profesional
                </Link>
              </li>
              <li>
                <Link
                  href="/servicios/redes"
                  className="transition hover:text-white"
                >
                  Redes e Infraestructura
                </Link>
              </li>
              <li>
                <Link
                  href="/servicios/cctv"
                  className="transition hover:text-white"
                >
                  Seguridad Electrónica y CCTV
                </Link>
              </li>
              <li>
                <Link
                  href="/servicios/control-de-acceso"
                  className="transition hover:text-white"
                >
                  Control de Acceso
                </Link>
              </li>
              <li>
                <Link href="/alfa-os" className="transition hover:text-white">
                  ALFA OS (Seguimiento)
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white">
              Sectores
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-zinc-400">
              <li>Residencial de Alto Nivel</li>
              <li>Corporativo & Oficinas</li>
              <li>Comercial & Retail</li>
              <li>Industrial & Crítico</li>
              <li>
                <Link
                  href="/arquitectos"
                  className="font-medium text-[#B84A5A] transition hover:text-[#F0B8C0]"
                >
                  Alianzas con Arquitectos →
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white">
              Contacto & Legal
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-zinc-400">
              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() =>
                    trackEvent("click_whatsapp", {
                      service: "home",
                      placement: "footer",
                    })
                  }
                  className="transition hover:text-white"
                >
                  WhatsApp Directo
                </a>
              </li>
              <li>
                <Link href="/blog" className="transition hover:text-white">
                  Blog & Novedades Técnicas
                </Link>
              </li>
              <li>
                <Link href="/login" className="transition hover:text-white">
                  Portal de Clientes
                </Link>
              </li>
              <li>
                <Link
                  href="/aviso-de-privacidad"
                  className="transition hover:text-white"
                >
                  Aviso de Privacidad
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-12 flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-zinc-500 sm:flex-row">
          <p>
            © {new Date().getFullYear()} ALFA High End Services. Todos los
            derechos reservados.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/aviso-de-privacidad"
              className="transition hover:text-zinc-400"
            >
              Aviso de Privacidad
            </Link>
            <Link href="/login" className="transition hover:text-zinc-400">
              Acceso Portal
            </Link>
          </div>
        </div>
      </footer>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Contactar por WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[#7A1F2B] text-white shadow-lg shadow-black/25 transition duration-[250ms] ease-in-out hover:-translate-y-0.5 hover:bg-[#5A1320] sm:bottom-6 sm:right-6"
      >
        <MessageCircle className="h-6 w-6" aria-hidden="true" />
      </a>
    </main>
  );
}

function SectionHeader({
  eyebrow,
  title,
  darkText = false,
}: {
  eyebrow: string;
  title: string;
  darkText?: boolean;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#B84A5A]">
        {eyebrow}
      </p>
      <h2
        className={`mt-4 text-3xl font-semibold sm:text-4xl ${
          darkText ? "text-[#0F0F0F]" : "text-white"
        }`}
      >
        {title}
      </h2>
    </div>
  );
}

function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-2 block text-sm font-medium text-zinc-300">
        {label}
      </span>
      {children}
    </label>
  );
}

const fieldClassName =
  "w-full rounded border border-white/10 bg-[#0F0F0F] px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#B84A5A] focus:ring-2 focus:ring-[#B84A5A]/20";
