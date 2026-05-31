import Link from "next/link";

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
      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/"
            className="inline-flex text-sm font-semibold uppercase tracking-[0.24em] text-[#B84A5A] transition hover:text-[#F0B8C0]"
          >
            ALFA High End Services
          </Link>
          <p className="mt-12 text-sm font-semibold uppercase tracking-[0.24em] text-[#F0B8C0]">
            {eyebrow}
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl">
            {title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
            {description}
          </p>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {points.map((point) => (
              <div
                key={point}
                className="border border-white/10 bg-white/[0.04] p-6"
              >
                <p className="text-base leading-7 text-zinc-200">{point}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/#diagnostico"
              className="inline-flex min-h-12 items-center justify-center rounded bg-[#7A1F2B] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#5A1320]"
            >
              Solicitar diagnóstico
            </Link>
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:border-[#B84A5A] hover:bg-white/5"
            >
              Volver a inicio
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
