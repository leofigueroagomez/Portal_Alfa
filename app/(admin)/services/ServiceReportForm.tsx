"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { supabase } from "@/services/supabase";

export type ServiceClient = {
  id: number;
  client_number: number | null;
  name: string | null;
};

export type ServiceProject = {
  id: number;
  client_id: number | null;
  project_number: number | null;
  name: string | null;
};

export type ExistingServicePhoto = {
  id: number;
  image_url: string | null;
  caption: string | null;
  sort_order: number | null;
  displayUrl?: string;
};

export type ServiceReportInitial = {
  id: number;
  service_number: string | null;
  client_id: number | null;
  client_project_id: number | null;
  service_location: string | null;
  google_maps_url: string | null;
  performed_by_name: string | null;
  service_date: string | null;
  background: string | null;
  diagnosis: string | null;
  solution_status: string | null;
  solution_description: string | null;
  requires_parts: boolean | null;
  required_parts_notes: string | null;
  technician_cost_mxn: number | null;
  status: string | null;
};

type NewPhoto = {
  file: File;
  previewUrl: string;
  caption: string;
};

type Props = {
  mode: "new" | "edit";
  clients: ServiceClient[];
  projects: ServiceProject[];
  initialReport?: ServiceReportInitial | null;
  existingPhotos?: ExistingServicePhoto[];
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function serviceNumber(id: number) {
  return `SERV-${String(id).padStart(4, "0")}`;
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

function safeExt(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export default function ServiceReportForm({
  mode,
  clients,
  projects,
  initialReport,
  existingPhotos = [],
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [clientId, setClientId] = useState(initialReport?.client_id ? String(initialReport.client_id) : "");
  const [projectId, setProjectId] = useState(
    initialReport?.client_project_id ? String(initialReport.client_project_id) : ""
  );
  const [serviceLocation, setServiceLocation] = useState(initialReport?.service_location || "");
  const [googleMapsUrl, setGoogleMapsUrl] = useState(initialReport?.google_maps_url || "");
  const [performedByName, setPerformedByName] = useState(initialReport?.performed_by_name || "");
  const [serviceDate, setServiceDate] = useState(initialReport?.service_date || today());
  const [background, setBackground] = useState(initialReport?.background || "");
  const [diagnosis, setDiagnosis] = useState(initialReport?.diagnosis || "");
  const [solutionStatus, setSolutionStatus] = useState(initialReport?.solution_status || "pending");
  const [solutionDescription, setSolutionDescription] = useState(initialReport?.solution_description || "");
  const [requiresParts, setRequiresParts] = useState(Boolean(initialReport?.requires_parts));
  const [requiredPartsNotes, setRequiredPartsNotes] = useState(initialReport?.required_parts_notes || "");
  const [technicianCostMxn, setTechnicianCostMxn] = useState(String(initialReport?.technician_cost_mxn || 0));
  const [status, setStatus] = useState(initialReport?.status || "draft");
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);
  const [photoList, setPhotoList] = useState(existingPhotos);
  const availableProjects = useMemo(
    () =>
      clientId
        ? projects.filter((project) => String(project.client_id || "") === clientId)
        : [],
    [clientId, projects]
  );
  const laborSaleMxn = (Number(technicianCostMxn) || 0) * 2;

  useEffect(() => {
    if (projectId && !availableProjects.some((project) => String(project.id) === projectId)) {
      setProjectId("");
    }
  }, [availableProjects, projectId]);

  function addPhotos(files: FileList | null) {
    if (!files?.length) return;

    const photos = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        caption: "",
      }));

    if (photos.length === 0) {
      alert("Selecciona imagenes validas.");
      return;
    }

    setNewPhotos((current) => [...current, ...photos]);
  }

  function removeNewPhoto(index: number) {
    setNewPhotos((current) => {
      const photo = current[index];
      if (photo) URL.revokeObjectURL(photo.previewUrl);
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
  }

  async function removeExistingPhoto(photoId: number) {
    const confirmed = window.confirm("Eliminar esta foto del reporte?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("service_report_photos")
      .delete()
      .eq("id", photoId);

    if (error) {
      reportError("eliminar foto", error);
      return;
    }

    setPhotoList((current) => current.filter((photo) => photo.id !== photoId));
  }

  async function uploadPhotos(reportId: number) {
    const rows = [];

    for (const [index, photo] of newPhotos.entries()) {
      const path = `services/${reportId}/${Date.now()}-${index}.${safeExt(photo.file)}`;
      const { error } = await supabase.storage
        .from("project-photos")
        .upload(path, photo.file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      rows.push({
        service_report_id: reportId,
        image_url: path,
        caption: photo.caption.trim() || null,
        sort_order: photoList.length + index,
      });
    }

    if (rows.length > 0) {
      const { error } = await supabase.from("service_report_photos").insert(rows);
      if (error) throw error;
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!clientId) {
      alert("Selecciona un cliente.");
      return;
    }

    if (!performedByName.trim()) {
      alert("Captura quien realizo el servicio.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setSaving(false);
      reportError("leer usuario", userError);
      return;
    }

    const payload = {
      client_id: Number(clientId),
      client_project_id: projectId ? Number(projectId) : null,
      service_location: serviceLocation.trim() || null,
      google_maps_url: googleMapsUrl.trim() || null,
      performed_by_name: performedByName.trim() || null,
      service_date: serviceDate,
      background: background.trim() || null,
      diagnosis: diagnosis.trim() || null,
      solution_status: solutionStatus,
      solution_description: solutionDescription.trim() || null,
      requires_parts: requiresParts,
      required_parts_notes: requiresParts ? requiredPartsNotes.trim() || null : null,
      technician_cost_mxn: Number(technicianCostMxn) || 0,
      labor_sale_mxn: laborSaleMxn,
      status,
      updated_at: new Date().toISOString(),
    };

    try {
      let reportId = initialReport?.id || null;

      if (mode === "new") {
        const { data, error } = await supabase
          .from("service_reports")
          .insert({
            ...payload,
            service_number: null,
            created_by_user_id: user?.id || null,
          })
          .select("id")
          .single();

        if (error || !data) throw error || { message: "No se recibio servicio" };
        reportId = Number(data.id);
        const createdReportId = Number(data.id);

        const { error: numberError } = await supabase
          .from("service_reports")
          .update({ service_number: serviceNumber(createdReportId) })
          .eq("id", createdReportId);

        if (numberError) throw numberError;
      } else if (reportId) {
        const { error } = await supabase
          .from("service_reports")
          .update(payload)
          .eq("id", reportId);

        if (error) throw error;
      }

      if (!reportId) throw { message: "Reporte no disponible" };

      await uploadPhotos(reportId);
      router.push(`/services/${reportId}`);
      router.refresh();
    } catch (error) {
      setSaving(false);
      reportError("guardar reporte de servicio", error);
      return;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
        <h2 className="mb-5 text-2xl font-semibold">Datos del servicio</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <select
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
          >
            <option value="">Cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {String(client.client_number || "").padStart(3, "0")} -{" "}
                {client.name || "Sin nombre"}
              </option>
            ))}
          </select>

          <select
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none disabled:text-[#77777D]"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            disabled={!clientId}
          >
            <option value="">Proyecto opcional</option>
            {availableProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {String(project.project_number || "").padStart(3, "0")} -{" "}
                {project.name || "Sin proyecto"}
              </option>
            ))}
          </select>

          <input
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            value={serviceLocation}
            onChange={(event) => setServiceLocation(event.target.value)}
            placeholder="Ubicacion del servicio"
          />
          <input
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            value={googleMapsUrl}
            onChange={(event) => setGoogleMapsUrl(event.target.value)}
            placeholder="URL Google Maps"
          />
          <input
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            value={performedByName}
            onChange={(event) => setPerformedByName(event.target.value)}
            placeholder="Tecnico / responsable"
          />
          <input
            type="date"
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            value={serviceDate}
            onChange={(event) => setServiceDate(event.target.value)}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
        <h2 className="mb-5 text-2xl font-semibold">Reporte tecnico</h2>
        <div className="grid grid-cols-1 gap-4">
          <textarea
            className="min-h-28 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            value={background}
            onChange={(event) => setBackground(event.target.value)}
            placeholder="Antecedentes / motivo del servicio"
          />
          <textarea
            className="min-h-28 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            value={diagnosis}
            onChange={(event) => setDiagnosis(event.target.value)}
            placeholder="Diagnostico"
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <select
              className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={solutionStatus}
              onChange={(event) => setSolutionStatus(event.target.value)}
            >
              <option value="solved">Solucionado</option>
              <option value="not_solved">No solucionado</option>
              <option value="pending">Pendiente</option>
            </select>
            <select
              className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="draft">Borrador</option>
              <option value="pending">Pendiente</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
          <textarea
            className="min-h-28 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            value={solutionDescription}
            onChange={(event) => setSolutionDescription(event.target.value)}
            placeholder="Descripcion de solucion"
          />
          <label className="flex items-center gap-3 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3">
            <input
              type="checkbox"
              checked={requiresParts}
              onChange={(event) => setRequiresParts(event.target.checked)}
            />
            Requiere refacciones
          </label>
          {requiresParts ? (
            <textarea
              className="min-h-24 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={requiredPartsNotes}
              onChange={(event) => setRequiredPartsNotes(event.target.value)}
              placeholder="Notas de refacciones requeridas"
            />
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
        <h2 className="mb-5 text-2xl font-semibold">Costo de servicio</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Costo tecnico MXN interno</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={technicianCostMxn}
              onChange={(event) => setTechnicianCostMxn(event.target.value)}
            />
          </label>
          <div className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
            <p className="text-sm text-[#B3B3B8]">Venta mano de obra / visita</p>
            <p className="mt-2 text-2xl font-bold text-[#8CE0B6]">
              {formatCurrency(laborSaleMxn, "MXN")}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold">Fotos de evidencia</h2>
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-sm font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white">
            <Camera size={16} />
            Agregar fotos
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(event) => {
                addPhotos(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photoList.map((photo) => (
            <figure key={photo.id} className="overflow-hidden rounded-xl border border-[#2A2A30] bg-[#222228]">
              {photo.displayUrl ? (
                <img src={photo.displayUrl} alt={photo.caption || "Evidencia"} className="h-40 w-full object-cover" />
              ) : null}
              <figcaption className="flex items-center justify-between gap-3 p-3 text-sm text-[#B3B3B8]">
                <span>{photo.caption || "Sin caption"}</span>
                {mode === "edit" ? (
                  <button type="button" onClick={() => removeExistingPhoto(photo.id)} className="text-[#F28B82]">
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </figcaption>
            </figure>
          ))}

          {newPhotos.map((photo, index) => (
            <div key={photo.previewUrl} className="overflow-hidden rounded-xl border border-[#2A2A30] bg-[#222228]">
              <img src={photo.previewUrl} alt="Nueva evidencia" className="h-40 w-full object-cover" />
              <div className="space-y-2 p-3">
                <input
                  className="w-full rounded-lg border border-[#2A2A30] bg-[#151518] px-3 py-2 text-sm outline-none"
                  value={photo.caption}
                  onChange={(event) =>
                    setNewPhotos((current) =>
                      current.map((item, currentIndex) =>
                        currentIndex === index ? { ...item, caption: event.target.value } : item
                      )
                    )
                  }
                  placeholder="Caption opcional"
                />
                <button
                  type="button"
                  onClick={() => removeNewPhoto(index)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#2A2A30] px-3 py-2 text-sm text-[#B3B3B8]"
                >
                  <Trash2 size={15} />
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-[#9E1B32] px-5 py-4 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
      >
        {saving ? "Guardando..." : "Guardar reporte de servicio"}
      </button>
    </form>
  );
}
