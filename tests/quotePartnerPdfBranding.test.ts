import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommercialPartner } from "../lib/commercialPartners";
import {
  buildQuotePremiumPdfFilename,
  resolvePartnerQuotePdfBranding,
} from "../lib/quotePartnerPdfBranding";

const kybit: CommercialPartner = {
  id: 2,
  commercial_name: "Kybit",
  logo_url: "https://cdn.example/kybit.png",
  logo_storage_path: null,
  primary_color: "#112233",
  secondary_color: "#445566",
  contact_name: null,
  contact_email: null,
  contact_phone: null,
  is_active: true,
};

function clientFor(options: {
  quote: { is_partner_quote: boolean | null; commercial_partner_id: number | null } | null;
  partner?: CommercialPartner | null;
}) {
  const tables: string[] = [];
  const selects: string[] = [];
  const client = {
    from(table: string) {
      tables.push(table);
      return {
        select(columns: string) {
          selects.push(`${table}:${columns}`);
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle: async () => ({
          data: table === "quotes" ? options.quote : (options.partner ?? null),
        }),
      };
    },
    storage: {
      from() {
        return { getPublicUrl: () => ({ data: { publicUrl: "" } }) };
      },
    },
  };

  return { client: client as unknown as SupabaseClient, tables, selects };
}

const snapshot = {
  quote: { id: 261, quoteNumber: "ALFA-0199-V1", isPartnerQuote: true },
  client: { companyName: "Kybit", name: "Kybit" },
};

test("el nombre distingue formato ALFA y marca de aliado", () => {
  assert.equal(
    buildQuotePremiumPdfFilename(snapshot, null, "2026-11-10"),
    "Cotizacion-ALFA-0199-V1-Kybit-2026-11-10-ALFA"
  );
  assert.equal(
    buildQuotePremiumPdfFilename(
      snapshot,
      { name: "Kybit", logoUrl: "https://cdn.example/kybit.png", primaryColor: "#112233", secondaryColor: "#445566" },
      "2026-11-10"
    ),
    "Cotizacion-ALFA-0199-V1-Kybit-2026-11-10-Aliado"
  );
  assert.equal(
    buildQuotePremiumPdfFilename(
      {
        quote: { id: 258, quoteNumber: "ALFA-0196-V1", isPartnerQuote: false },
        client: { companyName: null, name: "Cliente" },
      },
      undefined,
      "2026-11-10"
    ),
    "Cotizacion-ALFA-0196-V1-Cliente-2026-11-10"
  );
});

test("261 aliado Kybit resuelve marca blanca con descuento oculto", async () => {
  const { client, tables, selects } = clientFor({
    quote: { is_partner_quote: true, commercial_partner_id: 2 },
    partner: kybit,
  });
  const resolved = await resolvePartnerQuotePdfBranding(client, 261);

  assert.equal(resolved.ok, true);
  if (!resolved.ok) return;
  assert.equal(resolved.branding.hidePartnerDiscount, true);
  assert.equal(resolved.branding.name, "Kybit");
  assert.equal(resolved.branding.logoUrl, "https://cdn.example/kybit.png");
  assert.equal(resolved.branding.primaryColor, "#112233");
  assert.equal(resolved.branding.secondaryColor, "#445566");
  assert.deepEqual(tables, ["quotes", "commercial_partners"]);
  assert.equal(
    selects.some((entry) => entry.startsWith("quotes:is_partner_quote, commercial_partner_id")),
    true
  );
  assert.equal(selects.some((entry) => entry.includes("logo_storage_path")), true);
});

test("sin aliado, inactivo o sin logo responde 4xx y no inventa marca", async () => {
  const direct = clientFor({
    quote: { is_partner_quote: false, commercial_partner_id: null },
  });
  const notPartner = await resolvePartnerQuotePdfBranding(direct.client, 258);
  assert.deepEqual(notPartner, {
    ok: false,
    status: 400,
    error: "Bad Request",
    reason: "not_partner_quote",
  });
  assert.deepEqual(direct.tables, ["quotes"]);

  const missingPartner = await resolvePartnerQuotePdfBranding(
    clientFor({ quote: { is_partner_quote: true, commercial_partner_id: null } }).client,
    261
  );
  assert.equal(missingPartner.ok, false);
  if (missingPartner.ok) return;
  assert.equal(missingPartner.status, 422);
  assert.equal(missingPartner.error, "Selecciona un aliado comercial.");

  const inactive = await resolvePartnerQuotePdfBranding(
    clientFor({
      quote: { is_partner_quote: true, commercial_partner_id: 2 },
      partner: { ...kybit, is_active: false },
    }).client,
    261
  );
  assert.equal(inactive.ok, false);
  if (inactive.ok) return;
  assert.equal(inactive.status, 422);
  assert.equal(inactive.error, "El aliado comercial esta inactivo.");

  const noLogo = await resolvePartnerQuotePdfBranding(
    clientFor({
      quote: { is_partner_quote: true, commercial_partner_id: 1 },
      partner: { ...kybit, id: 1, commercial_name: "HQE", logo_url: null, logo_storage_path: null },
    }).client,
    261
  );
  assert.equal(noLogo.ok, false);
  if (noLogo.ok) return;
  assert.equal(noLogo.status, 422);
  assert.equal(noLogo.error, "El aliado no tiene logotipo.");
});
