"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  Camera,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  FileText,
  HardHat,
  IdCard,
  Lock,
  MapPin,
  RefreshCw,
  RotateCcw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { submitContractorAgreementAction } from "./actions";

interface Props {
  contractorName: string;
  defaultSignerName: string;
  defaultEmail: string;
  defaultPhone: string;
}

export default function ContractorAgreementSignForm({
  contractorName,
  defaultSignerName,
  defaultEmail,
  defaultPhone,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // 0. Régimen de Contratación
  const [serviceRegime, setServiceRegime] = useState<"independent_technician" | "specialized_contractor">("independent_technician");

  // 1. Identificación Legal y Fiscal
  const [personType, setPersonType] = useState<"fisica" | "moral">("fisica");
  const [legalBusinessName, setLegalBusinessName] = useState(contractorName || "");
  const [signerName, setSignerName] = useState(defaultSignerName || "");
  const [signerRfc, setSignerRfc] = useState("");
  const [signerCurp, setSignerCurp] = useState("");
  const [signerPhone, setSignerPhone] = useState(defaultPhone || "");
  const [signerEmail, setSignerEmail] = useState(defaultEmail || "");
  const [fiscalAddress, setFiscalAddress] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [representativePowers, setRepresentativePowers] = useState("");
  const [signerRole, setSignerRole] = useState("Técnico Especialista / Subcontratista");

  // 2. Laboral y REPSE (Opcionales)
  const [hasRepse, setHasRepse] = useState(false);
  const [repseNumber, setRepseNumber] = useState("");
  const [repseActivity, setRepseActivity] = useState("");
  const [repseExpirationDate, setRepseExpirationDate] = useState("");
  const [imssPatronalRegistry, setImssPatronalRegistry] = useState("");
  const [approximateWorkers, setApproximateWorkers] = useState(1);
  const [siteSupervisorName, setSiteSupervisorName] = useState("");
  const [siteSupervisorPhone, setSiteSupervisorPhone] = useState("");

  // 3. Datos Bancarios
  const [bankName, setBankName] = useState("");
  const [bankClabe, setBankClabe] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");

  // 4. Documentación Digital
  const [ineFrontData, setIneFrontData] = useState<string | null>(null);
  const [ineBackData, setIneBackData] = useState<string | null>(null);
  const [taxConstancyData, setTaxConstancyData] = useState<string | null>(null);

  // 5. Geolocalización
  const [coords, setCoords] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // 6. Consentimientos
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [dataPrivacyAccepted, setDataPrivacyAccepted] = useState(false);
  const [laborLiabilityAccepted, setLaborLiabilityAccepted] = useState(false);

  // Firma
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Solicitar ubicación GPS
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("La geolocalización no está soportada en tu navegador.");
      return;
    }
    setIsLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setGeoError(
          err.code === 1
            ? "Permiso de ubicación denegado. Permite el acceso al GPS para certificar la firma."
            : "No fue posible obtener la ubicación GPS precisa."
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  // Inicializar Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2.5;
  }, []);

  function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string | null) => void
  ) {
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

  function getCanvasPos(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function startDrawing(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  }

  function draw(
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = getCanvasPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function handleClear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    if (!legalBusinessName.trim()) {
      setErrorMessage("Por favor ingresa la Razón Social o Nombre Legal.");
      return;
    }
    if (!signerName.trim()) {
      setErrorMessage("Por favor ingresa el Nombre Completo del Firmante.");
      return;
    }
    if (!signerRfc.trim() || signerRfc.trim().length < 12) {
      setErrorMessage("El RFC es obligatorio (mínimo 12 caracteres).");
      return;
    }
    if (!fiscalAddress.trim()) {
      setErrorMessage("El Domicilio Fiscal Completo es obligatorio.");
      return;
    }
    if (!bankName.trim() || !bankClabe.trim() || bankClabe.trim().length !== 18) {
      setErrorMessage("La CLABE Interbancaria debe tener exactamente 18 dígitos.");
      return;
    }
    if (!bankAccountHolder.trim()) {
      setErrorMessage("El Titular de la Cuenta Bancaria es obligatorio.");
      return;
    }
    if (!ineFrontData) {
      setErrorMessage("Es obligatorio adjuntar la fotografía de tu Identificación Oficial (INE / Pasaporte) de frente.");
      return;
    }
    if (!hasDrawn || !canvasRef.current) {
      setErrorMessage("Por favor estampa tu firma autógrafa digital en el recuadro.");
      return;
    }
    if (!termsAccepted || !ndaAccepted || !dataPrivacyAccepted || !laborLiabilityAccepted) {
      setErrorMessage("Debes aceptar todas las declaraciones y cláusulas del Contrato Marco para continuar.");
      return;
    }

    const signatureData = canvasRef.current.toDataURL("image/png");

    const formData = new FormData();
    formData.append("service_regime", serviceRegime);
    formData.append("person_type", personType);
    formData.append("legal_business_name", legalBusinessName.trim());
    formData.append("signer_name", signerName.trim());
    formData.append("signer_rfc", signerRfc.trim());
    formData.append("signer_curp", signerCurp.trim());
    formData.append("signer_phone", signerPhone.trim());
    formData.append("signer_email", signerEmail.trim());
    formData.append("fiscal_address", fiscalAddress.trim());
    formData.append("representative_name", representativeName.trim());
    formData.append("representative_powers", representativePowers.trim());
    formData.append("signer_role", signerRole.trim());

    formData.append("has_repse", (serviceRegime === "specialized_contractor" && hasRepse) ? "true" : "false");
    formData.append("repse_number", repseNumber.trim());
    formData.append("repse_activity", repseActivity.trim());
    formData.append("repse_expiration_date", repseExpirationDate);
    formData.append("imss_patronal_registry", imssPatronalRegistry.trim());
    formData.append("approximate_workers", approximateWorkers.toString());
    formData.append("site_supervisor_name", siteSupervisorName.trim());
    formData.append("site_supervisor_phone", siteSupervisorPhone.trim());

    formData.append("bank_name", bankName.trim());
    formData.append("bank_clabe", bankClabe.trim());
    formData.append("bank_account_holder", bankAccountHolder.trim());

    formData.append("signature_data", signatureData);
    if (ineFrontData) formData.append("ine_front_data", ineFrontData);
    if (ineBackData) formData.append("ine_back_data", ineBackData);
    if (taxConstancyData) formData.append("tax_constancy_data", taxConstancyData);

    if (coords) {
      formData.append("geo_lat", coords.lat.toString());
      formData.append("geo_lng", coords.lng.toString());
      if (coords.accuracy) formData.append("geo_accuracy", coords.accuracy.toString());
    }

    formData.append("terms_accepted", "on");
    formData.append("nda_accepted", "on");
    formData.append("data_privacy_accepted", "on");
    formData.append("labor_liability_accepted", "on");

    startTransition(async () => {
      try {
        const res = await submitContractorAgreementAction(formData);
        if (res.ok) {
          router.push("/portal");
        }
      } catch (err: any) {
        setErrorMessage(err?.message || "Error al registrar el contrato.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {errorMessage ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-300 flex items-center gap-3 shadow-lg">
          <AlertCircle className="h-6 w-6 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {/* SECCIÓN 0: Modalidad de Contratación y Alcance */}
      <div className="rounded-3xl border border-[#2A2B32] bg-[#151518] p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="border-b border-[#222228] pb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7A1F2B]/20 text-[#E08A96]">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Modalidad de Contratación y Alcance Legal
            </h2>
            <p className="text-xs text-[#8A8A93]">
              Selecciona tu esquema operativo. El contrato delimita con precisión lo que ampara tu registro.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Opción A: Técnico Independiente */}
          <div
            onClick={() => {
              setServiceRegime("independent_technician");
              setHasRepse(false);
            }}
            className={`rounded-2xl border p-5 cursor-pointer transition space-y-2.5 ${
              serviceRegime === "independent_technician"
                ? "border-[#B84A5A] bg-[#7A1F2B]/15 shadow-lg shadow-[#7A1F2B]/15 ring-1 ring-[#B84A5A]"
                : "border-[#2A2B32] bg-[#0E0F12] opacity-75 hover:opacity-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                🟢 Técnico / Prestador Independiente
              </span>
              <input
                type="radio"
                name="service_regime_radio"
                checked={serviceRegime === "independent_technician"}
                onChange={() => {
                  setServiceRegime("independent_technician");
                  setHasRepse(false);
                }}
                className="accent-[#9E1B32] h-4 w-4 cursor-pointer"
              />
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Ejecutas los servicios técnicos de forma directa y personal con tus herramientas. <strong>No pones personal subordinado a disposición de ALFA ni requieres IMSS patronal o REPSE</strong>.
            </p>
            <div className="text-[11px] text-[#E08A96] pt-1 font-medium">
              ✓ Ampara: NDA, Protección de Datos, Cobro contra CFDI, Garantía de 12 meses y Deslinde patronal total.
            </div>
          </div>

          {/* Opción B: Empresa Contratista con Personal / REPSE */}
          <div
            onClick={() => setServiceRegime("specialized_contractor")}
            className={`rounded-2xl border p-5 cursor-pointer transition space-y-2.5 ${
              serviceRegime === "specialized_contractor"
                ? "border-[#B84A5A] bg-[#7A1F2B]/15 shadow-lg shadow-[#7A1F2B]/15 ring-1 ring-[#B84A5A]"
                : "border-[#2A2B32] bg-[#0E0F12] opacity-75 hover:opacity-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                🔵 Empresa Contratista / Obra Especializada
              </span>
              <input
                type="radio"
                name="service_regime_radio"
                checked={serviceRegime === "specialized_contractor"}
                onChange={() => setServiceRegime("specialized_contractor")}
                className="accent-[#9E1B32] h-4 w-4 cursor-pointer"
              />
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Cuentas con cuadrilla técnica o personal contratado bajo tu mando patronal. Puedes registrar tus datos de <strong>Registro Patronal IMSS y REPSE</strong> (opcional).
            </p>
            <div className="text-[11px] text-emerald-400 pt-1 font-medium">
              ✓ Ampara: Servicios especializados, REPSE, cumplimiento STPS e intermediación laboral.
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: Identificación Legal y Fiscal */}
      <div className="rounded-3xl border border-[#2A2B32] bg-[#151518] p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="border-b border-[#222228] pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7A1F2B]/20 text-[#E08A96]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                1. Identificación Legal y Fiscal del Subcontratista
              </h2>
              <p className="text-xs text-[#8A8A93]">
                Datos oficiales para la celebración del Contrato Marco y facturación de servicios.
              </p>
            </div>
          </div>

          {/* Selector Persona Física vs Moral */}
          <div className="flex rounded-xl border border-[#2A2B32] bg-[#0E0F12] p-1 text-xs">
            <button
              type="button"
              onClick={() => setPersonType("fisica")}
              className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                personType === "fisica"
                  ? "bg-[#7A1F2B] text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Persona Física
            </button>
            <button
              type="button"
              onClick={() => setPersonType("moral")}
              className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                personType === "moral"
                  ? "bg-[#7A1F2B] text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Persona Moral
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1">
              Razón Social / Nombre Legal Completo <span className="text-[#B84A5A]">*</span>
            </label>
            <input
              type="text"
              required
              value={legalBusinessName}
              onChange={(e) => setLegalBusinessName(e.target.value)}
              placeholder="Ej. Soluciones Eléctricas de Occidente / Mario Gómez"
              className="w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] px-3.5 py-3 text-sm text-white focus:border-[#B84A5A] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1">
              Nombre Completo del Firmante / Representante <span className="text-[#B84A5A]">*</span>
            </label>
            <input
              type="text"
              required
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Ej. Juan Carlos Pérez Gómez"
              className="w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] px-3.5 py-3 text-sm text-white focus:border-[#B84A5A] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1">
              RFC con Homoclave <span className="text-[#B84A5A]">*</span>
            </label>
            <input
              type="text"
              required
              value={signerRfc}
              onChange={(e) => setSignerRfc(e.target.value.toUpperCase())}
              placeholder="Ej. SEO180412XYZ"
              maxLength={13}
              className="w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] px-3.5 py-3 text-sm text-white font-mono uppercase focus:border-[#B84A5A] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1">
              CURP <span className="text-zinc-500 font-normal">(Opcional)</span>
            </label>
            <input
              type="text"
              value={signerCurp}
              onChange={(e) => setSignerCurp(e.target.value.toUpperCase())}
              placeholder="Ej. PEGJ850412HJCLRN01"
              maxLength={18}
              className="w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] px-3.5 py-3 text-sm text-white font-mono uppercase focus:border-[#B84A5A] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1">
              Teléfono Celular / WhatsApp <span className="text-[#B84A5A]">*</span>
            </label>
            <input
              type="tel"
              required
              value={signerPhone}
              onChange={(e) => setSignerPhone(e.target.value)}
              placeholder="Ej. 3318574884"
              className="w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] px-3.5 py-3 text-sm text-white focus:border-[#B84A5A] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1">
              Domicilio Fiscal Completo <span className="text-[#B84A5A]">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={fiscalAddress}
              onChange={(e) => setFiscalAddress(e.target.value)}
              placeholder="Calle, No. Ext/Int, Colonia, C.P., Municipio (Zapopan/Guadalajara), Estado"
              className="w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] px-3.5 py-2.5 text-sm text-white focus:border-[#B84A5A] focus:outline-none leading-relaxed"
            />
          </div>

          {personType === "moral" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1">
                  Nombre del Representante Legal
                </label>
                <input
                  type="text"
                  value={representativeName}
                  onChange={(e) => setRepresentativeName(e.target.value)}
                  placeholder="Ej. Lic. Roberto Gómez"
                  className="w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] px-3.5 py-3 text-sm text-white focus:border-[#B84A5A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1">
                  Escritura / Poder Notarial
                </label>
                <input
                  type="text"
                  value={representativePowers}
                  onChange={(e) => setRepresentativePowers(e.target.value)}
                  placeholder="Ej. Escritura Pública No. 12,450"
                  className="w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] px-3.5 py-3 text-sm text-white focus:border-[#B84A5A] focus:outline-none"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* SECCIÓN 2: Información Laboral y REPSE (Opcional) */}
      <div className="rounded-3xl border border-[#2A2B32] bg-[#151518] p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="border-b border-[#222228] pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7A1F2B]/20 text-[#E08A96]">
              <HardHat className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                2. Régimen Laboral y Registro REPSE
              </h2>
              <p className="text-xs text-[#8A8A93]">
                {serviceRegime === "independent_technician"
                  ? "Régimen Independiente: No requieres llenar estos campos al no tener personal a disposición."
                  : "Campos opcionales para contratistas que deseen registrar su acreditación STPS/IMSS."}
              </p>
            </div>
          </div>
          <span className="text-xs text-zinc-500 font-semibold">Opcional</span>
        </div>

        {serviceRegime === "independent_technician" ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-300 space-y-1">
            <p className="font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Régimen de Prestador Independiente Seleccionado
            </p>
            <p className="text-zinc-300 leading-relaxed">
              Al operar de forma independiente y personal, no estás obligado a presentar registro patronal ni REPSE. El contrato ampara tu actividad mercantil directa y te desliga del régimen de subcontratación de personal.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-[#2A2B32] bg-[#0E0F12] cursor-pointer">
              <input
                type="checkbox"
                checked={hasRepse}
                onChange={(e) => setHasRepse(e.target.checked)}
                className="h-5 w-5 accent-[#9E1B32] rounded cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-bold text-white">
                  ¿Cuentas con Registro REPSE vigente ante la STPS?
                </span>
                <p className="text-zinc-400">
                  Si marcas esta casilla podrás capturar tu número de registro y actividad autorizada.
                </p>
              </div>
            </label>

            {hasRepse && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 p-4 rounded-2xl border border-[#7A1F2B]/40 bg-[#1D1014]/40">
                <div>
                  <label className="block text-xs font-semibold text-[#E08A96] uppercase mb-1">
                    Número de Registro REPSE
                  </label>
                  <input
                    type="text"
                    value={repseNumber}
                    onChange={(e) => setRepseNumber(e.target.value.toUpperCase())}
                    placeholder="Ej. AR12345/2024"
                    className="w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] px-3 py-2.5 text-xs text-white uppercase focus:border-[#B84A5A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#E08A96] uppercase mb-1">
                    Actividad Autorizada
                  </label>
                  <input
                    type="text"
                    value={repseActivity}
                    onChange={(e) => setRepseActivity(e.target.value)}
                    placeholder="Ej. Instalaciones eléctricas y domótica"
                    className="w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] px-3 py-2.5 text-xs text-white focus:border-[#B84A5A] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#E08A96] uppercase mb-1">
                    Vigencia / Renovación
                  </label>
                  <input
                    type="date"
                    value={repseExpirationDate}
                    onChange={(e) => setRepseExpirationDate(e.target.value)}
                    className="w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] px-3 py-2 text-xs text-white focus:border-[#B84A5A] focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1">
                  Registro Patronal ante IMSS <span className="text-zinc-500 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  value={imssPatronalRegistry}
                  onChange={(e) => setImssPatronalRegistry(e.target.value.toUpperCase())}
                  placeholder="Ej. Y551234510"
                  className="w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] px-3.5 py-3 text-sm text-white font-mono uppercase focus:border-[#B84A5A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1">
                  Supervisor Operativo en Sitio <span className="text-zinc-500 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  value={siteSupervisorName}
                  onChange={(e) => setSiteSupervisorName(e.target.value)}
                  placeholder="Ej. Ing. Mario Morales"
                  className="w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] px-3.5 py-3 text-sm text-white focus:border-[#B84A5A] focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN 3: Datos Bancarios para Pagos */}
      <div className="rounded-3xl border border-[#2A2B32] bg-[#151518] p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="border-b border-[#222228] pb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7A1F2B]/20 text-[#E08A96]">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              3. Datos Bancarios para Pago de Servicios (Cláusula 18)
            </h2>
            <p className="text-xs text-[#8A8A93]">
              Cuenta exclusiva para dispersión de transferencias por servicios concluidos.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1">
              Institución Bancaria <span className="text-[#B84A5A]">*</span>
            </label>
            <input
              type="text"
              required
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Ej. BBVA / Santander / Banorte"
              className="w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] px-3.5 py-3 text-sm text-white focus:border-[#B84A5A] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1">
              CLABE Interbancaria (18 dígitos) <span className="text-[#B84A5A]">*</span>
            </label>
            <input
              type="text"
              required
              value={bankClabe}
              onChange={(e) => setBankClabe(e.target.value.replace(/\D/g, ""))}
              placeholder="012320001234567890"
              maxLength={18}
              className="w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] px-3.5 py-3 text-sm text-white font-mono focus:border-[#B84A5A] focus:outline-none tracking-wider"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1">
              Titular de la Cuenta <span className="text-[#B84A5A]">*</span>
            </label>
            <input
              type="text"
              required
              value={bankAccountHolder}
              onChange={(e) => setBankAccountHolder(e.target.value)}
              placeholder="Debe coincidir con tu RFC / Razón Social"
              className="w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] px-3.5 py-3 text-sm text-white focus:border-[#B84A5A] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN 4: Documentación Digital Adjunta */}
      <div className="rounded-3xl border border-[#2A2B32] bg-[#151518] p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="border-b border-[#222228] pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7A1F2B]/20 text-[#E08A96]">
              <IdCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                4. Identificación Oficial y Documentación
              </h2>
              <p className="text-xs text-[#8A8A93]">
                Adjunta fotos legibles de tu identificación oficial para certificar tu identidad jurídica.
              </p>
            </div>
          </div>
          <span className="text-xs text-[#E08A96] font-semibold">INE Obligatorio</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* INE Frente */}
          <div className="rounded-2xl border border-dashed border-[#2A2B32] bg-[#0E0F12] p-5 text-center space-y-3">
            <span className="text-xs font-bold text-white block">
              INE / Pasaporte (Frente) <span className="text-[#B84A5A]">*</span>
            </span>

            {ineFrontData ? (
              <div className="relative mx-auto max-h-36 overflow-hidden rounded-xl border border-emerald-500/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ineFrontData}
                  alt="INE Frente"
                  className="mx-auto max-h-32 object-contain"
                />
                <button
                  type="button"
                  onClick={() => setIneFrontData(null)}
                  className="absolute top-1 right-1 rounded-full bg-black/80 px-2 py-0.5 text-[10px] text-rose-300 hover:text-white"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border border-zinc-800 rounded-xl cursor-pointer hover:border-[#B84A5A] transition">
                <Camera className="h-8 w-8 text-zinc-500 mb-1" />
                <span className="text-xs font-semibold text-[#E08A96]">Tomar Foto o Subir</span>
                <span className="text-[10px] text-zinc-500">JPG, PNG o PDF</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileUpload(e, setIneFrontData)}
                  className="hidden"
                />
              </label>
            )}

            {ineFrontData && (
              <p className="text-[11px] text-emerald-400 font-semibold flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Frente Adjuntado
              </p>
            )}
          </div>

          {/* INE Reverso */}
          <div className="rounded-2xl border border-dashed border-[#2A2B32] bg-[#0E0F12] p-5 text-center space-y-3">
            <span className="text-xs font-bold text-white block">
              INE / Identificación (Reverso)
            </span>

            {ineBackData ? (
              <div className="relative mx-auto max-h-36 overflow-hidden rounded-xl border border-emerald-500/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ineBackData}
                  alt="INE Reverso"
                  className="mx-auto max-h-32 object-contain"
                />
                <button
                  type="button"
                  onClick={() => setIneBackData(null)}
                  className="absolute top-1 right-1 rounded-full bg-black/80 px-2 py-0.5 text-[10px] text-rose-300 hover:text-white"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border border-zinc-800 rounded-xl cursor-pointer hover:border-[#B84A5A] transition">
                <Camera className="h-8 w-8 text-zinc-500 mb-1" />
                <span className="text-xs font-semibold text-[#E08A96]">Tomar Foto o Subir</span>
                <span className="text-[10px] text-zinc-500">JPG, PNG o PDF</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleFileUpload(e, setIneBackData)}
                  className="hidden"
                />
              </label>
            )}

            {ineBackData && (
              <p className="text-[11px] text-emerald-400 font-semibold flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Reverso Adjuntado
              </p>
            )}
          </div>

          {/* Constancia Fiscal */}
          <div className="rounded-2xl border border-dashed border-[#2A2B32] bg-[#0E0F12] p-5 text-center space-y-3">
            <span className="text-xs font-bold text-white block">
              Constancia SAT (CSF) <span className="text-zinc-500 font-normal">(Opcional)</span>
            </span>

            {taxConstancyData ? (
              <div className="rounded-xl border border-emerald-500/30 p-4 bg-emerald-500/10 text-emerald-300 text-xs space-y-2">
                <FileCheck2 className="h-8 w-8 mx-auto text-emerald-400" />
                <p className="font-bold">Constancia Adjuntada</p>
                <button
                  type="button"
                  onClick={() => setTaxConstancyData(null)}
                  className="text-[10px] text-rose-300 underline"
                >
                  Cambiar documento
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border border-zinc-800 rounded-xl cursor-pointer hover:border-[#B84A5A] transition">
                <FileText className="h-8 w-8 text-zinc-500 mb-1" />
                <span className="text-xs font-semibold text-[#E08A96]">Subir Constancia SAT</span>
                <span className="text-[10px] text-zinc-500">PDF o Imagen</span>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => handleFileUpload(e, setTaxConstancyData)}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* SECCIÓN 5: Ubicación GPS en Tiempo Real */}
      <div className="rounded-3xl border border-[#2A2B32] bg-[#151518] p-6 sm:p-8 shadow-2xl space-y-4">
        <div className="border-b border-[#222228] pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7A1F2B]/20 text-[#E08A96]">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                5. Ubicación GPS en Tiempo Real al Momento de la Firma
              </h2>
              <p className="text-xs text-[#8A8A93]">
                Sello geográfico de atribución jurídica y no repudio.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={requestLocation}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2B32] bg-[#1C1D22] px-3 py-1.5 text-xs text-zinc-300 hover:bg-[#282932] hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLocating ? "animate-spin" : ""}`} />
            {isLocating ? "Obteniendo..." : "Actualizar GPS"}
          </button>
        </div>

        {coords ? (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-300 font-semibold">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <span>
                Coordenadas Certificadas: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </span>
            </div>
            <span className="text-[11px] text-zinc-400">
              Precisión satelital: ±{Math.round(coords.accuracy || 10)} metros
            </span>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="text-amber-200">
              {geoError || "Solicitando acceso a ubicación GPS..."}
            </div>
            <button
              type="button"
              onClick={requestLocation}
              className="rounded-lg bg-amber-500/20 px-3 py-1.5 font-bold text-amber-300 hover:bg-amber-500/30"
            >
              Permitir GPS
            </button>
          </div>
        )}
      </div>

      {/* SECCIÓN 6: Consentimientos Legales Obligatorios */}
      <div className="rounded-3xl border border-[#2A2B32] bg-[#151518] p-6 sm:p-8 shadow-2xl space-y-4">
        <div className="border-b border-[#222228] pb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7A1F2B]/20 text-[#E08A96]">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              6. Consentimientos Expresos y Aceptación de Cláusulas (1 a 29)
            </h2>
            <p className="text-xs text-[#8A8A93]">
              Aceptación expresa de las cláusulas aplicables a tu modalidad operativa.
            </p>
          </div>
        </div>

        <label className="flex items-start gap-3.5 rounded-2xl border border-[#2A2B32] bg-[#0E0F12] p-4 cursor-pointer hover:border-[#3A3B44] transition">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 h-5 w-5 accent-[#9E1B32] rounded cursor-pointer shrink-0"
          />
          <div className="text-xs space-y-1">
            <span className="font-bold text-white">
              Aceptación del Contrato Marco y Garantía de 12 Meses (Cláusulas 1 a 29)
            </span>
            <p className="text-zinc-400 leading-relaxed">
              Declaro que he leído y acepto los términos aplicables del Contrato Marco de ALFA IT, comprometiéndome a otorgar una garantía mínima obligatoria de 12 meses en toda mano de obra e instalación ejecutada.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3.5 rounded-2xl border border-[#2A2B32] bg-[#0E0F12] p-4 cursor-pointer hover:border-[#3A3B44] transition">
          <input
            type="checkbox"
            checked={ndaAccepted}
            onChange={(e) => setNdaAccepted(e.target.checked)}
            className="mt-1 h-5 w-5 accent-[#9E1B32] rounded cursor-pointer shrink-0"
          />
          <div className="text-xs space-y-1">
            <span className="font-bold text-white">
              Secreto Industrial, Credenciales y Confidencialidad Estricta (Cláusula 12 - NDA)
            </span>
            <p className="text-zinc-400 leading-relaxed">
              Me obligo a guardar reserva absoluta y no divulgar planos, códigos, programaciones Lutron/Shelly, contraseñas, topologías de red ni información de clientes y proyectos de ALFA IT.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3.5 rounded-2xl border border-[#2A2B32] bg-[#0E0F12] p-4 cursor-pointer hover:border-[#3A3B44] transition">
          <input
            type="checkbox"
            checked={dataPrivacyAccepted}
            onChange={(e) => setDataPrivacyAccepted(e.target.checked)}
            className="mt-1 h-5 w-5 accent-[#9E1B32] rounded cursor-pointer shrink-0"
          />
          <div className="text-xs space-y-1">
            <span className="font-bold text-white">
              Protección de Datos Personales de Clientes y Prohibición de Redes Sociales (Cláusulas 10 y 13)
            </span>
            <p className="text-zinc-400 leading-relaxed">
              Me comprometo a no tomar fotos ni videos de personas o bienes privados en los sitios, a no publicar imágenes de obras en redes sociales y a no transferir datos a modelos de inteligencia artificial o cuentas no autorizadas.
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3.5 rounded-2xl border border-[#2A2B32] bg-[#0E0F12] p-4 cursor-pointer hover:border-[#3A3B44] transition">
          <input
            type="checkbox"
            checked={laborLiabilityAccepted}
            onChange={(e) => setLaborLiabilityAccepted(e.target.checked)}
            className="mt-1 h-5 w-5 accent-[#9E1B32] rounded cursor-pointer shrink-0"
          />
          <div className="text-xs space-y-1">
            <span className="font-bold text-white">
              Responsiva e Independencia Mercantil (Cláusulas 4, 5 y 22)
            </span>
            <p className="text-zinc-400 leading-relaxed">
              Reconozco que no existe subordinación ni relación laboral con ALFA IT, actuando con autonomía técnica y herramientas propias, y asumiendo la responsabilidad patronal exclusiva si asigno personal propio.
            </p>
          </div>
        </label>
      </div>

      {/* SECCIÓN 7: Firma Autógrafa Digital */}
      <div className="rounded-3xl border border-[#2A2B32] bg-[#151518] p-6 sm:p-8 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#222228] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7A1F2B]/20 text-[#E08A96]">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                7. Firma Autógrafa Digital del Subcontratista
              </h2>
              <p className="text-xs text-[#8A8A93]">
                Firma electrónica vinculante conforme al Código de Comercio.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2B32] bg-[#1C1D22] px-3.5 py-2 text-xs text-zinc-300 transition hover:bg-[#282932] hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Limpiar firma
          </button>
        </div>

        <div className="relative rounded-2xl border-2 border-dashed border-[#3A3B44] bg-[#0A0B0D] p-1 touch-none">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="h-48 w-full cursor-crosshair rounded-xl"
          />

          {!hasDrawn && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-zinc-500 font-semibold">
              ✍️ Estampa tu firma aquí con tu dedo o pluma digital
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-500 pt-2 gap-2">
          <span>🔒 Sello Criptográfico • IP y GPS Vinculados • Fecha y Hora Certificada</span>
          <span>Jurisdicción: Tribunales de Guadalajara / Zapopan, Jal.</span>
        </div>
      </div>

      {/* Botón de Envío y Activación */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <p className="text-xs text-zinc-400 max-w-md">
          Al pulsar el botón, tu expediente y firma digital quedarán registrados ante ALFA IT y se activará de inmediato tu acceso al portal de servicios.
        </p>

        <button
          type="submit"
          disabled={isPending || !hasDrawn || !ineFrontData}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl bg-[#7A1F2B] px-10 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-2xl shadow-[#7A1F2B]/40 transition hover:bg-[#5A1320] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShieldCheck className="h-5 w-5" />
          {isPending ? "Validando y Registrando Expediente..." : "Firmar Contrato y Activar Portal"}
        </button>
      </div>
    </form>
  );
}
