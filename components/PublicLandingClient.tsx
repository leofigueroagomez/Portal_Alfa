"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  FileStack,
  Headphones,
  MessageCircle,
  MonitorSpeaker,
  Network,
  Phone,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wrench,
} from "lucide-react";

const WHATSAPP_PHONE = "5210000000000";

const experienceAreas = [
  {
    title: "Residencial",
    copy: "Integración de audio, video, redes, seguridad y automatización para hogares que exigen desempeño, estética y soporte confiable.",
  },
  {
    title: "Comercial / Corporativo",
    copy: "Soluciones para espacios de trabajo, retail, salas de juntas, operación diaria y atención a clientes con tecnología estable.",
  },
  {
    title: "Industrial",
    copy: "Infraestructura, seguridad, monitoreo y soporte para entornos donde la continuidad y la trazabilidad son críticas.",
  },
];

const highEndSolutions = [
  {
    title: "Audio y video profesional",
    icon: MonitorSpeaker,
    href: "/servicios/audio-video",
  },
  { title: "Infraestructura tecnológica", icon: Network },
  { title: "Seguridad electrónica", icon: ShieldCheck },
  { title: "Automatización y control", icon: SlidersHorizontal },
  { title: "Soporte especializado", icon: Headphones },
];

const alfaOsItems = [
  { title: "Seguimiento en tiempo real", icon: ClipboardCheck },
  { title: "Evidencias organizadas", icon: Camera },
  { title: "Historial completo", icon: FileStack },
  { title: "Soporte centralizado", icon: Wrench },
];

const projectGallery = [
  {
    title: "Residencia Premium",
    description:
      "Audio, video y automatización integrados desde la etapa de diseño.",
    src: "/projects/residencia-premium.jpeg",
  },
  {
    title: "Home Cinema",
    description:
      "Experiencias audiovisuales diseñadas para disfrutarse en casa.",
    src: "/projects/cine-bw-yamaha.jpeg",
  },
  {
    title: "Audio de Referencia",
    description:
      "Sistemas de alto desempeño para quienes buscan una experiencia excepcional.",
    src: "/projects/audio-hifi-bw-mcintosh.jpeg",
  },
  {
    title: "Espacios de Escucha",
    description:
      "Integración entre diseño interior y reproducción musical de alto nivel.",
    src: "/projects/estudio-hifi.jpeg",
  },
  {
    title: "Infraestructura Tecnológica",
    description:
      "La base invisible que permite que todo funcione de forma confiable.",
    src: "/projects/rack-panduit.jpeg",
  },
];

