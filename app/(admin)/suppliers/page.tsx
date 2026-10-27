import { canManagePurchases } from "@/lib/permissions";
import { getCurrentInternalUserProfile } from "@/services/profile";
import SuppliersClient from "./SuppliersClient";

export const dynamic = "force-dynamic";

// Gate en servidor (mismo patron que /inventory): perfil interno activo +
// canManagePurchases antes de montar el catalogo. Las escrituras tambien lo
// revalidan en ./actions.ts.
export default async function SuppliersPage() {
  const profile = await getCurrentInternalUserProfile();

  if (!profile || !canManagePurchases(profile.role)) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8 text-[#B3B3B8]">
          No tienes permiso para ver el catálogo de proveedores.
        </section>
      </main>
    );
  }

  return <SuppliersClient />;
}
