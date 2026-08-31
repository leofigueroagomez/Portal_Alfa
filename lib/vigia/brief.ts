import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppBaseUrl } from "@/lib/appUrl";
import type { VigiaRunSummary } from "./types";

type BriefFinding = {
  id: number;
  sensor_id: string;
  domain: string;
  lane: string;
  severity: string;
  confidence: string;
  title: string;
  summary: string;
  impact_mxn: number | null;
  entity_type: string | null;
  entity_id: string | null;
  status: string;
  first_seen_at: string;
  last_seen_at: string;
};

const DOMAIN_LABEL: Record<string, string> = {
  integridad_datos: "Integridad de datos",
  costos_margenes: "Costos y margenes",
};

const LANE_LABEL: Record<string, string> = {
  auto_aplicado: "Aplicado",
  requiere_autorizacion: "Requiere autorizacion",
  prestar_atencion: "Prestar atencion",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(value: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);
}

function entityLink(finding: BriefFinding): string | null {
  const base = getAppBaseUrl();
  if (!base) return null;
  if (finding.entity_type === "client_project" && finding.entity_id) {
    return `${base}/projects/${finding.entity_id}/purchases`;
  }
  if (finding.entity_type === "product" && finding.entity_id) {
    return `${base}/products/${finding.entity_id}`;
  }
  return null;
}

