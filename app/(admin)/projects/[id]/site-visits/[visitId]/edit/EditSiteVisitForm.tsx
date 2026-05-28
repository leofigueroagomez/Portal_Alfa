"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/services/supabase";

type ExistingPhoto = {
  id: number;
  image_url: string | null;
  caption: string;
  sort_order: number | null;
  displayUrl: string;
};

type EditablePhoto = ExistingPhoto & {
  file?: File;
  previewUrl?: string;
  isNew?: boolean;
};

type EditableNote = {
  id?: number;
  note_text: string;
  informed_to: string;
  commitment_date: string;
  photos: EditablePhoto[];
};

type InitialVisit = {
  title: string;
  visit_date: string;
  general_notes: string;
  notes: EditableNote[];
};

type Props = {
  projectId: number;
  visitId: number;
  initialVisit: InitialVisit;
};

function createEmptyNote(): EditableNote {
  return {
    note_text: "",
    informed_to: "",
    commitment_date: "",
    photos: [],
  };
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export default function EditSiteVisitForm({
  projectId,
  visitId,
  initialVisit,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(initialVisit.title);
  const [visitDate, setVisitDate] = useState(initialVisit.visit_date);
  const [generalNotes, setGeneralNotes] = useState(initialVisit.general_notes);
  const [notes, setNotes] = useState<EditableNote[]>(
    initialVisit.notes.length ? initialVisit.notes : [createEmptyNote()]
  );

  const initialNoteIds = useMemo(
    () => initialVisit.notes.flatMap((note) => (note.id ? [note.id] : [])),
    [initialVisit.notes]
  );

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

  function updateNote(
    index: number,
    field: Exclude<keyof EditableNote, "id" | "photos">,
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
    const note = notes[index];
    const hasPhotos = (note?.photos.length || 0) > 0;
    const confirmed = window.confirm(
      hasPhotos
        ? "Esta nota tiene fotos. Si la eliminas tambien se eliminaran sus fotos relacionadas. Continuar?"
        : "Eliminar esta nota?"
    );

    if (!confirmed) return;

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
      .map((file, index) => ({
        id: -Date.now() - index,
        image_url: null,
        caption: "",
        sort_order: null,
        displayUrl: "",
        file,
        previewUrl: URL.createObjectURL(file),
        isNew: true,
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

  function updatePhotoCaption(
    noteIndex: number,
    photoIndex: number,
    caption: string
  ) {
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
    const confirmed = window.confirm("Eliminar esta foto del reporte?");
    if (!confirmed) return;

    setNotes((current) =>
      current.map((note, currentIndex) => {
        if (currentIndex !== noteIndex) return note;

        const photoToRemove = note.photos[photoIndex];
        if (photoToRemove?.previewUrl) {
          URL.revokeObjectURL(photoToRemove.previewUrl);
        }

        return {
          ...note,
          photos: note.photos.filter(
            (_, currentPhotoIndex) => currentPhotoIndex !== photoIndex
          ),
        };
      })
    );
  }

  async function uploadPhoto(
    noteId: number,
    photo: EditablePhoto,
    photoIndex: number
  ) {
    if (!photo.file) return null;

    const safeName = sanitizeFileName(photo.file.name);
    const filePath = `site-visits/${visitId}/${noteId}/${Date.now()}-${photoIndex}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("project-photos")
      .upload(filePath, photo.file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    return {
      project_site_visit_note_id: noteId,
      image_url: filePath,
      caption: photo.caption.trim() || null,
      sort_order: photoIndex,
    };
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      alert("Agrega un titulo para la visita");
      return;
    }

    const cleanNotes = notes
      .map((note) => ({
        ...note,
        note_text: note.note_text.trim(),
        informed_to: note.informed_to.trim(),
        commitment_date: note.commitment_date,
      }))
      .filter((note) => note.note_text);

    if (cleanNotes.length === 0) {
      alert("Agrega al menos una nota de visita");
      return;
    }

    setSaving(true);

    const { error: visitError } = await supabase
      .from("project_site_visits")
      .update({
        title: title.trim(),
        visit_date: visitDate,
        general_notes: generalNotes.trim() || null,
      })
      .eq("id", visitId)
      .eq("client_project_id", projectId);

    if (visitError) {
      setSaving(false);
      reportError("actualizar visita de obra", visitError);
      return;
    }

    const keptExistingNoteIds = cleanNotes.flatMap((note) =>
      note.id ? [note.id] : []
    );
    const noteIdsToDelete = initialNoteIds.filter(
      (noteId) => !keptExistingNoteIds.includes(noteId)
    );

    if (noteIdsToDelete.length > 0) {
      const { error: deleteNotesError } = await supabase
        .from("project_site_visit_notes")
        .delete()
        .in("id", noteIdsToDelete)
        .eq("project_site_visit_id", visitId);

      if (deleteNotesError) {
        setSaving(false);
        reportError("eliminar notas quitadas", deleteNotesError);
        return;
      }
    }

    for (const [noteIndex, note] of cleanNotes.entries()) {
      let noteId = note.id || null;

      if (noteId) {
        const { error: updateNoteError } = await supabase
          .from("project_site_visit_notes")
          .update({
            note_text: note.note_text,
            informed_to: note.informed_to || null,
            commitment_date: note.commitment_date || null,
          })
          .eq("id", noteId)
          .eq("project_site_visit_id", visitId);

        if (updateNoteError) {
          setSaving(false);
          reportError(`actualizar nota ${noteIndex + 1}`, updateNoteError);
          return;
        }
      } else {
        const { data: savedNote, error: insertNoteError } = await supabase
          .from("project_site_visit_notes")
          .insert({
            project_site_visit_id: visitId,
            note_text: note.note_text,
            informed_to: note.informed_to || null,
            commitment_date: note.commitment_date || null,
          })
          .select("id")
          .single();

        if (insertNoteError || !savedNote) {
          setSaving(false);
          reportError(
            `crear nota ${noteIndex + 1}`,
            insertNoteError || { message: "No se recibio nota creada" }
          );
          return;
        }

        noteId = savedNote.id;
      }

      if (!noteId) {
        setSaving(false);
        reportError(`resolver nota ${noteIndex + 1}`, {
          message: "No se pudo obtener id de nota",
        });
        return;
      }

      const existingPhotoIds = initialVisit.notes
        .find((initialNote) => initialNote.id === note.id)
        ?.photos.flatMap((photo) => (!photo.isNew ? [photo.id] : [])) || [];
      const keptExistingPhotoIds = note.photos.flatMap((photo) =>
        !photo.isNew && photo.id > 0 ? [photo.id] : []
      );
      const photoIdsToDelete = existingPhotoIds.filter(
        (photoId) => !keptExistingPhotoIds.includes(photoId)
      );

      if (photoIdsToDelete.length > 0) {
        const { error: deletePhotosError } = await supabase
          .from("project_site_visit_note_photos")
          .delete()
          .in("id", photoIdsToDelete)
          .eq("project_site_visit_note_id", noteId);

        if (deletePhotosError) {
          setSaving(false);
          reportError(`eliminar fotos de nota ${noteIndex + 1}`, deletePhotosError);
          return;
        }
      }

      const photosToInsert = [];

      for (const [photoIndex, photo] of note.photos.entries()) {
        if (photo.isNew) {
          try {
            const uploadedPhoto = await uploadPhoto(noteId, photo, photoIndex);
            if (uploadedPhoto) photosToInsert.push(uploadedPhoto);
          } catch (error) {
            setSaving(false);
            reportError(
              `subir foto ${photoIndex + 1} de nota ${noteIndex + 1}`,
              error
            );
            return;
          }
          continue;
        }

        const { error: updatePhotoError } = await supabase
          .from("project_site_visit_note_photos")
          .update({
            caption: photo.caption.trim() || null,
            sort_order: photoIndex,
          })
          .eq("id", photo.id)
          .eq("project_site_visit_note_id", noteId);

        if (updatePhotoError) {
          setSaving(false);
          reportError(
            `actualizar foto ${photoIndex + 1} de nota ${noteIndex + 1}`,
            updatePhotoError
          );
          return;
        }
      }

      if (photosToInsert.length > 0) {
        const { error: insertPhotosError } = await supabase
          .from("project_site_visit_note_photos")
          .insert(photosToInsert);

        if (insertPhotosError) {
          setSaving(false);
          reportError(`guardar fotos de nota ${noteIndex + 1}`, insertPhotosError);
          return;
        }
      }
    }

    router.push(`/projects/${projectId}/site-visits/${visitId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* TODO: Restringir edicion por roles admin/pm/creador cuando exista matriz de permisos. */}
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
              Edita compromisos, responsables y evidencia por nota.
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
              key={note.id || `new-${index}`}
              className="rounded-xl border border-[#2A2A30] bg-[#222228] p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="font-semibold">Nota {index + 1}</p>
                <button
                  type="button"
                  onClick={() => removeNote(index)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#151518] px-3 py-2 text-sm text-[#F28B82] hover:text-white"
                >
                  <Trash2 size={16} />
                  Eliminar nota
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
                      Puedes agregar fotos nuevas, editar captions o quitar registros.
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
                        key={`${photo.id}-${photo.previewUrl || photo.displayUrl}`}
                        className="overflow-hidden rounded-xl border border-[#2A2A30] bg-[#222228]"
                      >
                        <img
                          src={photo.previewUrl || photo.displayUrl}
                          alt={photo.caption || `Evidencia ${photoIndex + 1}`}
                          className="h-32 w-full object-cover"
                        />
                        <div className="space-y-2 p-3">
                          <input
                            className="w-full rounded-lg border border-[#2A2A30] bg-[#151518] px-3 py-2 text-sm outline-none"
                            value={photo.caption}
                            onChange={(event) =>
                              updatePhotoCaption(
                                index,
                                photoIndex,
                                event.target.value
                              )
                            }
                            placeholder="Caption opcional"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index, photoIndex)}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#2A2A30] px-3 py-2 text-sm text-[#F28B82] hover:text-white"
                          >
                            <Trash2 size={15} />
                            Eliminar foto
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#77777D]">
                    Esta nota no tiene fotos.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/projects/${projectId}/site-visits/${visitId}`}
          className="inline-flex flex-1 items-center justify-center rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-4 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-xl bg-[#9E1B32] px-5 py-4 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
