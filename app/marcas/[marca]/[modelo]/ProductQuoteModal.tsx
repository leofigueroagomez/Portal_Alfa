"use client";

import { useState } from "react";
import { CatalogProduct } from "@/lib/catalog";
import { Check, Send, Sparkles, X, ShieldCheck, Phone } from "lucide-react";

type Props = {
  product: CatalogProduct;
};

export default function ProductQuoteModal({ product }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [customerType, setCustomerType] = useState("residencial");
  const [message, setMessage] = useState(
    `Me interesa solicitar cotización del equipo ${product.brand_name} ${product.model} (${product.name}).`
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const whatsappMsg = encodeURIComponent(
    `Hola ALFA, me interesa cotizar el equipo oficial ${product.brand_name} ${product.model} (${product.name}) para mi proyecto.`
  );
  const whatsappUrl = `https://wa.me/523318574884?text=${whatsappMsg}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setErrorMsg("Por favor ingresa tu nombre y número de teléfono.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          company: company.trim() || undefined,
          customerType,
          service: `Cotización de Producto: ${product.brand_name} ${product.model}`,
          interest: "Iluminación y persianas (Lutron / Shelly)",
          message: `${message}\n\n[Producto SKU: ${product.sku || product.model} - Slug: ${product.slug}]`,
          source: "Landing Web",
          status: "nuevo",
        }),
      });

      if (!response.ok) {
        throw new Error("No se pudo enviar la solicitud. Intenta de nuevo.");
      }

      setSuccess(true);
    } catch (err: any) {
      setErrorMsg(err?.message || "Ocurrió un error al procesar tu solicitud.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex-1 rounded-xl bg-[#9E1B32] hover:bg-[#B91C3C] px-6 py-4 text-xs font-semibold uppercase tracking-wider text-white transition shadow-lg shadow-[#9E1B32]/20 flex items-center justify-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Solicitar Cotización Oficial
        </button>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="flex-1 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-white transition flex items-center justify-center gap-2"
        >
          <Phone className="h-4 w-4 text-[#25D366]" />
          Cotizar por WhatsApp
        </a>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-[#141418] p-6 sm:p-8 shadow-2xl text-white">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white transition"
            >
              <X className="h-5 w-5" />
            </button>

            {success ? (
              <div className="text-center py-8 space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#1F7A4D]/20 text-[#8CE0B6] border border-[#1F7A4D]/40">
                  <Check className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold font-serif text-white">
                  Solicitud Recibida
                </h3>
                <p className="text-sm text-zinc-400 max-w-sm mx-auto font-light">
                  Un ingeniero especialista de ALFA se pondrá en contacto contigo a la brevedad para enviarte la cotización formal de{" "}
                  <strong className="text-white font-medium">{product.brand_name} {product.model}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setSuccess(false);
                  }}
                  className="mt-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E07A8B]">
                    Cotización de Producto • ALFA OS
                  </span>
                  <h3 className="mt-1 text-xl font-bold font-serif text-white">
                    {product.brand_name} {product.model}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                    {product.name}
                  </p>
                </div>

                {errorMsg && (
                  <div className="mb-4 rounded-xl bg-red-950/60 border border-red-800/60 p-3 text-xs text-red-300">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Ing. Carlos Morales"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#9E1B32] transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Teléfono / WhatsApp *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="Ej. 33 1234 5678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#9E1B32] transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                        Tipo de Proyecto
                      </label>
                      <select
                        value={customerType}
                        onChange={(e) => setCustomerType(e.target.value)}
                        className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[#9E1B32] transition"
                      >
                        <option value="residencial" className="bg-[#141418]">Residencial</option>
                        <option value="arquitecto_interiorista" className="bg-[#141418]">Arquitecto / Interiorista</option>
                        <option value="comercial" className="bg-[#141418]">Comercial / Restaurante</option>
                        <option value="corporativo" className="bg-[#141418]">Corporativo</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Despacho o Empresa (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Estudio de Arquitectura / Inmobiliaria"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#9E1B32] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Comentarios o Cantidad de piezas
                    </label>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-[#9E1B32] transition resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-[#9E1B32] hover:bg-[#B91C3C] py-3.5 text-xs font-semibold uppercase tracking-wider text-white transition shadow-lg shadow-[#9E1B32]/20 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      "Enviando solicitud..."
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Enviar Solicitud de Cotización
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-zinc-500 text-center font-light">
                    Tus datos se procesan de forma segura en ALFA OS para enviarte cotización formal y asesoría de ingeniería.
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
