"use client";

import { useState } from "react";
import { supabase } from "@/services/supabase";

type Props = {
  projectId: number;
};

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

    const fileName = `${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("project-documents")
      .upload(fileName, file);

    if (uploadError) {
      console.error(uploadError);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("project-documents")
      .getPublicUrl(fileName);

    const { error: dbError } = await supabase
      .from("documents")
      .insert({
        project_id: projectId,
        name: file.name,
        type: "general",
        file_url: publicUrl,
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