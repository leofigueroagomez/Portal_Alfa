import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { resolveSimulatorViewer } from "@/lib/simuladorAudio/access";
import {
  coverageDiameter,
  rectanglePolygon,
  suggestLayout,
} from "@/lib/simuladorAudio/geometry";
import { SIMULATOR_SPEAKERS } from "@/lib/simuladorAudio/speakers";
import { SITE_URL } from "@/lib/siteUrl";
import AccessGate from "./AccessGate";
import Simulator from "./Simulator";

export const metadata: Metadata = {
  title: { absolute: "Simulador de Audio: cuántas bocinas necesita tu espacio | ALFA" },
  description:
    "Sube tu plano o escribe las medidas, elige la bocina y mira cuántas necesitas y dónde colocarlas. Simulador de cobertura con equipos KEF y Bose que instala ALFA.",
  alternates: {
    canonical: "/simulador-audio",
  },
  openGraph: {
    title: "Simulador de Audio | ALFA High End Services",
    description:
      "Diseña el sonido de tu casa o negocio sobre tu propio plano, con las bocinas que instala ALFA.",
    url: `${SITE_URL}/simulador-audio`,
    siteName: "ALFA High End Services",
    type: "website",
  },
};

const steps = [
  {
    title: "Tu espacio",
    body: "Sube el plano en PDF o imagen y marca cada área. Si no tienes plano, basta con el largo, el ancho y la altura.",
  },
  {
    title: "Tu bocina",
    body: "Elige entre los modelos de plafón que instalamos. La cobertura se calcula con el ángulo que publica cada fabricante.",
  },
  {
    title: "Tu sistema",
    body: "El simulador reparte las bocinas y te dice cuántas son. Muévelas a tu gusto y, si quieres, pide una propuesta.",
  },
];

/** Vista previa estatica, calculada con el mismo motor que el simulador. */
function CoveragePreview() {
  const width = 7;
  const length = 5;
  const scale = 60;
  const diameter = coverageDiameter(SIMULATOR_SPEAKERS[0].dispersionDeg, 2.7, 1.3);
  const speakers = suggestLayout(rectanglePolygon(width, length), diameter, "uniforme");

  return (
    <svg
      viewBox={`-20 -20 ${width * scale + 40} ${length * scale + 40}`}
      className="w-full"
      role="img"
      aria-label="Ejemplo: una sala de 7 por 5 metros cubierta con seis bocinas de plafón"
    >
      <defs>
        <clipPath id="preview-room">
          <rect width={width * scale} height={length * scale} />
        </clipPath>
      </defs>
      <rect width={width * scale} height={length * scale} fill="#FFFFFF" />
      <g clipPath="url(#preview-room)">
        {speakers.map((speaker, index) => (
          <circle
            key={index}
            cx={speaker.x * scale}
            cy={speaker.y * scale}
            r={(diameter / 2) * scale}
            fill="#9E1B32"
            fillOpacity={0.13}
            stroke="#9E1B32"
            strokeOpacity={0.35}
          />
        ))}
      </g>
      <rect
        width={width * scale}
        height={length * scale}
        fill="none"
        stroke="#111111"
        strokeWidth={1.5}
      />
      {speakers.map((speaker, index) => (
        <g key={index} transform={`translate(${speaker.x * scale} ${speaker.y * scale})`}>
          <circle r={6.5} fill="#111111" stroke="#FFFFFF" strokeWidth={1.75} />
          <circle r={2} fill="#FFFFFF" />
        </g>
      ))}
    </svg>
  );
}

export default async function SimuladorAudioPage() {
  const viewer = await resolveSimulatorViewer();
  const backLink =
    viewer?.kind === "interno"
      ? { href: "/dashboard", label: "Volver a ALFA OS" }
      : viewer?.kind === "portal"
        ? { href: "/portal", label: "Volver a mi portal" }
        : { href: "/login", label: "Portal ALFA OS" };

  return (
    <main className="min-h-screen bg-[#0A0A0C] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/60 px-5 py-5 backdrop-blur-md sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-alfa.png"
              alt="ALFA High End Services"
              width={140}
              height={70}
              priority
              className="h-10 w-auto object-contain"
            />
            <span className="hidden text-xs font-semibold uppercase tracking-[0.24em] text-zinc-300 sm:block">
              High End Services
            </span>
          </Link>
          <div className="flex items-center gap-5">
            <Link
              href="/servicios/audio-video"
              className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 transition hover:text-white sm:block"
            >
              Audio y video
            </Link>
            <Link
              href="/marcas"
              className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 transition hover:text-white sm:block"
            >
              Marcas
            </Link>
            <Link
              href={backLink.href}
              className="rounded-lg bg-[#9E1B32] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-[#B91C3C]"
            >
              {backLink.label}
            </Link>
          </div>
        </div>
      </header>

      {viewer ? (
        <>
          <section className="px-5 pb-12 pt-14 sm:px-8 sm:pt-20 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#E07A8B]">
                Simulador de audio
              </p>
              <h1 className="mt-5 max-w-3xl font-serif text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                Cuántas bocinas necesita tu espacio, y dónde van
              </h1>
            </div>
          </section>
          <Simulator viewerKind={viewer.kind} />
        </>
      ) : (
        <>
          <section className="px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-24 lg:px-12">
            <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#E07A8B]">
                  Simulador de audio
                </p>
                <h1 className="mt-6 font-serif text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
                  Diseña el sonido de tu espacio
                </h1>
                <p className="mt-6 max-w-xl text-lg font-light leading-relaxed text-zinc-400">
                  Sube tu plano o escribe las medidas, elige la bocina y mira cuántas
                  necesitas y dónde colocarlas. Con los mismos equipos que instalamos.
                </p>
                <p className="mt-10 text-sm text-zinc-500">
                  KEF · Bose · y más marcas próximamente
                </p>
              </div>
              <AccessGate />
            </div>
          </section>

          <section className="bg-[#F7F6F3] px-5 py-20 text-[#111111] sm:px-8 sm:py-28 lg:px-12">
            <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Cómo funciona
                </h2>
                <ol className="mt-10 space-y-9">
                  {steps.map((step, index) => (
                    <li key={step.title} className="flex gap-5">
                      <span className="text-sm font-semibold tabular-nums text-[#9E1B32]">
                        0{index + 1}
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold">{step.title}</h3>
                        <p className="mt-2 max-w-md text-[15px] leading-7 text-[#5F626A]">
                          {step.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <figure>
                <CoveragePreview />
                <figcaption className="mt-4 text-sm text-[#77797F]">
                  Ejemplo: una sala de 7 × 5 m con plafón a 2.70 m queda cubierta con
                  seis KEF Ci160ER.
                </figcaption>
              </figure>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
