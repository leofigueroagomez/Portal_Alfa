"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit2,
  ExternalLink,
  Mail,
  Phone,
  Plus,
  Power,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import { supabase } from "@/services/supabase";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  getSuppliersWithAnalytics,
  type SupplierWithStats,
} from "@/lib/supplierAnalytics";

type SupplierFormState = {
  id?: number;
  name: string;
  legal_business_name: string;
  rfc: string;
  account_number: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_position: string;
  website_url: string;
  credit_days: string;
  credit_limit_mxn: string;
  discount_terms_notes: string;
  address: string;
  brands_distributed: string;
};

const emptyForm: SupplierFormState = {
  name: "",
  legal_business_name: "",
  rfc: "",
  account_number: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  contact_position: "",
  website_url: "",
  credit_days: "30",
  credit_limit_mxn: "0",
  discount_terms_notes: "",
  address: "",
  brands_distributed: "",
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierWithStats[]>([]);
  const [summary, setSummary] = useState({
    totalSuppliers: 0,
    activeSuppliers: 0,
    totalQuotedYtdMxn: 0,
    totalPurchasedYtdMxn: 0,
    topSupplierName: null as string | null,
  });
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<SupplierFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  async function loadData() {
    setLoading(true);
    const { suppliers: loadedSuppliers, summary: loadedSummary } =
      await getSuppliersWithAnalytics(supabase, selectedYear);
    setSuppliers(loadedSuppliers);
    setSummary(loadedSummary);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  function handleOpenCreate() {
    setForm(emptyForm);
    setShowModal(true);
  }

  function handleOpenEdit(supplier: SupplierWithStats) {
    setForm({
      id: supplier.id,
      name: supplier.name || "",
      legal_business_name: supplier.legal_business_name || "",
      rfc: supplier.rfc || "",
      account_number: supplier.account_number || "",
      contact_name: supplier.contact_name || "",
      contact_email: supplier.contact_email || "",
      contact_phone: supplier.contact_phone || "",
      contact_position: supplier.contact_position || "",
      website_url: supplier.website_url || "",
      credit_days: String(supplier.credit_days || 0),
      credit_limit_mxn: String(supplier.credit_limit_mxn || 0),
      discount_terms_notes: supplier.discount_terms_notes || "",
      address: supplier.address || "",
      brands_distributed: (supplier.brands_distributed || []).join(", "),
    });
    setShowModal(true);
  }

  function handleSaveSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("El nombre comercial del proveedor es obligatorio.");
      return;
    }

    startTransition(async () => {
      const brandsArray = form.brands_distributed
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean);

      const payload = {
        name: form.name.trim(),
        legal_business_name: form.legal_business_name.trim() || null,
        rfc: form.rfc.trim().toUpperCase() || null,
        account_number: form.account_number.trim() || null,
        contact_name: form.contact_name.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        contact_position: form.contact_position.trim() || null,
        website_url: form.website_url.trim() || null,
        credit_days: Number(form.credit_days) || 0,
        credit_limit_mxn: Number(form.credit_limit_mxn) || 0,
        discount_terms_notes: form.discount_terms_notes.trim() || null,
        address: form.address.trim() || null,
        brands_distributed: brandsArray,
        updated_at: new Date().toISOString(),
      };

      if (form.id) {
        // Actualizar
        const { error } = await supabase
          .from("suppliers")
          .update(payload)
          .eq("id", form.id);

        if (error) {
          alert("Error actualizando proveedor: " + error.message);
          return;
        }
      } else {
        // Crear
        const maxSortOrder =
          suppliers.length > 0
            ? Math.max(...suppliers.map((s) => s.sort_order || 0)) + 10
            : 10;

        const { error } = await supabase.from("suppliers").insert({
          ...payload,
          is_active: true,
          sort_order: maxSortOrder,
        });

        if (error) {
          alert("Error creando proveedor: " + error.message);
          return;
        }
      }

      setShowModal(false);
      loadData();
    });
  }

  function handleToggleActive(supplier: SupplierWithStats) {
    startTransition(async () => {
      const { error } = await supabase
        .from("suppliers")
        .update({
          is_active: !supplier.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", supplier.id);

      if (error) {
        alert("Error actualizando estado del proveedor: " + error.message);
        return;
      }

      loadData();
    });
  }

  const filteredSuppliers = suppliers.filter((s) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const matchName = s.name.toLowerCase().includes(q);
    const matchContact = (s.contact_name || "").toLowerCase().includes(q);
    const matchBrands = (s.brands_distributed || []).some((b) =>
      b.toLowerCase().includes(q)
    );
    const matchRfc = (s.rfc || "").toLowerCase().includes(q);
    return matchName || matchContact || matchBrands || matchRfc;
  });

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Encabezado */}
        <div>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-sm text-[#B3B3B8] hover:text-white mb-6"
          >
            <ArrowLeft size={16} />
            Volver a Configuración
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[#2A2A30] pb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#9E1B32]">
                ALFA OS • GESTIÓN DE MAYORISTAS Y PROVEEDORES
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
                Catálogo de Proveedores y Negociaciones
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-[#8E8E93]">
                Directorio oficial homologado de proveedores, contactos comerciales, condiciones de crédito y métricas anuales de cotización y compra para negociar mejores descuentos por volumen.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-xl border border-[#2A2A30] bg-[#151518] px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#9E1B32]"
              >
                <option value={2026}>Ejercicio 2026</option>
                <option value={2025}>Ejercicio 2025</option>
              </select>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 text-xs font-bold text-white hover:bg-[#B91C3C] transition shadow-lg shrink-0"
              >
                <Plus size={16} />
                Nuevo Proveedor
              </button>
            </div>
          </div>
        </div>

        {/* Métricas de Negociación (KPIs) */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 shadow-xl">
            <span className="text-xs text-[#8E8E93] flex items-center gap-1.5">
              <Truck size={14} className="text-[#9E1B32]" />
              Proveedores Homologados
            </span>
            <p className="mt-2 text-2xl font-bold text-white">
              {summary.activeSuppliers}{" "}
              <span className="text-xs font-normal text-[#8E8E93]">
                activos / {summary.totalSuppliers} total
              </span>
            </p>
          </div>

          <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 shadow-xl">
            <span className="text-xs text-[#8E8E93] flex items-center gap-1.5">
              <Briefcase size={14} className="text-[#8CE0B6]" />
              Total Comprado en {selectedYear}
            </span>
            <p className="mt-2 text-2xl font-bold text-[#8CE0B6]">
              {formatCurrency(summary.totalPurchasedYtdMxn, "MXN")}
            </p>
            <p className="mt-1 text-[11px] text-[#8E8E93]">
              En proyectos con cotización aprobada
            </p>
          </div>

          <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 shadow-xl">
            <span className="text-xs text-[#8E8E93] flex items-center gap-1.5">
              <TrendingUp size={14} className="text-[#8AB4F8]" />
              Total Cotizado en {selectedYear}
            </span>
            <p className="mt-2 text-2xl font-bold text-[#8AB4F8]">
              {formatCurrency(summary.totalQuotedYtdMxn, "MXN")}
            </p>
            <p className="mt-1 text-[11px] text-[#8E8E93]">
              Volumen cotizado acumulado
            </p>
          </div>

          <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-5 shadow-xl">
            <span className="text-xs text-[#8E8E93] flex items-center gap-1.5">
              <Building2 size={14} className="text-[#F4C66A]" />
              Mayor Proveedor {selectedYear}
            </span>
            <p className="mt-2 text-lg font-bold text-white truncate">
              {summary.topSupplierName || "Sin compras aún"}
            </p>
            <p className="mt-1 text-[11px] text-[#8E8E93]">
              Mayor volumen de compra en el año
            </p>
          </div>
        </section>

        {/* Buscador */}
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E93]"
            size={18}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre de proveedor, contacto, marca distribuida o RFC..."
            className="w-full rounded-2xl border border-[#2A2A30] bg-[#151518] pl-12 pr-4 py-3 text-sm text-white outline-none focus:border-[#9E1B32]"
          />
        </div>

        {/* Grid de Proveedores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className={`rounded-2xl border border-[#2A2A30] bg-[#151518] p-6 space-y-5 shadow-2xl transition hover:border-[#9E1B32]/40 ${
                !supplier.is_active ? "opacity-60 bg-black/20" : ""
              }`}
            >
              {/* Encabezado Tarjeta */}
              <div className="flex items-start justify-between gap-4 border-b border-[#2A2A30] pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-bold text-white">
                      {supplier.name}
                    </h3>
                    {supplier.is_active ? (
                      <span className="text-[10px] font-bold text-[#8CE0B6] bg-[#143D2A] px-2 py-0.5 rounded-full">
                        Activo
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-[#F4C66A] bg-[#322514] px-2 py-0.5 rounded-full">
                        Inactivo
                      </span>
                    )}
                  </div>
                  {supplier.legal_business_name && (
                    <p className="text-xs text-[#8E8E93] mt-0.5">
                      {supplier.legal_business_name} • RFC: {supplier.rfc || "N/D"}
                    </p>
                  )}
                  {supplier.account_number && (
                    <p className="text-[11px] font-mono text-[#F4C66A] mt-0.5">
                      No. Cliente ALFA: <strong>{supplier.account_number}</strong>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(supplier)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#2A2A30] bg-[#222228] text-[#B3B3B8] hover:text-white hover:border-[#9E1B32] transition"
                    title="Editar proveedor"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(supplier)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#2A2A30] bg-[#222228] text-[#B3B3B8] hover:text-white transition"
                    title={supplier.is_active ? "Desactivar" : "Activar"}
                  >
                    <Power size={13} />
                  </button>
                </div>
              </div>

              {/* Contacto: Quién nos atiende */}
              <div className="rounded-xl border border-white/5 bg-black/30 p-3.5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E1B32]">
                  Quién nos atiende
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <p className="font-bold text-white">
                      {supplier.contact_name || "Sin ejecutivo asignado"}
                    </p>
                    <p className="text-[11px] text-[#8E8E93]">
                      {supplier.contact_position || "Asesor Comercial"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {supplier.contact_phone && (
                      <a
                        href={`https://wa.me/${supplier.contact_phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-[#25D366]/20 px-2.5 py-1 text-[11px] font-bold text-[#25D366] hover:bg-[#25D366] hover:text-black transition"
                        title="Enviar WhatsApp"
                      >
                        <Phone size={11} />
                        WhatsApp
                      </a>
                    )}
                    {supplier.contact_email && (
                      <a
                        href={`mailto:${supplier.contact_email}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/20 transition"
                        title="Enviar Correo"
                      >
                        <Mail size={11} />
                        Correo
                      </a>
                    )}
                    {supplier.website_url && (
                      <a
                        href={supplier.website_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-[#9E1B32]/20 px-2.5 py-1 text-[11px] font-medium text-[#FFB4B4] hover:bg-[#9E1B32] hover:text-white transition"
                        title="Abrir Portal B2B"
                      >
                        <ExternalLink size={11} />
                        Portal
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Condiciones Comerciales & Marcas */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-white/5 bg-black/20 p-2.5">
                  <span className="text-[#8E8E93]">Crédito Comercial:</span>
                  <p className="font-bold text-white mt-0.5">
                    {supplier.credit_days > 0
                      ? `${supplier.credit_days} días de crédito`
                      : "Contado / Anticipado"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-black/20 p-2.5">
                  <span className="text-[#8E8E93]">Catálogo ALFA:</span>
                  <p className="font-bold text-white mt-0.5">
                    {supplier.products_count} productos vinculados
                  </p>
                </div>
              </div>

              {/* Marcas que Distribuye */}
              {supplier.brands_distributed.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-[#8E8E93] font-semibold uppercase">
                    Marcas que distribuye:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {supplier.brands_distributed.map((brand, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-[#222228] text-[#B3B3B8] border border-[#2A2A30] px-2 py-0.5 rounded-md"
                      >
                        {brand}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Métricas de Negociación del Año */}
              <div className="rounded-xl border border-[#2A2A30] bg-[#1C1D22] p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#2A2A30] pb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <DollarSign size={14} className="text-[#F4C66A]" />
                    Métricas de Negociación {selectedYear}
                  </span>
                  <span className="text-[10px] text-[#8E8E93]">
                    {supplier.quotes_count_ytd} cotizaciones / {supplier.approved_projects_count_ytd} proyectos
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#8E8E93]">Total Comprado (YTD):</span>
                    <p className="text-sm font-bold text-[#8CE0B6]">
                      {formatCurrency(supplier.purchased_amount_ytd_mxn, "MXN")}
                    </p>
                    <p className="text-[10px] text-[#8E8E93]">
                      ${formatNumber(supplier.purchased_amount_ytd_usd)} USD
                    </p>
                  </div>

                  <div>
                    <span className="text-[#8E8E93]">Total Cotizado (YTD):</span>
                    <p className="text-sm font-bold text-[#8AB4F8]">
                      {formatCurrency(supplier.quoted_amount_ytd_mxn, "MXN")}
                    </p>
                    <p className="text-[10px] text-[#8E8E93]">
                      ${formatNumber(supplier.quoted_amount_ytd_usd)} USD
                    </p>
                  </div>
                </div>

                {supplier.discount_terms_notes && (
                  <p className="text-[11px] text-[#F4C66A] bg-[#322514]/40 border border-[#F4C66A]/20 rounded-lg p-2 leading-relaxed">
                    <strong>Términos:</strong> {supplier.discount_terms_notes}
                  </p>
                )}
              </div>
            </div>
          ))}

          {filteredSuppliers.length === 0 && !loading && (
            <div className="col-span-2 rounded-2xl border border-dashed border-[#2A2A30] bg-[#151518] p-12 text-center text-sm text-[#8E8E93]">
              No se encontraron proveedores que coincidan con la búsqueda.
            </div>
          )}
        </div>

        {/* Modal de Alta / Edición de Proveedor */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#2A2A30] bg-[#151518] p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[#2A2A30] pb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 size={20} className="text-[#9E1B32]" />
                  {form.id ? "Editar Proveedor" : "Nuevo Proveedor Homologado"}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-sm text-[#8E8E93] hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveSupplier} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block space-y-1">
                    <span className="text-[#B3B3B8] font-semibold">
                      Nombre Comercial Oficial *:
                    </span>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="Ej. Syscom"
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#9E1B32]"
                      required
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[#B3B3B8] font-semibold">
                      Razón Social:
                    </span>
                    <input
                      type="text"
                      value={form.legal_business_name}
                      onChange={(e) =>
                        setForm({ ...form, legal_business_name: e.target.value })
                      }
                      placeholder="Ej. Sistemas y Servicios de Comunicación S.A. de C.V."
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#9E1B32]"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[#B3B3B8] font-semibold">RFC:</span>
                    <input
                      type="text"
                      value={form.rfc}
                      onChange={(e) => setForm({ ...form, rfc: e.target.value })}
                      placeholder="SSC840502XXX"
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#9E1B32]"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[#B3B3B8] font-semibold">
                      No. de Cuenta / Cliente ALFA:
                    </span>
                    <input
                      type="text"
                      value={form.account_number}
                      onChange={(e) =>
                        setForm({ ...form, account_number: e.target.value })
                      }
                      placeholder="Ej. ALFA-SYS-01"
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#9E1B32]"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[#B3B3B8] font-semibold">
                      Quién nos atiende (Ejecutivo):
                    </span>
                    <input
                      type="text"
                      value={form.contact_name}
                      onChange={(e) =>
                        setForm({ ...form, contact_name: e.target.value })
                      }
                      placeholder="Ej. Lic. Carlos Gómez"
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#9E1B32]"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[#B3B3B8] font-semibold">
                      Puesto / Rol del Ejecutivo:
                    </span>
                    <input
                      type="text"
                      value={form.contact_position}
                      onChange={(e) =>
                        setForm({ ...form, contact_position: e.target.value })
                      }
                      placeholder="Ej. Gerente de Cuenta Mayorista"
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#9E1B32]"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[#B3B3B8] font-semibold">
                      Teléfono / WhatsApp de Contacto:
                    </span>
                    <input
                      type="tel"
                      value={form.contact_phone}
                      onChange={(e) =>
                        setForm({ ...form, contact_phone: e.target.value })
                      }
                      placeholder="+52 33 1234 5678"
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#9E1B32]"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[#B3B3B8] font-semibold">
                      Correo Electrónico:
                    </span>
                    <input
                      type="email"
                      value={form.contact_email}
                      onChange={(e) =>
                        setForm({ ...form, contact_email: e.target.value })
                      }
                      placeholder="carlos.gomez@proveedor.com"
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#9E1B32]"
                    />
                  </label>

                  <label className="block space-y-1 sm:col-span-2">
                    <span className="text-[#B3B3B8] font-semibold">
                      Portal Web / Tienda B2B:
                    </span>
                    <input
                      type="url"
                      value={form.website_url}
                      onChange={(e) =>
                        setForm({ ...form, website_url: e.target.value })
                      }
                      placeholder="https://www.syscom.mx"
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#9E1B32]"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[#B3B3B8] font-semibold">
                      Días de Crédito:
                    </span>
                    <input
                      type="number"
                      value={form.credit_days}
                      onChange={(e) =>
                        setForm({ ...form, credit_days: e.target.value })
                      }
                      placeholder="30"
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#9E1B32]"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[#B3B3B8] font-semibold">
                      Marcas que Distribuye (separadas por comas):
                    </span>
                    <input
                      type="text"
                      value={form.brands_distributed}
                      onChange={(e) =>
                        setForm({ ...form, brands_distributed: e.target.value })
                      }
                      placeholder="Hikvision, Ubiquiti, Ruijie, Sonos"
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#9E1B32]"
                    />
                  </label>

                  <label className="block space-y-1 sm:col-span-2">
                    <span className="text-[#B3B3B8] font-semibold">
                      Condiciones de Descuento y Notas de Negociación:
                    </span>
                    <textarea
                      rows={2}
                      value={form.discount_terms_notes}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          discount_terms_notes: e.target.value,
                        })
                      }
                      placeholder="Ej. Descuento distribuidor Oro, tabulador especial en proyectos > $100k MXN."
                      className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs text-white outline-none focus:border-[#9E1B32]"
                    />
                  </label>
                </div>

                <div className="flex justify-end gap-3 border-t border-[#2A2A30] pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-2.5 text-xs font-semibold text-[#B3B3B8] hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl bg-[#9E1B32] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#B91C3C] transition shadow-lg disabled:opacity-50"
                  >
                    {isPending ? "Guardando..." : "Guardar Proveedor"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
