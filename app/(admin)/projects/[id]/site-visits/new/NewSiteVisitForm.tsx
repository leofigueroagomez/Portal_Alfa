"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/services/supabase";

type EvidencePhotoForm = {
  file: File;
  previewUrl: string;
  caption: string;
};

type VisitNoteForm = {
  note_text: string;
  informed_to: string;
  commitment_date: string;
  photos: EvidencePhotoForm[];
};

type Props = {
  projectId: number;
};

const emptyNote: VisitNoteForm = {
  note_text: "",
  informed_to: "",
  commitment_date: "",
  photos: [],
};

function createEmptyNote(): VisitNoteForm {
  return { ...emptyNote, photos: [] };
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export default function NewSiteVisitForm({ projectId }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 10));
  const [generalNotes, setGeneralNotes] = useState("");
  const [notes, setNotes] = useState<VisitNoteForm[]>([createEmptyNote()]);

  function updateNote(
    index: number,
    field: Exclude<keyof VisitNoteForm, "photos">,
    value: string
  ) {
    setNotes((current) =>
      current.map((note, currentIndex) =>
        currentIndex === index ? { ...note, [field]: value } : note
      )
    );
  }

  function addNote() {
    setNotes((current) => [...current, createEmptyNote()]);
  }

  function removeNote(index: number) {
    setNotes((current) =>
      current.length === 1
        ? [createEmptyNote()]
        : current.filter((_, currentIndex) => currentIndex !== index)
    );
  }

  function addPhotos(noteIndex: number, files: FileList | null) {
    if (!files?.length) return;

    const photos = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        caption: "",
      }));

    if (photos.length === 0) {
      alert("Selecciona archivos de imagen validos.");
      return;
    }

    setNotes((current) =>
      current.map((note, currentIndex) =>
        currentIndex === noteIndex
          ? { ...note, photos: [...note.photos, ...photos] }
          : note
      )
    );
  }

  function updatePhotoCaption(noteIndex: number, photoIndex: number, caption: string) {
    setNotes((current) =>
      current.map((note, currentIndex) =>
        currentIndex === noteIndex
          ? {
              ...note,
              photos: note.photos.map((photo, currentPhotoIndex) =>
                currentPhotoIndex === photoIndex ? { ...photo, caption } : photo
              ),
            }
          : note
      )
    );
  }

  function removePhoto(noteIndex: number, photoIndex: number) {
    setNotes((current) =>
      current.map((note, currentIndex) => {
        if (currentIndex !== noteIndex) return note;

        const photoToRemove = note.photos[photoIndex];
        if (photoToRemove) {
          URL.revokeObjectURL(photoToRemove.previewUrl);
        }

        return {
          ...note,
          photos: note.photos.filter((_, currentPhotoIndex) => currentPhotoIndex !== photoIndex),
        };
      })
    );
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      alert("Agrega un titulo para la visita");
      return;
    }

    const cleanNotes = notes
      .map((note) => ({
        note_text: note.note_text.trim(),
        informed_to: note.informed_to.trim(),
        commitment_date: note.commitment_date,
        photos: note.photos,
      }))
      .filter((note) => note.note_text);

    if (cleanNotes.length === 0) {
      alert("Agrega al menos una nota de visita");
      return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      setSaving(false);
      reportError("leer usuario actual", userError);
      return;
    }

    const { data: visit, error: visitError } = await supabase
      .from("project_site_visits")
      .insert({
        client_project_id: projectId,
        created_by_user_id: user?.id || null,
        visit_date: visitDate,
        title: title.trim(),
        general_notes: generalNotes.trim() || null,
      })
      .select("id")
      .single();

    if (visitError || !visit) {
      setSaving(false);
      reportError(
        "crear visita de obra",
        visitError || { message: "No se recibio visita creada" }
      );
      return;
    }

    for (const [noteIndex, note] of cleanNotes.entries()) {
      const { data: savedNote, error: noteError } = await supabase
        .from("project_site_visit_notes")
        .insert({
          project_site_visit_id: visit.id,
          note_text: note.note_text,
          informed_to: note.informed_to || null,
          commitment_date: note.commitment_date || null,
        })
        .select("id")
        .single();

      if (noteError || !savedNote) {
        setSaving(false);
        reportError(
          `guardar nota ${noteIndex + 1}`,
          noteError || { message: "No se recibio nota creada" }
        );
        return;
      }

      const uploadedPhotos = [];

      for (const [photoIndex, photo] of note.photos.entries()) {
        const safeName = sanitizeFileName(photo.file.name);
        const filePath = `site-visits/${visit.id}/${savedNote.id}/${Date.now()}-${photoIndex}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("project-photos")
          .upload(filePath, photo.file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          setSaving(false);
          reportError(`subir foto ${photoIndex + 1} de nota ${noteIndex + 1}`, uploadError);
          return;
        }

        uploadedPhotos.push({
          project_site_visit_note_id: savedNote.id,
          image_url: filePath,
          caption: photo.caption.trim() || null,
          sort_order: photoIndex,
        });
      }

      if (uploadedPhotos.length > 0) {
        const { error: photosError } = await supabase
          .from("project_site_visit_note_photos")
          .insert(uploadedPhotos);

        if (photosError) {
          setSaving(false);
          reportError(`guardar fotos de nota ${noteIndex + 1}`, photosError);
          return;
        }
      }
    }

    router.push(`/projects/${projectId}/site-visits/${visit.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
        <h2 className="mb-5 text-2xl font-semibold">Datos de la visita</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Titulo</span>
            <input
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Supervision de avance"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-[#B3B3B8]">Fecha de visita</span>
            <input
              type="date"
              className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={visitDate}
              onChange={(event) => setVisitDate(event.target.value)}
            />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-[#B3B3B8]">Notas generales</span>
            <textarea
              className="min-h-28 w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
              value={generalNotes}
              onChange={(event) => setGeneralNotes(event.target.value)}
              placeholder="Contexto general de la visita, avance observado o acuerdos principales."
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Notas independientes</h2>
            <p className="mt-1 text-sm text-[#B3B3B8]">
              Cada nota puede tener responsable informado y fecha compromiso.
            </p>
          </div>
          <button
            type="button"
            onClick={addNote}
            className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
          >
            <Plus size={18} />
            Agregar nota
          </button>
        </div>

        <div className="space-y-4">
          {notes.map((note, index) => (
            <div
              key={index}
              className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-semibold">Nota {index + 1}</p>
                <button
                  type="button"
                  onClick={() => removeNote(index)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#2A2A30] bg-[#151518] text-[#B3B3B8] hover:text-white"
                  aria-label="Quitar nota"
                >
                  <Trash2 size={17} />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm text-[#B3B3B8]">Descripcion</span>
                  <textarea
                    className="min-h-24 w-full rounded-xl border border-[#2A2A30] bg-[#151518] px-4 py-3 outline-none"
                    value={note.note_text}
                    onChange={(event) =>
                      updateNote(index, "note_text", event.target.value)
                    }
                    placeholder="Describe el hallazgo, acuerdo o pendiente."
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-[#B3B3B8]">Informado a</span>
                  <input
                    className="w-full rounded-xl border border-[#2A2A30] bg-[#151518] px-4 py-3 outline-none"
                    value={note.informed_to}
                    onChange={(event) =>
                      updateNote(index, "informed_to", event.target.value)
                    }
                    placeholder="Cliente, residente, contratista..."
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-[#B3B3B8]">Fecha compromiso</span>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-[#2A2A30] bg-[#151518] px-4 py-3 outline-none"
                    value={note.commitment_date}
                    onChange={(event) =>
                      updateNote(index, "commitment_date", event.target.value)
                    }
                  />
                </label>
              </div>
              <div className="mt-5 rounded-xl border border-[#2A2A30] bg-[#151518] p-4">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">Fotos de evidencia</p>
                    <p className="mt-1 text-sm text-[#B3B3B8]">
                      Opcionales, se guardan junto a esta nota.
                    </p>
                  </div>
                  <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-sm font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white">
                    <Plus size={16} />
                    Agregar fotos
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(event) => {
                        addPhotos(index, event.target.files);
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>

                {note.photos.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {note.photos.map((photo, photoIndex) => (
                      <div
                        key={`${photo.previewUrl}-${photoIndex}`}
                        className="overflow-hidden rounded-xl border border-[#2A2A30] bg-[#222228]"
                      >
                        <img
                          src={photo.previewUrl}
                          alt={`Evidencia ${photoIndex + 1}`}
                          className="h-32 w-full object-cover"
                        />
                        <div className="space-y-2 p-3">
                          <input
                            className="w-full rounded-lg border border-[#2A2A30] bg-[#151518] px-3 py-2 text-sm outline-none"
                            value={photo.caption}
                            onChange={(event) =>
                              updatePhotoCaption(index, photoIndex, event.target.value)
                            }
                            placeholder="Caption opcional"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index, photoIndex)}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#2A2A30] px-3 py-2 text-sm text-[#B3B3B8] hover:text-white"
                          >
                            <Trash2 size={15} />
                            Quitar foto
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
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
        {saving ? "Guardando..." : "Guardar visita de obra"}
      </button>
    </form>
  );
}
