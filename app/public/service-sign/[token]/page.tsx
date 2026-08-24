import type { Metadata } from "next";
import { getServiceSigningContext } from "@/lib/serviceSignature";
import ServiceSignClient from "./ServiceSignClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  try {
    const context = await getServiceSigningContext(token);
    const serviceNumber = context.serviceReport.service_number || `SERV-${String(context.serviceReport.id).padStart(4, "0")}`;
    const clientName = context.client?.company_name || context.client?.name || "Cliente";
    return {
      title: `Recepción y Firma de Servicio ${serviceNumber} - ${clientName} | ALFA IT`,
      description: `Revisión y firma de conformidad para el servicio técnico ${serviceNumber} de ALFA IT.`,
    };
  } catch {
    return {
      title: "Revisión de Servicio Técnico | ALFA IT",
    };
  }
}

export default async function ServiceSignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  try {
    const context = await getServiceSigningContext(token);

    return <ServiceSignClient token={token} context={context} />;
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "El enlace no es válido o ha expirado.";

    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-[#2A2A30] bg-[#151518] p-6 text-center space-y-4 shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#322514] text-[#F4C66A]">
            <svg
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold">Enlace no disponible</h1>
          <p className="text-sm text-[#B3B3B8]">{errorMessage}</p>
          <div className="pt-2 text-xs text-[#77777D]">
            Si consideras que esto es un error, por favor comunícate con tu asesor técnico de ALFA IT.
          </div>
        </div>
      </main>
    );
  }
}
