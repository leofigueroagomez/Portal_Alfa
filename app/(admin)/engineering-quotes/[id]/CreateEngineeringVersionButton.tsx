"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase";
import { buildEngineeringQuoteNumber, versionToLetter } from "../constants";

type Props = {
  quoteId: number;
  clientNumber: number | null;
  projectNumber: number | null;
};

type EngineeringQuote = {
  id: number;
  client_id: number | null;
  client_project_id: number | null;
  attention_to: string | null;
  project_name: string | null;
  intro_text: string | null;
  selected_systems: string[] | null;
  deliverables: string[] | null;
  requirements: string[] | null;
  commercial_terms: string[] | null;
  delivery_time: string | null;
  total_mxn: number | null;
  notes: string | null;
};

export default function CreateEngineeringVersionButton({
  quoteId,
  clientNumber,
  projectNumber,
}: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

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

  async function handleCreateVersion() {
    const confirmed = window.confirm(
      "¿Crear una nueva versión de esta cotización de ingeniería?"
    );
    if (!confirmed) return;

    setCreating(true);

    const { data: quote, error: quoteError } = await supabase
      .from("engineering_quotes")
      .select("*")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      setCreating(false);
      reportError("leer ingeniería actual", quoteError || { message: "No se recibió engineering_quote" });
      return;
    }

    const source = quote as EngineeringQuote;
    const { data: maxVersion, error: versionError } = await supabase
      .from("engineering_quotes")
      .select("version")
      .eq("client_id", source.client_id)
      .eq("client_project_id", source.client_project_id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (versionError) {
      setCreating(false);
      reportError("buscar versión máxima", versionError);
      return;
    }

    const nextVersion = Number(maxVersion?.version || 0) + 1;
    const nextLetter = versionToLetter(nextVersion);
    const nextQuoteNumber = buildEngineeringQuoteNumber(
      clientNumber,
      projectNumber,
      nextVersion
    );

    const { error: latestError } = await supabase
      .from("engineering_quotes")
      .update({ is_latest: false })
      .eq("client_id", source.client_id)
      .eq("client_project_id", source.client_project_id);

    if (latestError) {
      setCreating(false);
      reportError("marcar versiones anteriores", latestError);
      return;
    }

    const { data: newQuote, error: insertError } = await supabase
      .from("engineering_quotes")
      .insert({
        quote_number: nextQuoteNumber,
        client_id: source.client_id,
        client_project_id: source.client_project_id,
        version: nextVersion,
        version_letter: nextLetter,
        status: "draft",
        attention_to: source.attention_to,
        project_name: source.project_name,
        intro_text: source.intro_text,
        selected_systems: source.selected_systems,
        deliverables: source.deliverables,
        requirements: source.requirements,
        commercial_terms: source.commercial_terms,
        delivery_time: source.delivery_time,
        total_mxn: source.total_mxn,
        notes: source.notes,
        parent_quote_id: quoteId,
        is_latest: true,
      })
      .select("id")
      .single();

    setCreating(false);

    if (insertError || !newQuote) {
      reportError("crear nueva versión", insertError || { message: "No se recibió nueva versión" });
      return;
    }

    router.push(`/engineering-quotes/${newQuote.id}`);
  }

  return (
    <button
      type="button"
      onClick={handleCreateVersion}
      disabled={creating}
      className="rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
    >
      {creating ? "Creando versión..." : "Crear nueva versión"}
    </button>
  );
}
