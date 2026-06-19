import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const COMMERCIAL_PARTNER_ASSETS_BUCKET = "commercial-partner-assets";

export type CommercialPartner = {
  id: number;
  commercial_name: string;
  logo_url: string | null;
  logo_storage_path: string | null;
  primary_color: string;
  secondary_color: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
};

export type PartnerBranding = {
  name: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
};

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function isValidHexColor(value: string | null | undefined) {
  return Boolean(value && HEX_COLOR_PATTERN.test(value));
}

export function getPartnerLogoUrl(
  supabase: SupabaseClient,
  partner: Pick<CommercialPartner, "logo_url" | "logo_storage_path">
) {
  if (partner.logo_url?.trim()) return partner.logo_url.trim();
  if (!partner.logo_storage_path?.trim()) return null;

  const { data } = supabase.storage
    .from(COMMERCIAL_PARTNER_ASSETS_BUCKET)
    .getPublicUrl(partner.logo_storage_path);

  return data.publicUrl || null;
}

export function getPartnerBranding(
  supabase: SupabaseClient,
  partner: CommercialPartner | null
): PartnerBranding | null {
  if (!partner || !partner.is_active) return null;

  const logoUrl = getPartnerLogoUrl(supabase, partner);
  if (!logoUrl || !isValidHexColor(partner.primary_color)) return null;

  return {
    name: partner.commercial_name,
    logoUrl,
    primaryColor: partner.primary_color,
    secondaryColor: isValidHexColor(partner.secondary_color)
      ? partner.secondary_color || "#111111"
      : "#111111",
  };
}

export function getPartnerBrandingMissingReason(
  supabase: SupabaseClient,
  partner: CommercialPartner | null
) {
  if (!partner) return "Selecciona un aliado comercial.";
  if (!partner.is_active) return "El aliado comercial esta inactivo.";
  if (!getPartnerLogoUrl(supabase, partner)) return "El aliado no tiene logotipo.";
  if (!isValidHexColor(partner.primary_color)) {
    return "El aliado no tiene color principal valido.";
  }
  return null;
}
