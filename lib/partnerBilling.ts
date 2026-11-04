import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatMissingFiscalFields,
  getMissingFiscalFields,
  type FiscalClientData,
} from "@/lib/fiscalData";

/**
 * Facturar al aliado comercial.
 *
 * Un proyecto vendido via aliado (client_projects.commercial_partner_id) se
 * factura al cliente receptor del aliado (commercial_partners.default_billing_client_id)
 * cuando el aliado tiene bill_to_partner. client_projects.client_id sigue siendo
 * el cliente final (operacion, obra, CRM).
 *
 * El receptor CFDI SIEMPRE sale de project_invoices.client_id -> clients; este
 * modulo solo decide que cliente se preselecciona y deja trazabilidad en
 * project_invoices.billed_partner_id.
 *
 * Funciones puras (sin server-only) para usarlas en el formulario, en server
 * actions y en tests/partnerBilling.test.ts.
 */

export const PARTNER_BILLING_CLIENT_FIELDS =
  "id, name, tax_rfc, tax_business_name, tax_regime, default_cfdi_use, fiscal_regime, cfdi_use, tax_zip_code, billing_email, phone";

export type PartnerBillingPartner = {
  id: number;
  commercial_name: string;
  bill_to_partner: boolean;
  default_billing_client_id: number | null;
};

export type ProjectPartnerBilling = {
  projectId: number;
  finalClientId: number | null;
  finalClientName: string | null;
  partner: PartnerBillingPartner;
  billingClient: FiscalClientData | null;
};

export type ProjectPartnerBillingMap = Record<number, ProjectPartnerBilling>;

export type InvoiceReceiverResolution =
  | {
      kind: "client";
      receiverClientId: number | null;
      partnerId: null;
    }
  | {
      kind: "partner";
      receiverClientId: number;
      partnerId: number;
      partnerName: string;
      notice: string;
    }
  | {
      kind: "partner_incomplete";
      /** Cliente receptor del aliado si existe (para corregirle datos fiscales). */
      receiverClientId: number | null;
      partnerId: number;
      partnerName: string;
      error: string;
      missingFields: string[];
    };

function isPartnerBillingEnabled(billing: ProjectPartnerBilling | null | undefined) {
  return Boolean(billing?.partner && billing.partner.bill_to_partner !== false);
}

export function getPartnerBillingNotice(input: {
  partnerName: string;
  billingClient: FiscalClientData;
  finalClientName: string | null;
}) {
  const businessName =
    input.billingClient.tax_business_name?.trim() ||
    input.billingClient.name?.trim() ||
    `Cliente #${input.billingClient.id}`;
  const rfc = input.billingClient.tax_rfc?.trim().toUpperCase() || "sin RFC";
  const finalClient = input.finalClientName?.trim() || "sin cliente final";

  return `Proyecto vendido vía aliado ${input.partnerName}: se factura a ${businessName} (${rfc}). Cliente final: ${finalClient}`;
}

/**
 * Receptor que se preselecciona al elegir un proyecto.
 * - Sin aliado (o aliado con bill_to_partner = false): el cliente del proyecto.
 * - Con aliado y receptor completo: el cliente receptor del aliado.
 * - Con aliado y receptor faltante/incompleto: error claro (no cae en silencio
 *   al cliente final, porque esa factura saldria al RFC equivocado).
 */
export function resolveInvoiceReceiver(input: {
  projectClientId: number | null;
  billing: ProjectPartnerBilling | null | undefined;
}): InvoiceReceiverResolution {
  const { billing } = input;

  if (!billing || !isPartnerBillingEnabled(billing)) {
    return { kind: "client", receiverClientId: input.projectClientId, partnerId: null };
  }

  const partner = billing.partner;
  const partnerName = partner.commercial_name?.trim() || `Aliado #${partner.id}`;

  if (!partner.default_billing_client_id) {
    return {
      kind: "partner_incomplete",
      receiverClientId: null,
      partnerId: partner.id,
      partnerName,
      missingFields: ["Cliente receptor del aliado"],
      error: `El aliado ${partnerName} no tiene cliente receptor fiscal configurado. Configuralo en Aliados comerciales o elige el receptor a mano.`,
    };
  }

  if (!billing.billingClient || billing.billingClient.id !== partner.default_billing_client_id) {
    return {
      kind: "partner_incomplete",
      receiverClientId: null,
      partnerId: partner.id,
      partnerName,
      missingFields: ["Cliente receptor del aliado"],
      error: `No se encontro el cliente receptor #${partner.default_billing_client_id} del aliado ${partnerName}. Revisa Aliados comerciales.`,
    };
  }

  const missingFields = getMissingFiscalFields(billing.billingClient);
  if (missingFields.length > 0) {
    return {
      kind: "partner_incomplete",
      receiverClientId: billing.billingClient.id,
      partnerId: partner.id,
      partnerName,
      missingFields,
      error: `El receptor fiscal del aliado ${partnerName} tiene datos incompletos: ${formatMissingFiscalFields(missingFields)}.`,
    };
  }

  return {
    kind: "partner",
    receiverClientId: billing.billingClient.id,
    partnerId: partner.id,
    partnerName,
    notice: getPartnerBillingNotice({
      partnerName,
      billingClient: billing.billingClient,
      finalClientName: billing.finalClientName,
    }),
  };
}