function findingRow(finding: BriefFinding): string {
  const link = entityLink(finding);
  const impact =
    finding.impact_mxn != null && Math.abs(Number(finding.impact_mxn)) > 0
      ? `<div style="color:#F4C66A;font-size:12px;margin-top:4px;">Impacto ≈ ${money(Math.abs(Number(finding.impact_mxn)))}</div>`
      : "";
  const titleHtml = link
    ? `<a href="${escapeHtml(link)}" style="color:#FFFFFF;text-decoration:none;">${escapeHtml(finding.title)}</a>`
    : escapeHtml(finding.title);
  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #222228;">
        <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#9E1B32;font-weight:bold;">
          ${escapeHtml(finding.sensor_id)} &middot; ${escapeHtml(LANE_LABEL[finding.lane] ?? finding.lane)}
        </div>
        <div style="font-size:14px;color:#FFFFFF;font-weight:600;margin-top:4px;">${titleHtml}</div>
        <div style="font-size:13px;color:#B3B3B8;line-height:1.5;margin-top:4px;">${escapeHtml(finding.summary)}</div>
        ${impact}
      </td>
    </tr>`;
}

function section(title: string, findings: BriefFinding[]): string {
  if (findings.length === 0) return "";
  const byDomain = new Map<string, BriefFinding[]>();
  for (const finding of findings) {
    const list = byDomain.get(finding.domain) ?? [];
    list.push(finding);
    byDomain.set(finding.domain, list);
  }

  const blocks = Array.from(byDomain.entries())
    .map(
      ([domain, list]) => `
      <div style="margin-top:20px;">
        <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#77777D;font-weight:bold;">
          ${escapeHtml(DOMAIN_LABEL[domain] ?? domain)}
        </div>
        <table role="presentation" width="100%" style="border-collapse:collapse;">
          ${list.map(findingRow).join("")}
        </table>
      </div>`,
    )
    .join("");

  return `
    <div style="margin-top:28px;">
      <div style="font-size:16px;color:#FFFFFF;font-weight:bold;">${escapeHtml(title)}</div>
      ${blocks}
    </div>`;
}

export function buildBriefHtml(
  summary: VigiaRunSummary,
  findings: BriefFinding[],
): { subject: string; html: string; hasContent: boolean } {
  const applied = findings.filter((finding) => finding.lane === "auto_aplicado");
  const authorize = findings.filter((finding) => finding.lane === "requiere_autorizacion");
  const attention = findings.filter(
    (finding) => finding.lane === "prestar_atencion" && finding.confidence !== "baja",
  );
  const toConfirm = findings.filter(
    (finding) => finding.lane === "prestar_atencion" && finding.confidence === "baja",
  );

  const errors = summary.sensors.filter((sensor) => sensor.error);
  const headline =
    findings.length === 0
      ? "Sin hallazgos abiertos."
      : `${findings.length} hallazgo(s) abierto(s) &middot; ${summary.newFindings} nuevo(s) hoy &middot; impacto potencial ${money(summary.impactMxnOpen)}`;

  const subject =
    findings.length === 0
      ? "El Vigia de ALFA - sin novedades"
      : `El Vigia de ALFA - ${authorize.length} por autorizar, ${attention.length} por revisar${summary.newFindings > 0 ? ` (${summary.newFindings} nuevo/s)` : ""}`;

  const html = `
  <!DOCTYPE html>
  <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:20px;background-color:#0B0D0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="max-width:640px;margin:0 auto;background-color:#151518;border:1px solid #2A2A30;border-radius:16px;overflow:hidden;">
        <div style="padding:24px;border-bottom:1px solid #2A2A30;">
          <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9E1B32;font-weight:bold;">ALFA &middot; El Vigia</div>
          <div style="font-size:20px;color:#FFFFFF;font-weight:bold;margin-top:6px;">Brief del dia</div>
          <div style="font-size:13px;color:#B3B3B8;margin-top:6px;">${headline}</div>
        </div>
        <div style="padding:8px 24px 24px;">
          ${section("Aplicado - solo informar", applied)}
          ${section("Requiere tu autorizacion", authorize)}
          ${section("Prestar atencion", attention)}
          ${section("Senales por confirmar", toConfirm)}
          ${
            findings.length === 0
              ? '<div style="margin-top:24px;color:#77777D;font-size:14px;">Todo en orden. El Vigia reviso los frentes de integridad de datos y costos sin encontrar nada abierto.</div>'
              : ""
          }
          ${
            errors.length > 0
              ? `<div style="margin-top:24px;padding:12px;border:1px solid #614620;border-radius:10px;background-color:#322514;color:#F4C66A;font-size:12px;">
                   ${errors.length} sensor(es) con error: ${escapeHtml(errors.map((sensor) => `${sensor.id} (${sensor.error})`).join("; "))}
                 </div>`
              : ""
          }
        </div>
        <div style="padding:16px 24px;background-color:#101114;border-top:1px solid #222228;color:#77777D;font-size:11px;">
          El Vigia de ALFA OS &middot; Fase 1: integridad de datos + costos &middot; responde a este correo para ajustar sensibilidad.
        </div>
      </div>
    </body>
  </html>`;

  return { subject, html, hasContent: findings.length > 0 || errors.length > 0 };
}

async function loadOpenFindings(supabase: SupabaseClient): Promise<BriefFinding[]> {
  const { data, error } = await supabase
    .from("vigia_findings")
    .select(
      "id, sensor_id, domain, lane, severity, confidence, title, summary, impact_mxn, entity_type, entity_id, status, first_seen_at, last_seen_at",
    )
    .in("status", ["abierto", "reconocido"])
    .order("impact_mxn", { ascending: true, nullsFirst: false })
    .order("last_seen_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BriefFinding[];
}

export async function renderVigiaBrief(
  supabase: SupabaseClient,
  summary: VigiaRunSummary,
): Promise<{ subject: string; html: string; hasContent: boolean }> {
  const findings = await loadOpenFindings(supabase);
  return buildBriefHtml(summary, findings);
}

export async function sendVigiaBrief(
  supabase: SupabaseClient,
  summary: VigiaRunSummary,
): Promise<{ sent: boolean; skipped?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.VIGIA_BRIEF_FROM || "ALFA - El Vigia <soporte@alfait.com.mx>";
  const to = (process.env.VIGIA_BRIEF_TO || "leo@alfait.com.mx")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!apiKey) return { sent: false, skipped: "RESEND_API_KEY no configurado" };
  if (to.length === 0) return { sent: false, skipped: "VIGIA_BRIEF_TO vacio" };

  const findings = await loadOpenFindings(supabase);
  const { subject, html } = buildBriefHtml(summary, findings);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend rechazo el brief: ${body}`);
  }

  await supabase.from("vigia_audit_log").insert({
    event_type: "brief_sent",
    actor: "vigia",
    payload: { to, subject, findings: findings.length },
  });

  return { sent: true };
}
