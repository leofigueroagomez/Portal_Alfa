"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase";

type Props = {
  quoteId: number;
  quoteGroupId: number | null;
  clientProjectId?: number | null;
  status: string | null;
};

export default function ApproveQuoteVersionButton({
  quoteId,
  quoteGroupId,
  clientProjectId,
  status,
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

    const { error: archiveError } = await supabase
      .from("quotes")
      .update({ status: "archived" })
      .eq("quote_group_id", quoteGroupId)
      .eq("status", "approved")
      .neq("id", quoteId);

    if (archiveError) {
      reportStepError("archivar otras versiones aprobadas", archiveError);
      setApproving(false);
      return;
    }

    const { error: approveQuoteError } = await supabase
      .from("quotes")
      .update({ status: "approved" })
      .eq("id", quoteId);

    if (approveQuoteError) {
      reportStepError("aprobar quote", approveQuoteError);
      setApproving(false);
      return;
    }

    const { error: approveGroupError } = await supabase
      .from("quote_groups")
      .update({ approved_quote_id: quoteId })
      .eq("id", quoteGroupId);

    if (approveGroupError) {
      reportStepError("actualizar quote_groups.approved_quote_id", approveGroupError);
      setApproving(false);
      return;
    }

    if (clientProjectId) {
      const { error: projectStageError } = await supabase
        .from("client_projects")
        .update({ sales_stage: "won" })
        .eq("id", clientProjectId);

      if (projectStageError) {
        reportStepError("actualizar etapa de oportunidad a ganado", projectStageError);
        setApproving(false);
        return;
      }

      fetch("/api/notifications/quote-approved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: clientProjectId, quoteId }),
      }).catch((error) => {
        console.error("Error enviando notificacion de cotizacion:", error);
      });
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