/**
 * billed_partner_id a guardar: solo si la factura realmente va al receptor
 * del aliado. Si el usuario cambio el receptor a mano, queda null.
 */
export function getBilledPartnerIdForInvoice(
  billing: ProjectPartnerBilling | null | undefined,
  chosenClientId: number | null
) {
  if (!billing || !isPartnerBillingEnabled(billing) || !chosenClientId) return null;
  const billingClientId = billing.partner.default_billing_client_id;
  return billingClientId && billingClientId === chosenClientId ? billing.partner.id : null;
}

/** true si el proyecto se factura al aliado y el usuario eligio otro receptor. */
export function isReceiverOverride(
  resolution: InvoiceReceiverResolution,
  chosenClientId: number | null
) {
  if (resolution.kind === "client") return false;
  if (!chosenClientId) return false;
  return resolution.receiverClientId !== chosenClientId;
}

/**
 * Proyectos que se pueden facturar al receptor elegido: los del cliente y,
 * si el receptor es el cliente de un aliado, tambien los proyectos de ese aliado.
 */
export function filterProjectsForReceiver<
  T extends { id: number; client_id: number | null },
>(projects: T[], receiverClientId: number | null, billingByProject: ProjectPartnerBillingMap) {
  if (!receiverClientId) return projects;

  return projects.filter((project) => {
    if (project.client_id === receiverClientId) return true;
    const billing = billingByProject[project.id];
    return (
      isPartnerBillingEnabled(billing) &&
      billing.partner.default_billing_client_id === receiverClientId
    );
  });
}

/**
 * Validacion server-side al timbrar. Si la factura dice que se facturo al
 * aliado, su client_id debe ser el receptor fiscal actual de ese aliado.
 * Regresa el mensaje de error o null si todo cuadra.
 */
