"use client";

import { useState } from "react";
import { supabase } from "@/services/supabase";

type Props = {
  projectId: number;
  userId: string;
};

export default function UploadProjectPhoto({
  projectId,
  userId,
}: Props) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = event.target.files;

    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);

    for (const file of Array.from(selectedFiles)) {
      const fileName = `${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("project-photos")
        .upload(fileName, file);

      if (uploadError) {
        console.error(uploadError);
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("project-photos")
        .getPublicUrl(fileName);

      await supabase
        .from("project_photos")
        .insert({
          project_id: projectId,
          title: file.name,
          image_url: publicUrl,
        });
    }

    await supabase
      .from("project_updates")
      .insert({
        project_id: projectId,
        title: `Subida de ${selectedFiles.length} imágenes de evidencia`,
        description: "Se agregaron nuevas evidencias fotográficas al proyecto.",
        status: "completed",
        created_by: userId,
      });

    setUploading(false);
    window.location.reload();
  }

  return (
    <label className="block bg-[#9E1B32] hover:bg-[#B91C3C] transition rounded-xl py-3 text-center font-semibold cursor-pointer mb-5">
      {uploading ? "Subiendo fotos..." : "Subir fotos"}

      <input
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUpload}
      />
    </label>
  );
}