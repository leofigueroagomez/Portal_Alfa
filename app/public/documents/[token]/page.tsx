import Link from "next/link";
import { getPublicDocumentLink } from "@/lib/publicDocuments";

export const dynamic = "force-dynamic";

export default async function PublicDocumentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getPublicDocumentLink(token);

  if (!result) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-6 text-white">
        <section className="mx-auto mt-20 max-w-2xl rounded-2xl border border-[#1F1F24] bg-[#151518] p-8">
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA IT</p>
          <h1 className="text-3xl font-semibold">Documento no disponible</h1>
          <p className="mt-3 text-[#B3B3B8]">
            El enlace no existe o ha expirado.
          </p>
        </section>
      </main>
    );
  }

  const { link } = result;
  const title =
    link.document_type === "project_delivery"
      ? "Acta de entrega de proyecto"
      : "Carta de garantia";

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-6 text-white">
      <section className="mx-auto mt-16 max-w-2xl rounded-2xl border border-[#1F1F24] bg-[#151518] p-8">
        <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA IT</p>
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-3 text-[#B3B3B8]">
          Documento publico de postventa. Este enlace solo permite consultar el PDF
          asociado.
        </p>
        <Link
          href={`/public/documents/${token}/pdf`}
          className="mt-8 inline-flex rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
        >
          Abrir PDF
        </Link>
      </section>
    </main>
  );
}
