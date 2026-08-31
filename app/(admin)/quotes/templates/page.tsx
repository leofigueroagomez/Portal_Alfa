import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { normalizeRole } from "@/lib/permissions";
import { listQuoteTemplates } from "@/lib/quotes/templates";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import QuoteTemplatesManager from "@/components/quotes/QuoteTemplatesManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Plantillas de cotización | ALFA OS",
  description: "Paquetes estándar para armar borradores de cotización en segundos.",
};

export default async function QuoteTemplatesPage() {
  const profile = await getCurrentInternalUserProfile();
  if (!profile) redirect("/portal");

  const role = normalizeRole(profile.role);
  const canManage = role === "admin" || role === "direccion";

  const supabase = createSupabaseAdminClient();
  const [templates, productsRes, laborRes, clientsRes] = await Promise.all([
    listQuoteTemplates(supabase, { includeInactive: canManage }),
    supabase
      .from("products")
      .select("id, brand, model, name, calculated_sale_price, sale_currency")
      .eq("is_active", true)
      .order("brand", { ascending: true })
      .limit(2000),
    supabase
      .from("labor_activity_catalog")
      .select("id, name, default_unit, default_sale_price_mxn")
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("clients")
      .select("id, client_number, name, company_name")
      .order("name", { ascending: true })
      .limit(5000),
  ]);

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      <QuoteTemplatesManager
        templates={templates}
        canManage={canManage}
        products={productsRes.data ?? []}
        laborActivities={laborRes.data ?? []}
        clients={clientsRes.data ?? []}
      />
    </div>
  );
}
