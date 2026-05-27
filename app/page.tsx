import Link from "next/link";
export default function Home() {
  return (
    <main className="min-h-screen bg-[#0B0B0D] text-white flex items-center justify-center">
      <section className="text-center">
        <p className="text-sm tracking-[0.4em] text-[#9E1B32] mb-4">
          ALFA IT
        </p>

        <h1 className="text-5xl font-bold mb-4">
          Portal ALFA
        </h1>

        <p className="text-[#B3B3B8] text-lg">
          Gestión de proyectos, cotizaciones y pagos.
        </p>
      </section>
    </main>
  );
}