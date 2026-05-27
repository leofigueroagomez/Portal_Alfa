import UploadProjectPhoto from "@/components/UploadProjectPhoto";
import UploadDocument from "@/components/UploadDocument";
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  FileText,
  Image,
  MessageSquare,
  User,
} from "lucide-react";

import { createSupabaseServerClient } from "@/services/supabaseServer";
import AddProjectUpdate from "@/components/AddProjectUpdate";
export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;
  const user = {
  id: "bb31295d-10e3-4747-a89e-d920b0b88ff0",
};

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("project_id", id);

  const { data: photos } = await supabase
    .from("project_photos")
    .select("*")
    .eq("project_id", id);
  const { data: responsible } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", project.responsible_user_id)
    .single();
    const { data: updates } = await supabase
    .from("project_updates")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: true });
  const updaterIds = [
  ...new Set(updates?.map((update) => update.created_by).filter(Boolean)),
];

const { data: updateAuthors } = await supabase
  .from("profiles")
  .select("id, name, avatar_url")
  .in("id", updaterIds);

function getUpdateAuthor(userId: string) {
  return updateAuthors?.find((author) => author.id === userId);
}

  if (error || !project) {
    return (
      <main className="min-h-screen bg-[#0B0B0D] text-white p-10">
        <h1 className="text-3xl font-bold">Proyecto no encontrado</h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0B0D] text-white p-10">
      <a href="/dashboard" className="inline-flex items-center gap-2 text-[#B3B3B8] mb-8">
        <ArrowLeft size={18} />
        Volver al dashboard
      </a>

      <section className="mb-10">
        <p className="text-[#9E1B32] tracking-[0.3em] text-sm mb-3">
          PROYECTO
        </p>

        <h1 className="text-4xl font-bold mb-3">
          {project.name}
        </h1>

        <p className="text-[#B3B3B8]">
          Tipo de proyecto: {project.type}
        </p>
      </section>

      <section className="grid grid-cols-4 gap-6 mb-10">
        <div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
          <p className="text-[#B3B3B8] mb-2">Estado</p>
          <h2 className="text-2xl font-bold text-[#9E1B32]">{project.status}</h2>
        </div>

        <div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
          <p className="text-[#B3B3B8] mb-2">Avance</p>
          <h2 className="text-2xl font-bold">{project.progress}%</h2>
        </div>

        <div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
          <p className="text-[#B3B3B8] mb-2">Saldo pendiente</p>
          <h2 className="text-2xl font-bold">$130,756</h2>
        </div>

        <div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
          <p className="text-[#B3B3B8] mb-2">Fecha compromiso</p>
          <h2 className="text-2xl font-bold">28 Jun</h2>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-8">
          <div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="text-[#9E1B32]" />
              <h3 className="text-2xl font-semibold">Timeline del proyecto</h3>
            </div>
            <AddProjectUpdate
  projectId={project.id}
  userId={user.id}
/>

<div className="space-y-6">
  {updates?.map((update) => (
    <div key={update.id} className="flex gap-4">
      <div className="w-3 h-3 rounded-full bg-[#9E1B32] mt-2" />

      <div>
        <p className="font-medium">
          {update.title}
        </p>

        <p className="text-sm text-[#B3B3B8]">
          {update.description}
        </p>

        <p className="text-xs text-[#77777D] mt-1">
        {new Date(update.created_at).toLocaleDateString("es-MX")} ·{" "}
  {getUpdateAuthor(update.created_by)?.name || "Usuario ALFA"}
        </p>
         
      </div>
    </div>
  ))}
</div>
          </div>

          <div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Image className="text-[#9E1B32]" />
              <h3 className="text-2xl font-semibold">Evidencias</h3>
            </div>

            <UploadProjectPhoto projectId={project.id} userId={user.id} />

            <div className="grid grid-cols-3 gap-4">
              {photos?.map((photo) => (
                <a
                  key={photo.id}
                  href={photo.image_url}
                  target="_blank"
                  className="h-32 bg-[#222228] rounded-xl overflow-hidden block"
                >
                  <img
                    src={photo.image_url}
                    alt={photo.title}
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-8">
<div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
  <div className="flex items-center gap-3 mb-5">
    <User className="text-[#9E1B32]" />
    <h3 className="text-xl font-semibold">Responsable</h3>
  </div>

  <div className="flex items-center gap-4 mb-5">
    <img
      src={responsible?.avatar_url || "/logo-alfa.png"}
      alt={responsible?.name || "Responsable"}
      className="w-16 h-16 rounded-full object-cover border border-[#2A2A30]"
    />

    <div>
      <p className="font-semibold text-lg">
        {responsible?.name || "Sin responsable"}
      </p>

      <p className="text-sm text-[#B3B3B8]">
        {responsible?.position || responsible?.role || "Sin puesto"}
      </p>
    </div>
  </div>

  <div className="space-y-3 text-sm">
    <a
      href={`mailto:${responsible?.email || ""}`}
      className="block bg-[#222228] rounded-xl p-3 hover:bg-[#2A2A30] transition"
    >
      {responsible?.email || "Sin correo"}
    </a>

    <a
      href={`tel:${responsible?.phone || ""}`}
      className="block bg-[#222228] rounded-xl p-3 hover:bg-[#2A2A30] transition"
    >
      {responsible?.phone || "Sin teléfono"}
    </a>
  </div>
</div>

          <div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <FileText className="text-[#9E1B32]" />
              <h3 className="text-xl font-semibold">Documentos</h3>
            </div>

            <div className="mt-4 mb-5">
              <UploadDocument projectId={project.id} />
            </div>

            <div className="space-y-3">
              {documents?.map((document) => (
                <a
                  key={document.id}
                  href={document.file_url}
                  target="_blank"
                  className="block w-full text-left bg-[#222228] rounded-xl p-4 hover:bg-[#2A2A30] transition"
                >
                  {document.name}
                </a>
              ))}
            </div>
          </div>

          <div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <CreditCard className="text-[#9E1B32]" />
              <h3 className="text-xl font-semibold">Pagos</h3>
            </div>

            <p className="text-[#B3B3B8] mb-2">Pagado: $300,000</p>
            <p className="text-[#B3B3B8] mb-5">Pendiente: $130,756</p>

            <button className="w-full bg-[#9E1B32] hover:bg-[#B91C3C] rounded-xl py-3 font-semibold">
              Pagar saldo
            </button>
          </div>

          <div className="bg-[#151518] border border-[#1F1F24] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <MessageSquare className="text-[#9E1B32]" />
              <h3 className="text-xl font-semibold">Último mensaje</h3>
            </div>

            <p className="text-[#B3B3B8]">
              “La configuración remota queda programada para mañana.”
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
