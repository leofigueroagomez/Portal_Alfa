"use client";

import { useState, useTransition } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Mail,
  MessageCircle,
  QrCode,
  Send,
  ShieldCheck,
  UserPlus,
  Users,
  Wrench,
  X,
} from "lucide-react";
import {
  createContractorPortalUser,
  deactivateContractorPortalUser,
  generateContractorWhatsAppLinkAction,
  resendContractorPortalInvitation,
} from "./actions";

type PortalUserItem = {
  id: number;
  user_id: string;
  contractor_id: number;
  is_active: boolean;
  invited_at: string | null;
  invitation_status: string | null;
  created_at: string | null;
  email: string;
  fullName: string;
};

type ContractorData = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  specialty: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";
  return new Date(value).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getInvitationLabel(user: PortalUserItem) {
  if (user.invitation_status === "sent") return "Invitación enviada";
  if (user.invitation_status === "existing_user") return "Usuario activo";
  if (user.invitation_status === "error") return "Error de invitación";
  return "Sin invitación";
}

export default function ContractorPortalUsersClient({
  contractor,
  portalUsers,
}: {
  contractor: ContractorData;
  portalUsers: PortalUserItem[];
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(contractor.email || "");
  const [phone, setPhone] = useState(contractor.phone || "");

  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  // Modal / Feedback state for WhatsApp Link
  const [modalData, setModalData] = useState<{
    fullName: string;
    actionLink: string;
    waUrl: string;
    messageText: string;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerateWhatsAppLink = (
    userEmail: string,
    userName: string,
    userPhone?: string
  ) => {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        const res = await generateContractorWhatsAppLinkAction(
          contractor.id,
          userEmail,
          userName,
          userPhone || phone
        );
        if (res.ok) {
          setModalData({
            fullName: userName,
            actionLink: res.actionLink,
            waUrl: res.waUrl,
            messageText: res.messageText,
          });
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "Error al generar enlace de WhatsApp.");
      }
    });
  };

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMessage("Por favor ingresa un correo electrónico válido.");
      return;
    }
    handleGenerateWhatsAppLink(email, fullName, phone);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6">
      {errorMessage ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          {errorMessage}
        </div>
      ) : null}

      {/* Modal / Dialog for Generated WhatsApp Link */}
      {modalData ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-[#2A2B32] bg-[#151518] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#222228] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Invitación Lista para WhatsApp
                  </h3>
                  <p className="text-xs text-[#8A8A93]">
                    Técnico: <strong className="text-white">{modalData.fullName}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalData(null)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-[#222228] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Direct WhatsApp Big Button */}
            <div className="space-y-3">
              <a
                href={modalData.waUrl}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 active:scale-[0.98]"
              >
                <MessageCircle className="h-5 w-5" />
                Abrir y Enviar por WhatsApp
                <ExternalLink className="h-4 w-4 opacity-75" />
              </a>

              <p className="text-center text-[11px] text-[#8A8A93]">
                Al hacer clic se abrirá WhatsApp con el mensaje estructurado y el enlace directo de acceso.
              </p>
            </div>

            {/* Message Preview & Copy */}
            <div className="rounded-xl border border-[#222228] bg-[#0E0F12] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400">
                  Mensaje generado:
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(modalData.messageText)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#F0B8C0] hover:text-white"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ¡Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copiar texto
                    </>
                  )}
                </button>
              </div>
              <pre className="max-h-36 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[#151518] p-3 text-xs text-zinc-300 font-sans leading-relaxed border border-[#222228]">
                {modalData.messageText}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalData(null)}
                className="rounded-xl border border-[#2A2B32] bg-[#1C1D22] px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-[#25262D] hover:text-white"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Invite Form Card */}
      <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-base font-semibold text-white">
          <UserPlus className="h-4 w-4 text-[#B84A5A]" />
          Invitar a un nuevo técnico por WhatsApp o Correo
        </h2>
        <p className="mt-1 text-xs text-[#8A8A93]">
          Genera al instante el acceso para que el técnico cree su contraseña y consulte sus servicios asignados en el portal.
        </p>

        <form onSubmit={handleCreateSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-[#B3B3B8]">
                Nombre Completo del Técnico
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="mt-1 w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] px-3.5 py-2.5 text-sm text-white placeholder-[#555] focus:border-[#B84A5A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#B3B3B8]">
                WhatsApp / Teléfono Móvil
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej. 3318574884"
                className="mt-1 w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] px-3.5 py-2.5 text-sm text-white placeholder-[#555] focus:border-[#B84A5A] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#B3B3B8]">
                Correo Electrónico (para login)
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tecnico@ejemplo.com"
                className="mt-1 w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] px-3.5 py-2.5 text-sm text-white placeholder-[#555] focus:border-[#B84A5A] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-[11px] text-[#71717A]">
              💡 Es más rápido enviar la invitación por WhatsApp: el técnico solo toca el enlace y define su clave.
            </p>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-50"
            >
              <MessageCircle className="h-4 w-4" />
              {isPending ? "Generando acceso..." : "Crear y Enviar por WhatsApp 📲"}
            </button>
          </div>
        </form>
      </div>

      {/* Users Table Card */}
      <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-white">
          Técnicos Registrados ({portalUsers.length})
        </h2>

        {portalUsers.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-[#2A2B32] p-8 text-center text-sm text-[#8A8A93]">
            Aún no hay técnicos registrados para este contratista. Usa el formulario superior para enviar la primera invitación.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#2A2B32] text-xs font-semibold uppercase tracking-wider text-[#8A8A93]">
                  <th className="pb-3">Técnico</th>
                  <th className="pb-3">Correo</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3">Fecha Invitación</th>
                  <th className="pb-3 text-right">Acciones Directas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F1F24]">
                {portalUsers.map((user) => (
                  <tr key={user.id} className="text-zinc-200">
                    <td className="py-4 font-medium text-white">{user.fullName}</td>
                    <td className="py-4 text-[#B3B3B8]">{user.email}</td>
                    <td className="py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.is_active
                            ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                            : "border border-zinc-700 bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            user.is_active ? "bg-emerald-400" : "bg-zinc-500"
                          }`}
                        />
                        {user.is_active ? getInvitationLabel(user) : "Desactivado"}
                      </span>
                    </td>
                    <td className="py-4 text-xs text-[#8A8A93]">
                      {formatDate(user.invited_at || user.created_at)}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.is_active ? (
                          <>
                            {/* WhatsApp Button */}
                            <button
                              type="button"
                              onClick={() =>
                                handleGenerateWhatsAppLink(
                                  user.email,
                                  user.fullName,
                                  contractor.phone || ""
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              WhatsApp
                            </button>

                            {/* Email Re-invite form */}
                            <form
                              action={resendContractorPortalInvitation.bind(
                                null,
                                contractor.id
                              )}
                            >
                              <input type="hidden" name="portal_user_id" value={user.id} />
                              <input type="hidden" name="email" value={user.email} />
                              <input type="hidden" name="full_name" value={user.fullName} />
                              <button
                                type="submit"
                                title="Reenviar por correo"
                                className="rounded-lg border border-[#2A2B32] bg-[#1E1F24] px-2.5 py-1 text-xs text-zinc-300 transition hover:border-[#B84A5A] hover:text-white"
                              >
                                <Mail className="h-3.5 w-3.5" />
                              </button>
                            </form>

                            {/* Deactivate button */}
                            <form
                              action={deactivateContractorPortalUser.bind(
                                null,
                                contractor.id
                              )}
                            >
                              <input type="hidden" name="portal_user_id" value={user.id} />
                              <button
                                type="submit"
                                className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300 transition hover:bg-rose-500/20"
                              >
                                Desactivar
                              </button>
                            </form>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
