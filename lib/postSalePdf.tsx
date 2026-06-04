import React from "react";
import fs from "node:fs";
import path from "node:path";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProjectDeliverySystemsForDisplay } from "@/lib/projectDeliverySystems";

const logoPath = path.join(process.cwd(), "public", "logo-print.png");
const logoSrc = fs.existsSync(logoPath) ? logoPath : null;

type ClientProject = {
  id: number;
  name: string | null;
  client_id: number | null;
  site_address?: string | null;
};

type Client = {
  name: string | null;
  company_name?: string | null;
};

type Delivery = {
  id: number;
  delivery_date: string | null;
  status: string | null;
  delivered_to_name: string | null;
  delivered_to_role: string | null;
  delivered_by_name: string | null;
  observations: string | null;
  client_signature_image_url: string | null;
  alfa_signature_image_url: string | null;
};

type Evidence = {
  id: number;
  file_url: string | null;
  caption: string | null;
  displayUrl: string;
};

type PendingItem = {
  id: number;
  description: string | null;
  status: string | null;
};

type Warranty = {
  id: number;
  warranty_date: string | null;
  installed_systems: string | null;
  equipment_warranty_months: number | null;
  equipment_warranty_start_date: string | null;
  equipment_warranty_end_date: string | null;
  installation_warranty_months: number | null;
  installation_warranty_start_date: string | null;
  installation_warranty_end_date: string | null;
  preventive_maintenance_required: boolean | null;
  preventive_maintenance_frequency_months: number | null;
  preventive_maintenance_cost_mxn: number | null;
  maintenance_policy_active: boolean | null;
  maintenance_policy_reference: string | null;
  support_email: string | null;
  alfa_representative_name: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(value || 0));
}

