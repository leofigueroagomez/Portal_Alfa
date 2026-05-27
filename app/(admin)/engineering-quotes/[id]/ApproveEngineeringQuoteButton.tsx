"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase";

type Props = {
  quoteId: number;
  clientId: number | null;
  projectId: number | null;
  status: string | null;
};

export default function ApproveEngineeringQuoteButton({
  quoteId,
  clientId,
  projectId,
  status,
}: Props) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);
  const isApproved = status === "approved";

  function reportError(step: string, error: unknown) {
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
    const confirmed = window.confirm("¿Aprobar esta versión de ingeniería?");
    if (!confirmed) return;

    setApproving(true);

    const { error: archiveError } = await supabase
      .from("engineering_quotes")
      .update({ status: "archived" })
      .eq("client_id", clientId)
      .eq("client_project_id", projectId)
      .eq("status", "approved")
      .neq("id", quoteId);

    if (archiveError) {
      setApproving(false);
      reportError("archivar versiones aprobadas", archiveError);
      return;
    }

    const { error: approveError } = await supabase
      .from("engineering_quotes")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", quoteId);

    setApproving(false);

    if (approveError) {
      reportError("aprobar ingeniería", approveError);
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleApprove}
      disabled={approving || isApproved}
      className="rounded-xl border border-[#2A2A30] bg-[#1F7A4D] px-5 py-3 font-semibold text-white hover:bg-[#25945D] disabled:bg-[#151518] disabled:text-[#77777D]"
    >
      {approving ? "Aprobando..." : "Aprobar versión"}
    </button>
  );
}
