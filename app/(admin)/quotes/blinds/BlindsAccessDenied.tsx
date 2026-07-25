import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export default function BlindsAccessDenied() {
  return (
    <main className="min-h-screen bg-[#F7F6F3] px-5 py-10 text-[#111111] md:px-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/quotes/blinds"
          className="inline-flex items-center gap-2 text-sm text-black/55 transition hover:text-[#7A1F2B]"
        >
          <ArrowLeft size={16} />
          Volver a Persianas
        </Link>
        <section className="mt-10 border border-black/10 bg-white p-8 shadow-sm">
          <ShieldAlert className="text-[#7A1F2B]" size={28} />
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em]">
            Acceso de consulta
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-black/55">
            Tu perfil puede consultar cotizaciones, pero no crear ni modificar
            partidas de Persianas. Solicita apoyo a Comercial, Ingeniería o
            Dirección.
          </p>
        </section>
      </div>
    </main>
  );
}
