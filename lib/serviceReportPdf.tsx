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
  is_remote?: boolean | null;
  service_location: string | null;
  google_maps_url: string | null;
  performed_by_name: string | null;
  service_date: string | null;
  background: string | null;
  diagnosis: string | null;
  solution_status: string | null;
  solution_description: string | null;
  recommendations: string | null;
  labor_sale_mxn: number | null;
  client_signer_name: string | null;
  client_signed_at: string | null;
  client_signature_ip: string | null;
  signature_latitude?: number | null;
  signature_longitude?: number | null;
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
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-MX", {
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
  return "Pendiente";
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingHorizontal: 36,
    paddingBottom: 36,
    fontFamily: "Helvetica",
    color: "#0B0D0F",
    fontSize: 8.8,
    lineHeight: 1.3,
    backgroundColor: "#FFFFFF",
  },
  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#9E1B32",
    paddingBottom: 12,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  logo: {
    width: 105,
    maxHeight: 32,
    objectFit: "contain",
    marginBottom: 4,
  },
  eyebrow: {
    color: "#9E1B32",
    fontSize: 7.5,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: 700,
  },
  folio: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: "right",
    marginTop: 3,
    color: "#0B0D0F",
  },
  metaRight: {
    color: "#555963",
    fontSize: 8,
    textAlign: "right",
    marginTop: 2,
  },
  grid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  box: {
    flexGrow: 1,
    flexBasis: 0,
    borderWidth: 1,
    borderColor: "#E5E1DA",
    padding: 10,
    backgroundColor: "#FDFDFD",
    borderRadius: 2,
  },
  label: {
    color: "#9E1B32",
    fontSize: 7,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: 700,
    marginBottom: 3,
  },
  value: {
    fontSize: 9.8,
    fontWeight: 700,
    color: "#0B0D0F",
  },
  muted: {
    color: "#555963",
    fontSize: 8,
    marginTop: 1,
  },
  statusPill: {
    marginTop: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
    alignSelf: "flex-start",
    fontSize: 7.5,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  statusSolved: {
    backgroundColor: "#E6F4EA",
    color: "#137333",
  },
  statusPending: {
    backgroundColor: "#FEF7E0",
    color: "#B06000",
  },
  section: {
    borderTopWidth: 1,
    borderTopColor: "#E5E1DA",
    paddingTop: 10,
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: 700,
    marginBottom: 5,
    color: "#0B0D0F",
    letterSpacing: 0.5,
  },
  paragraph: {
    color: "#2C2D30",
    fontSize: 8.5,
    lineHeight: 1.35,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  photoCard: {
    width: "48.5%",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E1DA",
    padding: 5,
    backgroundColor: "#FAFAFA",
    borderRadius: 2,
  },
  photo: {
    width: "100%",
    height: 130,
    objectFit: "contain",
    backgroundColor: "#F0F0F2",
  },
  caption: {
    marginTop: 4,
    color: "#555963",
    fontSize: 7.5,
    textAlign: "center",
  },
  bankBox: {
    borderWidth: 1,
    borderColor: "#9E1B32",
    backgroundColor: "#FCF8F9",
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 2,
  },
  bankTitle: {
    fontSize: 8.5,
    fontWeight: 700,
    color: "#9E1B32",
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  bankGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#2C2D30",
  },
  signatureGrid: {
    flexDirection: "row",
    gap: 14,
    marginTop: 12,
  },
  signatureCard: {
    flexGrow: 1,
    flexBasis: 0,
    borderWidth: 1,
    borderColor: "#E5E1DA",
    padding: 10,
    backgroundColor: "#FAFAFA",
    borderRadius: 2,
  },
  signatureImage: {
    width: "100%",
    height: 52,
    objectFit: "contain",
    marginBottom: 5,
  },
  signaturePlaceholder: {
    width: "100%",
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },
  signaturePlaceholderText: {
    fontSize: 7.5,
    color: "#8E8E93",
    fontStyle: "italic",
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#0B0D0F",
    paddingTop: 4,
  },
  legalTrace: {
    marginTop: 8,
    borderLeftWidth: 2.5,
    borderLeftColor: "#9E1B32",
    paddingLeft: 8,
    paddingVertical: 3,
    backgroundColor: "#F8F8FA",
    fontSize: 7,
    color: "#555963",
    lineHeight: 1.25,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: "#E5E1DA",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#8E8E93",
  },
});

