"use client";

import type React from "react";
import { useState, useTransition } from "react";
import {
  Building2,
  CheckCircle2,
  FileCheck2,
  FileText,
  HelpCircle,
  Lock,
  MapPin,
  Phone,
  Send,
  Shield,
  ShieldCheck,
  Upload,
  User,
  Users,
} from "lucide-react";
import { submitClientContractOnboardingAction } from "./actions";
import type { PaymentMilestone } from "@/lib/contracts";

type Props = {
  token: string;
  contract: any;
};

export default function ClientContractOnboardingForm({ token, contract }: Props) {
  const [clientType, setClientType] = useState<"b2b" | "b2c">(contract.client_type || "b2b");
  
  // Datos Fiscales
  const [legalBusinessName, setLegalBusinessName] = useState(contract.legal_business_name || "");
  const [legalRfc, setLegalRfc] = useState(contract.legal_rfc || "");
  const [legalTaxRegime, setLegalTaxRegime] = useState(contract.legal_tax_regime || "601");
  const [legalTaxZipCode, setLegalTaxZipCode] = useState(contract.legal_tax_zip_code || "");
  const [legalFiscalAddress, setLegalFiscalAddress] = useState(contract.legal_fiscal_address || "");

  // Notariales B2B
  const [notaryDeedNumber, setNotaryDeedNumber] = useState(contract.notary_deed_number || "");
  const [notaryDeedDate, setNotaryDeedDate] = useState(contract.notary_deed_date || "");
  const [notaryNumber, setNotaryNumber] = useState(contract.notary_number || "");
  const [notaryCityState, setNotaryCityState] = useState(contract.notary_city_state || "");
  const [notaryName, setNotaryName] = useState(contract.notary_name || "");
  const [publicRegistryFolio, setPublicRegistryFolio] = useState(contract.public_registry_folio || "");

  // Representante
  const [representativeName, setRepresentativeName] = useState(contract.representative_name || "");
  const [representativeTitle, setRepresentativeTitle] = useState(contract.representative_title || (clientType === "b2b" ? "Representante Legal" : "El Contratante"));
  const [representativePowersDeed, setRepresentativePowersDeed] = useState(contract.representative_powers_deed || "");
  const [representativeEmail, setRepresentativeEmail] = useState(contract.representative_email || "");
  const [representativePhone, setRepresentativePhone] = useState(contract.representative_phone || "");
  const [representativeCurp, setRepresentativeCurp] = useState(contract.representative_curp || "");

  // Obra
  const [siteManagerName, setSiteManagerName] = useState(contract.site_manager_name || "");
  const [siteManagerPhone, setSiteManagerPhone] = useState(contract.site_manager_phone || "");

  // Documentos URLs (placeholder o base64 upload)
  const [taxConstancyFile, setTaxConstancyFile] = useState<string | null>(contract.client_tax_constancy_url || null);
  const [ineFrontFile, setIneFrontFile] = useState<string | null>(contract.client_signer_ine_front_url || null);
  const [ineBackFile, setIneBackFile] = useState<string | null>(contract.client_signer_ine_back_url || null);

  const [isPending, startTransition] = useTransition();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const quoteNumber = contract.quotes?.quote_number || "COT-0000";
  const projectName = contract.client_projects?.name || "Proyecto ALFA IT";
  const siteAddress = contract.client_projects?.site_address || "Instalaciones del cliente";
  const totalAmountMxn = Number(contract.total_amount_mxn) || 0;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: contract.currency || "MXN" }).format(val);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setter(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const res = await submitClientContractOnboardingAction(token, {
        clientType,
        legalBusinessName,
        legalRfc,
        legalTaxRegime,
        legalTaxZipCode,
        legalFiscalAddress,
        notaryDeedNumber: clientType === "b2b" ? notaryDeedNumber : undefined,
        notaryDeedDate: clientType === "b2b" ? notaryDeedDate : undefined,
        notaryNumber: clientType === "b2b" ? notaryNumber : undefined,
        notaryCityState: clientType === "b2b" ? notaryCityState : undefined,
        notaryName: clientType === "b2b" ? notaryName : undefined,
        publicRegistryFolio: clientType === "b2b" ? publicRegistryFolio : undefined,
        representativeName,
        representativeTitle,
        representativePowersDeed: clientType === "b2b" ? representativePowersDeed : undefined,
        representativeEmail,
        representativePhone,
        representativeCurp: clientType === "b2c" ? representativeCurp : undefined,
        siteManagerName,
        siteManagerPhone,
        clientTaxConstancyUrl: taxConstancyFile || undefined,
        clientSignerIneFrontUrl: ineFrontFile || undefined,
        clientSignerIneBackUrl: ineBackFile || undefined,
      });

      if (res.ok) {
        setIsSubmitted(true);
      } else {
        setErrorMessage(res.error || "Ocurrió un error al guardar los datos.");
      }
    });
  }

  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-[#0B0D0F] p-4 text-white flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-[#1F7A4D]/40 bg-[#12221A] p-6 text-center space-y-5 shadow-2xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#143D2A] text-[#8CE0B6]">
            <CheckCircle2 size={32} />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8CE0B6]">
              Información Recibida con Éxito
            </span>
            <h2 className="text-xl font-bold text-white">¡Datos del Contrato Registrados!</h2>
            <p className="text-xs text-[#B3B3B8] leading-relaxed">
              Hemos preparado el contrato marco para <strong>{projectName}</strong> ({contract.contract_number}) con los datos proporcionados.
            </p>
          </div>

          <div className="pt-2">
            <a
              href={`/public/contracts/${contract.signing_token}/sign`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#9E1B32] py-3.5 text-xs font-bold text-white transition hover:bg-[#B91C3C] shadow-lg"
            >
              <FileCheck2 size={16} />
              Proceder a Firmar Contrato Digitalmente
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0D0F] py-8 px-4 text-white">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Encabezado Institucional */}
        <div className="flex items-center justify-between border-b border-[#2A2A30] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#9E1B32] text-white font-bold">
              A
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#9E1B32]">
                ALFA IT SOLUCIONES
              </p>
              <h1 className="text-base font-bold text-white">Onboarding de Contrato de Proyecto</h1>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-[#8E8E93] bg-[#151518] px-2.5 py-1 rounded-lg border border-[#2A2A30]">
            {contract.contract_number}
          </span>
        </div>

        {/* Resumen del Proyecto Autorizado */}
        <div className="rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8E8E93]">Proyecto Autorizado</span>
            <span className="text-xs font-bold text-[#9E1B32]">{quoteNumber}</span>
          </div>
          <h2 className="text-lg font-bold text-white">{projectName}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs border-t border-[#2A2A30]">
            <div>
              <span className="text-[#8E8E93]">Inversión Total:</span>
              <p className="font-bold text-white mt-0.5">{formatCurrency(totalAmountMxn)}</p>
            </div>
            <div>
              <span className="text-[#8E8E93]">Semanas de Ejecución:</span>
              <p className="font-bold text-white mt-0.5">{contract.estimated_weeks} semanas</p>
            </div>
            <div>
              <span className="text-[#8E8E93]">Garantía Mano de Obra:</span>
              <p className="font-bold text-[#8CE0B6] mt-0.5">{contract.warranty_labor_months} meses</p>
            </div>
          </div>
        </div>

        {/* Formulario de Onboarding Legal */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Selector Tipo de Persona */}
          <div className="rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 size={16} className="text-[#9E1B32]" />
              1. Régimen y Personalidad Jurídica
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setClientType("b2b");
                  setRepresentativeTitle("Representante Legal");
                }}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition ${
                  clientType === "b2b"
                    ? "border-[#9E1B32] bg-[#9E1B32]/10 text-white font-bold"
                    : "border-[#2A2A30] bg-[#222228] text-[#8E8E93] hover:text-white"
                }`}
              >
                <Building2 size={20} className="mb-1.5" />
                <span className="text-xs">Persona Moral</span>
                <span className="text-[10px] text-[#8E8E93]">Empresa / Sociedad</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setClientType("b2c");
                  setRepresentativeTitle("El Contratante");
                }}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition ${
                  clientType === "b2c"
                    ? "border-[#9E1B32] bg-[#9E1B32]/10 text-white font-bold"
                    : "border-[#2A2A30] bg-[#222228] text-[#8E8E93] hover:text-white"
                }`}
              >
                <User size={20} className="mb-1.5" />
                <span className="text-xs">Persona Física</span>
                <span className="text-[10px] text-[#8E8E93]">Particular / Residencial</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-[#B3B3B8]">
                  {clientType === "b2b" ? "Razón Social Oficial (según Constancia Fiscal):" : "Nombre Completo (como en tu INE):"}
                </span>
                <input
                  type="text"
                  value={legalBusinessName}
                  onChange={(e) => setLegalBusinessName(e.target.value)}
                  placeholder={clientType === "b2b" ? "Ej. Desarrollos e Inversiones S.A. de C.V." : "Ej. Juan Pérez González"}
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3.5 py-2.5 text-white outline-none focus:border-[#9E1B32]"
                  required
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[#B3B3B8]">RFC con Homoclave:</span>
                <input
                  type="text"
                  value={legalRfc}
                  onChange={(e) => setLegalRfc(e.target.value.toUpperCase())}
                  placeholder={clientType === "b2b" ? "Ej. ABC120304XYZ (12 car.)" : "Ej. PEGJ850101XYZ (13 car.)"}
                  maxLength={13}
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3.5 py-2.5 text-white font-mono uppercase outline-none focus:border-[#9E1B32]"
                  required
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[#B3B3B8]">Código Postal Fiscal:</span>
                <input
                  type="text"
                  value={legalTaxZipCode}
                  onChange={(e) => setLegalTaxZipCode(e.target.value)}
                  placeholder="Ej. 45030"
                  maxLength={5}
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3.5 py-2.5 text-white font-mono outline-none focus:border-[#9E1B32]"
                  required
                />
              </label>

              <label className="block space-y-1 sm:col-span-2">
                <span className="text-[#B3B3B8]">Domicilio Fiscal Completo:</span>
                <input
                  type="text"
                  value={legalFiscalAddress}
                  onChange={(e) => setLegalFiscalAddress(e.target.value)}
                  placeholder="Calle, No. Exterior, Interior, Colonia, Municipio, Estado"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3.5 py-2.5 text-white outline-none focus:border-[#9E1B32]"
                  required
                />
              </label>
            </div>
          </div>

          {/* 2. Datos Notariales (Solo Persona Moral B2B) */}
          {clientType === "b2b" && (
            <div className="rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText size={16} className="text-[#9E1B32]" />
                2. Datos de Constitución y Notaría (Persona Moral)
              </h3>
              <p className="text-[11px] text-[#8E8E93]">
                Información de la Escritura Pública constitutiva para las Declaraciones Legales del Contrato.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <label className="block space-y-1">
                  <span className="text-[#B3B3B8]">No. Escritura / Póliza:</span>
                  <input
                    type="text"
                    value={notaryDeedNumber}
                    onChange={(e) => setNotaryDeedNumber(e.target.value)}
                    placeholder="Ej. 24,590"
                    className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-2 text-white outline-none focus:border-[#9E1B32]"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[#B3B3B8]">Fecha de Escritura:</span>
                  <input
                    type="date"
                    value={notaryDeedDate}
                    onChange={(e) => setNotaryDeedDate(e.target.value)}
                    className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-2 text-white outline-none focus:border-[#9E1B32]"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[#B3B3B8]">No. de Notaría:</span>
                  <input
                    type="text"
                    value={notaryNumber}
                    onChange={(e) => setNotaryNumber(e.target.value)}
                    placeholder="Ej. Notario 128"
                    className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-2 text-white outline-none focus:border-[#9E1B32]"
                  />
                </label>

                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-[#B3B3B8]">Nombre del Notario / Corredor:</span>
                  <input
                    type="text"
                    value={notaryName}
                    onChange={(e) => setNotaryName(e.target.value)}
                    placeholder="Ej. Lic. Roberto Gómez Pérez"
                    className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-2 text-white outline-none focus:border-[#9E1B32]"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[#B3B3B8]">Ciudad y Estado:</span>
                  <input
                    type="text"
                    value={notaryCityState}
                    onChange={(e) => setNotaryCityState(e.target.value)}
                    placeholder="Ej. Guadalajara, Jal."
                    className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-2 text-white outline-none focus:border-[#9E1B32]"
                  />
                </label>

                <label className="block space-y-1 sm:col-span-3">
                  <span className="text-[#B3B3B8]">Folio Mercantil Electrónico (RPPC):</span>
                  <input
                    type="text"
                    value={publicRegistryFolio}
                    onChange={(e) => setPublicRegistryFolio(e.target.value)}
                    placeholder="Ej. 102938-1 o N-2018045920"
                    className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3 py-2 text-white font-mono outline-none focus:border-[#9E1B32]"
                  />
                </label>
              </div>
            </div>
          )}

          {/* 3. Representante Legal y Firmante */}
          <div className="rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <User size={16} className="text-[#9E1B32]" />
              3. Datos del Representante Legal / Firmante
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <label className="block space-y-1">
                <span className="text-[#B3B3B8]">Nombre Completo del Firmante:</span>
                <input
                  type="text"
                  value={representativeName}
                  onChange={(e) => setRepresentativeName(e.target.value)}
                  placeholder="Ej. Lic. Fernando Sánchez Ruiz"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3.5 py-2.5 text-white outline-none focus:border-[#9E1B32]"
                  required
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[#B3B3B8]">Cargo del Firmante:</span>
                <input
                  type="text"
                  value={representativeTitle}
                  onChange={(e) => setRepresentativeTitle(e.target.value)}
                  placeholder="Ej. Administrador Único / Apoderado Legal"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3.5 py-2.5 text-white outline-none focus:border-[#9E1B32]"
                  required
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[#B3B3B8]">Correo Electrónico Oficial:</span>
                <input
                  type="email"
                  value={representativeEmail}
                  onChange={(e) => setRepresentativeEmail(e.target.value)}
                  placeholder="firmante@empresa.com"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3.5 py-2.5 text-white outline-none focus:border-[#9E1B32]"
                  required
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[#B3B3B8]">WhatsApp / Teléfono Móvil:</span>
                <input
                  type="tel"
                  value={representativePhone}
                  onChange={(e) => setRepresentativePhone(e.target.value)}
                  placeholder="Ej. 3312345678"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3.5 py-2.5 text-white outline-none focus:border-[#9E1B32]"
                  required
                />
              </label>
            </div>
          </div>

          {/* 4. Contacto Operativo en Sitio / Obra */}
          <div className="rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin size={16} className="text-[#9E1B32]" />
              4. Responsable de Coordinación en Sitio (Obra)
            </h3>
            <p className="text-[11px] text-[#8E8E93]">
              Persona que autorizará accesos y firmará entregas intermedias en el inmueble.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <label className="block space-y-1">
                <span className="text-[#B3B3B8]">Nombre del Responsable en Sitio:</span>
                <input
                  type="text"
                  value={siteManagerName}
                  onChange={(e) => setSiteManagerName(e.target.value)}
                  placeholder="Ej. Arq. Daniel Morales (Residente)"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3.5 py-2.5 text-white outline-none focus:border-[#9E1B32]"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[#B3B3B8]">Teléfono / WhatsApp en Obra:</span>
                <input
                  type="tel"
                  value={siteManagerPhone}
                  onChange={(e) => setSiteManagerPhone(e.target.value)}
                  placeholder="Ej. 3398765432"
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-3.5 py-2.5 text-white outline-none focus:border-[#9E1B32]"
                />
              </label>
            </div>
          </div>

          {/* 5. Adjuntar Documentación (Constancia Fiscal / INE) */}
          <div className="rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload size={16} className="text-[#9E1B32]" />
              5. Documentación Digital Adjunta (Opcional / Recomendada)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-dashed border-[#2A2A30] bg-[#222228] p-4 text-center space-y-2">
                <span className="text-[#B3B3B8] font-semibold block">Constancia de Situación Fiscal (PDF o Foto)</span>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => handleFileUpload(e, setTaxConstancyFile)}
                  className="text-[11px] text-[#8E8E93] file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-[#9E1B32] file:text-white"
                />
                {taxConstancyFile && <p className="text-[10px] text-[#8CE0B6] font-bold">✓ Archivo adjuntado</p>}
              </div>

              <div className="rounded-xl border border-dashed border-[#2A2A30] bg-[#222228] p-4 text-center space-y-2">
                <span className="text-[#B3B3B8] font-semibold block">Identificación Oficial (INE / Pasaporte)</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileUpload(e, setIneFrontFile)}
                  className="text-[11px] text-[#8E8E93] file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-[#9E1B32] file:text-white"
                />
                {ineFrontFile && <p className="text-[10px] text-[#8CE0B6] font-bold">✓ Archivo adjuntado</p>}
              </div>
            </div>
          </div>

          {/* Aviso de Privacidad y Consentimiento */}
          <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-[11px] text-[#8E8E93] space-y-2">
            <div className="flex items-center gap-2 text-white font-semibold">
              <ShieldCheck size={16} className="text-[#9E1B32]" />
              <span>Protección de Datos Personales (LFPDPPP)</span>
            </div>
            <p>
              Tus datos y documentos están protegidos y serán utilizados exclusivamente para la formulación, validez jurídica y cumplimiento del Contrato de Servicios e Integración Tecnológica con ALFA IT Soluciones S.A. de C.V.
            </p>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-[#6A2A2A] bg-[#351818] p-3 text-xs text-[#FFB4B4]">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#9E1B32] py-4 text-sm font-bold text-white transition hover:bg-[#B91C3C] disabled:opacity-50 shadow-xl"
          >
            <Send size={16} />
            {isPending ? "Guardando información..." : "Guardar Datos y Generar Contrato"}
          </button>
        </form>
      </div>
    </main>
  );
}
