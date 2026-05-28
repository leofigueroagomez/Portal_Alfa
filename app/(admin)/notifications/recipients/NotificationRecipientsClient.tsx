"use client";

import { useEffect, useState } from "react";
import { Bell, Trash2 } from "lucide-react";
import { supabase } from "@/services/supabase";

type Recipient = {
  id: number;
  name: string;
  phone: string;
  channel: string;
  is_active: boolean;
  created_at: string | null;
};

const emptyForm = {
  name: "",
  phone: "",
};

export default function NotificationRecipientsClient() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function loadRecipients() {
    setLoading(true);
    const { data, error } = await supabase
      .from("notification_recipients")
      .select("id, name, phone, channel, is_active, created_at")
      .order("is_active", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error cargando destinatarios:", error);
      alert("Error cargando destinatarios");
      setLoading(false);
      return;
    }

    setRecipients((data || []) as Recipient[]);
    setLoading(false);
  }

  useEffect(() => {
    loadRecipients();
  }, []);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim() || !form.phone.trim()) {
      alert("Agrega nombre y telefono");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("notification_recipients").insert({
      name: form.name.trim(),
      phone: form.phone.trim(),
      channel: "whatsapp",
      is_active: true,
    });

    setSaving(false);

    if (error) {
      console.error("Error creando destinatario:", error);
      alert("Error creando destinatario");
      return;
    }

    setForm(emptyForm);
    loadRecipients();
  }

  async function updateRecipient(
    recipientId: number,
    fields: Partial<Pick<Recipient, "name" | "phone" | "is_active">>
  ) {
    const { error } = await supabase
      .from("notification_recipients")
      .update(fields)
      .eq("id", recipientId);

    if (error) {
      console.error("Error actualizando destinatario:", error);
      alert("Error actualizando destinatario");
      return;
    }

    setRecipients((current) =>
      current.map((recipient) =>
        recipient.id === recipientId ? { ...recipient, ...fields } : recipient
      )
    );
  }

  async function deleteRecipient(recipientId: number) {
    const confirmed = window.confirm("Eliminar este destinatario?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("notification_recipients")
      .delete()
      .eq("id", recipientId);

    if (error) {
      console.error("Error eliminando destinatario:", error);
      alert("Error eliminando destinatario");
      return;
    }

    setRecipients((current) =>
      current.filter((recipient) => recipient.id !== recipientId)
    );
  }

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <section className="mb-10">
        <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA OS</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Notificaciones</h1>
        <p className="mt-3 text-[#B3B3B8]">
          Destinatarios internos para avisos operativos por WhatsApp.
        </p>
      </section>

      <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
        <h2 className="mb-5 text-2xl font-semibold">Nuevo destinatario</h2>
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto]"
        >
          <input
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            placeholder="Nombre"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
          />
          <input
            className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 outline-none"
            placeholder="Telefono WhatsApp"
            value={form.phone}
            onChange={(event) =>
              setForm((current) => ({ ...current, phone: event.target.value }))
            }
          />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold hover:bg-[#B91C3C] disabled:bg-[#222228] disabled:text-[#77777D]"
          >
            <Bell size={18} />
            {saving ? "Guardando..." : "Agregar"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
        <h2 className="mb-5 text-2xl font-semibold">Destinatarios</h2>

        {loading ? (
          <p className="text-[#B3B3B8]">Cargando...</p>
        ) : recipients.length === 0 ? (
          <p className="text-[#B3B3B8]">No hay destinatarios registrados.</p>
        ) : (
          <div className="space-y-3">
            {recipients.map((recipient) => (
              <div
                key={recipient.id}
                className="grid grid-cols-1 gap-3 rounded-xl border border-[#2A2A30] bg-[#222228] p-4 lg:grid-cols-[1fr_1fr_auto_auto]"
              >
                <input
                  className="rounded-xl border border-[#2A2A30] bg-[#151518] px-4 py-3 outline-none"
                  value={recipient.name}
                  onChange={(event) =>
                    setRecipients((current) =>
                      current.map((item) =>
                        item.id === recipient.id
                          ? { ...item, name: event.target.value }
                          : item
                      )
                    )
                  }
                  onBlur={(event) =>
                    updateRecipient(recipient.id, {
                      name: event.target.value.trim() || recipient.name,
                    })
                  }
                />
                <input
                  className="rounded-xl border border-[#2A2A30] bg-[#151518] px-4 py-3 outline-none"
                  value={recipient.phone}
                  onChange={(event) =>
                    setRecipients((current) =>
                      current.map((item) =>
                        item.id === recipient.id
                          ? { ...item, phone: event.target.value }
                          : item
                      )
                    )
                  }
                  onBlur={(event) =>
                    updateRecipient(recipient.id, {
                      phone: event.target.value.trim(),
                    })
                  }
                />
                <label className="flex items-center gap-3 rounded-xl border border-[#2A2A30] bg-[#151518] px-4 py-3 text-[#B3B3B8]">
                  <input
                    type="checkbox"
                    checked={recipient.is_active}
                    onChange={(event) =>
                      updateRecipient(recipient.id, {
                        is_active: event.target.checked,
                      })
                    }
                  />
                  Activo
                </label>
                <button
                  type="button"
                  onClick={() => deleteRecipient(recipient.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#2A2A30] bg-[#151518] px-4 py-3 text-[#F28B82] hover:text-white"
                >
                  <Trash2 size={16} />
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