export function ServiceReportPdfDocument({
  report,
  photos,
  clientSignatureUrl,
  alfaSignatureUrl,
}: {
  report: ServiceReport;
  photos: ServicePhoto[];
  clientSignatureUrl?: string | null;
  alfaSignatureUrl?: string | null;
}) {
  const folio = report.service_number || `SERV-${String(report.id).padStart(4, "0")}`;
  const clientName = report.clients?.name || "Cliente General";
  const projectName = report.client_projects?.name || "Servicio Técnico Directo";
  const isSolved = report.solution_status === "solved";
  const totalMxn = Number(report.labor_sale_mxn || 0);

  return (
    <Document title={`Reporte de Servicio ${folio}`} author="ALFA IT Soluciones">
      {/* PÁGINA 1: DATOS, DIAGNÓSTICO, TRABAJOS Y FIRMAS */}
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
            <Text style={styles.eyebrow}>ALFA IT SOLUCIONES • REPORTE TÉCNICO</Text>
          </View>
          <View>
            <Text style={styles.folio}>{folio}</Text>
            <Text style={styles.metaRight}>Fecha: {formatDate(report.service_date)}</Text>
            <Text style={styles.metaRight}>
              Técnico: {report.performed_by_name || "Ingeniería ALFA"}
            </Text>
          </View>
        </View>

        {/* Metadatos del Cliente y Ubicación */}
        <View style={styles.grid}>
          <View style={styles.box}>
            <Text style={styles.label}>Cliente y Proyecto</Text>
            <Text style={styles.value}>{clientName}</Text>
            <Text style={styles.muted}>{projectName}</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.label}>
              {report.is_remote ? "Modalidad de Atención" : "Ubicación del Servicio"}
            </Text>
            <Text style={styles.value}>
              {report.is_remote
                ? "Soporte Remoto (Online)"
                : report.service_location || "Instalaciones del cliente"}
            </Text>
            {report.is_remote ? (
              <Text style={styles.muted}>Asistencia remota ALFA IT</Text>
            ) : report.google_maps_url ? (
              <Text style={styles.muted}>Coordenadas GPS registradas</Text>
            ) : null}
          </View>
          <View style={styles.box}>
            <Text style={styles.label}>Resultado del Servicio</Text>
            <View
              style={[
                styles.statusPill,
                isSolved ? styles.statusSolved : styles.statusPending,
              ]}
            >
              <Text>{solutionLabel(report.solution_status)}</Text>
            </View>
          </View>
        </View>

        {/* Antecedentes y Diagnóstico */}
        {report.background || report.diagnosis ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Antecedentes y Diagnóstico Técnico</Text>
            {report.background ? (
              <Text style={[styles.paragraph, { marginBottom: 4 }]}>
                <Text style={{ fontWeight: 700 }}>Motivo de la atención: </Text>
                {report.background}
              </Text>
            ) : null}
            {report.diagnosis ? (
              <Text style={styles.paragraph}>
                <Text style={{ fontWeight: 700 }}>Diagnóstico en sitio: </Text>
                {report.diagnosis}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Solución y Trabajos Realizados */}
        {report.solution_description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Trabajos y Solución Ejecutada</Text>
            <Text style={styles.paragraph}>{report.solution_description}</Text>
          </View>
        ) : null}

        {/* Recomendaciones de Mantenimiento */}
        {report.recommendations ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Recomendaciones y Cuidados</Text>
            <Text style={styles.paragraph}>{report.recommendations}</Text>
          </View>
        ) : null}

        {/* Liquidación Bancaria (Solo si Dirección definió monto) */}
        {totalMxn > 0 ? (
          <View style={styles.bankBox}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 4,
              }}
            >
              <Text style={styles.bankTitle}>
                Liquidación del Servicio: {formatMoney(totalMxn)} (+ IVA)
              </Text>
              <Text style={{ fontSize: 7, color: "#9E1B32", fontWeight: 700 }}>
                {report.payment_status === "paid" ? "PAGADO" : "PENDIENTE DE PAGO"}
              </Text>
            </View>
            <View style={styles.bankGrid}>
              <Text>
                Banco: <Text style={{ fontWeight: 700 }}>BBVA México</Text>
              </Text>
              <Text>
                Beneficiario: <Text style={{ fontWeight: 700 }}>ALFA IT Soluciones S.A. de C.V.</Text>
              </Text>
              <Text>
                CLABE: <Text style={{ fontWeight: 700 }}>012180015894123567</Text>
              </Text>
              <Text>
                Referencia: <Text style={{ fontWeight: 700 }}>{folio}</Text>
              </Text>
            </View>
          </View>
        ) : null}

        {/* Bloque de Firmas y Legalidad */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Constancia de Conformidad y Recepción</Text>
          <View style={styles.signatureGrid}>
            {/* Firma ALFA IT */}
            <View style={styles.signatureCard}>
              <Text style={styles.label}>Técnico Especialista ALFA IT</Text>
              {alfaSignatureUrl ? (
                <Image src={alfaSignatureUrl} style={styles.signatureImage} />
              ) : (
                <View style={styles.signaturePlaceholder}>
                  <Text style={styles.signaturePlaceholderText}>
                    {report.performed_by_name || "ALFA IT"}
                  </Text>
                </View>
              )}
              <View style={styles.signatureLine}>
                <Text style={styles.value}>
                  {report.performed_by_name || "Técnico Certificado"}
                </Text>
                <Text style={styles.muted}>Ingeniería y Soporte ALFA IT</Text>
              </View>
            </View>

            {/* Firma Cliente */}
            <View style={styles.signatureCard}>
              <Text style={styles.label}>Conformidad del Cliente</Text>
              {clientSignatureUrl ? (
                <Image src={clientSignatureUrl} style={styles.signatureImage} />
              ) : (
                <View style={styles.signaturePlaceholder}>
                  <Text style={styles.signaturePlaceholderText}>
                    {report.client_signed_at
                      ? "Firma Digital Registrada"
                      : "Pendiente de firma del cliente"}
                  </Text>
                </View>
              )}
              <View style={styles.signatureLine}>
                <Text style={styles.value}>
                  {report.client_signer_name || clientName}
                </Text>
                <Text style={styles.muted}>Receptor / Aceptación del servicio</Text>
              </View>
            </View>
          </View>

          {/* Trazabilidad Digital Legal */}
          {report.client_signed_at ? (
            <View style={styles.legalTrace}>
              <Text style={{ fontWeight: 700, color: "#0B0D0F", marginBottom: 2 }}>
                Constancia Legal de Firma Electrónica (NOM-151 / Código de Comercio)
              </Text>
              <Text>
                Firmante: {report.client_signer_name || clientName} • Fecha/Hora:{" "}
                {formatDateTime(report.client_signed_at)}
              </Text>
              <Text>
                Dirección IP: {report.client_signature_ip || "Registrada"}
                {report.signature_latitude
                  ? ` • GPS: ${report.signature_latitude.toFixed(5)}, ${report.signature_longitude?.toFixed(5)}`
                  : ""}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>ALFA IT SOLUCIONES • alfait.com.mx</Text>
          <Text>
            Página 1 {photos.length > 0 ? `de ${1 + Math.ceil(photos.length / 4)}` : "de 1"}
          </Text>
        </View>
      </Page>

      {/* PÁGINAS ADICIONALES: EVIDENCIAS FOTOGRÁFICAS */}
      {photos.length > 0 ? (
        <Page size="LETTER" style={styles.page}>
          <View style={styles.header}>
            <View>
              {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
              <Text style={styles.eyebrow}>EVIDENCIAS FOTOGRÁFICAS EN SITIO</Text>
            </View>
            <View>
              <Text style={styles.folio}>{folio}</Text>
              <Text style={styles.metaRight}>Cliente: {clientName}</Text>
            </View>
          </View>

          <View style={styles.photoGrid}>
            {photos.map((photo, index) => (
              <View key={photo.id} style={styles.photoCard}>
                {photo.displayUrl ? (
                  <Image src={photo.displayUrl} style={styles.photo} />
                ) : null}
                <Text style={styles.caption}>
                  {photo.caption || `Evidencia fotográfica ${index + 1}`}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <Text>ALFA IT SOLUCIONES • Evidencias de Calidad</Text>
            <Text>Página 2</Text>
          </View>
        </Page>
      ) : null}
    </Document>
  );
}

export async function generateServiceReportPdf(
  supabase: SupabaseClient,
  serviceId: number
): Promise<Buffer> {
  const [{ data: report, error }, { data: rawPhotos }] = await Promise.all([
    supabase
      .from("service_reports")
      .select(`
        id,
        service_number,
        is_remote,
        service_location,
        google_maps_url,
        performed_by_name,
        service_date,
        background,
        diagnosis,
        solution_status,
        solution_description,
        recommendations,
        labor_sale_mxn,
        client_signer_name,
        client_signed_at,
        client_signature_ip,
        signature_latitude,
        signature_longitude,
        payment_status,
        client_signature_image_url,
        alfa_signature_image_url,
        clients:client_id ( name, company_name ),
        client_projects:client_project_id ( name )
      `)
      .eq("id", serviceId)
      .single(),
    supabase
      .from("service_report_photos")
      .select("id, image_url, caption, sort_order")
      .eq("service_report_id", serviceId)
      .order("sort_order", { ascending: true }),
  ]);

  if (error || !report) {
    throw error || new Error("Servicio no encontrado");
  }

  const photos: ServicePhoto[] = await Promise.all(
    (rawPhotos || []).map(async (p) => ({
      id: p.id,
      image_url: p.image_url,
      caption: p.caption,
      displayUrl: await resolveServicePhotoUrl(supabase.storage, p.image_url),
    }))
  );

  let clientSignatureUrl: string | null = null;
  if (report.client_signature_image_url) {
    clientSignatureUrl = await resolveServicePhotoUrl(
      supabase.storage,
      report.client_signature_image_url
    );
  }

  let alfaSignatureUrl: string | null = null;
  if (report.alfa_signature_image_url) {
    alfaSignatureUrl = await resolveServicePhotoUrl(
      supabase.storage,
      report.alfa_signature_image_url
    );
  }

  const doc = (
    <ServiceReportPdfDocument
      report={report as unknown as ServiceReport}
      photos={photos}
      clientSignatureUrl={clientSignatureUrl}
      alfaSignatureUrl={alfaSignatureUrl}
    />
  );

  return renderToBuffer(doc);
}
