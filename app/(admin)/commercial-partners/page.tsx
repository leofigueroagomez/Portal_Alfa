"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ImagePlus, Save } from "lucide-react";
import { supabase } from "@/services/supabase";
import {
  formatMissingFiscalFields,
  getCfdiUseCode,
  getFiscalRegimeCode,
  getMissingFiscalFields,
  type FiscalClientData,
} from "@/lib/fiscalData";
import { canManagePartnerBilling } from "@/lib/permissions";
import { PARTNER_BILLING_CLIENT_FIELDS } from "@/lib/partnerBilling";

type CommercialPartner = {
  id: number;
  commercial_name: string;
  logo_url: string | null;
  logo_storage_path: string | null;
  primary_color: string;
  secondary_color: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  default_billing_client_id?: number | null;
  bill_to_partner?: boolean | null;
};

type PartnerForm = {
  id: number | null;
  commercial_name: string;
  logo_url: string;
  logo_storage_path: string | null;
  primary_color: string;
  secondary_color: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  is_active: boolean;
  default_billing_client_id: string;
  bill_to_partner: boolean;
};

const PARTNER_FIELDS =
  "id, commercial_name, logo_url, logo_storage_path, primary_color, secondary_color, contact_name, contact_email, contact_phone, is_active";
const PARTNER_BILLING_FIELDS = `${PARTNER_FIELDS}, default_billing_client_id, bill_to_partner`;

const BUCKET = "commercial-partner-assets";
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

const emptyForm: PartnerForm = {
  id: null,
  commercial_name: "",
  logo_url: "",
  logo_storage_path: null,
  primary_color: "#1E5AA8",
  secondary_color: "#111111",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  is_active: true,
  default_billing_client_id: "",
  bill_to_partner: true,
};

function isMissingColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "42703" ||
    /column .* does not exist|could not find the .* column/i.test(error.message || "")
  );
}

function getClientLabel(client: FiscalClientData) {
  const name = client.name || `Cliente #${client.id}`;
  return client.tax_rfc ? `${name} / ${client.tax_rfc}` : name;
}

function getLogoUrl(partner: Pick<CommercialPartner, "logo_url" | "logo_storage_path">) {
  if (partner.logo_url) return partner.logo_url;
  if (!partner.logo_storage_path) return "";

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(partner.logo_storage_path);
  return data.publicUrl || "";
}

function isHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export default function CommercialPartnersPage() {
  const [partners, setPartners] = useState<CommercialPartner[]>([]);
  const [form, setForm] = useState<PartnerForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState("");
  const [billingAvailable, setBillingAvailable] = useState(true);
  const [canEditBilling, setCanEditBilling] = useState(false);
  const [billingClients, setBillingClients] = useState<FiscalClientData[]>([]);

  const selectedPartner = useMemo(
    () => partners.find((partner) => partner.id === form.id) || null,
    [form.id, partners]
  );

  const clientsById = useMemo(
    () => new Map(billingClients.map((client) => [client.id, client])),
    [billingClients]
  );
  const selectedBillingClient = form.default_billing_client_id
    ? clientsById.get(Number(form.default_billing_client_id)) || null
    : null;
  const billingMissingFields = selectedBillingClient
    ? getMissingFiscalFields(selectedBillingClient)
    : [];

  async function loadPartners() {
    setLoading(true);
    const withBilling = await supabase
      .from("commercial_partners")
      .select(PARTNER_BILLING_FIELDS)
      .order("commercial_name", { ascending: true });
    let data: unknown[] | null = withBilling.data;
    let error = withBilling.error;

    if (error && isMissingColumnError(error)) {
      // Migracion 20261104130000_commercial_partner_billing.sql aun no aplicada.
      setBillingAvailable(false);
      const legacy = await supabase
        .from("commercial_partners")
        .select(PARTNER_FIELDS)
        .order("commercial_name", { ascending: true });
      data = legacy.data;
      error = legacy.error;
    }

    if (error) {
      setMessage(`Error cargando aliados: ${error.message}`);
      setLoading(false);
      return;
    }

    setPartners((data || []) as CommercialPartner[]);
    setLoading(false);
  }

  async function loadBillingContext() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      setCanEditBilling(canManagePartnerBilling(profile?.role || null));
    }

    const { data, error } = await supabase
      .from("clients")
      .select(PARTNER_BILLING_CLIENT_FIELDS)
      .order("name", { ascending: true });

    if (!error) setBillingClients((data || []) as FiscalClientData[]);
  }

  useEffect(() => {
    loadPartners();
    loadBillingContext();
  }, []);

  function editPartner(partner: CommercialPartner) {
    setForm({
      id: partner.id,
      commercial_name: partner.commercial_name || "",
      logo_url: partner.logo_url || "",
      logo_storage_path: partner.logo_storage_path,
      primary_color: partner.primary_color || "#1E5AA8",
      secondary_color: partner.secondary_color || "#111111",
      contact_name: partner.contact_name || "",
      contact_email: partner.contact_email || "",
      contact_phone: partner.contact_phone || "",
      is_active: partner.is_active !== false,
      default_billing_client_id: partner.default_billing_client_id
        ? String(partner.default_billing_client_id)
        : "",
      bill_to_partner: partner.bill_to_partner !== false,
    });
    setMessage("");
  }

  function resetForm() {
    setForm(emptyForm);
    setMessage("");
  }

  async function uploadLogo(file: File) {
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setMessage("Logo invalido. Usa PNG, JPG, WebP o SVG.");
      return;
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setMessage("El logotipo no debe superar 2 MB.");
      return;
    }

    setUploadingLogo(true);
    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const partnerSlug =
      form.commercial_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
      "aliado";
    const filePath = `${partnerSlug}/${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from(BUCKET).upload(filePath, file, {
      upsert: true,
    });

    if (error) {
      setMessage(`Error subiendo logo: ${error.message}`);
      setUploadingLogo(false);
      return;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    setForm((current) => ({
      ...current,
      logo_url: data.publicUrl || current.logo_url,
      logo_storage_path: filePath,
    }));
    setUploadingLogo(false);
  }

  async function savePartner() {
    if (!form.commercial_name.trim()) {
      setMessage("Captura el nombre comercial del aliado.");
      return;
    }

    if (!isHexColor(form.primary_color)) {
      setMessage("El color principal debe estar en formato HEX, por ejemplo #1E5AA8.");
      return;
    }

    if (form.secondary_color && !isHexColor(form.secondary_color)) {
      setMessage("El color secundario debe estar en formato HEX.");
      return;
    }

    const savedBillingClientId = selectedPartner?.default_billing_client_id
      ? String(selectedPartner.default_billing_client_id)
      : "";
    const savedBillToPartner = selectedPartner ? selectedPartner.bill_to_partner !== false : true;
    const billingChanged =
      billingAvailable &&
      (form.default_billing_client_id !== savedBillingClientId ||
        form.bill_to_partner !== savedBillToPartner);

    if (billingChanged && !canEditBilling) {
      setMessage("Solo admin o direccion pueden cambiar el receptor fiscal del aliado.");
      return;
    }

    if (billingChanged && selectedBillingClient && billingMissingFields.length > 0) {
      setMessage(
        `El cliente receptor tiene datos fiscales incompletos: ${formatMissingFiscalFields(billingMissingFields)}. Completalos en la ficha del cliente antes de asignarlo.`
      );
      return;
    }

    setSaving(true);
    setMessage("");

    const payload: Record<string, unknown> = {
      commercial_name: form.commercial_name.trim(),
      logo_url: form.logo_url.trim() || null,
      logo_storage_path: form.logo_storage_path,
      primary_color: form.primary_color,
      secondary_color: form.secondary_color || null,
      contact_name: form.contact_name.trim() || null,
      contact_email: form.contact_email.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    if (billingChanged) {
      payload.default_billing_client_id = form.default_billing_client_id
        ? Number(form.default_billing_client_id)
        : null;
      payload.bill_to_partner = form.bill_to_partner;
    }

    const result = form.id
      ? await supabase.from("commercial_partners").update(payload).eq("id", form.id)
      : await supabase.from("commercial_partners").insert(payload);

    if (result.error) {
      setMessage(`Error guardando aliado: ${result.error.message}`);
      setSaving(false);
      return;
    }

    await loadPartners();
    setMessage("Aliado guardado.");
    if (!form.id) resetForm();
    setSaving(false);
  }

  const previewLogo = form.logo_url || (selectedPartner ? getLogoUrl(selectedPartner) : "");

  return (
    <main className="min-h-screen bg-[#F7F6F3] px-5 py-10 text-[#111111] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <Link href="/settings" className="mb-8 inline-flex items-center gap-2 text-sm text-[#666666]">
          <ArrowLeft size={17} />
          Volver a configuracion
        </Link>

        <div className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
              Aliados comerciales
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-normal sm:text-5xl">
              Identidad visual para cotizaciones white label.
            </h1>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="w-fit rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[#111111]"
          >
            Nuevo aliado
          </button>
        </div>

        {message ? (
          <p className="mb-5 border border-black/10 bg-white px-4 py-3 text-sm text-[#555555]">
            {message}
          </p>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-3">
            {loading ? (
              <div className="border border-black/10 bg-white p-6 text-sm text-[#666666]">
                Cargando aliados...
              </div>
            ) : partners.length === 0 ? (
              <div className="border border-black/10 bg-white p-6 text-sm text-[#666666]">
                No hay aliados registrados.
              </div>
            ) : (
              partners.map((partner) => {
                const logoUrl = getLogoUrl(partner);

                return (
                  <button
                    key={partner.id}
                    type="button"
                    onClick={() => editPartner(partner)}
                    className="grid w-full grid-cols-[72px_minmax(0,1fr)_120px] items-center gap-5 border border-black/10 bg-white p-4 text-left transition hover:border-[#7A1F2B]/40"
                  >
                    <div className="flex h-14 w-14 items-center justify-center bg-[#F7F6F3]">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={partner.commercial_name}
                          className="max-h-12 max-w-12 object-contain"
                        />
                      ) : (
                        <ImagePlus size={18} className="text-[#888888]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{partner.commercial_name}</p>
                      <p className="mt-1 text-xs text-[#666666]">
                        {partner.contact_email || partner.contact_phone || "Sin contacto"}
                      </p>
                      {billingAvailable ? (
                        <p className="mt-1 truncate text-xs text-[#7A1F2B]">
                          {partner.bill_to_partner === false
                            ? "Factura al cliente final"
                            : partner.default_billing_client_id
                              ? `Factura a ${
                                  clientsById.get(partner.default_billing_client_id)
                                    ?.tax_business_name ||
                                  `cliente #${partner.default_billing_client_id}`
                                }`
                              : "Sin receptor fiscal"}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <span
                        className="h-6 w-6 rounded-full border border-black/10"
                        style={{ background: partner.primary_color }}
                      />
                      <span className="text-xs text-[#666666]">
                        {partner.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <aside className="border border-black/10 bg-white p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-semibold">
                {form.id ? "Editar aliado" : "Nuevo aliado"}
              </h2>
              <button
                type="button"
                onClick={savePartner}
                disabled={saving || uploadingLogo}
                className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? "Guardando" : "Guardar"}
              </button>
            </div>

            <div className="space-y-4">
              <label className="block text-sm">
                <span className="mb-2 block text-[#666666]">Nombre comercial</span>
                <input
                  className="w-full border border-black/10 bg-[#F7F6F3] px-4 py-3 outline-none"
                  value={form.commercial_name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, commercial_name: event.target.value }))
                  }
                />
              </label>

              <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-4">
                <div className="flex h-24 w-24 items-center justify-center border border-black/10 bg-[#F7F6F3]">
                  {previewLogo ? (
                    <img
                      src={previewLogo}
                      alt={form.commercial_name || "Aliado"}
                      className="max-h-20 max-w-20 object-contain"
                    />
                  ) : (
                    <ImagePlus size={24} className="text-[#888888]" />
                  )}
                </div>
                <label className="block text-sm">
                  <span className="mb-2 block text-[#666666]">Logotipo</span>
                  <input
                    type="file"
                    accept={ALLOWED_LOGO_TYPES.join(",")}
                    className="w-full text-sm"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) uploadLogo(file);
                    }}
                  />
                  <input
                    className="mt-3 w-full border border-black/10 bg-[#F7F6F3] px-4 py-3 outline-none"
                    placeholder="O pega una URL publica"
                    value={form.logo_url}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, logo_url: event.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-2 block text-[#666666]">Color principal</span>
                  <input
                    type="color"
                    className="h-12 w-full border border-black/10 bg-[#F7F6F3]"
                    value={form.primary_color}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, primary_color: event.target.value }))
                    }
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-2 block text-[#666666]">Color secundario</span>
                  <input
                    type="color"
                    className="h-12 w-full border border-black/10 bg-[#F7F6F3]"
                    value={form.secondary_color}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, secondary_color: event.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="border-t border-black/10 pt-4">
                <div className="mb-4 h-20 p-4" style={{ background: form.primary_color }}>
                  {previewLogo ? (
                    <img src={previewLogo} alt="" className="h-12 max-w-36 object-contain" />
                  ) : null}
                </div>
                <p className="text-lg font-semibold" style={{ color: form.secondary_color }}>
                  {form.commercial_name || "Nombre del aliado"}
                </p>
              </div>

              <label className="block text-sm">
                <span className="mb-2 block text-[#666666]">Contacto</span>
                <input
                  className="w-full border border-black/10 bg-[#F7F6F3] px-4 py-3 outline-none"
                  value={form.contact_name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, contact_name: event.target.value }))
                  }
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <input
                  className="border border-black/10 bg-[#F7F6F3] px-4 py-3 outline-none"
                  placeholder="Email"
                  value={form.contact_email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, contact_email: event.target.value }))
                  }
                />
                <input
                  className="border border-black/10 bg-[#F7F6F3] px-4 py-3 outline-none"
                  placeholder="Telefono"
                  value={form.contact_phone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, contact_phone: event.target.value }))
                  }
                />
              </div>

              <label className="flex items-center gap-3 text-sm text-[#666666]">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, is_active: event.target.checked }))
                  }
                />
                Activo para cotizaciones
              </label>

              {billingAvailable ? (
                <PartnerBillingSection
                  form={form}
                  clients={billingClients}
                  selectedClient={selectedBillingClient}
                  missingFields={billingMissingFields}
                  canEdit={canEditBilling}
                  onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
                />
              ) : (
                <p className="border-t border-black/10 pt-4 text-xs text-[#888888]">
                  El receptor fiscal del aliado estara disponible al aplicar la migracion
                  20261104130000_commercial_partner_billing.sql.
                </p>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function PartnerBillingSection({
  form,
  clients,
  selectedClient,
  missingFields,
  canEdit,
  onChange,
}: {
  form: PartnerForm;
  clients: FiscalClientData[];
  selectedClient: FiscalClientData | null;
  missingFields: string[];
  canEdit: boolean;
  onChange: (patch: Partial<PartnerForm>) => void;
}) {
  const rows: [string, string][] = selectedClient
    ? [
        ["RFC", selectedClient.tax_rfc?.trim().toUpperCase() || "Pendiente"],
        ["Razon social", selectedClient.tax_business_name?.trim() || "Pendiente"],
        ["Regimen", getFiscalRegimeCode(selectedClient) || "Pendiente"],
        ["CP fiscal", selectedClient.tax_zip_code?.trim() || "Pendiente"],
        ["Uso CFDI", getCfdiUseCode(selectedClient) || "Pendiente"],
      ]
    : [];

  return (
    <div className="space-y-4 border-t border-black/10 pt-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
          Facturacion
        </p>
        <p className="mt-2 text-sm text-[#666666]">
          Los proyectos vendidos via este aliado se facturan a este receptor. El cliente
          final del proyecto no cambia.
        </p>
      </div>

      <label className="flex items-center gap-3 text-sm text-[#666666]">
        <input
          type="checkbox"
          checked={form.bill_to_partner}
          disabled={!canEdit}
          onChange={(event) => onChange({ bill_to_partner: event.target.checked })}
        />
        Facturar al aliado
      </label>

      <label className="block text-sm">
        <span className="mb-2 block text-[#666666]">Cliente receptor</span>
        <select
          className="w-full border border-black/10 bg-[#F7F6F3] px-4 py-3 outline-none disabled:opacity-60"
          value={form.default_billing_client_id}
          disabled={!canEdit}
          onChange={(event) => onChange({ default_billing_client_id: event.target.value })}
        >
          <option value="">Sin receptor</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {getClientLabel(client)}
            </option>
          ))}
        </select>
      </label>

      {selectedClient ? (
        <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-[#888888]">{label}</dt>
              <dd className={value === "Pendiente" ? "text-[#9E1B32]" : "text-[#111111]"}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {selectedClient && missingFields.length > 0 ? (
        <p className="text-sm text-[#9E1B32]">
          Datos fiscales incompletos: {formatMissingFiscalFields(missingFields)}.
        </p>
      ) : null}

      {form.bill_to_partner && !selectedClient ? (
        <p className="text-sm text-[#9E1B32]">
          Sin receptor: las facturas de este aliado no se podran preseleccionar.
        </p>
      ) : null}

      {!canEdit ? (
        <p className="text-xs text-[#888888]">
          Solo admin o direccion pueden cambiar el receptor.
        </p>
      ) : null}
    </div>
  );
}
