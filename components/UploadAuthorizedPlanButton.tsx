"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { supabase } from "@/services/supabase";

type Props = {
  projectId: number;
};

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

    const fileName = `authorized-plans/${projectId}/${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from("project-documents")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error subiendo plano autorizado:", uploadError);
      alert("Error subiendo plano autorizado");
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("project-documents").getPublicUrl(fileName);

    const { data: document, error: dbError } = await supabase
      .from("documents")
      .insert({
        project_id: projectId,
        name: file.name,
        type: "authorized_plan",
        file_url: publicUrl,
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
