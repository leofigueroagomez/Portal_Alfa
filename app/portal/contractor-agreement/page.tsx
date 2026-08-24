import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  FileCheck2,
  FileText,
  HardHat,
  Lock,
  Scale,
  Shield,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import {
  getContractorPortalContext,
  getContractorSignedAgreement,
} from "@/lib/contractorPortal";
import {
  CONTRACTOR_AGREEMENT_CLAUSES,
  CONTRACTOR_AGREEMENT_METADATA,
} from "@/lib/contractorAgreementTemplate";
import ContractorAgreementSignForm from "./ContractorAgreementSignForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ContractorAgreementPage() {
  const context = await getContractorPortalContext();

  if (!context) {
    redirect("/login");
  }

  const { supabase, portalUser, user, contractor } = context;

  // Verificar si ya cuenta con convenio firmado
  const signedAgreement = await getContractorSignedAgreement(
    supabase,
    portalUser.contractor_id,
    user.id
  );

  const contractorName = contractor?.name || "Subcontratista / Empresa Aliada";
  const userFullName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    contractorName;
  const userPhone = contractor?.phone || "";
  const userEmail = user.email || contractor?.email || "";

  return (
    <main className="min-h-screen bg-[#0A0B0E] text-[#ECECEC] selection:bg-[#9E1B32] selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#380E14]/40 via-[#0A0B0E]/80 to-[#0A0B0E]" />

      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 space-y-10">
        {/* Header Branding */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#222228] pb-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7A1F2B] text-white shadow-lg shadow-[#7A1F2B]/30">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#E08A96]">
                ALFA OS • ONBOARDING LEGAL DE SUBCONTRATISTAS
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Contrato Marco de Prestación de Servicios y Obra Especializada
              </h1>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-[#2A2B32] bg-[#14151A] px-4 py-1.5 text-xs text-[#E1E1E6]">
            <ShieldCheck className="h-4 w-4 text-[#E08A96]" />
            Versión {CONTRACTOR_AGREEMENT_METADATA.version}
          </div>
        </header>

        {signedAgreement ? (
          /* Already Signed Card */
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8 sm:p-12 text-center space-y-6 shadow-2xl backdrop-blur-md">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">
                Contrato Marco y Expediente Firmado Exitosamente
              </h2>
              <p className="text-sm text-emerald-200/90 max-w-xl mx-auto leading-relaxed">
                Tu expediente legal, bancario, responsiva patronal y convenio de confidencialidad se encuentran debidamente certificados y activos en ALFA OS.
              </p>
            </div>

            <div className="mx-auto max-w-md rounded-2xl border border-emerald-500/20 bg-[#0E0F12] p-5 text-left text-xs space-y-2.5 text-zinc-300">
              <div className="flex justify-between">
                <span className="text-zinc-500">Razón Social:</span>
                <strong className="text-white">{signedAgreement.signer_name}</strong>
              </div>
              {signedAgreement.signer_rfc && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">RFC:</span>
                  <strong className="text-white">{signedAgreement.signer_rfc}</strong>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-500">Fecha de firma:</span>
                <span className="text-zinc-200">
                  {new Date(signedAgreement.signed_at).toLocaleString("es-MX", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">IP Certificada:</span>
                <span className="text-zinc-200 font-mono">{signedAgreement.ip_address || "127.0.0.1"}</span>
              </div>
            </div>

            <div className="pt-4">
              <Link
                href="/portal"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-8 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-xl shadow-emerald-600/30 transition hover:bg-emerald-500"
              >
                Ir a mi Portal de Servicios
              </Link>
            </div>
          </div>
        ) : (
          /* Agreement Document & Signing Flow */
          <div className="space-y-10">
            {/* Legal Warning Banner */}
            <div className="rounded-3xl border border-[#3A1F26] bg-[#221014]/70 p-6 sm:p-7 text-xs text-[#F2C0C8] space-y-2.5 leading-relaxed shadow-xl">
              <div className="flex items-center gap-2.5 text-sm font-bold text-white uppercase tracking-wider">
                <Lock className="h-4 w-4 text-[#E08A96]" />
                Compuerta de Contratación y Registro Obligatorio
              </div>
              <p>
                Para celebrar asignaciones con <strong>ALFA IT Soluciones S.A. de C.V.</strong> y garantizar el cumplimiento de la legislación laboral (LFT, Ley del Seguro Social, INFONAVIT), REPSE, secreto industrial (NDA) y protección de datos personales de clientes (LFPDPPP), es requisito legal indispensable completar el siguiente registro escrito y firmar digitalmente el presente Contrato Marco.
              </p>
            </div>

            {/* Document Clauses Viewer */}
            <div className="rounded-3xl border border-[#222228] bg-[#121316]/95 p-6 sm:p-10 shadow-2xl backdrop-blur-md space-y-8">
              <div className="border-b border-[#222228] pb-6 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#E08A96]">
                  INSTRUMENTO JURÍDICO VINCULANTE • 29 CLÁUSULAS
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {CONTRACTOR_AGREEMENT_METADATA.title}
                </h2>
                <p className="text-xs text-zinc-400">
                  Celebrado entre <strong>{CONTRACTOR_AGREEMENT_METADATA.companyName}</strong> (ALFA) y{" "}
                  <strong>{contractorName}</strong> (EL CONTRATISTA).
                </p>
              </div>

              {/* Declaraciones Resumen */}
              <div className="rounded-2xl border border-[#1F1F24] bg-[#0E0F12] p-5 space-y-3 text-xs text-zinc-300">
                <h3 className="font-bold text-white uppercase tracking-wider text-[11px] text-[#E08A96]">
                  Declaraciones Principales de las Partes
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 leading-relaxed text-zinc-400">
                  <li><strong>ALFA declara:</strong> Que es una sociedad legalmente constituida que coordina proyectos de ingeniería e integración para clientes de alto nivel y requiere resultados especializados con autonomía técnica.</li>
                  <li><strong>EL CONTRATISTA declara:</strong> Que cuenta con organización, personal, herramientas y recursos propios suficientes; está al corriente con el SAT, IMSS e INFONAVIT; y asume el carácter de único patrón de sus trabajadores.</li>
                </ul>
              </div>

              {/* Clauses Accordion/List */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700">
                {CONTRACTOR_AGREEMENT_CLAUSES.map((clause) => (
                  <article
                    key={clause.id}
                    className="rounded-2xl border border-[#1F1F24] bg-[#0E0F12] p-5 sm:p-6 space-y-3 transition hover:border-[#2F3038]"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7A1F2B]/30 text-xs font-bold text-[#E08A96]">
                        {clause.number}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          Cláusula {clause.number}. {clause.title}
                        </h3>
                        <p className="text-[11px] text-[#A1A1AA]">{clause.subtitle}</p>
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed text-zinc-300 font-sans pl-10">
                      {clause.content}
                    </p>

                    <div className="pl-10 pt-1 space-y-1">
                      {clause.keyPoints.map((pt, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-[11px] text-zinc-400 font-medium"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#E08A96] shrink-0" />
                          <span>{pt}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {/* Interactive Registration & Sign Form */}
            <ContractorAgreementSignForm
              contractorName={contractorName}
              defaultSignerName={userFullName}
              defaultEmail={userEmail}
              defaultPhone={userPhone}
            />
          </div>
        )}
      </div>
    </main>
  );
}
