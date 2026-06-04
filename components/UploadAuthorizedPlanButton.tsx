"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { supabase } from "@/services/supabase";

type Props = {
  projectId: number;
};

const PROJECT_DOCUMENTS_BUCKET = "project-documents";

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

export default function UploadAuthorizedPlanButton({ projectId }: Props) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setUploading(true);

    const storagePath = `authorized-plans/${projectId}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(PROJECT_DOCUMENTS_BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

    if (uploadError) {
      console.error("Error subiendo plano autorizado:", uploadError);
      alert(
        uploadError.message?.includes("Bucket not found")
          ? "El bucket project-documents no existe en Supabase Storage."
          : "Error subiendo plano autorizado"
      );
      setUploading(false);
      return;
    }

    const { data: document, error: dbError } = await supabase
      .from("documents")
      .insert({
        project_id: projectId,
        name: file.name,
        type: "authorized_plan",
        document_type: "authorized_plan",
        is_client_visible: false,
        bucket_id: PROJECT_DOCUMENTS_BUCKET,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || null,
      })
      .select("id")
      .single();

    if (dbError || !document) {
      console.error("Error guardando plano autorizado:", dbError);
      alert("Error guardando plano autorizado");
      setUploading(false);
      return;
    }

    fetch("/api/notifications/authorized-plan-uploaded", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, documentId: document.id }),
    }).catch((error) => {
      console.error("Error enviando notificacion de plano:", error);
    });

    setUploading(false);
    router.refresh();
  }

  return (
    <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white">
      <FileText size={18} />
      {uploading ? "Subiendo..." : "Subir plano"}
      <input
        type="file"
        className="hidden"
        disabled={uploading}
        onChange={handleUpload}
      />
    </label>
  );
}
