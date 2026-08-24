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
