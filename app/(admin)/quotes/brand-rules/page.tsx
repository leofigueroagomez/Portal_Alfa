import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { normalizeRole } from "@/lib/permissions";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import BrandRulesManager from "@/components/quotes/BrandRulesManager";
import type { BrandCommercialRule } from "@/lib/quoteLineDiscounts";
import { fetchAllRows } from "@/lib/supabaseFetchAll";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reglas por marca | ALFA OS",
  description: "Topes de descuento al cliente y % del aliado por marca.",
};

export default async function BrandRulesPage() {
  const profile = await getCurrentInternalUserProfile();
  if (!profile) redirect("/portal");

  const role = normalizeRole(profile.role);
  const canManage = role === "admin" || role === "direccion";

  const supabase = createSupabaseAdminClient();
  const [rulesRes, brandsRes] = await Promise.all([
    supabase
      .from("brand_commercial_rules")
      .select("id, brand, max_client_discount_percent, partner_profit_share_percent, notes, is_active")
      .eq("is_active", true)
      .order("brand", { ascending: true }),
    // Paginado: el API corta en 1000 filas.
    fetchAllRows<{ brand: string | null }>((from, to) =>
      supabase
        .from("products")
        .select("brand")
        .eq("is_active", true)
        .order("id", { ascending: true })
        .range(from, to)
    ),
  ]);

  const brandOptions = Array.from(
    new Set(
      (brandsRes.data || [])
        .map((row) => (row.brand || "").trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="min-h-screen bg-[#F7F6F3]">
      <BrandRulesManager
        rules={(rulesRes.data || []) as BrandCommercialRule[]}
        brandOptions={brandOptions}
        canManage={canManage}
        loadError={rulesRes.error ? rulesRes.error.message : null}
      />
    </div>
  );
}
