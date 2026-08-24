import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

type SeoContentPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
};

export default function SeoContentPage({
  eyebrow,
  title,
  description,
  points,
}: SeoContentPageProps) {
  return (
    <main className="min-h-screen bg-[#0F0F0F] text-white">
      {/* Header Bar */}
      <header className="border-b border-white/10 px-5 py-6 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
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
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Inicio
            </Link>
            <Link
              href="/login"
              className="rounded bg-[#7A1F2B] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-[#5A1320]"
            >
              Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <p className="inline-flex items-center gap-2 border border-[#B84A5A]/40 bg-[#7A1F2B]/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#F0B8C0]">
            {eyebrow}
          </p>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl">
            {title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
            {description}
          </p>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {points.map((point) => (
              <div
                key={point}
                className="border border-white/10 bg-white/[0.04] p-6 rounded"
              >
                <p className="text-base leading-7 text-zinc-200">{point}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/#diagnostico"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-[#7A1F2B] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#5A1320]"
            >
              Solicitar diagnóstico
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-[#B84A5A] hover:bg-white/5"
            >
              Explorar otros servicios
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0A0A0A] px-5 py-8 text-center text-xs text-zinc-500 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p>© {new Date().getFullYear()} ALFA High End Services. Todos los derechos reservados.</p>
          <div className="flex items-center gap-6">
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