function splitSystems(value: string | null | undefined) {
  return (value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function addMonths(value: string | null | undefined, months: number | null | undefined) {
  if (!value || !months) return null;
  const date = new Date(`${value}T00:00:00`);
  date.setMonth(date.getMonth() + Number(months || 0));
  return date.toISOString().slice(0, 10);
}

async function resolveStorageUrl(
  supabase: SupabaseClient,
  imageUrl: string | null | undefined
) {
  if (!imageUrl) return "";
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  const bucket = supabase.storage.from("project-photos");
  const { data: signedData } = await bucket.createSignedUrl(imageUrl, 60 * 60);
  if (signedData?.signedUrl) return signedData.signedUrl;

  const { data: publicData } = bucket.getPublicUrl(imageUrl);
  return publicData.publicUrl || "";
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingHorizontal: 40,
    paddingBottom: 44,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: "#111318",
    lineHeight: 1.45,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#D6D1C8",
    paddingBottom: 14,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  brand: {
    fontSize: 18,
    fontWeight: 700,
    color: "#111318",
  },
  logo: {
    width: 112,
    maxHeight: 36,
    objectFit: "contain",
    marginBottom: 8,
  },
  eyebrow: {
    marginTop: 8,
    fontSize: 8,
    color: "#9E1B32",
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  rightHeader: {
    textAlign: "right",
    color: "#555963",
  },
  folio: {
    marginTop: 8,
    fontSize: 15,
    color: "#111318",
    fontWeight: 700,
  },
  grid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  card: {
    flexGrow: 1,
    flexBasis: 0,
    borderWidth: 1,
    borderColor: "#E1DDD5",
    padding: 12,
  },
  label: {
    fontSize: 8,
    color: "#9E1B32",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 5,
    fontWeight: 700,
  },
  value: {
    fontSize: 12,
    fontWeight: 700,
  },
  muted: {
    color: "#555963",
  },
  section: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#D6D1C8",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8,
  },
  rowBox: {
    borderWidth: 1,
    borderColor: "#E1DDD5",
    padding: 9,
    marginBottom: 6,
  },
  twoColumnWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  halfBox: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#E1DDD5",
    padding: 9,
    marginBottom: 8,
  },
  evidenceImage: {
    width: "100%",
    maxHeight: 160,
    objectFit: "contain",
    marginBottom: 6,
  },
  signatureImage: {
    width: "100%",
    height: 80,
    objectFit: "contain",
    marginBottom: 10,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#111318",
    paddingTop: 7,
    marginTop: 34,
  },
  clauseBox: {
    borderWidth: 1,
    borderColor: "#E1DDD5",
    padding: 10,
    marginTop: 10,
  },
  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 22,
    borderTopWidth: 1,
    borderTopColor: "#E1DDD5",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#77777D",
    fontSize: 8,
  },
  warrantyPage: {
    paddingTop: 26,
    paddingHorizontal: 34,
    paddingBottom: 34,
    fontFamily: "Helvetica",
    fontSize: 8.6,
    color: "#111318",
    lineHeight: 1.24,
  },
  warrantyHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#D6D1C8",
    paddingBottom: 8,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  warrantyLogo: {
    width: 98,
    maxHeight: 30,
    objectFit: "contain",
    marginBottom: 4,
  },
  warrantyEyebrow: {
    marginTop: 4,
    fontSize: 7,
    color: "#9E1B32",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  warrantyRightHeader: {
    textAlign: "right",
    color: "#555963",
    fontSize: 8,
  },
  warrantyFolio: {
    marginTop: 4,
    fontSize: 12,
    color: "#111318",
    fontWeight: 700,
  },
  warrantyGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  warrantyCard: {
    flexGrow: 1,
    flexBasis: 0,
    borderWidth: 1,
    borderColor: "#E1DDD5",
    padding: 8,
  },
  warrantyLabel: {
    fontSize: 7,
    color: "#9E1B32",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
    fontWeight: 700,
  },
  warrantyValue: {
    fontSize: 10.2,
    fontWeight: 700,
  },
  warrantyMuted: {
    color: "#555963",
    fontSize: 8,
  },
  warrantyIntro: {
    marginTop: 2,
    marginBottom: 7,
  },
  warrantyParagraph: {
    fontSize: 8.6,
    lineHeight: 1.24,
  },
  warrantySystemsBox: {
    borderLeftWidth: 2,
    borderLeftColor: "#9E1B32",
    backgroundColor: "#FAF9F6",
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 6,
    marginBottom: 2,
  },
  warrantySystemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 5,
  },
  warrantySystemItem: {
    width: "48%",
    fontSize: 8.2,
    color: "#111318",
  },
  warrantySection: {
    marginTop: 7,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#D6D1C8",
  },
  warrantySectionTitle: {
    fontSize: 10.8,
    fontWeight: 700,
    marginBottom: 4,
  },
  warrantyClause: {
    borderWidth: 1,
    borderColor: "#E1DDD5",
    backgroundColor: "#FBFAF8",
    padding: 7,
    marginTop: 5,
  },
  warrantyClauseTitle: {
    fontSize: 9.2,
    fontWeight: 700,
    marginBottom: 3,
  },
  warrantyClosingBlock: {
    marginTop: 7,
  },
  warrantySignatureGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  warrantySignatureCard: {
    flexGrow: 1,
    flexBasis: 0,
    paddingTop: 12,
  },
  warrantySignatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#111318",
    paddingTop: 5,
  },
  warrantyFooter: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#E1DDD5",
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#77777D",
    fontSize: 7,
  },
});

function PdfFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text>ALFA IT - Documento de postventa</Text>
      <Text render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} de ${totalPages}`} />
    </View>
  );
}

function WarrantyPdfFooter() {
  return (
    <View style={styles.warrantyFooter} fixed>
      <Text>ALFA IT - Carta de garantia</Text>
      <Text render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} de ${totalPages}`} />
    </View>
  );
}

