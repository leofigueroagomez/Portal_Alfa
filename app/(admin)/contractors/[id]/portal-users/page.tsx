import Link from "next/link";
import { ArrowLeft, MessageCircle, Scale, Users, Wrench } from "lucide-react";
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

type AgreementRow = {
  id: number;
  contractor_id: number;
  contractor_portal_user_id: number | null;
  user_id: string | null;
  service_regime?: string | null;
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
    contractorRes,
    portalUsersRes,
    signedAgreementsRes,
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
    admin
      .from("contractor_signed_agreements")
      .select("id, contractor_id, contractor_portal_user_id, user_id, service_regime, person_type, legal_business_name, signer_name, signer_rfc, signer_curp, signer_phone, signer_email, fiscal_address, representative_name, representative_powers, signer_role, has_repse, repse_number, repse_activity, repse_expiration_date, imss_patronal_registry, approximate_workers, site_supervisor_name, site_supervisor_phone, bank_name, bank_clabe, bank_account_holder, signature_data, ine_front_data, ine_back_data, tax_constancy_data, geo_lat, geo_lng, geo_accuracy, ip_address, signed_at")
      .eq("contractor_id", contractorId),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (contractorRes.error || !contractorRes.data) {
    notFound();
  }

  const contractorData = contractorRes.data as Contractor;
  const portalUserList = (portalUsersRes.data || []) as PortalUserRow[];
  const agreementList = (signedAgreementsRes.data || []) as AgreementRow[];

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

  const agreementByUserId = new Map<string, AgreementRow>();
  for (const agg of agreementList) {
    if (agg.user_id) {
      agreementByUserId.set(agg.user_id, agg);
    }
  }

  const formattedUsers = portalUserList.map((user) => {
    const authUser = authUserById.get(user.user_id);
    const email = authUser?.email || "Sin email";
    const fullName = authUser?.fullName || email;
    const signedAgreement = agreementByUserId.get(user.user_id) || null;

    return {
      ...user,
      email,
      fullName,
      signedAgreement,
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
                  Técnicos, Accesos y Convenios Legales
                </h1>
                <p className="mt-1 text-sm text-[#8A8A93]">
                  Empresa: <strong className="text-white">{contractorData.name}</strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300">
                <MessageCircle className="h-4 w-4" />
                Invitación WhatsApp
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border border-[#7A1F2B]/40 bg-[#7A1F2B]/10 px-3.5 py-2 text-xs font-semibold text-[#F0B8C0]">
                <Scale className="h-4 w-4" />
                Firma NDA / Responsiva Obligatoria
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {portalUsersRes.error || signedAgreementsRes.error ? (
            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 space-y-1">
              <p className="font-bold text-amber-300">⚠️ Configuración de base de datos pendiente en Supabase</p>
              <p className="text-zinc-300">
                Para activar el registro de subcontratistas, ejecuta el script <code className="bg-black/50 px-1.5 py-0.5 rounded font-mono text-amber-200">sql/20260825_contractor_complete_setup.sql</code> en el <strong>SQL Editor de Supabase</strong>.
              </p>
            </div>
          ) : null}
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
