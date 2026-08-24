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
import { resolveServicePhotoUrl } from "@/lib/serviceReports";
import { getAlfaBankAccounts } from "@/lib/bankAccounts";

const logoPath = path.join(process.cwd(), "public", "logo-print.png");
const logoSrc = fs.existsSync(logoPath) ? logoPath : null;

type ServiceReport = {
  id: number;
  service_number: string | null;
  service_location: string | null;
  google_maps_url: string | null;
  performed_by_name: string | null;
  service_date: string | null;
  background: string | null;
  diagnosis: string | null;
  solution_status: string | null;
  solution_description: string | null;
  recommendations: string | null;
  requires_parts: boolean | null;
  required_parts_notes: string | null;
  labor_sale_mxn: number | null;
  client_signer_name: string | null;
  client_signed_at: string | null;
  client_signature_ip: string | null;
  payment_status: string | null;
  clients: { name: string | null; company_name?: string | null } | null;
  client_projects: { name: string | null } | null;
};

type ServicePhoto = {
  id: number;
  image_url: string | null;
  caption: string | null;
  displayUrl: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(value || 0));
}

function solutionLabel(status: string | null | undefined) {
  if (status === "solved") return "Solucionado";
  if (status === "not_solved") return "No solucionado";
  return "En proceso / Pendiente";
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingHorizontal: 34,
    paddingBottom: 34,
    fontFamily: "Helvetica",
    color: "#111318",
    fontSize: 8.8,
    lineHeight: 1.28,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#D6D1C8",
    paddingBottom: 10,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  logo: {
    width: 96,
    maxHeight: 28,
    objectFit: "contain",
    marginBottom: 4,
  },
  eyebrow: {
    color: "#9E1B32",
    fontSize: 7.5,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontWeight: 700,
  },
  folio: {
    fontSize: 13,
    fontWeight: 700,
    textAlign: "right",
    marginTop: 3,
  },
  metaRight: {
    color: "#555963",
    fontSize: 8,
    textAlign: "right",
  },
  grid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  box: {
    flexGrow: 1,
    flexBasis: 0,
    borderWidth: 1,
    borderColor: "#E1DDD5",
    padding: 8,
    backgroundColor: "#FFFFFF",
  },
  label: {
    color: "#9E1B32",
    fontSize: 7,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontWeight: 700,
    marginBottom: 3,
  },
  value: {
    fontSize: 10,
    fontWeight: 700,
  },
  muted: {
    color: "#555963",
    fontSize: 8,
  },
  section: {
    borderTopWidth: 1,
    borderTopColor: "#E1DDD5",
    paddingTop: 8,
    marginTop: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 4,
    color: "#111318",
  },
  paragraph: {
    color: "#30343B",
    fontSize: 8.5,
    lineHeight: 1.25,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  photoCard: {
    width: "48%",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#E1DDD5",
    padding: 4,
    backgroundColor: "#FAFAFA",
  },
  photo: {
    width: "100%",
    height: 120,
    objectFit: "contain",
  },
  caption: {
    marginTop: 3,
    color: "#555963",
    fontSize: 7.5,
    textAlign: "center",
  },
  bankBox: {
    borderWidth: 1,
    borderColor: "#9E1B32",
    backgroundColor: "#FDF9FA",
    padding: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  bankTitle: {
    fontSize: 8.5,
    fontWeight: 700,
    color: "#9E1B32",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  bankGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
  },
  signatureGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  signatureCard: {
    flexGrow: 1,
    flexBasis: 0,
    borderWidth: 1,
    borderColor: "#E1DDD5",
    padding: 8,
    backgroundColor: "#FAFAFA",
  },
  signatureImage: {
    width: "100%",
    height: 48,
    objectFit: "contain",
    marginBottom: 4,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#111318",
    paddingTop: 4,
  },
  legalTrace: {
    marginTop: 6,
    borderLeftWidth: 2,
    borderLeftColor: "#9E1B32",
    paddingLeft: 6,
    paddingVertical: 2,
    backgroundColor: "#F8F8FA",
    fontSize: 7,
    color: "#555963",
  },
  footer: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#E1DDD5",
    paddingTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#77777D",
    fontSize: 7,
  },
});

