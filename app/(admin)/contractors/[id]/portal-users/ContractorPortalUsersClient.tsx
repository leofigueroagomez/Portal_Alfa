"use client";

import { useState, useTransition } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  HardHat,
  IdCard,
  Mail,
  MapPin,
  MessageCircle,
  QrCode,
  Scale,
  Send,
  ShieldAlert,
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

type SignedAgreementInfo = {
  id: number;
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
} | null;

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
  signedAgreement?: SignedAgreementInfo;
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

  // Modal for Generated WhatsApp Link
  const [modalData, setModalData] = useState<{
    fullName: string;
    actionLink: string;
    waUrl: string;
    messageText: string;
  } | null>(null);

  // Modal for Viewing Signed Agreement
  const [viewingAgreement, setViewingAgreement] = useState<{
    userName: string;
    agreement: NonNullable<SignedAgreementInfo>;
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

      {/* Modal / Dialog for Viewing Signed Agreement */}
      {viewingAgreement ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[#2A2B32] bg-[#151518] p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#222228] pb-4 sticky top-0 bg-[#151518] z-10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Expediente y Contrato Marco Firmado (29 Cláusulas)
                  </h3>
                  <p className="text-xs text-[#8A8A93]">
                    Subcontratista: <strong className="text-white">{viewingAgreement.agreement.legal_business_name || viewingAgreement.userName}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingAgreement(null)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-[#222228] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Régimen y Alcance Legal */}
            <div className="rounded-2xl border border-[#222228] bg-[#0E0F12] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div>
                <span className="text-zinc-500 block text-[10px] uppercase font-bold">Modalidad de Contratación:</span>
                <span className="font-bold text-white text-sm flex items-center gap-2 mt-0.5">
                  {viewingAgreement.agreement.service_regime === "specialized_contractor" ? (
                    <span className="text-blue-400">🔵 Empresa Contratista con Personal (REPSE)</span>
                  ) : (
                    <span className="text-emerald-400">🟢 Técnico / Prestador Independiente</span>
                  )}
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 max-w-xs">
                {viewingAgreement.agreement.service_regime === "specialized_contractor" ? (
                  <span>Ampara intermediación con cuadrilla y responsabilidades patronales.</span>
                ) : (
                  <span>Ejecución directa personal. <strong>No ampara personal subordinado ni REPSE</strong>.</span>
                )}
              </div>
            </div>

            {/* 1. Datos Fiscales y Legales */}
            <div className="rounded-2xl border border-[#222228] bg-[#0E0F12] p-5 space-y-2.5 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#E08A96] block border-b border-[#1C1D22] pb-1.5">
                1. Identificación Legal y Fiscal
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-zinc-500">Razón Social: </span>
                  <strong className="text-white">{viewingAgreement.agreement.legal_business_name || viewingAgreement.agreement.signer_name}</strong>
                </div>
                <div>
                  <span className="text-zinc-500">RFC: </span>
                  <span className="text-zinc-200 font-mono">{viewingAgreement.agreement.signer_rfc || "-"}</span>
                </div>
                {viewingAgreement.agreement.signer_curp && (
                  <div>
                    <span className="text-zinc-500">CURP: </span>
                    <span className="text-zinc-200 font-mono">{viewingAgreement.agreement.signer_curp}</span>
                  </div>
                )}
                <div>
                  <span className="text-zinc-500">Tipo de Persona: </span>
                  <span className="text-zinc-200 capitalize">{viewingAgreement.agreement.person_type || "Física"}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Firmante: </span>
                  <span className="text-zinc-200">{viewingAgreement.agreement.signer_name}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Teléfono / WhatsApp: </span>
                  <span className="text-zinc-200">{viewingAgreement.agreement.signer_phone || "-"}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-zinc-500">Domicilio Fiscal: </span>
                  <span className="text-zinc-200">{viewingAgreement.agreement.fiscal_address || "-"}</span>
                </div>
              </div>
            </div>

            {/* 2. Régimen Laboral y REPSE */}
            <div className="rounded-2xl border border-[#222228] bg-[#0E0F12] p-5 space-y-2.5 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#E08A96] block border-b border-[#1C1D22] pb-1.5">
                2. Régimen Laboral, Seguridad Social y REPSE
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-zinc-500">Registro Patronal IMSS: </span>
                  <span className="text-zinc-200 font-mono">{viewingAgreement.agreement.imss_patronal_registry || "No especificado"}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Cuenta con REPSE: </span>
                  <span className={viewingAgreement.agreement.has_repse ? "text-emerald-400 font-bold" : "text-zinc-400"}>
                    {viewingAgreement.agreement.has_repse ? "Sí (Registrado)" : "No"}
                  </span>
                </div>
                {viewingAgreement.agreement.repse_number && (
                  <div>
                    <span className="text-zinc-500">No. REPSE: </span>
                    <span className="text-zinc-200 font-mono">{viewingAgreement.agreement.repse_number}</span>
                  </div>
                )}
                {viewingAgreement.agreement.repse_activity && (
                  <div>
                    <span className="text-zinc-500">Actividad REPSE: </span>
                    <span className="text-zinc-200">{viewingAgreement.agreement.repse_activity}</span>
                  </div>
                )}
                {viewingAgreement.agreement.site_supervisor_name && (
                  <div className="sm:col-span-2">
                    <span className="text-zinc-500">Supervisor en Sitio: </span>
                    <span className="text-zinc-200">{viewingAgreement.agreement.site_supervisor_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Datos Bancarios */}
            <div className="rounded-2xl border border-[#222228] bg-[#0E0F12] p-5 space-y-2.5 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#E08A96] block border-b border-[#1C1D22] pb-1.5">
                3. Datos Bancarios para Pagos (Cláusula 18)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-zinc-500">Banco: </span>
                  <span className="text-zinc-200 font-bold">{viewingAgreement.agreement.bank_name || "-"}</span>
                </div>
                <div>
                  <span className="text-zinc-500">CLABE Interbancaria: </span>
                  <span className="text-zinc-200 font-mono tracking-wider font-bold">{viewingAgreement.agreement.bank_clabe || "-"}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-zinc-500">Titular de la Cuenta: </span>
                  <span className="text-zinc-200">{viewingAgreement.agreement.bank_account_holder || "-"}</span>
                </div>
              </div>
            </div>

            {/* 4. Documentación Oficial (INE y CSF) */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-zinc-400">
                Documentación Digital Adjunta:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {viewingAgreement.agreement.ine_front_data ? (
                  <div className="rounded-xl border border-[#2A2B32] bg-[#0A0B0D] p-3 text-center space-y-1.5">
                    <span className="text-[10px] text-zinc-500 font-semibold block">INE Frente</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={viewingAgreement.agreement.ine_front_data}
                      alt="INE Frente"
                      className="max-h-28 mx-auto object-contain rounded-lg"
                    />
                  </div>
                ) : null}

                {viewingAgreement.agreement.ine_back_data ? (
                  <div className="rounded-xl border border-[#2A2B32] bg-[#0A0B0D] p-3 text-center space-y-1.5">
                    <span className="text-[10px] text-zinc-500 font-semibold block">INE Reverso</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={viewingAgreement.agreement.ine_back_data}
                      alt="INE Reverso"
                      className="max-h-28 mx-auto object-contain rounded-lg"
                    />
                  </div>
                ) : null}

                {viewingAgreement.agreement.tax_constancy_data ? (
                  <div className="rounded-xl border border-[#2A2B32] bg-[#0A0B0D] p-3 text-center space-y-1.5 flex flex-col justify-center">
                    <FileText className="h-8 w-8 mx-auto text-[#E08A96]" />
                    <span className="text-[10px] text-zinc-300 font-semibold block">Constancia SAT</span>
                    <span className="text-[10px] text-emerald-400">Adjuntada en alta</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* 5. Auditoría, Ubicación GPS y Firma */}
            <div className="rounded-2xl border border-[#222228] bg-[#0E0F12] p-5 space-y-2 text-xs">
              <div className="flex justify-between border-b border-[#1C1D22] pb-2">
                <span className="text-zinc-500">Fecha y Hora de Firma:</span>
                <span className="text-zinc-200">{formatDate(viewingAgreement.agreement.signed_at)}</span>
              </div>
              <div className="flex justify-between border-b border-[#1C1D22] pb-2">
                <span className="text-zinc-500">Dirección IP Registrada:</span>
                <span className="text-zinc-200 font-mono">{viewingAgreement.agreement.ip_address || "127.0.0.1"}</span>
              </div>
              {viewingAgreement.agreement.geo_lat && viewingAgreement.agreement.geo_lng ? (
                <div className="flex justify-between border-b border-[#1C1D22] pb-2 items-center">
                  <span className="text-zinc-500">Ubicación GPS (Tiempo Real):</span>
                  <a
                    href={`https://www.google.com/maps?q=${viewingAgreement.agreement.geo_lat},${viewingAgreement.agreement.geo_lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 font-semibold inline-flex items-center gap-1 hover:underline"
                  >
                    📍 {viewingAgreement.agreement.geo_lat.toFixed(5)}, {viewingAgreement.agreement.geo_lng.toFixed(5)}
                    <ExternalLink className="h-3 w-3 opacity-75" />
                  </a>
                </div>
              ) : null}
            </div>

            {/* Firma Autógrafa Preview */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-400">
                Firma Autógrafa Digital Capturada:
              </span>
              <div className="flex items-center justify-center rounded-2xl border border-[#2A2B32] bg-[#0A0B0D] p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={viewingAgreement.agreement.signature_data}
                  alt="Firma autógrafa digital"
                  className="max-h-28 object-contain filter invert"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewingAgreement(null)}
                className="rounded-xl border border-[#2A2B32] bg-[#1C1D22] px-6 py-2.5 text-xs font-bold text-zinc-300 hover:bg-[#25262D] hover:text-white"
              >
                Cerrar Expediente
              </button>
            </div>
          </div>
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
                Al hacer clic se abrirá WhatsApp con el mensaje estructurado y el enlace para registrar su expediente, firmar el contrato y definir su clave.
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
          Invitar a un nuevo subcontratista por WhatsApp o Correo
        </h2>
        <p className="mt-1 text-xs text-[#8A8A93]">
          El subcontratista recibirá su enlace para completar su expediente legal/bancario y firmar el Contrato Marco de 29 cláusulas.
        </p>

        <form onSubmit={handleCreateSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-[#B3B3B8]">
                Nombre Completo del Técnico / Representante
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
              💡 El técnico no podrá ver servicios ni clientes hasta que complete su expediente legal y firma digital en el portal.
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
          Técnicos y Subcontratistas Registrados ({portalUsers.length})
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
                  <th className="pb-3">Subcontratista / Razón Social</th>
                  <th className="pb-3">Correo</th>
                  <th className="pb-3">Cuenta</th>
                  <th className="pb-3">Contrato Marco</th>
                  <th className="pb-3 text-right">Acciones Directas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F1F24]">
                {portalUsers.map((user) => (
                  <tr key={user.id} className="text-zinc-200">
                    <td className="py-4 font-medium text-white">
                      <div>{user.signedAgreement?.legal_business_name || user.fullName}</div>
                      {user.signedAgreement?.signer_rfc && (
                        <div className="text-[11px] text-zinc-500 font-mono">{user.signedAgreement.signer_rfc}</div>
                      )}
                    </td>
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
                    <td className="py-4">
                      {user.signedAgreement ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            Contrato Firmado
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setViewingAgreement({
                                userName: user.fullName,
                                agreement: user.signedAgreement!,
                              })
                            }
                            title="Ver expediente completo y firma"
                            className="rounded-lg border border-[#2A2B32] bg-[#1E1F24] p-1.5 text-zinc-300 hover:text-white hover:border-[#7A1F2B]"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                          <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                          Pendiente de Firma
                        </span>
                      )}
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
