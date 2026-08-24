"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  Laptop,
  Mail,
  MapPin,
  Send,
  Sparkles,
  Trash2,
  Upload,
  User,
  Users,
} from "lucide-react";
import { getMexicoDate } from "@/lib/mexicoDate";
import {
  buildGoogleCalendarUrl,
  buildTechnicianAssignmentWhatsAppMessage,
} from "@/lib/googleCalendar";
import { supabase } from "@/services/supabase";
import { notifyContractorAction } from "./[id]/actions";

export type ServiceClient = {
  id: number;
  client_number: number | null;
  name: string | null;
};

export type ServiceContractor = {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  specialty: string | null;
};

export type ServiceProject = {
  id: number;
  client_id: number | null;
  project_number: number | null;
  name: string | null;
  site_address?: string | null;
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
  contractor_id?: number | null;
  is_remote?: boolean | null;
  requester_name?: string | null;
  requester_phone?: string | null;
  scheduled_time_start?: string | null;
  scheduled_time_end?: string | null;
  technician_phone?: string | null;
  service_location: string | null;
  google_maps_url: string | null;
  performed_by_name: string | null;
  service_date: string | null;
  background: string | null;
  diagnosis: string | null;
  solution_status: string | null;
  solution_description: string | null;
  recommendations?: string | null;
  status: string | null;
};

type ScheduledItem = {
  id: number;
  service_number: string | null;
  performed_by_name: string | null;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  is_remote: boolean;
  status: string | null;
  clients: { name: string | null } | null;
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
  contractors?: ServiceContractor[];
  initialReport?: ServiceReportInitial | null;
  existingPhotos?: ExistingServicePhoto[];
};

