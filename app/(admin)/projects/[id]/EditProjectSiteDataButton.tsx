"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { supabase } from "@/services/supabase";

type Props = {
  projectId: number;
  initialSiteContactName?: string | null;
  initialSiteContactPhone?: string | null;
  initialSiteAddress?: string | null;
  initialSiteGoogleMapsUrl?: string | null;
};

function normalizeValue(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

function reportError(step: string, error: unknown) {
  const message =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
      ? ` ${error.message}`
      : "";

  console.error(`Error en ${step}:`, error);
  alert(`Error en ${step}: ${JSON.stringify(error)}${message}`);
}

export default function EditProjectSiteDataButton({
  projectId,
  initialSiteContactName,
  initialSiteContactPhone,
  initialSiteAddress,
  initialSiteGoogleMapsUrl,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [siteContactName, setSiteContactName] = useState(initialSiteContactName || "");
  const [siteContactPhone, setSiteContactPhone] = useState(initialSiteContactPhone || "");
  const [siteAddress, setSiteAddress] = useState(initialSiteAddress || "");
  const [siteGoogleMapsUrl, setSiteGoogleMapsUrl] = useState(
    initialSiteGoogleMapsUrl || ""
  );

  async function handleSave() {
    setSaving(true);

    const { error } = await supabase
      .from("client_projects")
      .update({
        site_contact_name: normalizeValue(siteContactName),
        site_contact_phone: normalizeValue(siteContactPhone),
        site_address: normalizeValue(siteAddress),
        site_google_maps_url: normalizeValue(siteGoogleMapsUrl),
      })
      .eq("id", projectId);

    setSaving(false);

    if (error) {
      reportError("guardar datos de obra", error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-sm font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
      >
        <Pencil size={16} />
        Editar datos
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 sm:items-center sm:justify-center">
          <div className="w-full max-w-2xl rounded-2xl border border-[#2A2A30] bg-[#151518] p-5 text-white shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Datos de obra</h2>
                <p className="mt-1 text-sm text-[#B3B3B8]">
                  Esta informacion aparece en ordenes de trabajo y listados operativos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#2A2A30] bg-[#222228] text-[#B3B3B8] hover:text-white"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Contacto en sitio</span>
                <input
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={siteContactName}
                  onChange={(event) => setSiteContactName(event.target.value)}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-[#B3B3B8]">Telefono contacto</span>
                <input
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={siteContactPhone}
                  onChange={(event) => setSiteContactPhone(event.target.value)}
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-[#B3B3B8]">Direccion de obra</span>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={siteAddress}
                  onChange={(event) => setSiteAddress(event.target.value)}
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm text-[#B3B3B8]">Google Maps</span>
                <input
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
                  value={siteGoogleMapsUrl}
                  onChange={(event) => setSiteGoogleMapsUrl(event.target.value)}
                  placeholder="https://maps.google.com/..."
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
              >
                {saving ? "Guardando..." : "Guardar datos"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
