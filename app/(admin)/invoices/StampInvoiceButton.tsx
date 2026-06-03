"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2 } from "lucide-react";
import ClientFiscalDataModal from "@/components/ClientFiscalDataModal";
import {
  formatMissingFiscalFields,
  getCfdiUseCode,
  getFiscalRegimeCode,
  getMissingFiscalFields,
  type FiscalCatalogItem,
  type FiscalClientData,
} from "@/lib/fiscalData";
import { stampProjectInvoice } from "./actions";

type Props = {
  invoiceId: number;
  status: string | null | undefined;
  facturamaId?: string | null;
  client?: FiscalClientData | null;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "No se pudo timbrar la factura.";
}

export default function StampInvoiceButton({
  invoiceId,
  status,
  facturamaId,
  client,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [localClient, setLocalClient] = useState<FiscalClientData | null>(client || null);
  const [fiscalModalOpen, setFiscalModalOpen] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const canStamp = status === "draft" && !facturamaId;

  useEffect(() => {
    setLocalClient(client || null);
  }, [client]);

  async function getCatalogCode(endpoint: string, code: string) {
    if (!code.trim()) return null;

    const response = await fetch(`${endpoint}?code=${encodeURIComponent(code.trim())}`);
    const payload = (await response.json()) as {
      items?: FiscalCatalogItem[];
    };

    return response.ok ? payload.items?.[0] || null : null;
  }

  async function loadCatalogs() {
    const [regime, cfdiUse] = await Promise.all([
      getCatalogCode(
        "/api/sat-catalogs/fiscal-regimes",
        getFiscalRegimeCode(localClient)
      ),
      getCatalogCode("/api/sat-catalogs/cfdi-uses", getCfdiUseCode(localClient)),
    ]);

    return {
      fiscalRegimes: regime ? [regime] : [],
      cfdiUses: cfdiUse ? [cfdiUse] : [],
    };
  }

  async function handleStamp() {
    setMessage(null);
    const catalogs = await loadCatalogs();
    const currentMissing = getMissingFiscalFields(localClient, catalogs);

    if (currentMissing.length > 0) {
      setMissingFields(currentMissing);
      setMessage(`Faltan datos fiscales: ${formatMissingFiscalFields(currentMissing)}`);
      setFiscalModalOpen(true);
      return;
    }

    startTransition(async () => {
      try {
        await stampProjectInvoice(invoiceId);
        router.refresh();
      } catch (error) {
        setMessage(getErrorMessage(error));
      }
    });
  }

  if (!canStamp) {
    return (
      <span className="inline-flex rounded-full border border-[#2A2A30] bg-[#222228] px-3 py-1 text-xs text-[#77777D]">
        {facturamaId ? "Timbrada" : "No disponible"}
      </span>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleStamp}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-[#9E1B32] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
        >
          {isPending ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
          {isPending ? "Timbrando" : "Timbrar sandbox"}
        </button>
        {message ? (
          <p className="max-w-[220px] text-xs leading-5 text-[#FFB4B4]">{message}</p>
        ) : null}
      </div>
      <ClientFiscalDataModal
        client={localClient}
        open={fiscalModalOpen}
        missingFields={missingFields}
        onClose={() => setFiscalModalOpen(false)}
        onSaved={(nextClient) => {
          setLocalClient(nextClient);
          setMissingFields([]);
          setMessage(null);
        }}
      />
    </>
  );
}