export function validateBilledPartnerForStamp(input: {
  billedPartnerId: number | null | undefined;
  invoiceClientId: number | null | undefined;
  partner: Pick<PartnerBillingPartner, "id" | "commercial_name" | "default_billing_client_id"> | null;
}) {
  if (!input.billedPartnerId) return null;

  if (!input.partner || input.partner.id !== input.billedPartnerId) {
    return `La factura esta marcada como facturada al aliado #${input.billedPartnerId}, pero ese aliado no existe.`;
  }

  if (!input.partner.default_billing_client_id) {
    return `La factura esta marcada como facturada al aliado ${input.partner.commercial_name}, pero el aliado no tiene cliente receptor configurado.`;
  }

  if (input.partner.default_billing_client_id !== Number(input.invoiceClientId)) {
    return `La factura esta marcada como facturada al aliado ${input.partner.commercial_name}, pero su receptor (cliente #${input.invoiceClientId ?? "?"}) no es el receptor fiscal del aliado (cliente #${input.partner.default_billing_client_id}). Borra el borrador y crealo de nuevo.`;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Heredar el aliado de la cotizacion al proyecto.
// ---------------------------------------------------------------------------

/**
 * Aliado que conviene proponer al proyecto a partir de una cotizacion.
 * null = no hay nada que proponer (la cotizacion no tiene aliado o el
 * proyecto ya tiene ese mismo aliado).
 */
export function getProjectPartnerSuggestion(
  currentProjectPartnerId: number | null | undefined,
  quotePartnerId: number | null | undefined
) {
  if (!quotePartnerId) return null;
  if (currentProjectPartnerId === quotePartnerId) return null;
  return {
    partnerId: quotePartnerId,
    replacesPartnerId: currentProjectPartnerId || null,
  };
}

/**
 * Al ganar una cotizacion con aliado: pregunta (window.confirm) si el proyecto
 * se marca como vendido via ese aliado. Nunca cambia client_id.
 * Regresa true si actualizo el proyecto.
 */
export async function proposeProjectPartnerFromQuote(
  supabase: SupabaseClient,
  projectId: number,
  quotePartnerId: number,
  quotePartnerName: string | null
) {
  const { data, error } = await supabase
    .from("client_projects")
    .select("id, commercial_partner_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    if (!isMissingColumnError(error)) throw error;
    return false;
  }

  const current = (data as { commercial_partner_id: number | null } | null)?.commercial_partner_id;
  const suggestion = getProjectPartnerSuggestion(current, quotePartnerId);
  if (!suggestion || typeof window === "undefined") return false;

  const partnerName = quotePartnerName?.trim() || `aliado #${quotePartnerId}`;
  const question = suggestion.replacesPartnerId
    ? `Esta cotización es vía ${partnerName}, pero el proyecto esta marcado con otro aliado. ¿Cambiar el proyecto a ${partnerName}? Sus nuevas facturas se prepararan a nombre del receptor fiscal de ${partnerName}.`
    : `Esta cotización es vía ${partnerName}. ¿Marcar el proyecto como vendido vía ${partnerName}? Sus facturas se prepararan a nombre del receptor fiscal del aliado (el cliente final no cambia).`;

  if (!window.confirm(question)) return false;

  const { error: updateError } = await supabase
    .from("client_projects")
    .update({ commercial_partner_id: quotePartnerId, updated_at: new Date().toISOString() })
    .eq("id", projectId);

  if (updateError) throw updateError;
  return true;
}

// ---------------------------------------------------------------------------
// Backfill de client_projects.commercial_partner_id (espejo de
// scripts/backfill_project_partners.sql).
// ---------------------------------------------------------------------------

export type ProjectPartnerBackfillQuote = {
  client_project_id: number | null;
  commercial_partner_id: number | null;
  is_latest: boolean | null;
};

export type ProjectPartnerBackfillDecision =
  | "ASIGNAR"
  | "CONFLICTO"
  | "SOLO_VERSIONES_VIEJAS"
  | "YA_TIENE_ALIADO";

export type ProjectPartnerBackfillRow = {
  projectId: number;
  decision: ProjectPartnerBackfillDecision;
  partnerId: number | null;
  allPartners: number[];
  latestPartners: number[];
};

export function planProjectPartnerBackfill(
  quotes: ProjectPartnerBackfillQuote[],
  currentPartnerByProject: Record<number, number | null | undefined> = {}
): ProjectPartnerBackfillRow[] {
  const byProject = new Map<number, { all: Set<number>; latest: Set<number> }>();

  for (const quote of quotes) {
    if (!quote.client_project_id || !quote.commercial_partner_id) continue;
    const entry = byProject.get(quote.client_project_id) || {
      all: new Set<number>(),
      latest: new Set<number>(),
    };
    entry.all.add(quote.commercial_partner_id);
    if (quote.is_latest) entry.latest.add(quote.commercial_partner_id);
    byProject.set(quote.client_project_id, entry);
  }

  return [...byProject.entries()]
    .sort(([a], [b]) => a - b)
    .map(([projectId, entry]) => {
      const allPartners = [...entry.all].sort((a, b) => a - b);
      const latestPartners = [...entry.latest].sort((a, b) => a - b);
      let decision: ProjectPartnerBackfillDecision;

      if (currentPartnerByProject[projectId]) decision = "YA_TIENE_ALIADO";
      else if (allPartners.length > 1) decision = "CONFLICTO";
      else if (latestPartners.length === 0) decision = "SOLO_VERSIONES_VIEJAS";
      else decision = "ASIGNAR";

      return {
        projectId,
        decision,
        partnerId: decision === "ASIGNAR" ? latestPartners[0] : null,
        allPartners,
        latestPartners,
      };
    });
}

// ---------------------------------------------------------------------------
// Carga de datos (cliente o servidor). Tolerante a que la migracion
// 20261104130000_commercial_partner_billing.sql aun no este aplicada: en ese
// caso regresa {} y facturacion sigue funcionando como antes.
// ---------------------------------------------------------------------------

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /column .* does not exist|could not find the .* column/i.test(error.message || "")
  );
}

