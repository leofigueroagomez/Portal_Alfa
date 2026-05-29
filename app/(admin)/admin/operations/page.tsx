import RegenerateOperationalBaseButton from "./RegenerateOperationalBaseButton";

export default function AdminOperationsPage() {
  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <section className="mb-10">
        <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA OS</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Operaciones admin</h1>
        <p className="mt-3 max-w-3xl text-[#B3B3B8]">
          Herramientas de mantenimiento operativo para datos historicos y
          migraciones internas.
        </p>
      </section>

      <RegenerateOperationalBaseButton />
    </main>
  );
}
