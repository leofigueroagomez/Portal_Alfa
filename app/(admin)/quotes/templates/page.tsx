import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { normalizeRole } from "@/lib/permissions";
import { listQuoteTemplates } from "@/lib/quotes/templates";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import QuoteTemplatesManager from "@/components/quotes/QuoteTemplatesManager";
import { fetchAllRows } from "@/lib/supabaseFetchAll";

type TemplateProduct = {
  id: number;
  brand: string | null;
  model: string | null;
  name: string | null;
  calculated_sale_price: number | null;
  sale_currency: string | null;
};

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
    // Paginado: el `.limit(2000)` que estaba aqui no servia de nada, el API
    // corta en 1000 filas y ese tope lo impone el servidor.
    fetchAllRows<TemplateProduct>((from, to) =>
      supabase
        .from("products")
        .select("id, brand, model, name, calculated_sale_price, sale_currency")
        .eq("is_active", true)
        .order("brand", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to)
    ),
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
