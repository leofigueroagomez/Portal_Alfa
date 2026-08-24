"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  Save,
  Send,
  Sparkles,
  Upload,
  User,
  Wrench,
} from "lucide-react";
import {
  updateContractorServiceAction,
  addContractorServicePhotoAction,
} from "./contractorActions";

type ServiceData = {
  id: number;
  service_number: string | null;
  service_date: string | null;
  service_location: string | null;
  google_maps_url: string | null;
  performed_by_name: string | null;
  technician_phone: string | null;
  requester_name: string | null;
  requester_phone: string | null;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  is_remote: boolean | null;
  background: string | null;
  diagnosis: string | null;
  solution_status: string | null;
  solution_description: string | null;
  recommendations: string | null;
  requires_parts: boolean | null;
  required_parts_notes: string | null;
  status: string | null;
  completed_at: string | null;
  clients: { id: number; name: string | null } | null;
  client_projects: { id: number; name: string | null } | null;
};

type PhotoData = {
  id: number;
  image_url: string | null;
  caption: string | null;
  displayUrl: string;
};

function statusBadge(status: string | null | undefined) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Finalizado
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
        En proceso
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-300">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
      Pendiente
    </span>
  );
}

export default function ContractorServiceView({
  service,
  photos,
  contractorName,
}: {
  service: ServiceData;
  photos: PhotoData[];
  contractorName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [isUploading, startUploadTransition] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [status, setStatus] = useState(service.status || "in_progress");
  const [solutionStatus, setSolutionStatus] = useState(service.solution_status || "pending");
  const [diagnosis, setDiagnosis] = useState(service.diagnosis || "");
  const [solutionDescription, setSolutionDescription] = useState(
    service.solution_description || ""
  );
  const [recommendations, setRecommendations] = useState(service.recommendations || "");
  const [requiresParts, setRequiresParts] = useState(Boolean(service.requires_parts));
  const [requiredPartsNotes, setRequiredPartsNotes] = useState(
    service.required_parts_notes || ""
  );

  const [caption, setCaption] = useState("");

  const folio = service.service_number || `SERV-${service.id}`;
  const clientName = service.clients?.name || "Cliente";
  const projectName = service.client_projects?.name || "Proyecto";

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updateContractorServiceAction(service.id, formData);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      } catch (err: any) {
        setErrorMessage(err?.message || "Error al guardar el servicio.");
      }
    });
  };

  const handleUploadPhoto = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setUploadSuccess(false);

    const form = e.currentTarget;
    const formData = new FormData(form);

    startUploadTransition(async () => {
      try {
        await addContractorServicePhotoAction(service.id, formData);
        setUploadSuccess(true);
        setCaption("");
        form.reset();
        setTimeout(() => setUploadSuccess(false), 4000);
      } catch (err: any) {
        setErrorMessage(err?.message || "Error al subir la fotografía.");
      }
    });
  };

  const cleanPhone = (service.requester_phone || "").replace(/\D/g, "");

  return (
    <div className="min-h-screen bg-[#0B0D0F] pb-16 text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-[#1F1F24] bg-[#0E0F12]/95 backdrop-blur px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link
            href="/portal"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#A1A1AA] transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Volver a mis servicios</span>
            <span className="sm:hidden">Volver</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#71717A] hidden sm:inline">{contractorName}</span>
            {statusBadge(status)}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 space-y-6">
        {/* Service Title Card */}
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-7 shadow-xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#B84A5A]">
                Servicio Técnico Asignado
              </p>
              <h1 className="mt-1 text-2xl font-bold sm:text-3xl text-white">
                {folio}
              </h1>
              <p className="mt-1 text-sm text-[#A1A1AA]">
                {clientName} · <span className="text-zinc-400">{projectName}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#8CE0B6] bg-[#8CE0B6]/10 border border-[#8CE0B6]/20 px-3 py-1.5 rounded-lg w-fit">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {service.service_date || "Fecha pendiente"} ({service.scheduled_time_start || "10:00"} - {service.scheduled_time_end || "12:00"})
              </span>
            </div>
          </div>

          {/* Quick Contact & Navigation Bar */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-[#222228]">
            {service.google_maps_url ? (
              <a
                href={service.google_maps_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#2E3038] bg-[#1C1D22] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#282A32] hover:border-[#B84A5A]"
              >
                <MapPin className="h-4 w-4 text-[#F0B8C0]" />
                Abrir en Google Maps / Waze
                <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
              </a>
            ) : service.service_location ? (
              <div className="flex items-center gap-2 text-xs text-[#A1A1AA] bg-[#1C1D22] p-3 rounded-xl border border-[#222228]">
                <MapPin className="h-4 w-4 text-[#F0B8C0] shrink-0" />
                <span className="truncate">{service.service_location}</span>
              </div>
            ) : null}

            {service.requester_phone ? (
              <div className="flex gap-2">
                <a
                  href={`tel:${cleanPhone}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-[#2E3038] bg-[#1C1D22] px-3 py-3 text-sm font-semibold text-white transition hover:bg-[#282A32]"
                >
                  <Phone className="h-4 w-4 text-emerald-400" />
                  Llamar ({service.requester_name || "Contacto"})
                </a>
                <a
                  href={`https://wa.me/${cleanPhone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-300 transition hover:bg-emerald-500/20"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              </div>
            ) : null}
          </div>
        </div>

        {/* Reported Issue / Background */}
        {service.background ? (
          <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-6 shadow-lg">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#F0B8C0] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#B84A5A]" />
              Requerimiento / Falla Reportada por el Cliente
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap bg-[#0E0F12] p-4 rounded-xl border border-[#222228]">
              {service.background}
            </p>
          </div>
        ) : null}

        {/* Messages */}
        {saveSuccess ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            ¡Reporte de servicio actualizado correctamente en ALFA OS!
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
            {errorMessage}
          </div>
        ) : null}

        {/* Technical Report & Updates Form */}
        <form
          onSubmit={handleUpdate}
          className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-7 shadow-xl space-y-6"
        >
          <div className="border-b border-[#222228] pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Wrench className="h-5 w-5 text-[#B84A5A]" />
              Captura de Diagnóstico y Solución Técnica
            </h2>
            <p className="mt-1 text-xs text-[#8A8A93]">
              Actualiza el avance del trabajo para el equipo de supervisión y el reporte final.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1.5">
                Estado del Servicio
              </label>
              <select
                name="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] px-3.5 py-3 text-sm text-white focus:border-[#B84A5A] focus:outline-none"
              >
                <option value="in_progress">En proceso (En sitio / Atendiendo)</option>
                <option value="completed">Finalizado (Trabajo concluido)</option>
                <option value="pending">Pendiente (Por atender)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1.5">
                Resultado de la Solución
              </label>
              <select
                name="solution_status"
                value={solutionStatus}
                onChange={(e) => setSolutionStatus(e.target.value)}
                className="w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] px-3.5 py-3 text-sm text-white focus:border-[#B84A5A] focus:outline-none"
              >
                <option value="pending">Pendiente / En revisión</option>
                <option value="solved">Solucionado al 100%</option>
                <option value="not_solved">No solucionado / Requiere visita técnica mayor</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1.5">
              Diagnóstico Técnico Realizado en Sitio
            </label>
            <textarea
              name="diagnosis"
              rows={3}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Describe lo encontrado: voltajes, conexionados, cableado, estado de equipos, etc."
              className="w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] p-3.5 text-sm text-white placeholder-zinc-600 focus:border-[#B84A5A] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1.5">
              Solución Aplicada / Trabajos Ejecutados
            </label>
            <textarea
              name="solution_description"
              rows={3}
              value={solutionDescription}
              onChange={(e) => setSolutionDescription(e.target.value)}
              placeholder="Describe las acciones realizadas: reconfiguración, cambio de conectores, ajuste de luminarias..."
              className="w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] p-3.5 text-sm text-white placeholder-zinc-600 focus:border-[#B84A5A] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1.5">
              Recomendaciones para el Cliente
            </label>
            <textarea
              name="recommendations"
              rows={2}
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              placeholder="Ej. Mantener ventilado el rack, evitar apagar el switch principal..."
              className="w-full rounded-xl border border-[#2A2B32] bg-[#0E0F12] p-3.5 text-sm text-white placeholder-zinc-600 focus:border-[#B84A5A] focus:outline-none"
            />
          </div>

          {/* Parts Required Section */}
          <div className="rounded-xl border border-[#222228] bg-[#0E0F12] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">¿Se requieren refacciones o materiales adicionales?</p>
                <p className="text-[11px] text-[#71717A]">Marca si el cliente necesita adquirir equipo nuevo o cables para terminar.</p>
              </div>
              <input
                type="checkbox"
                name="requires_parts"
                checked={requiresParts}
                onChange={(e) => setRequiresParts(e.target.checked)}
                className="h-4 w-4 accent-[#9E1B32] rounded cursor-pointer"
              />
            </div>

            {requiresParts ? (
              <input
                type="text"
                name="required_parts_notes"
                value={requiredPartsNotes}
                onChange={(e) => setRequiredPartsNotes(e.target.value)}
                placeholder="Especifica los materiales o equipos necesarios..."
                className="w-full rounded-lg border border-[#2A2B32] bg-[#151518] px-3 py-2 text-xs text-white focus:border-[#B84A5A] focus:outline-none"
              />
            ) : null}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-[#7A1F2B] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#5A1320] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isPending ? "Guardando..." : "Guardar Avance / Reporte"}
            </button>
          </div>
        </form>

        {/* Evidence Photos Section */}
        <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 sm:p-7 shadow-xl space-y-6">
          <div className="border-b border-[#222228] pb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Camera className="h-5 w-5 text-[#B84A5A]" />
                Fotografías y Evidencias del Servicio ({photos.length})
              </h2>
              <p className="mt-1 text-xs text-[#8A8A93]">
                Toma fotos antes y después del trabajo para respaldar la entrega de calidad.
              </p>
            </div>
          </div>

          {/* Upload Form */}
          <form
            onSubmit={handleUploadPhoto}
            className="rounded-xl border border-[#2A2B32] bg-[#0E0F12] p-4 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1.5">
                  Seleccionar / Tomar Fotografía
                </label>
                <input
                  type="file"
                  name="photo"
                  accept="image/*"
                  capture="environment"
                  required
                  className="w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-[#7A1F2B] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-[#5A1320] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] uppercase mb-1.5">
                  Descripción (Opcional)
                </label>
                <input
                  type="text"
                  name="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Ej. Rack terminado, cableado ordenado..."
                  className="w-full rounded-lg border border-[#2A2B32] bg-[#151518] px-3 py-2 text-xs text-white focus:border-[#B84A5A] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUploading}
                className="inline-flex items-center gap-2 rounded-lg bg-[#27272A] border border-[#3F3F46] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#3F3F46] disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" />
                {isUploading ? "Subiendo fotografía..." : "Subir Foto"}
              </button>
            </div>
          </form>

          {uploadSuccess ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              ✓ Fotografía agregada a la bitácora del servicio.
            </div>
          ) : null}

          {/* Photos Grid */}
          {photos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#222228] p-8 text-center text-xs text-zinc-500">
              Aún no se han subido fotografías de evidencia para este servicio.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative overflow-hidden rounded-xl border border-[#222228] bg-[#0E0F12]"
                >
                  <img
                    src={photo.displayUrl}
                    alt={photo.caption || "Evidencia técnica"}
                    className="h-44 w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  {photo.caption ? (
                    <div className="p-2 text-[11px] text-zinc-300 truncate bg-[#141519] border-t border-[#222228]">
                      {photo.caption}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
