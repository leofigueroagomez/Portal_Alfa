"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ImagePlus, Save } from "lucide-react";
import { supabase } from "@/services/supabase";

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
};

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
};

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

  const selectedPartner = useMemo(
    () => partners.find((partner) => partner.id === form.id) || null,
    [form.id, partners]
  );

  async function loadPartners() {
    setLoading(true);
    const { data, error } = await supabase
      .from("commercial_partners")
      .select(
        "id, commercial_name, logo_url, logo_storage_path, primary_color, secondary_color, contact_name, contact_email, contact_phone, is_active"
      )
      .order("commercial_name", { ascending: true });

    if (error) {
      setMessage(`Error cargando aliados: ${error.message}`);
      setLoading(false);
      return;
    }

    setPartners((data || []) as CommercialPartner[]);
    setLoading(false);
  }

  useEffect(() => {
    loadPartners();
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

    setSaving(true);
    setMessage("");

    const payload = {
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
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
