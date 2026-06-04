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
  const documentConfig = {
    project_delivery: {
      title: "Acta de entrega de proyecto",
      href: `/public/documents/${token}/pdf`,
      label: "Abrir PDF",
    },
    project_warranty: {
      title: "Carta de garantia",
      href: `/public/documents/${token}/pdf`,
      label: "Abrir PDF",
    },
    approved_quote: {
      title: "Cotizacion autorizada",
      href: `/public/documents/${token}/quote`,
      label: "Abrir cotizacion",
    },
    authorized_plan: {
      title: "Plano autorizado",
      href: `/public/documents/${token}/file`,
      label: "Abrir archivo",
    },
    project_invoice_pdf: {
      title: "Factura PDF",
      href: `/public/documents/${token}/pdf`,
      label: "Abrir PDF",
    },
    project_invoice_xml: {
      title: "Factura XML",
      href: `/public/documents/${token}/xml`,
      label: "Abrir XML",
    },
  }[link.document_type];

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-6 text-white">
      <section className="mx-auto mt-16 max-w-2xl rounded-2xl border border-[#1F1F24] bg-[#151518] p-8">
        <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA IT</p>
        <h1 className="text-3xl font-semibold">{documentConfig.title}</h1>
        <p className="mt-3 text-[#B3B3B8]">
          Documento publico de cliente. Este enlace solo permite consultar el
          archivo autorizado asociado.
        </p>
        <Link
          href={documentConfig.href}
          className="mt-8 inline-flex rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
        >
          {documentConfig.label}
        </Link>
      </section>
    </main>
  );
}
