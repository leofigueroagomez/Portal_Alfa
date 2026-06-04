"use client";

import { useState } from "react";
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

export default function UploadDocument({
  projectId,
}: Props) {

  const [uploading, setUploading] = useState(false);

  async function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {

    const file = event.target.files?.[0];

    if (!file) return;

    setUploading(true);

    const storagePath = `documents/${projectId}/${Date.now()}-${sanitizeFileName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from(PROJECT_DOCUMENTS_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type || undefined,
      });

    if (uploadError) {
      console.error(uploadError);
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase
      .from("documents")
      .insert({
        project_id: projectId,
        name: file.name,
        type: "general",
        document_type: "general",
        is_client_visible: false,
        bucket_id: PROJECT_DOCUMENTS_BUCKET,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type || null,
      });

    if (dbError) {
      console.error(dbError);
    }

    setUploading(false);

    window.location.reload();
  }

  return (
    <div>
      <label className="block w-full bg-[#9E1B32] hover:bg-[#B91C3C] transition rounded-xl py-3 text-center font-semibold cursor-pointer">

        {uploading
          ? "Subiendo..."
          : "Subir documento"}

        <input
          type="file"
          className="hidden"
          onChange={handleUpload}
        />
      </label>
    </div>
  );
}