function today() {
  return getMexicoDate();
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
  contractors = [],
  initialReport,
  existingPhotos = [],
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  // Ticket & Modalidad
  const [isRemote, setIsRemote] = useState(Boolean(initialReport?.is_remote));
  const [requesterName, setRequesterName] = useState(
    initialReport?.requester_name || ""
  );
  const [requesterPhone, setRequesterPhone] = useState(
    initialReport?.requester_phone || ""
  );

  // Subcontratista y Asignación
  const [contractorId, setContractorId] = useState<string>(
    initialReport?.contractor_id ? String(initialReport.contractor_id) : ""
  );
  const [notifyContractorByEmail, setNotifyContractorByEmail] = useState<boolean>(true);

  // Programación de Horario y Asignación
  const [serviceDate, setServiceDate] = useState(
    initialReport?.service_date || today()
  );
  const [timeStart, setTimeStart] = useState(
    initialReport?.scheduled_time_start || "10:00"
  );
  const [timeEnd, setTimeEnd] = useState(
    initialReport?.scheduled_time_end || "12:00"
  );
  const [performedByName, setPerformedByName] = useState(
    initialReport?.performed_by_name || ""
  );
  const [technicianPhone, setTechnicianPhone] = useState(
    initialReport?.technician_phone || ""
  );

  // Cliente y Ubicación
  const [clientId, setClientId] = useState(
    initialReport?.client_id ? String(initialReport.client_id) : ""
  );
  const [projectId, setProjectId] = useState(
    initialReport?.client_project_id ? String(initialReport.client_project_id) : ""
  );
  const [serviceLocation, setServiceLocation] = useState(
    initialReport?.service_location || ""
  );
  const [googleMapsUrl, setGoogleMapsUrl] = useState(
    initialReport?.google_maps_url || ""
  );

  // Antecedentes y Reporte Técnico
  const [background, setBackground] = useState(
    initialReport?.background || ""
  );
  const [diagnosis, setDiagnosis] = useState(
    initialReport?.diagnosis || ""
  );
  const [solutionStatus, setSolutionStatus] = useState(
    initialReport?.solution_status === "solved" ? "solved" : "pending"
  );
  const [solutionDescription, setSolutionDescription] = useState(
    initialReport?.solution_description || ""
  );
  const [recommendations, setRecommendations] = useState(
    initialReport?.recommendations || ""
  );

  // Status para técnico: por defecto 'in_progress' o 'pending_signature'.
  const [status, setStatus] = useState(
    initialReport?.status || (mode === "new" ? "in_progress" : "pending_signature")
  );

  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);
  const [photoList, setPhotoList] = useState(existingPhotos);

  // Agenda del día seleccionado
  const [daySchedule, setDaySchedule] = useState<ScheduledItem[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Modal de Éxito Post-Creación con enlaces de Calendar y WhatsApp
  const [createdTicketData, setCreatedTicketData] = useState<{
    id: number;
    folio: string;
    clientName: string;
    calendarUrl: string;
    waTechUrl: string;
  } | null>(null);

  const availableProjects = useMemo(
    () =>
      clientId
        ? projects.filter((project) => String(project.client_id || "") === clientId)
        : [],
    [clientId, projects]
  );

  const selectedProject = useMemo(
    () => projects.find((p) => String(p.id) === projectId),
    [projectId, projects]
  );

  const selectedClient = useMemo(
    () => clients.find((c) => String(c.id) === clientId),
    [clientId, clients]
  );

  useEffect(() => {
    if (projectId && !availableProjects.some((project) => String(project.id) === projectId)) {
      setProjectId("");
    }
  }, [availableProjects, projectId]);

  // Consulta en vivo de la agenda para el día seleccionado
  useEffect(() => {
    if (!serviceDate) return;

    let cancelled = false;
    async function fetchDaySchedule() {
      setLoadingSchedule(true);
      const { data, error } = await supabase
        .from("service_reports")
        .select(`
          id,
          service_number,
          performed_by_name,
          scheduled_time_start,
          scheduled_time_end,
          is_remote,
          status,
          clients:client_id ( name )
        `)
        .eq("service_date", serviceDate)
        .order("scheduled_time_start", { ascending: true });

      if (!cancelled) {
        setLoadingSchedule(false);
        if (!error && data) {
          // Filtrar el reporte actual si está en edición
          const filtered = initialReport?.id
            ? data.filter((item: any) => item.id !== initialReport.id)
            : data;
          setDaySchedule(filtered as unknown as ScheduledItem[]);
        }
      }
    }

    fetchDaySchedule();
    return () => {
      cancelled = true;
    };
  }, [serviceDate, initialReport?.id]);

  // Autocompletado / Geolocalización con GPS y Google Maps
  async function handleGetCurrentLocation() {
    if (!navigator.geolocation) {
      alert("Tu navegador no soporta geolocalización.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
        setGoogleMapsUrl(mapsLink);

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.display_name && !serviceLocation.trim()) {
              setServiceLocation(data.display_name);
            }
          }
        } catch (e) {
          console.warn("No se pudo obtener el nombre de la calle automáticamente:", e);
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        console.error("Error obteniendo GPS:", err);
        alert("No se pudo obtener la ubicación GPS. Por favor permite el acceso a ubicación o escríbela manualmente.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function handleGenerateMapsUrl() {
    if (!serviceLocation.trim()) {
      alert("Escribe primero una dirección o nombre de lugar.");
      return;
    }
    const generated = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      serviceLocation.trim()
    )}`;
    setGoogleMapsUrl(generated);
  }

  function handleUseProjectAddress() {
    if (selectedProject?.site_address) {
      setServiceLocation(selectedProject.site_address);
      setGoogleMapsUrl(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          selectedProject.site_address
        )}`
      );
    }
  }

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
      alert("Selecciona imágenes válidas.");
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
    const confirmed = window.confirm("¿Deseas eliminar esta foto de evidencia?");
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
      alert("Por favor selecciona un cliente.");
      return;
    }

    if (!performedByName.trim()) {
      alert("Captura el nombre del técnico responsable.");
      return;
    }

    if (!isRemote && !serviceLocation.trim() && !googleMapsUrl.trim()) {
      alert("Para servicios presenciales, por favor ingresa la ubicación o el enlace de Google Maps.");
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
      contractor_id: contractorId ? Number(contractorId) : null,
      is_remote: isRemote,
      requester_name: requesterName.trim() || null,
      requester_phone: requesterPhone.trim() || null,
      scheduled_time_start: timeStart.trim() || null,
      scheduled_time_end: timeEnd.trim() || null,
      technician_phone: technicianPhone.trim() || null,
      service_location: isRemote ? null : serviceLocation.trim() || null,
      google_maps_url: isRemote ? null : googleMapsUrl.trim() || null,
      performed_by_name: performedByName.trim() || null,
      service_date: serviceDate,
      background: background.trim() || null,
      diagnosis: diagnosis.trim() || null,
      solution_status: solutionStatus,
      solution_description: solutionDescription.trim() || null,
      recommendations: recommendations.trim() || null,
      status: status === "completed" ? "completed" : status,
      updated_at: new Date().toISOString(),
    };

    try {
      let reportId = initialReport?.id || null;
      let finalFolio = initialReport?.service_number || "";

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

        if (error || !data) throw error || { message: "No se pudo crear el ticket de servicio" };
        reportId = Number(data.id);
        finalFolio = serviceNumber(reportId);

        const { error: numberError } = await supabase
          .from("service_reports")
          .update({ service_number: finalFolio })
          .eq("id", reportId);

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

      // Si se asignó un contratista y se marcó notificar por correo, enviamos notificación
      if (contractorId && notifyContractorByEmail) {
        notifyContractorAction(reportId, Number(contractorId)).catch((e) =>
          console.debug("[NotifyContractor] Error sending assignment email:", e)
        );
      }

      // Si es nuevo, preparamos los links para el modal interactivo de Calendar & WhatsApp
      const clientNameStr = selectedClient?.name || "Cliente";
      const appBaseUrl =
        typeof window !== "undefined" ? window.location.origin : "https://www.alfait.com.mx";
      const serviceUrl = `${appBaseUrl}/portal/services/${reportId}`;

      const calendarUrl = buildGoogleCalendarUrl({
        serviceNumber: finalFolio,
        clientName: clientNameStr,
        requesterName,
        requesterPhone,
        technicianName: performedByName,
        serviceDate,
        startTime: timeStart,
        endTime: timeEnd,
        isRemote,
        serviceLocation,
        googleMapsUrl,
        background,
        serviceUrl,
      });

      const { waUrl: waTechUrl } = buildTechnicianAssignmentWhatsAppMessage({
        serviceNumber: finalFolio,
        clientName: clientNameStr,
        requesterName,
        requesterPhone,
        technicianName: performedByName,
        serviceDate,
        startTime: timeStart,
        endTime: timeEnd,
        isRemote,
        serviceLocation,
        googleMapsUrl,
        background,
        serviceUrl,
      });

      if (mode === "new") {
        setCreatedTicketData({
          id: reportId,
          folio: finalFolio,
          clientName: clientNameStr,
          calendarUrl,
          waTechUrl: technicianPhone
            ? `https://wa.me/${technicianPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                buildTechnicianAssignmentWhatsAppMessage({
                  serviceNumber: finalFolio,
                  clientName: clientNameStr,
                  requesterName,
                  requesterPhone,
                  technicianName: performedByName,
                  serviceDate,
                  startTime: timeStart,
                  endTime: timeEnd,
                  isRemote,
                  serviceLocation,
                  googleMapsUrl,
                  background,
                  serviceUrl,
                }).text
              )}`
            : waTechUrl,
        });
      } else {
        router.push(`/services/${reportId}`);
        router.refresh();
      }
    } catch (error) {
      setSaving(false);
      reportError("guardar ticket de servicio", error);
      return;
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 1. Tipo de Servicio y Solicitante */}
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-7 shadow-xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#2A2A30] pb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <User size={20} className="text-[#9E1B32]" />
                Datos del Ticket y Solicitante
              </h2>
              <p className="mt-1 text-xs text-[#8E8E93]">
                Información de contacto de quien solicita la asistencia técnica.
              </p>
            </div>

            {/* Switch de Modalidad: Presencial vs Remoto */}
            <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-3 hover:border-[#9E1B32] transition">
              <input
                type="checkbox"
                checked={isRemote}
                onChange={(e) => setIsRemote(e.target.checked)}
                className="h-4 w-4 rounded border-[#2A2A30] text-[#9E1B32] focus:ring-[#9E1B32]"
              />
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Laptop size={16} className={isRemote ? "text-[#8CE0B6]" : "text-[#77777D]"} />
                <span>{isRemote ? "🛠️ SERVICIO REMOTO (Online)" : "📍 SERVICIO PRESENCIAL EN SITIO"}</span>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8E8E93] uppercase">
                Cliente <span className="text-[#9E1B32]">*</span>
              </label>
              <select
                className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3.5 text-sm text-white outline-none focus:border-[#9E1B32]"
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                required
              >
                <option value="">Selecciona un cliente...</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {String(client.client_number || "").padStart(3, "0")} - {client.name || "Sin nombre"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8E8E93] uppercase">
                Proyecto Vinculado (Opcional)
              </label>
              <select
                className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3.5 text-sm text-white outline-none focus:border-[#9E1B32] disabled:opacity-50"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                disabled={!clientId}
              >
                <option value="">Sin proyecto vinculado</option>
                {availableProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {String(project.project_number || "").padStart(3, "0")} - {project.name || "Sin nombre"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8E8E93] uppercase">
                Nombre de Quien Solicita el Servicio
              </label>
              <input
                className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3.5 text-sm text-white outline-none focus:border-[#9E1B32]"
                value={requesterName}
                onChange={(event) => setRequesterName(event.target.value)}
                placeholder="Ej. Ing. Roberto Gómez / Sra. Mariana"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8E8E93] uppercase">
                WhatsApp / Teléfono del Solicitante
              </label>
              <input
                type="tel"
                className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3.5 text-sm text-white outline-none focus:border-[#9E1B32]"
                value={requesterPhone}
                onChange={(event) => setRequesterPhone(event.target.value)}
                placeholder="10 dígitos (ej. 3312345678)"
              />
            </div>
          </div>
        </section>

        {/* 2. Programación, Horario y Comprobación de Agenda */}
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-7 shadow-xl space-y-6">
          <div className="border-b border-[#2A2A30] pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar size={20} className="text-[#9E1B32]" />
              Programación de Fecha, Horario y Agenda
            </h2>
            <p className="mt-1 text-xs text-[#8E8E93]">
              Define la fecha, el horario de atención y revisa la disponibilidad del equipo técnico.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-[#8E8E93] uppercase">
                Subcontratista / Empresa Asignada
              </label>
              <select
                className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3.5 text-sm text-white outline-none focus:border-[#9E1B32]"
                value={contractorId}
                onChange={(event) => {
                  const val = event.target.value;
                  setContractorId(val);
                  if (val) {
                    const c = contractors.find((item) => String(item.id) === val);
                    if (c) {
                      if (!performedByName || performedByName === "Técnico ALFA") {
                        setPerformedByName(c.name || "");
                      }
                      if (!technicianPhone && c.phone) {
                        setTechnicianPhone(c.phone);
                      }
                    }
                  }
                }}
              >
                <option value="">Personal Interno / Sin Subcontratista</option>
                {contractors.map((contractor) => (
                  <option key={contractor.id} value={contractor.id}>
                    {contractor.name} ({contractor.specialty || "Técnico / Integrador"})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8E8E93] uppercase">
                Fecha del Servicio <span className="text-[#9E1B32]">*</span>
              </label>
              <input
                type="date"
                className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3.5 text-sm text-white outline-none focus:border-[#9E1B32]"
                value={serviceDate}
                onChange={(event) => setServiceDate(event.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8E8E93] uppercase">
                Técnico Asignado <span className="text-[#9E1B32]">*</span>
              </label>
              <input
                className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3.5 text-sm text-white outline-none focus:border-[#9E1B32]"
                value={performedByName}
                onChange={(event) => setPerformedByName(event.target.value)}
                placeholder="Nombre del técnico responsable"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8E8E93] uppercase">
                Hora Inicio <span className="text-[#9E1B32]">*</span>
              </label>
              <input
                type="time"
                className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3.5 text-sm text-white outline-none focus:border-[#9E1B32]"
                value={timeStart}
                onChange={(event) => setTimeStart(event.target.value)}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8E8E93] uppercase">
                Hora Fin (Estimada)
              </label>
              <input
                type="time"
                className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3.5 text-sm text-white outline-none focus:border-[#9E1B32]"
                value={timeEnd}
                onChange={(event) => setTimeEnd(event.target.value)}
              />
            </div>

            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold text-[#8E8E93] uppercase">
                WhatsApp del Técnico (para envío de asignación)
              </label>
              <input
                type="tel"
                className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3.5 text-sm text-white outline-none focus:border-[#9E1B32]"
                value={technicianPhone}
                onChange={(event) => setTechnicianPhone(event.target.value)}
                placeholder="Teléfono del técnico (ej. 3398765432)"
              />
            </div>

            {contractorId && (
              <div className="lg:col-span-4 rounded-xl border border-[#2A2A30] bg-[#1A1A20] p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-[#F0B8C0]" />
                  <div>
                    <p className="text-xs font-medium text-white">
                      Notificar por correo electrónico al subcontratista
                    </p>
                    <p className="text-[11px] text-[#8A8A93]">
                      Se enviará el detalle operativo del servicio y el enlace directo a su portal técnico.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notifyContractorByEmail}
                  onChange={(e) => setNotifyContractorByEmail(e.target.checked)}
                  className="h-4 w-4 accent-[#9E1B32] rounded cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Widget de Comprobación de Agenda en Vivo para el Día Seleccionado */}
          <div className="rounded-xl border border-[#2A2A30] bg-[#121316] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-[#F4C66A]" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Agenda del Día: {serviceDate}
                </h4>
              </div>
              <span className="text-[11px] text-[#8E8E93]">
                {loadingSchedule
                  ? "Consultando disponibilidad..."
                  : daySchedule.length === 0
                    ? "✨ Sin otros servicios programados para este día"
                    : `${daySchedule.length} servicio(s) agendado(s)`}
              </span>
            </div>

            {daySchedule.length > 0 && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 pt-1">
                {daySchedule.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-[#2A2A30] bg-[#1C1D22] p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-white">
                      <span>{item.service_number || `SERV-${item.id}`}</span>
                      <span className="text-[#F4C66A]">
                        {item.scheduled_time_start || "10:00"} - {item.scheduled_time_end || "12:00"}
                      </span>
                    </div>
                    <p className="text-[#B3B3B8] truncate">{item.clients?.name || "Cliente"}</p>
                    <p className="text-[11px] text-[#8CE0B6]">
                      👷‍♂️ {item.performed_by_name || "Técnico ALFA"} {item.is_remote ? "(Remoto)" : "(En sitio)"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 3. Ubicación (Solo si no es remoto) */}
        {!isRemote && (
          <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-7 shadow-xl space-y-5">
            <div className="border-b border-[#2A2A30] pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MapPin size={20} className="text-[#9E1B32]" />
                Ubicación del Servicio Presencial
              </h2>
              <p className="mt-1 text-xs text-[#8E8E93]">
                Domicilio del cliente y coordenadas para el traslado técnico.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label className="text-xs font-semibold text-[#8E8E93] uppercase">
                    Domicilio / Sitio del Servicio
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleGetCurrentLocation}
                      disabled={locating}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2A30] bg-[#1C1D22] px-3 py-1.5 text-xs font-medium text-[#8CE0B6] hover:bg-[#25262C]"
                    >
                      <Compass size={14} className={locating ? "animate-spin" : ""} />
                      {locating ? "Localizando..." : "📍 Usar mi GPS"}
                    </button>

                    {selectedProject?.site_address && (
                      <button
                        type="button"
                        onClick={handleUseProjectAddress}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2A30] bg-[#1C1D22] px-3 py-1.5 text-xs font-medium text-[#F4C66A] hover:bg-[#25262C]"
                      >
                        <Building2 size={14} />
                        Usar dirección del proyecto
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleGenerateMapsUrl}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2A30] bg-[#1C1D22] px-3 py-1.5 text-xs font-medium text-[#B3B3B8] hover:text-white hover:bg-[#25262C]"
                    >
                      <Sparkles size={14} />
                      Generar link Google Maps
                    </button>
                  </div>
                </div>

                <input
                  className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3.5 text-sm text-white outline-none focus:border-[#9E1B32]"
                  value={serviceLocation}
                  onChange={(event) => setServiceLocation(event.target.value)}
                  placeholder="Ej. Franz Liszt 5160, La Estancia, Zapopan, Jalisco"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#8E8E93] uppercase">
                  Enlace de Google Maps (Navegación GPS)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3.5 text-sm text-white outline-none focus:border-[#9E1B32]"
                    value={googleMapsUrl}
                    onChange={(event) => setGoogleMapsUrl(event.target.value)}
                    placeholder="https://maps.google.com/?q=..."
                  />
                  {googleMapsUrl && (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-3.5 text-[#8CE0B6] hover:bg-[#25262C]"
                      title="Abrir mapa"
                    >
                      <ExternalLink size={18} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 4. Antecedentes y Motivo del Servicio */}
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-7 shadow-xl space-y-5">
          <div>
            <h2 className="text-xl font-bold text-white">Antecedentes y Falla Reportada</h2>
            <p className="mt-1 text-xs text-[#8E8E93]">
              Describe detalladamente el motivo de la solicitud o falla descrita por el cliente.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8E8E93] uppercase">
              Antecedentes / Motivo del Reporte <span className="text-[#9E1B32]">*</span>
            </label>
            <textarea
              className="min-h-24 w-full rounded-xl border border-[#2A2A30] bg-[#222228] p-4 text-sm text-white outline-none focus:border-[#9E1B32]"
              value={background}
              onChange={(event) => setBackground(event.target.value)}
              placeholder="Describe el problema reportado, sistemas afectados, observaciones preliminares..."
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8E8E93] uppercase">
              Diagnóstico Técnico en Sitio / Remoto
            </label>
            <textarea
              className="min-h-24 w-full rounded-xl border border-[#2A2A30] bg-[#222228] p-4 text-sm text-white outline-none focus:border-[#9E1B32]"
              value={diagnosis}
              onChange={(event) => setDiagnosis(event.target.value)}
              placeholder="Causa raíz identificada, mediciones, pruebas realizadas..."
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8E8E93] uppercase">
                Resultado del Servicio
              </label>
              <select
                className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3.5 text-sm text-white outline-none focus:border-[#9E1B32]"
                value={solutionStatus}
                onChange={(event) => setSolutionStatus(event.target.value)}
              >
                <option value="solved">✅ Solucionado</option>
                <option value="pending">⏳ Pendiente</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8E8E93] uppercase">
                Estado del Flujo
              </label>
              <select
                className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3.5 text-sm text-white outline-none focus:border-[#9E1B32]"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="in_progress">En proceso</option>
                <option value="pending_signature">Pendiente de firma del cliente</option>
                <option value="draft">Borrador</option>
                {initialReport?.status === "completed" && (
                  <option value="completed">Completado (Aprobado por Dirección)</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8E8E93] uppercase">
              Descripción de Solución y Trabajos Realizados
            </label>
            <textarea
              className="min-h-28 w-full rounded-xl border border-[#2A2A30] bg-[#222228] p-4 text-sm text-white outline-none focus:border-[#9E1B32]"
              value={solutionDescription}
              onChange={(event) => setSolutionDescription(event.target.value)}
              placeholder="Detalla las acciones correctivas, configuraciones, pruebas realizadas..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-[#8E8E93] uppercase">
              Recomendaciones para el Cliente
            </label>
            <textarea
              className="min-h-24 w-full rounded-xl border border-[#2A2A30] bg-[#222228] p-4 text-sm text-white outline-none focus:border-[#9E1B32]"
              value={recommendations}
              onChange={(event) => setRecommendations(event.target.value)}
              placeholder="Recomendaciones preventivas, cuidados o sugerencias técnicas..."
            />
          </div>
        </section>

        {/* 5. Fotos de Evidencia */}
        <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-7 shadow-xl">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#2A2A30] pb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Camera size={20} className="text-[#9E1B32]" />
                Evidencias Fotográficas
              </h2>
              <p className="mt-1 text-xs text-[#8E8E93]">
                Agrega fotografías nítidas del servicio (si aplica).
              </p>
            </div>

            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 text-xs font-bold text-white shadow-lg hover:bg-[#B91C3C]">
              <Upload size={16} />
              Tomar o Subir Fotos (HD)
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

          {photoList.length === 0 && newPhotos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#2A2A30] bg-[#101114] p-8 text-center text-[#77777D]">
              <Camera size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Sin fotos de evidencia adjuntas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {photoList.map((photo) => (
                <figure
                  key={photo.id}
                  className="overflow-hidden rounded-xl border border-[#2A2A30] bg-[#1C1D22] shadow-md"
                >
                  {photo.displayUrl && (
                    <img
                      src={photo.displayUrl}
                      alt={photo.caption || "Evidencia"}
                      className="h-48 w-full object-cover"
                    />
                  )}
                  <figcaption className="flex items-center justify-between gap-3 p-3.5 text-xs text-[#B3B3B8]">
                    <span className="truncate">{photo.caption || "Evidencia guardada"}</span>
                    {mode === "edit" && (
                      <button
                        type="button"
                        onClick={() => removeExistingPhoto(photo.id)}
                        className="text-[#F28B82] hover:text-red-400 p-1"
                        title="Eliminar foto"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </figcaption>
                </figure>
              ))}

              {newPhotos.map((photo, index) => (
                <div
                  key={photo.previewUrl}
                  className="overflow-hidden rounded-xl border border-[#1F7A4D]/50 bg-[#1C1D22] shadow-md"
                >
                  <img
                    src={photo.previewUrl}
                    alt="Nueva evidencia"
                    className="h-48 w-full object-cover"
                  />
                  <div className="space-y-2.5 p-3.5">
                    <input
                      className="w-full rounded-lg border border-[#2A2A30] bg-[#101114] px-3 py-2 text-xs text-white outline-none focus:border-[#9E1B32]"
                      value={photo.caption}
                      onChange={(event) =>
                        setNewPhotos((current) =>
                          current.map((item, currentIndex) =>
                            currentIndex === index
                              ? { ...item, caption: event.target.value }
                              : item
                          )
                        )
                      }
                      placeholder="Descripción de la foto"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewPhoto(index)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#2A2A30] bg-[#101114] py-1.5 text-xs text-[#F28B82] hover:bg-[#251B1B]"
                    >
                      <Trash2 size={14} />
                      Quitar foto
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Botón de Guardar / Levantar Ticket */}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-[#9E1B32] px-6 py-4 text-base font-bold text-white shadow-xl hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D] transition"
        >
          {saving
            ? "Guardando ticket y agendando..."
            : mode === "new"
              ? "Levantar Ticket y Agendar Servicio"
              : "Guardar Cambios del Servicio"}
        </button>
      </form>

      {/* Modal Post-Creación de Ticket: Google Calendar & WhatsApp Técnico */}
      {createdTicketData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-[#2A2A30] bg-[#151518] p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#143D2A] text-[#8CE0B6] mx-auto border border-[#1F7A4D]">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-2xl font-bold text-white">¡Ticket Generado con Éxito!</h3>
              <p className="text-sm text-[#8E8E93]">
                Folio <strong className="text-white">{createdTicketData.folio}</strong> para{" "}
                <strong className="text-white">{createdTicketData.clientName}</strong>
              </p>
            </div>

            <div className="space-y-3">
              {/* Botón 1: Google Calendar */}
              <a
                href={createdTicketData.calendarUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-4 text-white hover:border-[#4285F4] hover:bg-[#1E2530] transition group"
              >
                <div className="flex items-center gap-3">
                  <Calendar size={22} className="text-[#4285F4]" />
                  <div className="text-left">
                    <p className="text-sm font-bold">1. Agendar en Google Calendar</p>
                    <p className="text-xs text-[#8E8E93]">Registra el evento con fecha, hora y ubicación</p>
                  </div>
                </div>
                <ExternalLink size={16} className="text-[#8E8E93] group-hover:text-white" />
              </a>

              {/* Botón 2: Notificar Asignación a Técnico */}
              <a
                href={createdTicketData.waTechUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-4 text-white hover:border-[#25D366] hover:bg-[#1A2E22] transition group"
              >
                <div className="flex items-center gap-3">
                  <Send size={22} className="text-[#25D366]" />
                  <div className="text-left">
                    <p className="text-sm font-bold">2. Notificar al Técnico por WhatsApp</p>
                    <p className="text-xs text-[#8E8E93]">Envía mensaje de asignación con link de ALFA OS</p>
                  </div>
                </div>
                <ExternalLink size={16} className="text-[#8E8E93] group-hover:text-white" />
              </a>
            </div>

            <button
              type="button"
              onClick={() => {
                router.push(`/services/${createdTicketData.id}`);
                router.refresh();
              }}
              className="w-full rounded-xl bg-[#9E1B32] py-3.5 text-sm font-bold text-white hover:bg-[#B91C3C] transition shadow-lg"
            >
              Ir al Detalle del Servicio
            </button>
          </div>
        </div>
      )}
    </>
  );
}
