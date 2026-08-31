import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getAppBaseUrl } from "@/lib/appUrl";
import type { Interpretation, InvestigationFinding } from "./types";

/**
 * Correo aparte de la investigacion a fondo (Sprint B2). No se mezcla con el
 * brief diario: asunto propio y llega en cuanto termina la investigacion.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CONF_LABEL: Record<string, string> = {
  alta: "Confianza alta",
  media: "Confianza media",
  baja: "Confianza baja — confirmar a mano",
};

function entityUrl(finding: InvestigationFinding): string | null {
  const base = getAppBaseUrl();
  if (!base) return null;
  if (finding.entity_type === "client_project" && finding.entity_id) {
    return `${base}/projects/${finding.entity_id}/purchases`;
  }
  if (finding.entity_type === "product" && finding.entity_id) {
    return `${base}/products/${finding.entity_id}`;
  }
  if (finding.entity_type === "quote" && finding.entity_id) {
    return `${base}/quotes/${finding.entity_id}`;
  }
  return null;
}

function listBlock(title: string, items: string[]): string {
  if (!items.length) return "";
  return `
    <div style="margin-top:18px;">
      <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#77777D;font-weight:bold;">${escapeHtml(title)}</div>
      <ul style="margin:8px 0 0;padding-left:18px;color:#B3B3B8;font-size:13px;line-height:1.6;">
        ${items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}
      </ul>
    </div>`;
}

export function buildInvestigationHtml(
  finding: InvestigationFinding,
  interpretation: Interpretation,
  meta: { costUsd: number; model: string; playbook: string },
): { subject: string; html: string } {
  const link = entityUrl(finding);
  const subject = `El Vigia - Investigacion a fondo: ${finding.entity_label || finding.title}`;

  const autoBadge = interpretation.es_automatizable
    ? `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background-color:#123524;color:#8CE0B6;font-size:11px;font-weight:bold;">Automatizable</span>`
    : `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background-color:#3A2A14;color:#F4C66A;font-size:11px;font-weight:bold;">Requiere mano humana</span>`;

  const keep = interpretation.partidas_a_conservar?.length
    ? `<div style="margin-top:6px;font-size:13px;color:#8CE0B6;">Conservar: ${interpretation.partidas_a_conservar.join(", ")}</div>`
    : "";
  const drop = interpretation.partidas_a_eliminar?.length
    ? `<div style="margin-top:2px;font-size:13px;color:#F0A6A6;">Eliminar / desactivar: ${interpretation.partidas_a_eliminar.join(", ")}</div>`
    : "";

  const html = `
  <!DOCTYPE html>
  <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:20px;background-color:#0B0D0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="max-width:640px;margin:0 auto;background-color:#151518;border:1px solid #2A2A30;border-radius:16px;overflow:hidden;">
        <div style="padding:24px;border-bottom:1px solid #2A2A30;">
          <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9E1B32;font-weight:bold;">ALFA &middot; El Vigia &middot; Investigacion a fondo</div>
          <div style="font-size:19px;color:#FFFFFF;font-weight:bold;margin-top:6px;">${escapeHtml(finding.title)}</div>
          ${finding.entity_label ? `<div style="font-size:13px;color:#8CE0B6;margin-top:4px;">${escapeHtml(finding.entity_label)}</div>` : ""}
          <div style="margin-top:10px;">${autoBadge} <span style="margin-left:6px;font-size:11px;color:#77777D;">${escapeHtml(CONF_LABEL[interpretation.confianza] ?? interpretation.confianza)}</span></div>
        </div>
        <div style="padding:24px;">
          <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#77777D;font-weight:bold;">Causa raiz</div>
          <div style="font-size:14px;color:#FFFFFF;font-weight:600;margin-top:6px;line-height:1.5;">${escapeHtml(interpretation.causa_raiz)}</div>

          <div style="margin-top:18px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#77777D;font-weight:bold;">Que esta pasando</div>
          <div style="font-size:14px;color:#D8D8DC;margin-top:6px;line-height:1.6;">${escapeHtml(interpretation.explicacion)}</div>

          <div style="margin-top:18px;padding:14px;border:1px solid #2A2A30;border-radius:12px;background-color:#101114;">
            <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#9E1B32;font-weight:bold;">Accion recomendada</div>
            <div style="font-size:14px;color:#FFFFFF;margin-top:6px;line-height:1.6;">${escapeHtml(interpretation.accion_recomendada)}</div>
            ${keep}${drop}
          </div>

          ${interpretation.riesgos ? `
          <div style="margin-top:18px;">
            <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#77777D;font-weight:bold;">Riesgos</div>
            <div style="font-size:13px;color:#B3B3B8;margin-top:6px;line-height:1.6;">${escapeHtml(interpretation.riesgos)}</div>
          </div>` : ""}

          ${listBlock("Como verificar que quedo bien", interpretation.pasos_verificacion ?? [])}

          ${link ? `
          <div style="margin-top:24px;">
            <a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 18px;border-radius:999px;background-color:#9E1B32;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:bold;">Abrir en ALFA OS</a>
          </div>` : ""}
        </div>
        <div style="padding:16px 24px;background-color:#101114;border-top:1px solid #222228;color:#77777D;font-size:11px;">
          Playbook ${escapeHtml(meta.playbook)} &middot; ${escapeHtml(meta.model)} &middot; costo de esta investigacion ≈ $${meta.costUsd.toFixed(3)} USD.
          El Vigia arma el expediente con consultas de solo lectura; la conclusion es una sugerencia, no una accion aplicada.
        </div>
      </div>
    </body>
  </html>`;

  return { subject, html };
}

export async function sendInvestigationEmail(
  supabase: SupabaseClient,
  finding: InvestigationFinding,
  interpretation: Interpretation,
  meta: { costUsd: number; model: string; playbook: string; investigationId: number },
): Promise<{ sent: boolean; skipped?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.VIGIA_BRIEF_FROM || "ALFA - El Vigia <soporte@alfait.com.mx>";
  const to = (process.env.VIGIA_INVESTIGATE_TO || process.env.VIGIA_BRIEF_TO || "leo@alfait.com.mx")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  if (!apiKey) return { sent: false, skipped: "RESEND_API_KEY no configurado" };
  if (to.length === 0) return { sent: false, skipped: "sin destinatario" };

  const { subject, html } = buildInvestigationHtml(finding, interpretation, meta);

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
    throw new Error(`Resend rechazo el correo de investigacion: ${body.slice(0, 300)}`);
  }

  await supabase.from("vigia_audit_log").insert({
    event_type: "investigation_emailed",
    actor: "vigia",
    finding_id: finding.id,
    payload: { to, subject, investigation_id: meta.investigationId },
  });

  return { sent: true };
}
