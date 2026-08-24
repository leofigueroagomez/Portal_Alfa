import Link from "next/link";
import { ArrowLeft, MessageCircle, Users, Wrench } from "lucide-react";
import { notFound } from "next/navigation";
import { canManageUsers } from "@/lib/permissions";
import { getCurrentInternalUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import ContractorPortalUsersClient from "./ContractorPortalUsersClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Contractor = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  specialty: string | null;
};

type PortalUserRow = {
  id: number;
  user_id: string;
  contractor_id: number;
  is_active: boolean;
  invited_at: string | null;
  invitation_status: string | null;
  created_at: string | null;
};

export default async function ContractorPortalUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const profile = await getCurrentInternalUserProfile();

  if (!profile || !canManageUsers(profile.role)) {
    notFound();
  }

  const { id } = await params;
  const contractorId = Number(id);

  if (!Number.isFinite(contractorId) || contractorId <= 0) {
    notFound();
  }

  const { success, error } = await searchParams;
  const admin = createSupabaseAdminClient();

  const [
    { data: contractor, error: contractorError },
    { data: portalUsers },
    authUsersResult,
  ] = await Promise.all([
    admin
      .from("contractors")
      .select("id, name, email, phone, specialty")
      .eq("id", contractorId)
      .maybeSingle(),
    admin
      .from("contractor_portal_users")
      .select("id, user_id, contractor_id, is_active, invited_at, invitation_status, created_at")
      .eq("contractor_id", contractorId)
      .order("created_at", { ascending: false }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (contractorError || !contractor) {
    notFound();
  }

  const contractorData = contractor as Contractor;
  const portalUserList = (portalUsers || []) as PortalUserRow[];

  const authUserById = new Map<string, { email: string | null; fullName: string | null }>();
  for (const user of authUsersResult.data?.users || []) {
    authUserById.set(user.id, {
      email: user.email || null,
      fullName:
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        null,
    });
  }

  const formattedUsers = portalUserList.map((user) => {
    const authUser = authUserById.get(user.user_id);
    const email = authUser?.email || "Sin email";
    const fullName = authUser?.fullName || email;
    return {
      ...user,
      email,
      fullName,
    };
  });

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Top bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={`/contractors/${contractorId}`}
            className="inline-flex items-center gap-2 text-sm text-[#B3B3B8] transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a {contractorData.name || "Contratista"}
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#2A2B32] bg-[#14151A] px-3 py-1 text-xs text-[#E1E1E6]">
            <Wrench className="h-3.5 w-3.5 text-[#B84A5A]" />
            Especialidad: {contractorData.specialty || "Técnico / Integrador"}
          </span>
        </div>

        {/* Title Card */}
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7A1F2B]/20 text-[#F0B8C0]">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold sm:text-3xl">
                  Técnicos y Accesos WhatsApp
                </h1>
                <p className="mt-1 text-sm text-[#8A8A93]">
                  Empresa: <strong className="text-white">{contractorData.name}</strong>
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300">
              <MessageCircle className="h-4 w-4" />
              Invitación Directa por WhatsApp Activa
            </div>
          </div>

          {/* Feedback messages */}
          {success ? (
            <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
              {success}
            </div>
          ) : null}
          {error ? (
            <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
              {error}
            </div>
          ) : null}
        </div>

        {/* Interactive Client Component */}
        <ContractorPortalUsersClient
          contractor={contractorData}
          portalUsers={formattedUsers}
        />
      </div>
    </main>
  );
}
