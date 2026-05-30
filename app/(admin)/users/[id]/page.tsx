import { canManageUsers } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/services/profile";
import UserDetailClient from "./UserDetailClient";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentProfile = await getCurrentUserProfile();
  const { id } = await params;

  if (!canManageUsers(currentProfile?.role)) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8">
          No tienes permiso para administrar usuarios.
        </section>
      </main>
    );
  }

  return <UserDetailClient userId={id} currentUserId={currentProfile?.id || ""} />;
}
