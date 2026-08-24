import type { Metadata } from "next";
import { getContractBySigningToken } from "./actions";
import ClientContractSignCanvas from "./ClientContractSignCanvas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  try {
    const { contract } = await getContractBySigningToken(token);
    const projectName = (contract.client_projects as { name?: string } | null)?.name || "Proyecto";
    return {
      title: `Firma de Contrato - ${contract.contract_number} (${projectName}) | ALFA IT`,
      description: `Firma digital de conformidad para el contrato del proyecto con ALFA IT.`,
    };
  } catch {
    return {
      title: "Firma de Contrato | ALFA IT",
    };
  }
}

export default async function ContractSignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  try {
    const { contract, quoteItems } = await getContractBySigningToken(token);

    return <ClientContractSignCanvas token={token} contract={contract} quoteItems={quoteItems} />;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "El enlace no es válido o ha expirado.";

    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-[#2A2A30] bg-[#151518] p-6 text-center space-y-4 shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#322514] text-[#F4C66A]">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-white">Enlace No Disponible</h1>
          <p className="text-xs text-[#B3B3B8]">{errorMessage}</p>
        </div>
      </main>
    );
  }
}
