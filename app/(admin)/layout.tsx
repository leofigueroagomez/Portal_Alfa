import AdminShell from "@/components/AdminShell";
import { getCurrentUserProfile } from "@/services/profile";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentUserProfile();

  return <AdminShell profile={profile}>{children}</AdminShell>;
}
