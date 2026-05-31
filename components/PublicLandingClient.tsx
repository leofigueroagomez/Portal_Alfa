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
  MessageSquareText,
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
  { title: "Audio y video profesional", icon: MonitorSpeaker },
  { title: "Infraestructura tecnológica", icon: Network },
  { title: "Seguridad electrónica", icon: ShieldCheck },
  { title: "Automatización y control", icon: SlidersHorizontal },
  { title: "Soporte especializado", icon: Headphones },
];

const alfaOsItems = [
  { title: "Avances del proyecto", icon: ClipboardCheck },
  { title: "Evidencias fotográficas", icon: Camera },
  { title: "Cotizaciones y documentación", icon: FileStack },
  { title: "Historial de actividades", icon: CheckCircle2 },
  { title: "Solicitudes de soporte", icon: Wrench },
  { title: "Comunicación y seguimiento", icon: MessageSquareText },
];

const brandLogos = [
  { name: "LinkedPro", src: "/logos/brands/linkedpro.png" },
  { name: "Panduit", src: "/logos/brands/panduit.png" },
  { name: "Lutron", src: "/logos/brands/lutron.png" },
  { name: "Ruijie", src: "/logos/brands/ruijie.png" },
  { name: "Ubiquiti", src: "/logos/brands/ubiquiti.png" },
  { name: "Grandstream", src: "/logos/brands/grandstream.png" },
  { name: "Sonos", src: "/logos/brands/sonos.png" },
  { name: "McIntosh", src: "/logos/brands/mcintosh.png" },
  { name: "Tributaries", src: "/logos/brands/tributaries.png" },
  { name: "AudioQuest", src: "/logos/brands/audioquest.png" },
  { name: "Panamax", src: "/logos/brands/panamax.png" },
  { name: "Hikvision", src: "/logos/brands/hikvision.png" },
  { name: "DSC", src: "/logos/brands/dsc.png" },
];

const processSteps = [
  "Diagnóstico y levantamiento",
  "Diseño técnico y alcance",
  "Implementación coordinada",
  "Entrega, documentación y soporte",
];

const initialForm = {
  name: "",
  customerType: "residencial",
  company: "",
  phone: "",
  service: "",
  message: "",
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
      source: "pagina_web_alfa_high_end_services",
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

  const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
    "Hola, me gustaría solicitar un diagnóstico para un proyecto con ALFA High End Services."
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

      <section className="px-5 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Experiencia comprobada"
            title="Tres contextos, una misma exigencia: que la tecnología funcione."
          />
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {experienceAreas.map((area) => (
              <article
                key={area.title}
                className="border border-white/10 bg-white/[0.04] p-6"
              >
                <Building2
                  className="mb-8 h-7 w-7 text-[#B84A5A]"
                  aria-hidden="true"
                />
                <h3 className="text-xl font-semibold">{area.title}</h3>
                <p className="mt-4 text-sm leading-7 text-zinc-400">
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
              return (
                <div
                  key={solution.title}
                  className="min-h-40 border border-white/10 bg-[#0F0F0F] p-5"
                >
                  <Icon className="h-7 w-7 text-[#B84A5A]" aria-hidden="true" />
                  <h3 className="mt-8 text-base font-semibold">
                    {solution.title}
                  </h3>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#0F0F0F] px-5 py-16 text-white sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#B84A5A]">
              Fabricantes
            </p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
              Tecnología respaldada por marcas líderes.
            </h2>
            <p className="mt-5 text-base leading-8 text-zinc-300">
              Seleccionamos cada solución considerando desempeño, confiabilidad
              y experiencia de uso para entregar proyectos a la altura de las
              expectativas de nuestros clientes.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {brandLogos.map((brand) => (
              <div
                key={brand.name}
                className="flex h-28 items-center justify-center rounded-[24px] border border-white/[0.08] bg-[#141414] p-5 transition duration-[250ms] ease-in-out hover:-translate-y-0.5 hover:border-[#7A1F2B] sm:h-32"
              >
                <Image
                  src={brand.src}
                  alt={brand.name}
                  width={220}
                  height={90}
                  className="max-h-14 w-auto max-w-full object-contain opacity-[.85] grayscale transition duration-[250ms] ease-in-out hover:opacity-100 hover:grayscale-0"
                />
              </div>
            ))}
          </div>

          <p className="mt-8 max-w-3xl text-sm leading-7 text-zinc-400">
            Trabajamos con fabricantes reconocidos por su calidad, confiabilidad
            y desempeño para construir soluciones pensadas para durar.
          </p>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="border border-[#B84A5A]/30 bg-[#7A1F2B]/18 p-7 sm:p-9">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#F0B8C0]">
              ALFA OS
            </p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
              Tu proyecto siempre visible.
            </h2>
            <p className="mt-3 text-lg font-medium text-[#F0B8C0]">
              Transparencia total impulsada por ALFA OS.
            </p>
            <p className="mt-6 text-base leading-8 text-zinc-200">
              La mayoría de los proyectos tecnológicos tienen el mismo
              problema: el cliente no sabe qué está pasando.
            </p>
            <p className="mt-5 text-base leading-8 text-zinc-300">
              Por eso creamos ALFA OS: una plataforma donde nuestros clientes
              pueden consultar el avance, documentación, evidencias y
              seguimiento de su proyecto desde un solo lugar.
            </p>
            <p className="mt-6 border-l-2 border-[#B84A5A] pl-4 text-base font-semibold leading-7 text-white">
              Porque la confianza también se construye con transparencia.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {alfaOsItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="min-h-36 border border-white/10 bg-white/[0.035] p-6"
                >
                  <Icon className="h-6 w-6 text-[#B84A5A]" aria-hidden="true" />
                  <h3 className="mt-7 text-lg font-semibold">{item.title}</h3>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-zinc-100 px-5 py-16 text-[#0F0F0F] sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Proceso"
            title="Orden técnico, comunicación clara y ejecución documentada."
            darkText
          />
          <div className="mt-9 grid gap-4 md:grid-cols-4">
            {processSteps.map((step, index) => (
              <div key={step} className="border border-zinc-200 bg-white p-6">
                <span className="text-sm font-semibold text-[#7A1F2B]">
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
        className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12"
      >
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#B84A5A]">
              Solicita un diagnóstico
            </p>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
              Cuéntanos qué necesitas resolver.
            </h2>
            <p className="mt-5 text-base leading-8 text-zinc-400">
              Revisamos el contexto del proyecto y te orientamos sobre la mejor
              ruta técnica para avanzar con claridad.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid gap-4 border border-white/10 bg-white/[0.04] p-5 sm:grid-cols-2 sm:p-7"
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