export function ServiceReportPdfDocument({
  report,
  photos,
  clientSignatureUrl,
}: {
  report: ServiceReport;
  photos: ServicePhoto[];
  clientSignatureUrl?: string | null;
}) {
  const folio = report.service_number || `SERV-${String(report.id).padStart(4, "0")}`;
  const bank = getAlfaBankAccounts();
  const clientName = report.clients?.company_name || report.clients?.name || "Cliente";

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.header}>
          <View>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
            <Text style={styles.eyebrow}>Reporte de Servicio Técnico y Conformidad</Text>
          </View>
          <View>
            <Text style={styles.metaRight}>Fecha de Servicio: {formatDate(report.service_date)}</Text>
            <Text style={styles.folio}>{folio}</Text>
          </View>
        </View>

        {/* Resumen de Cliente y Proyecto */}
        <View style={styles.grid}>
          <View style={styles.box}>
            <Text style={styles.label}>Cliente Titular</Text>
            <Text style={styles.value}>{clientName}</Text>
            <Text style={styles.muted}>{report.service_location || "En sitio"}</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.label}>Proyecto / Atención</Text>
            <Text style={styles.value}>{report.client_projects?.name || "Servicio Técnico en Sitio"}</Text>
            <Text style={styles.muted}>Técnico ALFA: {report.performed_by_name || "Soporte Técnico"}</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.label}>Resultado y Cobro</Text>
            <Text style={styles.value}>{solutionLabel(report.solution_status)}</Text>
            <Text style={styles.muted}>Monto: {formatMoney(report.labor_sale_mxn)} (+ IVA)</Text>
          </View>
        </View>

        {/* Diagnóstico y Solución */}
        {[
          ["1. Antecedentes y Motivo de Solicitud", report.background],
          ["2. Diagnóstico Técnico", report.diagnosis],
          ["3. Solución y Trabajos Realizados", report.solution_description],
          ["4. Recomendaciones Técnicas", report.recommendations],
        ]
          .filter(([, text]) => Boolean(text))
          .map(([title, text]) => (
            <View key={String(title)} style={styles.section} wrap={false}>
              <Text style={styles.sectionTitle}>{title}</Text>
              <Text style={styles.paragraph}>{text}</Text>
            </View>
          ))}

        {report.requires_parts && report.required_parts_notes && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>5. Refacciones y Materiales Suministrados</Text>
            <Text style={styles.paragraph}>{report.required_parts_notes}</Text>
          </View>
        )}

        {/* Evidencias Fotográficas */}
        {photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evidencias Fotográficas del Servicio</Text>
            <View style={styles.photoGrid}>
              {photos.slice(0, 4).map((photo) => (
                <View key={photo.id} style={styles.photoCard} wrap={false}>
                  <Image src={photo.displayUrl} style={styles.photo} />
                  {photo.caption ? <Text style={styles.caption}>{photo.caption}</Text> : null}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bloque de Pago y Transferencia Bancaria */}
        <View style={styles.bankBox} wrap={false}>
          <Text style={styles.bankTitle}>Datos para Transferencia Electrónica (SPEI)</Text>
          <View style={styles.bankGrid}>
            <View>
              <Text>• Banco: {bank.bankName}</Text>
              <Text>• Beneficiario: {bank.beneficiary}</Text>
            </View>
            <View>
              <Text>• CLABE: {bank.clabe}</Text>
              <Text>• Referencia / Concepto: {folio}</Text>
            </View>
          </View>
        </View>

        {/* Firmas de Conformidad */}
        <View style={styles.signatureGrid} wrap={false}>
          <View style={styles.signatureCard}>
            <Text style={styles.label}>Por ALFA IT (Ejecución Técnica)</Text>
            <View style={{ height: 35, justifyContent: "center" }}>
              <Text style={{ fontSize: 9, fontWeight: 700 }}>{report.performed_by_name || "ALFA IT"}</Text>
            </View>
            <View style={styles.signatureLine}>
              <Text style={styles.muted}>Técnico Especialista / Operaciones</Text>
            </View>
          </View>

          <View style={styles.signatureCard}>
            <Text style={styles.label}>Por el Cliente (Recepción y Conformidad)</Text>
            {clientSignatureUrl ? (
              <Image src={clientSignatureUrl} style={styles.signatureImage} />
            ) : (
              <View style={{ height: 35, justifyContent: "center" }}>
                <Text style={styles.muted}>Firma en expediente digital</Text>
              </View>
            )}
            <View style={styles.signatureLine}>
              <Text style={styles.value}>{report.client_signer_name || clientName}</Text>
              <Text style={styles.muted}>
                {report.client_signed_at ? `Firmado el: ${formatDateTime(report.client_signed_at)}` : "Firma pendiente"}
              </Text>
            </View>
          </View>
        </View>

        {report.client_signed_at && (
          <View style={styles.legalTrace} wrap={false}>
            <Text>
              Sello Digital: Documento firmado electrónicamente vía ALFA OS. IP de origen: {report.client_signature_ip || "Registrada"}.
              Consentimiento de conformidad LFPDPPP aceptado.
            </Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>ALFA IT • Documento Oficial de Servicio y Cobranza</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function generateServiceReportPdf(
  supabase: SupabaseClient,
  serviceReportId: number
) {
  const [{ data: report, error }, { data: rawPhotos }] = await Promise.all([
    supabase
      .from("service_reports")
      .select(
        "id, service_number, service_location, google_maps_url, performed_by_name, service_date, background, diagnosis, solution_status, solution_description, recommendations, requires_parts, required_parts_notes, labor_sale_mxn, client_signer_name, client_signed_at, client_signature_ip, client_signature_image_url, payment_status, clients(name, company_name), client_projects(name)"
      )
      .eq("id", serviceReportId)
      .maybeSingle(),
    supabase
      .from("service_report_photos")
      .select("id, image_url, caption")
      .eq("service_report_id", serviceReportId)
      .order("sort_order", { ascending: true })
      .limit(6),
  ]);

  if (error || !report) {
    throw new Error("No se pudo generar el PDF del reporte de servicio.");
  }

  const photos = await Promise.all(
    ((rawPhotos || []) as Omit<ServicePhoto, "displayUrl">[]).map(async (photo) => ({
      ...photo,
      displayUrl: await resolveServicePhotoUrl(supabase.storage, photo.image_url),
    }))
  );

  let clientSignatureUrl: string | null = null;
  if (report.client_signature_image_url) {
    clientSignatureUrl = await resolveServicePhotoUrl(supabase.storage, report.client_signature_image_url);
  }

  return renderToBuffer(
    <ServiceReportPdfDocument
      report={report as unknown as ServiceReport}
      photos={photos.filter((photo) => Boolean(photo.displayUrl))}
      clientSignatureUrl={clientSignatureUrl}
    />
  );
}