export function ProjectDeliveryPdfDocument({
  delivery,
  project,
  client,
  systems,
  pendingItems,
  evidences,
  clientSignatureUrl,
  alfaSignatureUrl,
}: {
  delivery: Delivery;
  project: ClientProject | null;
  client: Client | null;
  systems: { system_name: string; notes: string | null }[];
  pendingItems: PendingItem[];
  evidences: Evidence[];
  clientSignatureUrl: string;
  alfaSignatureUrl: string;
}) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : <Text style={styles.brand}>ALFA IT</Text>}
            <Text style={styles.eyebrow}>Acta de entrega de proyecto</Text>
          </View>
          <View style={styles.rightHeader}>
            <Text>Fecha: {formatDate(delivery.delivery_date)}</Text>
            <Text style={styles.folio}>Entrega #{delivery.id}</Text>
            <Text>Estado: {delivery.status === "delivered" ? "Entregado" : "Borrador"}</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.label}>Cliente</Text>
            <Text style={styles.value}>{client?.name || "Sin cliente"}</Text>
            <Text style={styles.muted}>{client?.company_name || ""}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Proyecto</Text>
            <Text style={styles.value}>{project?.name || "Sin proyecto"}</Text>
            <Text style={styles.muted}>{project?.site_address || ""}</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.label}>Recibe</Text>
            <Text style={styles.value}>{delivery.delivered_to_name || "Sin receptor"}</Text>
            <Text style={styles.muted}>{delivery.delivered_to_role || ""}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Entrega</Text>
            <Text style={styles.value}>{delivery.delivered_by_name || "ALFA IT"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sistemas entregados</Text>
          {systems.length === 0 ? (
            <Text style={styles.muted}>Sin sistemas seleccionados.</Text>
          ) : (
            <View style={styles.twoColumnWrap}>
              {systems.map((system) => (
                <View key={system.system_name} style={styles.halfBox}>
                  <Text style={styles.value}>Sistema entregado: {system.system_name}</Text>
                  {system.notes ? <Text style={styles.muted}>{system.notes}</Text> : null}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Observaciones</Text>
          <Text style={styles.muted}>{delivery.observations || "Sin observaciones registradas."}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pendientes</Text>
          {pendingItems.length === 0 ? (
            <Text style={styles.muted}>Sin pendientes registrados.</Text>
          ) : (
            pendingItems.map((item, index) => (
              <View key={item.id} style={styles.rowBox}>
                <Text>{index + 1}. {item.description || "Pendiente"}</Text>
                <Text style={styles.muted}>
                  Estado: {item.status === "resolved" ? "Resuelto" : "Pendiente"}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Evidencias</Text>
          {evidences.length === 0 ? (
            <Text style={styles.muted}>Sin evidencias disponibles.</Text>
          ) : (
            <View style={styles.twoColumnWrap}>
              {evidences.map((evidence, index) => (
                <View key={evidence.id} style={styles.halfBox}>
                  {evidence.displayUrl ? (
                    <Image src={evidence.displayUrl} style={styles.evidenceImage} />
                  ) : null}
                  <Text style={styles.muted}>
                    {evidence.caption || `Evidencia ${index + 1}`}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.label}>Firma cliente</Text>
            {clientSignatureUrl ? <Image src={clientSignatureUrl} style={styles.signatureImage} /> : null}
            <View style={styles.signatureLine}>
              <Text>{delivery.delivered_to_name || "Cliente"}</Text>
            </View>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Firma ALFA</Text>
            {alfaSignatureUrl ? <Image src={alfaSignatureUrl} style={styles.signatureImage} /> : null}
            <View style={styles.signatureLine}>
              <Text>{delivery.delivered_by_name || "ALFA IT"}</Text>
            </View>
          </View>
        </View>
        <PdfFooter />
      </Page>
    </Document>
  );
}

export function WarrantyLetterPdfDocument({
  warranty,
  project,
  client,
  installedSystems,
}: {
  warranty: Warranty;
  project: ClientProject | null;
  client: Client | null;
  installedSystems: string[];
}) {
  const clientName = client?.company_name || client?.name || "Cliente";
  const projectName = project?.name || "Proyecto";
  const supportEmail = warranty.support_email || "soporte@alfait.com";
  const representativeName = warranty.alfa_representative_name || "ALFA IT";
  const nextMaintenanceDate = addMonths(
    warranty.installation_warranty_start_date || warranty.warranty_date,
    warranty.preventive_maintenance_frequency_months
  );
  const maintenanceFrequency = warranty.preventive_maintenance_frequency_months || 6;

  return (
    <Document>
      <Page size="LETTER" style={styles.warrantyPage}>
        <View style={styles.warrantyHeader}>
          <View>
            {logoSrc ? <Image src={logoSrc} style={styles.warrantyLogo} /> : <Text style={styles.brand}>ALFA IT</Text>}
            <Text style={styles.warrantyEyebrow}>Carta de garantia</Text>
          </View>
          <View style={styles.warrantyRightHeader}>
            <Text>Fecha: {formatDate(warranty.warranty_date)}</Text>
            <Text style={styles.warrantyFolio}>Folio GAR-{String(warranty.id).padStart(4, "0")}</Text>
          </View>
        </View>

        <View style={styles.warrantyGrid}>
          <View style={styles.warrantyCard}>
            <Text style={styles.warrantyLabel}>Cliente</Text>
            <Text style={styles.warrantyValue}>{clientName}</Text>
          </View>
          <View style={styles.warrantyCard}>
            <Text style={styles.warrantyLabel}>Proyecto</Text>
            <Text style={styles.warrantyValue}>{projectName}</Text>
            <Text style={styles.warrantyMuted}>{project?.site_address || ""}</Text>
          </View>
        </View>

        <View style={styles.warrantyIntro}>
          <Text style={styles.warrantyParagraph}>
            Por medio de la presente, ALFA IT hace constar las condiciones de garantia
            aplicables al proyecto indicado, conforme a los sistemas instalados,
            alcances ejecutados y fecha de entrega registrada.
          </Text>
          <View style={styles.warrantySystemsBox}>
            <Text style={styles.warrantyClauseTitle}>Sistemas instalados</Text>
            {installedSystems.length === 0 ? (
              <Text style={styles.warrantyMuted}>Sin sistemas registrados.</Text>
            ) : (
              <View style={styles.warrantySystemsGrid}>
                {installedSystems.map((system) => (
                  <Text key={system} style={styles.warrantySystemItem}>
                    - {system}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.warrantySection}>
          <Text style={styles.warrantySectionTitle}>1. Garantia de Equipos</Text>
          <Text style={styles.warrantyParagraph}>
            Los equipos suministrados por ALFA IT cuentan con una garantia de{" "}
            {warranty.equipment_warranty_months || 0} meses, vigente del{" "}
            {formatDate(warranty.equipment_warranty_start_date)} al{" "}
            {formatDate(warranty.equipment_warranty_end_date)}. Esta garantia se
            limita a fallas atribuibles a defectos de fabricacion o funcionamiento
            del equipo, conforme a las condiciones del fabricante.
          </Text>
          <View style={styles.warrantyClause}>
            <Text style={styles.warrantyClauseTitle}>Clausula de Gestion de Garantia en Equipos</Text>
            <Text style={styles.warrantyParagraph}>
              La gestion de garantia por parte de ALFA IT estara incluida unicamente
              durante el primer ano contado a partir de la fecha de entrega.
            </Text>
            {warranty.maintenance_policy_active ? (
              <Text style={styles.warrantyParagraph}>
                Al existir una poliza de mantenimiento vigente
                {warranty.maintenance_policy_reference
                  ? ` (${warranty.maintenance_policy_reference})`
                  : ""}
                , la gestion continuara incluida mientras dicha poliza se mantenga activa.
              </Text>
            ) : (
              <Text style={styles.warrantyParagraph}>
                Si no existe poliza de mantenimiento vigente, las visitas y mano de obra
                seran cobradas conforme a las tarifas vigentes de ALFA IT.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.warrantySection}>
          <Text style={styles.warrantySectionTitle}>2. Garantia de Instalacion</Text>
          <Text style={styles.warrantyParagraph}>
            La instalacion realizada por ALFA IT cuenta con una garantia de{" "}
            {warranty.installation_warranty_months || 0} meses, vigente del{" "}
            {formatDate(warranty.installation_warranty_start_date)} al{" "}
            {formatDate(warranty.installation_warranty_end_date)}. Esta garantia cubre
            mano de obra relacionada directamente con la instalacion ejecutada, siempre
            que los equipos y sistemas no hayan sido intervenidos, reubicados, modificados
            o manipulados por terceros.
          </Text>
          {warranty.preventive_maintenance_required ? (
            <Text style={styles.warrantyParagraph}>
              Para conservar el funcionamiento correcto de los sistemas, se requiere
              mantenimiento preventivo cada {maintenanceFrequency} meses.
              El costo registrado de mantenimiento es {formatMoney(warranty.preventive_maintenance_cost_mxn)}.
              El proximo mantenimiento sugerido es {formatDate(nextMaintenanceDate)}.
            </Text>
          ) : (
            <Text style={styles.warrantyParagraph}>
              No se registraron requisitos obligatorios de mantenimiento preventivo para esta carta.
            </Text>
          )}
        </View>

        <View style={styles.warrantyClosingBlock} wrap={false}>
          <View style={styles.warrantySection}>
            <Text style={styles.warrantySectionTitle}>3. Procedimiento de Reclamo</Text>
            <Text style={styles.warrantyParagraph}>
              Cualquier solicitud de garantia debera reportarse al correo {supportEmail},
              indicando cliente, proyecto, descripcion de la falla, evidencia fotografica
              o en video y datos de contacto para coordinacion de revision tecnica.
            </Text>
          </View>

          <View style={styles.warrantySignatureGrid} wrap={false}>
            <View style={styles.warrantySignatureCard}>
              <View style={styles.warrantySignatureLine}>
                <Text style={styles.warrantyValue}>{representativeName}</Text>
                <Text style={styles.warrantyMuted}>Representante ALFA IT</Text>
              </View>
            </View>
            <View style={styles.warrantySignatureCard}>
              <View style={styles.warrantySignatureLine}>
                <Text style={styles.warrantyValue}>{clientName}</Text>
                <Text style={styles.warrantyMuted}>Cliente</Text>
              </View>
            </View>
          </View>
        </View>
        <WarrantyPdfFooter />
      </Page>
    </Document>
  );
}

export async function generateProjectDeliveryPdf(
  supabase: SupabaseClient,
  projectId: number,
  deliveryId: number
) {
  const { data: delivery, error: deliveryError } = await supabase
    .from("project_deliveries")
    .select(
      "id, delivery_date, status, delivered_to_name, delivered_to_role, delivered_by_name, observations, client_signature_image_url, alfa_signature_image_url"
    )
    .eq("id", deliveryId)
    .eq("client_project_id", projectId)
    .maybeSingle();

  if (deliveryError || !delivery) {
    throw new Error("No se pudo generar el PDF formal de entrega.");
  }

  const deliveryData = delivery as Delivery;
  const [{ data: project }, { data: evidences }, { data: pendingItems }] = await Promise.all([
    supabase
      .from("client_projects")
      .select("id, name, client_id, site_address")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("project_delivery_evidences")
      .select("id, file_url, caption")
      .eq("project_delivery_id", deliveryId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("project_delivery_pending_items")
      .select("id, description, status")
      .eq("project_delivery_id", deliveryId)
      .order("sort_order", { ascending: true }),
  ]);
  const projectData = project as ClientProject | null;
  const { data: client } = projectData?.client_id
    ? await supabase
        .from("clients")
        .select("name, company_name")
        .eq("id", projectData.client_id)
        .maybeSingle()
    : { data: null };
  const systems = await getProjectDeliverySystemsForDisplay(supabase, projectId, deliveryId);
  const evidenceList = await Promise.all(
    ((evidences || []) as Omit<Evidence, "displayUrl">[]).map(async (evidence) => ({
      ...evidence,
      displayUrl: await resolveStorageUrl(supabase, evidence.file_url),
    }))
  );
  const [clientSignatureUrl, alfaSignatureUrl] = await Promise.all([
    resolveStorageUrl(supabase, deliveryData.client_signature_image_url),
    resolveStorageUrl(supabase, deliveryData.alfa_signature_image_url),
  ]);

  return renderToBuffer(
    <ProjectDeliveryPdfDocument
      delivery={deliveryData}
      project={projectData}
      client={client as Client | null}
      systems={systems}
      pendingItems={(pendingItems || []) as PendingItem[]}
      evidences={evidenceList}
      clientSignatureUrl={clientSignatureUrl}
      alfaSignatureUrl={alfaSignatureUrl}
    />
  );
}

export async function generateWarrantyLetterPdf(
  supabase: SupabaseClient,
  projectId: number,
  warrantyId: number
) {
  const { data: warranty, error: warrantyError } = await supabase
    .from("project_warranties")
    .select(
      "id, warranty_date, installed_systems, equipment_warranty_months, equipment_warranty_start_date, equipment_warranty_end_date, installation_warranty_months, installation_warranty_start_date, installation_warranty_end_date, preventive_maintenance_required, preventive_maintenance_frequency_months, preventive_maintenance_cost_mxn, maintenance_policy_active, maintenance_policy_reference, support_email, alfa_representative_name"
    )
    .eq("id", warrantyId)
    .eq("client_project_id", projectId)
    .maybeSingle();

  if (warrantyError || !warranty) {
    throw new Error("No se pudo generar el PDF formal de garantia.");
  }

  const warrantyData = warranty as Warranty;
  const { data: project } = await supabase
    .from("client_projects")
    .select("id, name, client_id, site_address")
    .eq("id", projectId)
    .maybeSingle();
  const projectData = project as ClientProject | null;
  const { data: client } = projectData?.client_id
    ? await supabase
        .from("clients")
        .select("name, company_name")
        .eq("id", projectData.client_id)
        .maybeSingle()
    : { data: null };
  const storedSystems = splitSystems(warrantyData.installed_systems);
  const fallbackSystems =
    storedSystems.length === 0
      ? await getProjectDeliverySystemsForDisplay(supabase, projectId)
      : [];
  const installedSystems =
    storedSystems.length > 0
      ? storedSystems
      : fallbackSystems.map((system) => system.system_name);

  return renderToBuffer(
    <WarrantyLetterPdfDocument
      warranty={warrantyData}
      project={projectData}
      client={client as Client | null}
      installedSystems={installedSystems}
    />
  );
}
