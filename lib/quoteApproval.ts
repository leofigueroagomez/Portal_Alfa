import type { SupabaseClient } from "@supabase/supabase-js";
import { proposeProjectPartnerFromQuote } from "@/lib/partnerBilling";
import { syncProjectOperationalItems } from "@/lib/projectOperationalItems";
import { generateProjectSpecializedWorkOrders } from "@/lib/workOrdersAutomation";

/**
 * Misma secuencia que el botón "Aprobar versión".
 * El estado pasa a approved solo dentro de esta secuencia, junto con el
 * archivo de la versión previa, el grupo, el proyecto ganado, compras,
 * órdenes de trabajo, aviso y contrato. No es un update suelto.
 *
 * La sesión del botón aporta el uuid del usuario a las partidas operativas.
 * Ese campo es una llave a auth.users: sin sesión se guarda null. No se
 * inventa un usuario.
 */

export const QUOTE_APPROVAL_BOT_NOTE = "aprobado por bot a petición de Leonardo";

export function approvalConflictAfterMiss(
  row: { status: string | null; is_latest: boolean | null } | null
): { status: 409; error: "Already approved" | "Not the latest version" } | { status: 500; error: "Unable to process request" } {
  if (row?.status === "approved") return { status: 409, error: "Already approved" };
  if (row?.is_latest === false) return { status: 409, error: "Not the latest version" };
  return { status: 500, error: "Unable to process request" };
}

export type ApproveQuoteVersionResult =
  | { ok: true; claimed: true; warnings: string[] }
  | { ok: false; claimed: false; step?: undefined; error?: undefined }
  | { ok: false; claimed: boolean; step: string; error: unknown };

type ApproveQuoteVersionDeps = {
  syncProjectOperationalItems: typeof syncProjectOperationalItems;
  generateProjectSpecializedWorkOrders: typeof generateProjectSpecializedWorkOrders;
  proposeProjectPartnerFromQuote: typeof proposeProjectPartnerFromQuote;
};

const defaultDeps: ApproveQuoteVersionDeps = {
  syncProjectOperationalItems,
  generateProjectSpecializedWorkOrders,
  proposeProjectPartnerFromQuote,
};

export async function approveQuoteVersion(
  supabase: SupabaseClient,
  input: {
    quoteId: number;
    quoteGroupId: number;
    clientProjectId?: number | null;
    commercialPartnerId?: number | null;
    commercialPartnerName?: string | null;
    requireLatest: boolean;
    resolveActorUserId: () => Promise<string | null>;
    createContract: (quoteId: number) => Promise<unknown>;
    notify: (projectId: number, quoteId: number) => void | Promise<unknown>;
  },
  deps: ApproveQuoteVersionDeps = defaultDeps
): Promise<ApproveQuoteVersionResult> {
  const warnings: string[] = [];
  const { quoteId, quoteGroupId } = input;

  // status nulo no cumple `neq approved` en Postgres. El OR lo incluye.
  // Se reclama antes de archivar: si la versión ya no es la última, no se toca la aprobada anterior.
  let claim = supabase
    .from("quotes")
    .update({ status: "approved" })
    .eq("id", quoteId)
    .or("status.is.null,status.neq.approved");

  if (input.requireLatest) {
    claim = claim.eq("is_latest", true);
  }

  const { data: claimedRows, error: approveQuoteError } = await claim.select("id");

  if (approveQuoteError) {
    return { ok: false, claimed: false, step: "aprobar quote", error: approveQuoteError };
  }

  if (!claimedRows?.length) {
    return { ok: false, claimed: false };
  }

  const { error: archiveError } = await supabase
    .from("quotes")
    .update({ status: "archived" })
    .eq("quote_group_id", quoteGroupId)
    .eq("status", "approved")
    .neq("id", quoteId);

  if (archiveError) {
    return {
      ok: false,
      claimed: true,
      step: "archivar otras versiones aprobadas",
      error: archiveError,
    };
  }

  const { error: approveGroupError } = await supabase
    .from("quote_groups")
    .update({ approved_quote_id: quoteId })
    .eq("id", quoteGroupId);

  if (approveGroupError) {
    return {
      ok: false,
      claimed: true,
      step: "actualizar quote_groups.approved_quote_id",
      error: approveGroupError,
    };
  }

  if (input.clientProjectId) {
    const { error: projectStageError } = await supabase
      .from("client_projects")
      .update({ sales_stage: "won" })
      .eq("id", input.clientProjectId);

    if (projectStageError) {
      return {
        ok: false,
        claimed: true,
        step: "actualizar etapa de oportunidad a ganado",
        error: projectStageError,
      };
    }

    if (input.commercialPartnerId) {
      try {
        await deps.proposeProjectPartnerFromQuote(
          supabase,
          input.clientProjectId,
          input.commercialPartnerId,
          input.commercialPartnerName ?? null
        );
      } catch (partnerError) {
        warnings.push("No se pudo proponer el aliado del proyecto");
        console.warn("No se pudo proponer el aliado del proyecto:", partnerError);
      }
    }

    const actorUserId = await input.resolveActorUserId();

    try {
      await deps.syncProjectOperationalItems(supabase, input.clientProjectId, actorUserId);
    } catch (syncError) {
      warnings.push("No se pudo sincronizar base operativa al aprobar");
      console.warn("No se pudo sincronizar base operativa al aprobar:", syncError);
    }

    try {
      await deps.generateProjectSpecializedWorkOrders(
        supabase,
        input.clientProjectId,
        quoteId
      );
    } catch (odtError) {
      warnings.push("No se pudieron generar ODTs automáticas al aprobar");
      console.warn("No se pudieron generar ODTs automáticas al aprobar:", odtError);
    }

    try {
      await input.notify(input.clientProjectId, quoteId);
    } catch (notifyError) {
      warnings.push("Error enviando notificacion de cotizacion");
      console.error("Error enviando notificacion de cotizacion:", notifyError);
    }
  }

  try {
    const contractResult = await input.createContract(quoteId);
    if (
      contractResult &&
      typeof contractResult === "object" &&
      "ok" in contractResult &&
      contractResult.ok === false
    ) {
      warnings.push("No se pudo generar contrato automático al aprobar");
      console.warn("No se pudo generar contrato automático al aprobar:", contractResult);
    }
  } catch (contractError) {
    warnings.push("No se pudo generar contrato automático al aprobar");
    console.warn("No se pudo generar contrato automático al aprobar:", contractError);
  }

  return { ok: true, claimed: true, warnings };
}
