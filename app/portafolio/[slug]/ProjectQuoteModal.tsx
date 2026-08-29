"use client";

import { useState } from "react";
import { X, CheckCircle2, Phone, Sparkles, Send, Loader2 } from "lucide-react";
import { PortfolioProject } from "@/lib/portfolio";

type Props = {
  project: PortfolioProject;
  isOpen: boolean;
  onClose: () => void;
};

export default function ProjectQuoteModal({ project, isOpen, onClose }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [customerType, setCustomerType] = useState("residencial");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState(
    `Hola, me interesa una propuesta de ingeniería inspirada en su proyecto "${project.title}".`
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        name,
        phone,
        email: email || undefined,
        company: location || "No especificada",
        customerType,
        service: `Proyecto Inspirado en: ${project.title}`,
        interest: project.category,
        message: `${message}\n\n[Referencia de Portafolio: ${project.title} (Slug: ${project.slug})]`,
        source: "Landing Web",
        status: "nuevo",
      };

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("No se pudo registrar la solicitud");
      }

      setSuccess(true);
    } catch (err) {
      console.error("[ProjectQuoteModal] Error submitting lead:", err);
      setError("Ocurrió un error al enviar tu solicitud. Intenta por WhatsApp o llámanos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#141418] p-6 sm:p-8 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
          aria-label="Cerrar modal"
        >
          <X className="h-5 w-5" />
        </button>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#9E1B32]/20 text-[#E07A8B] border border-[#9E1B32]/40">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold font-serif text-white">
              ¡Solicitud Recibida!
            </h3>
            <p className="text-sm text-zinc-300 max-w-md mx-auto leading-relaxed font-light">
              Un ingeniero especialista de ALFA analizará los requerimientos para tu espacio y te contactará a la brevedad.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href={`https://wa.me/523318574884?text=${encodeURIComponent(
                  `Hola ALFA, acabo de enviar una solicitud para un proyecto de audio similar a "${project.title}".`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-black transition"
              >
                <Phone className="h-4 w-4" />
                Continuar por WhatsApp
              </a>
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/15 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E07A8B] bg-[#9E1B32]/10 px-3 py-1 rounded-full border border-[#9E1B32]/30 mb-2">
                <Sparkles className="h-3.5 w-3.5" />
                Propuesta de Ingeniería Personalizada
              </div>
              <h3 className="text-2xl font-bold font-serif text-white">
                Cotizar Proyecto Similar a {project.title}
              </h3>
              <p className="text-xs text-zinc-400 font-light mt-1">
                Diseñamos e integramos soluciones de audio y control adaptadas a las dimensiones y acústica de tu espacio.
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-900/30 border border-red-500/40 p-3 text-xs text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1">
                    Tu Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Arq. Carlos Mendoza"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-[#9E1B32] outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1">
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ej. 33 1234 5678"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-[#9E1B32] outline-none transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1">
                    Ciudad / Ubicación
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ej. Guadalajara / Zapopan / CDMX"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-[#9E1B32] outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1">
                    Tipo de Proyecto
                  </label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value)}
                    className="w-full rounded-xl bg-[#1D1D24] border border-white/10 px-4 py-2.5 text-sm text-white focus:border-[#9E1B32] outline-none transition"
                  >
                    <option value="residencial">Residencial Privado</option>
                    <option value="arquitecto_interiorista">Despacho de Arquitectura / Interiorismo</option>
                    <option value="comercial">Comercial / Restaurante</option>
                    <option value="corporativo">Corporativo / Sala de Consejo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1">
                  Detalles de tu espacio o requerimientos
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-[#9E1B32] outline-none transition resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#9E1B32] hover:bg-[#B91C3C] py-3.5 text-xs font-semibold uppercase tracking-wider text-white transition shadow-lg shadow-[#9E1B32]/20 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando solicitud...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Solicitar Asesoría y Propuesta Técnica
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
