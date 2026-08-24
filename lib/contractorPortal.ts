import "server-only";

import { notFound, redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/services/supabaseServer";

export type ContractorPortalUser = {
  id: number;
  user_id: string;
  contractor_id: number;
  is_active: boolean;
};

export type ContractorInfo = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  specialty: string | null;
};

export type ContractorSignedAgreement = {
  id: number;
  contractor_id: number;
  contractor_portal_user_id: number | null;
  user_id: string | null;
  service_regime?: "independent_technician" | "specialized_contractor" | string | null;
  person_type?: string | null;
  legal_business_name?: string | null;
  signer_name: string;
  signer_rfc: string | null;
  signer_curp: string | null;
  signer_phone: string | null;
  signer_email?: string | null;
  fiscal_address?: string | null;
  representative_name?: string | null;
  representative_powers?: string | null;
  signer_role: string | null;
  has_repse?: boolean | null;
  repse_number?: string | null;
  repse_activity?: string | null;
  repse_expiration_date?: string | null;
  imss_patronal_registry?: string | null;
  approximate_workers?: number | null;
  site_supervisor_name?: string | null;
  site_supervisor_phone?: string | null;
  bank_name?: string | null;
  bank_clabe?: string | null;
  bank_account_holder?: string | null;
  signature_data: string;
  ine_front_data?: string | null;
  ine_back_data?: string | null;
  tax_constancy_data?: string | null;
  geo_lat?: number | null;
  geo_lng?: number | null;
  geo_accuracy?: number | null;
  ip_address: string | null;
  signed_at: string;
};

export async function getContractorPortalContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: portalUser, error } = await supabase
    .from("contractor_portal_users")
    .select("id, user_id, contractor_id, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error || !portalUser) {
    return null;
  }

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id, name, phone, email, specialty")
    .eq("id", portalUser.contractor_id)
    .maybeSingle();

  return {
    supabase,
    user,
    portalUser: portalUser as ContractorPortalUser,
    contractor: contractor as ContractorInfo | null,
  };
}

export async function getContractorSignedAgreement(
  supabase: SupabaseClient,
  contractorId: number,
  userId?: string
) {
  let query = supabase
    .from("contractor_signed_agreements")
    .select(
      "id, contractor_id, contractor_portal_user_id, user_id, service_regime, person_type, legal_business_name, signer_name, signer_rfc, signer_curp, signer_phone, signer_email, fiscal_address, representative_name, representative_powers, signer_role, has_repse, repse_number, repse_activity, repse_expiration_date, imss_patronal_registry, approximate_workers, site_supervisor_name, site_supervisor_phone, bank_name, bank_clabe, bank_account_holder, signature_data, ine_front_data, ine_back_data, tax_constancy_data, geo_lat, geo_lng, geo_accuracy, ip_address, signed_at"
    )
    .eq("contractor_id", contractorId);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data } = await query
    .order("signed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as ContractorSignedAgreement | null;
}

export async function getAccessibleContractorService(
  supabase: SupabaseClient,
  contractorId: number,
  serviceId: number
) {
  const { data: service, error } = await supabase
    .from("service_reports")
    .select(
      `
      id,
      service_number,
      service_date,
      service_location,
      google_maps_url,
      performed_by_name,
      technician_phone,
      requester_name,
      requester_phone,
      scheduled_time_start,
      scheduled_time_end,
      is_remote,
      background,
      diagnosis,
      solution_status,
      solution_description,
      recommendations,
      requires_parts,
      required_parts_notes,
      status,
      completed_at,
      contractor_id,
      clients (id, name),
      client_projects (id, name)
    `
    )
    .eq("id", serviceId)
    .eq("contractor_id", contractorId)
    .maybeSingle();

  if (error || !service) {
    notFound();
  }

  const { data: photos } = await supabase
    .from("service_report_photos")
    .select("id, image_url, caption, sort_order")
    .eq("service_report_id", serviceId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return {
    service,
    photos: photos || [],
  };
}
