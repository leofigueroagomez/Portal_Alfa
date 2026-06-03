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
  sandboxNotice?: string | null;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "No se pudo timbrar la factura.";
}

function formatDetails(details: unknown) {
  if (!details) return null;
  if (typeof details === "string") return details;

  try {
    const text = JSON.stringify(details, null, 2);
    return text.length > 1800 ? `${text.slice(0, 1800)}...` : text;
  } catch {
    return "No se pudieron mostrar los detalles tecnicos.";
  }
}

function getSandboxMissingFiscalFields(
  client: FiscalClientData | null,
  catalogs: { cfdiUses: FiscalCatalogItem[] }
) {
  const cfdiUseCode = getCfdiUseCode(client);

  if (!cfdiUseCode) return ["Uso CFDI"];

  const cfdiUse = catalogs.cfdiUses.find((item) => item.code === cfdiUseCode);
  if (!cfdiUse || !cfdiUse.is_active) return ["Uso CFDI (requiere actualizacion)"];

  return [];
}

export default function StampInvoiceButton({
  invoiceId,
  status,
  facturamaId,
  client,
  sandboxNotice,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [localClient, setLocalClient] = useState<FiscalClientData | null>(client || null);
  const [fiscalModalOpen, setFiscalModalOpen] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const canStamp = status === "draft" && !facturamaId;
  const busy = checking || isPending;

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
    setDetails(null);
    setChecking(true);

    let currentMissing: string[] = [];
    try {
      const catalogs = await loadCatalogs();
      currentMissing = sandboxNotice
        ? getSandboxMissingFiscalFields(localClient, catalogs)
        : getMissingFiscalFields(localClient, catalogs);
    } catch (error) {
      setMessage(getErrorMessage(error));
      setChecking(false);
      return;
    }

    setChecking(false);

    if (currentMissing.length > 0) {
      setMissingFields(currentMissing);
      setMessage(`Faltan datos fiscales: ${formatMissingFiscalFields(currentMissing)}`);
      setFiscalModalOpen(true);
      return;
    }

    startTransition(async () => {
      try {
        const result = await stampProjectInvoice(invoiceId);

        if (!result.ok) {
          setMessage(result.error);
          setDetails(formatDetails(result.details));
          return;
        }

        if (result.warning) {
          setMessage(result.warning);
          setDetails(formatDetails(result.details));
        }

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
        {sandboxNotice ? (
          <p className="max-w-[280px] rounded-xl border border-[#614620] bg-[#322514] p-3 text-xs leading-5 text-[#F4C66A]">
            {sandboxNotice}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleStamp}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-[#9E1B32] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
          {busy ? "Timbrando" : "Timbrar sandbox"}
        </button>
        {message ? (
          <div
            className="max-w-[280px] rounded-xl border border-[#6A2A2A] bg-[#351818] p-3 text-xs leading-5 text-[#FFB4B4]"
            aria-live="polite"
          >
            <p>{message}</p>
            {details ? (
              <details className="mt-2 text-[#F1C2C2]">
                <summary className="cursor-pointer font-semibold text-white">
                  Detalles
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/30 p-2 text-[11px] leading-4">
                  {details}
                </pre>
              </details>
            ) : null}
          </div>
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
          setDetails(null);
        }}
      />
    </>
  );
}
