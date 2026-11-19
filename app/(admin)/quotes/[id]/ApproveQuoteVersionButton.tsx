"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase";
import { createOrGetProjectContractAction } from "@/app/(admin)/projects/[id]/contract/actions";
import { approveQuoteVersion } from "@/lib/quoteApproval";

type Props = {
  quoteId: number;
  quoteGroupId: number | null;
  clientProjectId?: number | null;
  status: string | null;
  commercialPartnerId?: number | null;
  commercialPartnerName?: string | null;
};

export default function ApproveQuoteVersionButton({
  quoteId,
  quoteGroupId,
  clientProjectId,
  status,
  commercialPartnerId = null,
  commercialPartnerName = null,
}: Props) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const isApproved = status === "approved";
  const disabled = !quoteGroupId || isApproved || approving;

  function reportStepError(step: string, error: unknown) {
    const message =
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
        ? ` ${error.message}`
        : "";

    console.error(`Error en ${step}:`, error);
    alert(`Error en ${step}: ${JSON.stringify(error)}${message}`);
  }

  async function handleApprove() {
    if (!quoteGroupId) return;

    const confirmed = window.confirm(
      "¿Aprobar esta versión de cotización?"
    );

    if (!confirmed) return;

    setApproving(true);

    const result = await approveQuoteVersion(supabase, {
      quoteId,
      quoteGroupId,
      clientProjectId,
      commercialPartnerId,
      commercialPartnerName,
      requireLatest: false,
      resolveActorUserId: async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        return user?.id || null;
      },
      createContract: (id) => createOrGetProjectContractAction(id),
      notify: (projectId, approvedQuoteId) => {
        fetch("/api/notifications/quote-approved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, quoteId: approvedQuoteId }),
        }).catch((error) => {
          console.error("Error enviando notificacion de cotizacion:", error);
        });
      },
    });

    if (!result.ok) {
      if (result.step) reportStepError(result.step, result.error);
      else alert("Esta versión ya estaba aprobada.");
      setApproving(false);
      return;
    }

    router.refresh();
    setApproving(false);
  }

  return (
    <button
      type="button"
      onClick={handleApprove}
      disabled={disabled}
      className="bg-[#1F7A4D] hover:bg-[#25945D] disabled:bg-[#151518] disabled:text-[#77777D] border border-[#2A2A30] text-white rounded-xl px-5 py-3 font-semibold"
    >
      {approving ? "Aprobando..." : "Aprobar versión"}
    </button>
  );
}
