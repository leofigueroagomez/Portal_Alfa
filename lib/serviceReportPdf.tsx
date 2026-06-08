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

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Number(value || 0));
}

function solutionLabel(status: string | null | undefined) {
  if (status === "solved") return "Solucionado";
  if (status === "not_solved") return "No solucionado";
  return "Pendiente";
}

const styles = StyleSheet.create({
  page: {
    padding: 34,
    fontFamily: "Helvetica",
    color: "#111318",
    fontSize: 10,
    lineHeight: 1.35,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#D6D1C8",
    paddingBottom: 14,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
  },
  logo: {
    width: 108,
    height: 32,
    objectFit: "contain",
    marginBottom: 12,
  },
  eyebrow: {
    color: "#9E1B32",
    fontSize: 8,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: 700,
  },
  folio: {
    fontSize: 18,
    fontWeight: 700,
    textAlign: "right",
  },
  metaRight: {
    color: "#555963",
    textAlign: "right",
    marginBottom: 6,
  },
  grid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  box: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E1DDD5",
    padding: 12,
  },
  label: {
    color: "#9E1B32",
    fontSize: 8,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    fontWeight: 700,
    marginBottom: 5,
  },
  value: {
    fontSize: 12,
    fontWeight: 700,
  },
  muted: {
    color: "#555963",
  },
  section: {
    borderTopWidth: 1,
    borderTopColor: "#D6D1C8",
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 14,
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 7,
  },
  paragraph: {
    color: "#555963",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  photoCard: {
    width: "48%",
    marginBottom: 8,
  },
  photo: {
    width: "100%",
    height: 150,
    objectFit: "contain",
  },
  caption: {
    marginTop: 4,
    color: "#555963",
    fontSize: 8,
  },
  footer: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: 18,
    borderTopWidth: 1,
    borderTopColor: "#E1DDD5",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#77777D",
    fontSize: 8,
  },
});

function ServiceReportPdfDocument({
  report,
  photos,
}: {
  report: ServiceReport;
  photos: ServicePhoto[];
}) {
  const folio = report.service_number || `SERV-${String(report.id).padStart(4, "0")}`;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : null}
            <Text style={styles.eyebrow}>Reporte de servicio tecnico</Text>
          </View>
          <View>
            <Text style={styles.metaRight}>Fecha: {formatDate(report.service_date)}</Text>
            <Text style={styles.folio}>{folio}</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.box}>
            <Text style={styles.label}>Cliente</Text>
            <Text style={styles.value}>{report.clients?.name || "Sin cliente"}</Text>
            <Text style={styles.muted}>{report.clients?.company_name || ""}</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.label}>Proyecto</Text>
            <Text style={styles.value}>{report.client_projects?.name || "Sin proyecto"}</Text>
            <Text style={styles.muted}>Tecnico: {report.performed_by_name || "-"}</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.box}>
            <Text style={styles.label}>Ubicacion</Text>
            <Text>{report.service_location || "-"}</Text>
            <Text style={styles.muted}>{report.google_maps_url || ""}</Text>
          </View>
          <View style={styles.box}>
            <Text style={styles.label}>Estado</Text>
            <Text style={styles.value}>{solutionLabel(report.solution_status)}</Text>
            <Text style={styles.muted}>Cargo: {formatMoney(report.labor_sale_mxn)}</Text>
          </View>
        </View>

        {[
          ["Antecedentes", report.background],
          ["Diagnostico", report.diagnosis],
          ["Trabajo realizado", report.solution_description],
          ["Recomendaciones", report.recommendations],
        ].map(([title, text]) => (
          <View key={String(title)} style={styles.section} wrap={false}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.paragraph}>{text || "-"}</Text>
          </View>
        ))}

        {report.requires_parts ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.title}>Refacciones requeridas</Text>
            <Text style={styles.paragraph}>{report.required_parts_notes || "-"}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.title}>Evidencia fotografica</Text>
          {photos.length === 0 ? (
            <Text style={styles.paragraph}>Sin evidencia fotografica.</Text>
          ) : (
            <View style={styles.photoGrid}>
              {photos.slice(0, 6).map((photo) => (
                <View key={photo.id} style={styles.photoCard} wrap={false}>
                  <Image src={photo.displayUrl} style={styles.photo} />
                  {photo.caption ? <Text style={styles.caption}>{photo.caption}</Text> : null}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>ALFA IT - Reporte de servicio</Text>
          <Text render={({ pageNumber, totalPages }) => `Pagina ${pageNumber} de ${totalPages}`} />
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
        "id, service_number, service_location, google_maps_url, performed_by_name, service_date, background, diagnosis, solution_status, solution_description, recommendations, requires_parts, required_parts_notes, labor_sale_mxn, clients(name, company_name), client_projects(name)"
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

  return renderToBuffer(
    <ServiceReportPdfDocument
      report={report as unknown as ServiceReport}
      photos={photos.filter((photo) => Boolean(photo.displayUrl))}
    />
  );
}
