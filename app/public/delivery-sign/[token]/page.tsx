import Link from "next/link";
import { getDeliverySigningContext } from "@/lib/projectDeliverySignature";
import DeliverySignClient from "./DeliverySignClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const context = await getDeliverySigningContext(token);
  const projectName = context.project?.name || "Proyecto";

  return {
    title: `Recepción y Firma de Entrega | ${projectName} - ALFA`,
    description: `Firma digital de entrega y conformidad técnica del proyecto ${projectName}`,
  };
}

export default async function DeliverySignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const context = await getDeliverySigningContext(token);

  if (!context.isValid) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-6 text-white flex items-center justify-center">
        <section className="mx-auto max-w-lg rounded-2xl border border-[#1F1F24] bg-[#151518] p-8 text-center space-y-4 shadow-2xl">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#9E1B32] font-black text-white text-sm">
            ALFA
          </span>
          <h1 className="text-2xl font-bold text-white">Enlace No Disponible</h1>
          <p className="text-sm text-[#B3B3B8]">
            {context.errorMessage ||
              "El enlace de firma digital no existe, ha expirado o fue revocado."}
          </p>
          <p className="text-xs text-[#77777D]">
            Si consideras que esto es un error, por favor ponte en contacto con tu asesor o
            responsable de proyecto en ALFA IT.
          </p>
        </section>
      </main>
    );
  }

  return <DeliverySignClient token={token} context={context} />;
}
