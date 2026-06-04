import Link from "next/link";
import { ArrowLeft, Mail, ShieldCheck, UserPlus, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { getSafeErrorMessage } from "@/lib/adminUsers";
import { canManageUsers } from "@/lib/permissions";
import { getCurrentUserProfile } from "@/services/profile";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import {
  assignPortalProjectAccess,
  createClientPortalUser,
  deactivateClientPortalUser,
  resendClientPortalInvitation,
  revokePortalProjectAccess,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Client = {
  id: number;
  name: string | null;
  email: string | null;
};

type Project = {
  id: number;
  name: string | null;
  sales_stage: string | null;
};

type PortalUser = {
  id: number;
  user_id: string;
  client_id: number;
  is_active: boolean;
  invited_at: string | null;
  invitation_status: string | null;
  invitation_error: string | null;
  created_at: string | null;
};

type PortalAccess = {
  client_portal_user_id: number;
  client_project_id: number;
  is_active: boolean;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getInvitationLabel(user: PortalUser) {
  if (user.invitation_status === "sent") return "Invitacion enviada";
  if (user.invitation_status === "existing_user") return "Usuario existente";
  if (user.invitation_status === "error") return "Error de invitacion";
  return "Sin invitacion";
}

function getPortalUserDisplay(
  user: PortalUser,
  authUserById: Map<string, { email: string | null; fullName: string | null }>
) {
  const authUser = authUserById.get(user.user_id);

  return {
    email: authUser?.email || "Sin email",
    fullName: authUser?.fullName || authUser?.email || "Usuario portal",
  };
}

function hasProjectAccess(
  accesses: PortalAccess[],
  portalUserId: number,
  projectId: number
) {
  return accesses.some(
    (access) =>
      access.client_portal_user_id === portalUserId &&
      access.client_project_id === projectId &&
      access.is_active
  );
}

export default async function ClientPortalUsersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getCurrentUserProfile();

  if (!profile?.is_active || !canManageUsers(profile.role)) {
    notFound();
  }

  const { id } = await params;
  const clientId = Number(id);

  if (!Number.isFinite(clientId) || clientId <= 0) {
    notFound();
  }

  const admin = createSupabaseAdminClient();
  const [
    { data: client, error: clientError },
    { data: projects, error: projectsError },
    { data: portalUsers, error: portalUsersError },
    { data: accessRows, error: accessError },
    authUsersResult,
  ] = await Promise.all([
    admin.from("clients").select("id, name, email").eq("id", clientId).maybeSingle(),
    admin
      .from("client_projects")
      .select("id, name, sales_stage")
      .eq("client_id", clientId)
      .order("project_number", { ascending: true }),
    admin
      .from("client_portal_users")
      .select(
        "id, user_id, client_id, is_active, invited_at, invitation_status, invitation_error, created_at"
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
    admin
      .from("client_portal_project_access")
      .select("client_portal_user_id, client_project_id, is_active"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (clientError || !client) {
    notFound();
  }

  if (projectsError || portalUsersError || accessError || authUsersResult.error) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
        <Link href={`/clients/${clientId}`} className="text-[#B3B3B8] hover:text-white">
          Volver al cliente
        </Link>
        <section className="mt-8 rounded-2xl border border-[#6A2A2A] bg-[#351818] p-6 text-[#FFB4B4]">
          Error cargando usuarios portal:{" "}
          {getSafeErrorMessage(
            projectsError || portalUsersError || accessError || authUsersResult.error
          )}
        </section>
      </main>
    );
  }

  const clientData = client as Client;
  const projectList = (projects || []) as Project[];
  const userList = (portalUsers || []) as PortalUser[];
  const accessList = (accessRows || []) as PortalAccess[];
  const authUserById = new Map(
    authUsersResult.data.users.map((user) => [
      user.id,
      {
        email: user.email || null,
        fullName:
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          user.email ||
          null,
      },
    ])
  );

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link
        href={`/clients/${clientId}`}
        className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8] hover:text-white"
      >
        <ArrowLeft size={18} />
        Volver al cliente
      </Link>

      <section className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">PORTAL CLIENTE</p>
          <h1 className="text-3xl font-bold sm:text-4xl">
            Usuarios portal
          </h1>
          <p className="mt-3 text-[#B3B3B8]">
            {clientData.name || "Cliente"} / accesos de solo lectura a proyectos.
          </p>
        </div>
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5">
          <p className="text-sm text-[#B3B3B8]">Usuarios activos</p>
          <p className="mt-2 text-2xl font-bold text-[#9E1B32]">
            {userList.filter((user) => user.is_active).length}
          </p>
        </div>
      </section>

      <form
        action={createClientPortalUser.bind(null, clientId)}
        className="mb-10 rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6"
      >
        <div className="mb-5 flex items-center gap-3">
          <UserPlus className="text-[#9E1B32]" size={22} />
          <div>
            <h2 className="text-2xl font-semibold">Crear usuario portal</h2>
            <p className="mt-1 text-sm text-[#B3B3B8]">
              Se enviara invitacion por Supabase Auth cuando el usuario no exista.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <input
            name="email"
            type="email"
            required
            defaultValue={clientData.email || ""}
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            placeholder="correo@cliente.com"
          />
          <input
            name="full_name"
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            placeholder="Nombre del usuario"
          />
        </div>

        <div className="mt-5">
          <p className="mb-3 text-sm font-semibold text-[#B3B3B8]">
            Proyectos visibles
          </p>
          {projectList.length === 0 ? (
            <p className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4 text-sm text-[#77777D]">
              Este cliente no tiene proyectos.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {projectList.map((project) => (
                <label
                  key={project.id}
                  className="flex items-center gap-3 rounded-xl border border-[#2A2A30] bg-[#222228] p-4"
                >
                  <input
                    type="checkbox"
                    name="project_ids"
                    value={project.id}
                    className="h-4 w-4"
                  />
                  <span>{project.name || `Proyecto #${project.id}`}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C]"
        >
          <Mail size={18} />
          Crear e invitar
        </button>
      </form>

      {userList.length === 0 ? (
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-8 text-center text-[#B3B3B8]">
          <Users className="mx-auto mb-3" size={34} />
          No hay usuarios portal para este cliente.
        </section>
      ) : (
        <section className="space-y-5">
          {userList.map((portalUser) => {
            const display = getPortalUserDisplay(portalUser, authUserById);

            return (
              <article
                key={portalUser.id}
                className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6"
              >
                <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">{display.fullName}</h2>
                    <p className="mt-1 text-[#B3B3B8]">{display.email}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-[#2A2A30] bg-[#222228] px-3 py-1 text-[#B3B3B8]">
                        {portalUser.is_active ? "Activo" : "Inactivo"}
                      </span>
                      <span className="rounded-full border border-[#2A2A30] bg-[#222228] px-3 py-1 text-[#B3B3B8]">
                        {getInvitationLabel(portalUser)}
                      </span>
                      <span className="rounded-full border border-[#2A2A30] bg-[#222228] px-3 py-1 text-[#B3B3B8]">
                        Invitado: {formatDate(portalUser.invited_at)}
                      </span>
                    </div>
                    {portalUser.invitation_error ? (
                      <p className="mt-3 rounded-xl border border-[#6A2A2A] bg-[#351818] p-3 text-sm text-[#FFB4B4]">
                        {portalUser.invitation_error}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <form action={resendClientPortalInvitation.bind(null, clientId)}>
                      <input type="hidden" name="portal_user_id" value={portalUser.id} />
                      <input type="hidden" name="email" value={display.email} />
                      <input type="hidden" name="full_name" value={display.fullName} />
                      <button
                        type="submit"
                        className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2 text-sm font-semibold text-[#B3B3B8] hover:text-white"
                      >
                        Reenviar invitacion
                      </button>
                    </form>
                    <form action={deactivateClientPortalUser.bind(null, clientId)}>
                      <input type="hidden" name="portal_user_id" value={portalUser.id} />
                      <button
                        type="submit"
                        disabled={!portalUser.is_active}
                        className="rounded-xl border border-[#7A2E1F] px-4 py-2 text-sm font-semibold text-[#FFB19C] hover:text-white disabled:border-[#2A2A30] disabled:text-[#555963]"
                      >
                        Desactivar
                      </button>
                    </form>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#B3B3B8]">
                    <ShieldCheck size={16} className="text-[#9E1B32]" />
                    Proyectos visibles
                  </div>
                  {projectList.length === 0 ? (
                    <p className="text-sm text-[#77777D]">Sin proyectos disponibles.</p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {projectList.map((project) => {
                        const active = hasProjectAccess(
                          accessList,
                          portalUser.id,
                          project.id
                        );

                        return (
                          <div
                            key={project.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-[#2A2A30] bg-[#222228] p-4"
                          >
                            <div>
                              <p className="font-semibold">
                                {project.name || `Proyecto #${project.id}`}
                              </p>
                              <p className="mt-1 text-xs text-[#77777D]">
                                {active ? "Visible en portal" : "Sin acceso"}
                              </p>
                            </div>
                            <form
                              action={
                                active
                                  ? revokePortalProjectAccess.bind(null, clientId)
                                  : assignPortalProjectAccess.bind(null, clientId)
                              }
                            >
                              <input type="hidden" name="portal_user_id" value={portalUser.id} />
                              <input type="hidden" name="project_id" value={project.id} />
                              <button
                                type="submit"
                                disabled={!portalUser.is_active}
                                className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:border-[#2A2A30] disabled:text-[#555963] ${
                                  active
                                    ? "border-[#7A2E1F] text-[#FFB19C] hover:text-white"
                                    : "border-[#1F7A4D] text-[#8CE0B6] hover:text-white"
                                }`}
                              >
                                {active ? "Revocar" : "Asignar"}
                              </button>
                            </form>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