export async function loadProjectPartnerBilling(
  supabase: SupabaseClient,
  projectIds?: number[]
): Promise<ProjectPartnerBillingMap> {
  if (projectIds && projectIds.length === 0) return {};

  let projectsQuery = supabase
    .from("client_projects")
    .select("id, client_id, commercial_partner_id")
    .not("commercial_partner_id", "is", null);
  if (projectIds) projectsQuery = projectsQuery.in("id", projectIds);

  const { data: projectRows, error: projectsError } = await projectsQuery;
  if (projectsError) {
    if (!isMissingColumnError(projectsError)) {
      console.warn("[partnerBilling] no se pudo leer aliado de proyectos", projectsError.message);
    }
    return {};
  }

  const projects = (projectRows || []) as {
    id: number;
    client_id: number | null;
    commercial_partner_id: number;
  }[];
  if (projects.length === 0) return {};

  const partnerIds = [...new Set(projects.map((project) => project.commercial_partner_id))];
  const { data: partnerRows, error: partnersError } = await supabase
    .from("commercial_partners")
    .select("id, commercial_name, bill_to_partner, default_billing_client_id")
    .in("id", partnerIds);

  if (partnersError) {
    console.warn("[partnerBilling] no se pudo leer aliados", partnersError.message);
    return {};
  }

  const partners = new Map(
    ((partnerRows || []) as PartnerBillingPartner[]).map((partner) => [partner.id, partner])
  );
  const clientIds = [
    ...new Set(
      [
        ...projects.map((project) => project.client_id),
        ...[...partners.values()].map((partner) => partner.default_billing_client_id),
      ].filter((id): id is number => Boolean(id))
    ),
  ];
  const { data: clientRows, error: clientsError } = clientIds.length
    ? await supabase.from("clients").select(PARTNER_BILLING_CLIENT_FIELDS).in("id", clientIds)
    : { data: [], error: null };

  if (clientsError) {
    console.warn("[partnerBilling] no se pudo leer clientes receptores", clientsError.message);
  }

  const clients = new Map(
    ((clientRows || []) as FiscalClientData[]).map((client) => [client.id, client])
  );
  const result: ProjectPartnerBillingMap = {};

  for (const project of projects) {
    // Si el rol no puede leer commercial_partners (RLS: hoy finanzas no puede),
    // se marca igual como proyecto de aliado sin receptor: el formulario avisa
    // en vez de facturar en silencio al cliente final.
    const partner = partners.get(project.commercial_partner_id) || {
      id: project.commercial_partner_id,
      commercial_name: `Aliado #${project.commercial_partner_id}`,
      bill_to_partner: true,
      default_billing_client_id: null,
    };
    result[project.id] = {
      projectId: project.id,
      finalClientId: project.client_id,
      finalClientName: project.client_id ? clients.get(project.client_id)?.name || null : null,
      partner,
      billingClient: partner.default_billing_client_id
        ? clients.get(partner.default_billing_client_id) || null
        : null,
    };
  }

  return result;
}

/** Aliado de cada factura (para mostrar "via HQE"). Tolerante a migracion pendiente. */
export async function loadInvoiceBilledPartnerNames(
  supabase: SupabaseClient,
  invoiceIds: number[]
): Promise<Record<number, string>> {
  if (invoiceIds.length === 0) return {};

  const { data, error } = await supabase
    .from("project_invoices")
    .select("id, billed_partner_id")
    .in("id", invoiceIds)
    .not("billed_partner_id", "is", null);

  if (error) {
    if (!isMissingColumnError(error)) {
      console.warn("[partnerBilling] no se pudo leer aliado facturado", error.message);
    }
    return {};
  }

  const rows = (data || []) as { id: number; billed_partner_id: number }[];
  if (rows.length === 0) return {};

  const { data: partnerRows, error: partnersError } = await supabase
    .from("commercial_partners")
    .select("id, commercial_name")
    .in("id", [...new Set(rows.map((row) => row.billed_partner_id))]);

  if (partnersError) {
    console.warn("[partnerBilling] no se pudo leer aliados", partnersError.message);
    return {};
  }

  const names = new Map(
    ((partnerRows || []) as { id: number; commercial_name: string | null }[]).map(
      (partner) => [partner.id, partner.commercial_name || `Aliado #${partner.id}`]
    )
  );
  const result: Record<number, string> = {};
  for (const row of rows) {
    const name = names.get(row.billed_partner_id);
    if (name) result[row.id] = name;
  }
  return result;
}