const brandLogos = [
  {
    name: "LinkedPro",
    src: "/logos/brands/linkedpro.png",
    category: "Infraestructura",
    logoClassName: "max-h-12 max-w-[78%]",
  },
  {
    name: "Panduit",
    src: "/logos/brands/panduit.png",
    category: "Infraestructura",
    logoClassName: "max-h-11 max-w-[78%]",
  },
  {
    name: "Lutron",
    src: "/logos/brands/lutron.png",
    category: "Infraestructura",
    logoClassName: "max-h-14 max-w-[76%]",
  },
  {
    name: "Ruijie",
    src: "/logos/brands/ruijie.png",
    category: "Infraestructura",
    logoClassName: "max-h-12 max-w-[78%]",
  },
  {
    name: "Ubiquiti",
    src: "/logos/brands/ubiquiti.png",
    category: "Conectividad",
    logoClassName: "max-h-10 max-w-[46%] scale-[2]",
  },
  {
    name: "Grandstream",
    src: "/logos/brands/grandstream.png",
    category: "Conectividad",
    logoClassName: "max-h-14 max-w-[84%] scale-110",
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
    name: "Panamax",
    src: "/logos/brands/panamax.png",
    category: "Experiencias audiovisuales",
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
  "Audio y video",
  "Redes e infraestructura",
  "CCTV y seguridad",
  "Control de acceso",
  "Automatización",
  "Soporte",
  "Otro",
];

const budgetRangeOptions = [
  "Menos de $50,000",
  "$50,000 – $150,000",
  "$150,000 – $500,000",
  "Más de $500,000",
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

  const updateField = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (submitState !== "idle") setSubmitState("idle");
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("sending");

    const payload = {
      ...form,
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
      <section className="relative border-b border-white/10 px-5 py-6 sm:px-8 lg:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(184,74,90,0.24),transparent_30%),radial-gradient(circle_at_86%_2%,rgba(122,31,43,0.25),transparent_28%)]" />
        <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-alfa.png"
              alt="ALFA High End Services"
              width={160}
              height={80}
              priority
              className="h-12 w-auto object-contain"
            />
            <span className="hidden text-sm font-semibold uppercase tracking-[0.24em] text-zinc-300 sm:block">
              High End Services
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/servicios/audio-video"
              className="hidden rounded border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-[#B84A5A] hover:text-white md:inline-flex"
            >
              Servicios &gt; Audio y Video
            </Link>
            <a
              href="#diagnostico"
              className="hidden rounded border border-white/15 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-[#B84A5A] hover:text-white sm:inline-flex"
            >
              Diagnóstico
            </a>
            <Link
              href="/login"
              className="rounded bg-[#7A1F2B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#5A1320]"
            >
              Portal
            </Link>
          </div>
        </div>
      </section>

      <section className="relative px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_72%_42%,rgba(122,31,43,0.38),transparent_32%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.04fr_0.96fr]">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 border border-[#B84A5A]/40 bg-[#7A1F2B]/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#F0B8C0]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              ALFA High End Services
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              Tecnología bien implementada. Experiencias bien ejecutadas.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300 sm:text-lg">
              Diseñamos, implementamos y respaldamos soluciones tecnológicas
              para residencias, empresas e industria. Combinamos experiencia
              técnica, visión de proyecto y atención personalizada para entregar
              resultados en los que nuestros clientes pueden confiar.
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
                className="inline-flex items-center justify-center gap-2 rounded border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-[#B84A5A] hover:bg-white/5"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                WhatsApp
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

      <section className="border-y border-white/10 bg-[#151515] px-5 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Soluciones High End"
            title="Diseñamos sistemas integrados para espacios que no pueden fallar."
          />
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {highEndSolutions.map((solution) => {
              const Icon = solution.icon;
              const content = (
                <>
                  <Icon className="h-7 w-7 text-[#B84A5A]" aria-hidden="true" />
                  <h3 className="mt-8 text-base font-semibold">
                    {solution.title}
                  </h3>
                  {solution.href ? (
                    <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#F0B8C0]">
                      Conocer servicio
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  ) : null}
                </>
              );

              if (solution.href) {
                return (
                  <Link
                    key={solution.title}
                    href={solution.href}
                    className="group min-h-40 border border-white/10 bg-[#0F0F0F] p-5 transition duration-[250ms] ease-in-out hover:-translate-y-0.5 hover:border-[#B84A5A] hover:bg-white/[0.04]"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <div
                  key={solution.title}
                  className="min-h-40 border border-white/10 bg-[#0F0F0F] p-5"
                >
                  {content}
                </div>
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
            {brandLogos.map((brand) => (
              <div
                key={brand.name}
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
              </div>
            ))}
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
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#B84A5A]">
              Portfolio
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

          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {projectGallery.map((project, index) => (
              <article
                key={project.title}
                className={`group relative min-h-[360px] overflow-hidden rounded-[24px] border border-white/10 bg-[#141414] shadow-2xl shadow-black/20 ${
                  index === 0 ? "lg:row-span-2 lg:min-h-[760px]" : ""
                }`}
              >
                <Image
                  src={project.src}
                  alt={project.title}
                  fill
                  sizes={
                    index === 0
                      ? "(min-width: 1024px) 50vw, 100vw"
                      : "(min-width: 1024px) 50vw, 100vw"
                  }
                  className="object-cover transition duration-[250ms] ease-in-out group-hover:scale-[1.03]"
                  onError={() =>
                    console.warn(`Falta imagen de proyecto: ${project.src}`)
                  }
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/32 to-black/5" />
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                  <h3
                    className={`font-semibold text-white ${
                      index === 0 ? "text-3xl sm:text-4xl" : "text-2xl"
                    }`}
                  >
                    {project.title}
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-200 sm:text-base">
                    {project.description}
                  </p>
                </div>
              </article>
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
