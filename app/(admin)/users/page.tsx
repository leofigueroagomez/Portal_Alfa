import { canManageUsers } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/services/profile";
import UsersAdminClient from "./UsersAdminClient";

export default async function UsersPage() {
  const currentProfile = await getCurrentUserProfile();

  if (!canManageUsers(currentProfile?.role)) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8">
          No tienes permiso para administrar usuarios.
        </section>
      </main>
    );
  }

  return <UsersAdminClient currentUserId={currentProfile?.id || ""} />;
}
