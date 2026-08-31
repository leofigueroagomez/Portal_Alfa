"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  Loader2,
  Package,
  Pencil,
  Plus,
  Power,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import ClientSearchSelect from "@/components/ClientSearchSelect";
import type { QuoteTemplate, ResolvedTemplateLine } from "@/lib/quotes/templates";
import {
  createDraftFromTemplateAction,
  deleteQuoteTemplate,
  saveQuoteTemplate,
  setQuoteTemplateActive,
} from "@/app/(admin)/quotes/templates/actions";

type ProductOption = {
  id: number;
  brand: string | null;
  model: string | null;
  name: string | null;
  calculated_sale_price: number | null;
  sale_currency: string | null;
};
type LaborOption = {
  id: number;
  name: string | null;
  default_unit: string | null;
  default_sale_price_mxn: number | null;
};
type ClientOption = {
  id: number;
  client_number: number | null;
  name: string | null;
  company_name: string | null;
};

type Props = {
  templates: QuoteTemplate[];
  canManage: boolean;
  products: ProductOption[];
  laborActivities: LaborOption[];
  clients: ClientOption[];
};

type DraftLine = {
  key: string;
  kind: "product" | "labor";
  product_id: number | null;
  labor_activity_id: number | null;
  quantity: string;
};

function productLabel(p: ProductOption) {
  return (
    `${(p.brand || "").trim()} ${(p.model || "").trim()}`.trim() ||
    (p.name || "").trim() ||
    `Producto ${p.id}`
  );
}

function money(value: number, currency: "USD" | "MXN") {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(value);
}

export default function QuoteTemplatesManager({
  templates,
  canManage,
  products,
  laborActivities,
  clients,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<"list" | "edit">("list");
  const [editing, setEditing] = useState<QuoteTemplate | null>(null);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link
            href="/quotes"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/50 transition hover:text-black"
          >
            <ArrowLeft size={14} /> Cotizaciones
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-[#111111]">Plantillas</h1>
          <p className="mt-1 text-sm text-black/60">
            Paquetes estándar. Elige uno, ajusta cantidades y cliente, y sale un borrador.
          </p>
        </div>
        {canManage && view === "list" && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setView("edit");
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#9E1B32] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#7A1F2B]"
          >
            <Plus size={14} /> Nueva
          </button>
        )}
      </div>

      {view === "list" ? (
        <div className="mt-6 space-y-4">
          {templates.length === 0 && (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center text-sm text-black/50">
              Aún no hay plantillas.{" "}
              {canManage ? "Crea la primera con “Nueva”." : "Pídele a Dirección que cree las primeras."}
            </div>
          )}
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              canManage={canManage}
              clients={clients}
              onUse={(payload) =>
                createDraftFromTemplateAction(payload).then((res) => {
                  if (res.ok && res.quoteId) router.push(`/quotes/${res.quoteId}/edit`);
                  return res;
                })
              }
              onEdit={() => {
                setEditing(template);
                setView("edit");
              }}
              onToggleActive={() => setQuoteTemplateActive(template.id, !template.is_active)}
            />
          ))}
        </div>
      ) : (
        <TemplateEditor
          template={editing}
          products={products}
          laborActivities={laborActivities}
          onDone={() => {
            setView("list");
            setEditing(null);
            router.refresh();
          }}
          onDelete={
            editing
              ? async () => {
                  await deleteQuoteTemplate(editing.id);
                  setView("list");
                  setEditing(null);
                  router.refresh();
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta de plantilla + flujo "usar"
// ---------------------------------------------------------------------------

function TemplateCard({
  template,
  canManage,
  clients,
  onUse,
  onEdit,
  onToggleActive,
}: {
  template: QuoteTemplate;
  canManage: boolean;
  clients: ClientOption[];
  onUse: (payload: {
    templateId: number;
    clientId: number;
    quantityOverrides: Record<number, number>;
    notes: string | null;
  }) => Promise<{ ok: boolean; error?: string; warnings?: string[]; skippedBrokenLines?: number }>;
  onEdit: () => void;
  onToggleActive: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState<string>("");
  const [qty, setQty] = useState<Record<number, string>>(
    Object.fromEntries(template.lines.map((l) => [l.id, String(l.quantity)])),
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const cid = Number(clientId);
    if (!cid) {
      setError("Elige un cliente.");
      return;
    }
    const overrides: Record<number, number> = {};
    for (const line of template.lines) {
      overrides[line.id] = Number(qty[line.id] ?? line.quantity);
    }
    startTransition(async () => {
      const res = await onUse({
        templateId: template.id,
        clientId: cid,
        quantityOverrides: overrides,
        notes: notes.trim() || null,
      });
      if (!res.ok) setError(res.error ?? "No se pudo crear el borrador.");
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-[#111111]">{template.name}</h3>
            {template.scenario && (
              <span className="rounded-full bg-[#9E1B32]/10 px-2 py-0.5 text-[11px] font-semibold text-[#9E1B32]">
                {template.scenario}
              </span>
            )}
            {!template.is_active && (
              <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black/50">
                Inactiva
              </span>
            )}
          </div>
          {template.description && (
            <p className="mt-1 text-sm text-black/60">{template.description}</p>
          )}
          <p className="mt-2 text-xs text-black/45">
            {template.lines.filter((l) => l.kind === "product").length} equipo ·{" "}
            {template.lines.filter((l) => l.kind === "labor").length} mano de obra
            {template.broken_line_count > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 font-semibold text-[#9E1B32]">
                <AlertTriangle size={12} /> {template.broken_line_count} línea(s) rota(s)
              </span>
            )}
          </p>
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-full p-2 text-black/40 transition hover:bg-black/5 hover:text-black"
              aria-label="Editar plantilla"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={onToggleActive}
              className="rounded-full p-2 text-black/40 transition hover:bg-black/5 hover:text-black"
              aria-label={template.is_active ? "Desactivar" : "Activar"}
            >
              <Power size={15} />
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-black/5 bg-[#FBFAF8] px-5 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex w-full items-center justify-between text-sm font-bold text-[#9E1B32]"
        >
          <span className="inline-flex items-center gap-1.5">
            <Sparkles size={15} /> Usar esta plantilla
          </span>
          <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-black/60">Cliente</label>
              <ClientSearchSelect
                clients={clients}
                value={clientId}
                onChange={(id) => setClientId(id)}
                placeholder="Buscar cliente…"
                theme="light"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-black/60">Cantidades</p>
              {template.lines.map((line) => (
                <TemplateLineRow
                  key={line.id}
                  line={line}
                  value={qty[line.id] ?? String(line.quantity)}
                  onChange={(v) => setQty((prev) => ({ ...prev, [line.id]: v }))}
                />
              ))}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-black/60">
                Notas (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder={template.default_notes ?? "Se usan las notas por defecto de la plantilla."}
                className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm focus:border-[#9E1B32] focus:outline-none"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-900">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#9E1B32] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#7A1F2B] disabled:opacity-50"
            >
              {pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Crear borrador y abrir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateLineRow({
  line,
  value,
  onChange,
}: {
  line: ResolvedTemplateLine;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
        line.broken ? "border-rose-200 bg-rose-50" : "border-black/10 bg-white"
      }`}
    >
      {line.kind === "product" ? (
        <Package size={15} className="shrink-0 text-black/40" />
      ) : (
        <Wrench size={15} className="shrink-0 text-black/40" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-black/80">{line.label}</p>
        {line.unit_price != null && line.unit_currency && (
          <p className="text-[11px] text-black/45">
            {money(line.unit_price, line.unit_currency)} c/u
          </p>
        )}
        {line.broken && (
          <p className="text-[11px] font-semibold text-rose-700">
            No disponible — se omite al crear el borrador
          </p>
        )}
      </div>
      <input
        type="number"
        min={0}
        step="any"
        value={value}
        disabled={line.broken}
        onChange={(e) => onChange(e.target.value)}
        className="w-16 rounded-lg border border-black/15 bg-white px-2 py-1 text-right text-sm focus:border-[#9E1B32] focus:outline-none disabled:opacity-40"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor de plantilla
// ---------------------------------------------------------------------------

function TemplateEditor({
  template,
  products,
  laborActivities,
  onDone,
  onDelete,
}: {
  template: QuoteTemplate | null;
  products: ProductOption[];
  laborActivities: LaborOption[];
  onDone: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [scenario, setScenario] = useState(template?.scenario ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [defaultNotes, setDefaultNotes] = useState(template?.default_notes ?? "");
  const [lines, setLines] = useState<DraftLine[]>(
    (template?.lines ?? []).map((l, i) => ({
      key: `${l.id}-${i}`,
      kind: l.kind,
      product_id: l.product_id,
      labor_activity_id: l.labor_activity_id,
      quantity: String(l.quantity),
    })),
  );
  const [productQuery, setProductQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products.slice(0, 20);
    return products
      .filter((p) => productLabel(p).toLowerCase().includes(q) || (p.name || "").toLowerCase().includes(q))
      .slice(0, 20);
  }, [productQuery, products]);

  function addProduct(id: number) {
    setLines((prev) => [
      ...prev,
      { key: `p-${id}-${prev.length}`, kind: "product", product_id: id, labor_activity_id: null, quantity: "1" },
    ]);
    setProductQuery("");
  }
  function addLabor(id: number) {
    setLines((prev) => [
      ...prev,
      { key: `l-${id}-${prev.length}`, kind: "labor", product_id: null, labor_activity_id: id, quantity: "1" },
    ]);
  }
  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }
  function setQty(key: string, quantity: string) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity } : l)));
  }

  function save() {
    setError(null);
    if (!name.trim()) {
      setError("Ponle un nombre a la plantilla.");
      return;
    }
    if (lines.length === 0) {
      setError("Agrega al menos una línea.");
      return;
    }
    startTransition(async () => {
      const res = await saveQuoteTemplate({
        id: template?.id,
        name,
        scenario,
        description,
        default_notes: defaultNotes,
        lines: lines.map((l) => ({
          kind: l.kind,
          product_id: l.product_id,
          labor_activity_id: l.labor_activity_id,
          quantity: Number(l.quantity),
        })),
      });
      if (res.ok) onDone();
      else setError(res.error ?? "No se pudo guardar.");
    });
  }

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const laborById = useMemo(() => new Map(laborActivities.map((a) => [a.id, a])), [laborActivities]);

  return (
    <div className="mt-6 space-y-5">
      <button
        type="button"
        onClick={onDone}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/50 transition hover:text-black"
      >
        <ArrowLeft size={14} /> Volver a la lista
      </button>

      <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-black/60">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="CCTV residencial 4 cámaras"
              className="w-full rounded-xl border border-black/15 px-3 py-2 text-sm focus:border-[#9E1B32] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-black/60">
              Escenario (etiqueta corta)
            </label>
            <input
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              placeholder="CCTV residencial"
              className="w-full rounded-xl border border-black/15 px-3 py-2 text-sm focus:border-[#9E1B32] focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-semibold text-black/60">Descripción</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-black/15 px-3 py-2 text-sm focus:border-[#9E1B32] focus:outline-none"
          />
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-xs font-semibold text-black/60">
            Notas por defecto del borrador
          </label>
          <textarea
            value={defaultNotes}
            onChange={(e) => setDefaultNotes(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-black/15 px-3 py-2 text-sm focus:border-[#9E1B32] focus:outline-none"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-[#111111]">Líneas</p>
        <div className="mt-3 space-y-2">
          {lines.map((line) => {
            const label =
              line.kind === "product"
                ? line.product_id
                  ? productLabel(productById.get(line.product_id) ?? ({ id: line.product_id } as ProductOption))
                  : "Producto"
                : line.labor_activity_id
                  ? laborById.get(line.labor_activity_id)?.name ?? "Actividad"
                  : "Actividad";
            return (
              <div key={line.key} className="flex items-center gap-3 rounded-xl border border-black/10 px-3 py-2">
                {line.kind === "product" ? (
                  <Package size={15} className="shrink-0 text-black/40" />
                ) : (
                  <Wrench size={15} className="shrink-0 text-black/40" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm text-black/80">{label}</span>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={line.quantity}
                  onChange={(e) => setQty(line.key, e.target.value)}
                  className="w-16 rounded-lg border border-black/15 px-2 py-1 text-right text-sm focus:border-[#9E1B32] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeLine(line.key)}
                  className="rounded-full p-1.5 text-black/40 transition hover:bg-rose-50 hover:text-[#9E1B32]"
                  aria-label="Quitar línea"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
          {lines.length === 0 && (
            <p className="py-2 text-xs text-black/45">Sin líneas. Agrega productos o mano de obra abajo.</p>
          )}
        </div>

        <div className="mt-4 space-y-3 border-t border-black/5 pt-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-black/60">Agregar producto</label>
            <input
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Buscar producto del catálogo…"
              className="w-full rounded-xl border border-black/15 px-3 py-2 text-sm focus:border-[#9E1B32] focus:outline-none"
            />
            {productQuery.trim() && (
              <div className="mt-1 max-h-56 overflow-y-auto rounded-xl border border-black/10 bg-white">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProduct(p.id)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-black/5"
                  >
                    <span className="truncate">{productLabel(p)}</span>
                    <Plus size={14} className="shrink-0 text-[#9E1B32]" />
                  </button>
                ))}
                {filteredProducts.length === 0 && (
                  <p className="px-3 py-2 text-xs text-black/45">Sin resultados.</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-black/60">
              Agregar mano de obra
            </label>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) addLabor(Number(e.target.value));
              }}
              className="w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm focus:border-[#9E1B32] focus:outline-none"
            >
              <option value="">Elegir actividad…</option>
              {laborActivities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-900">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        {onDelete ? (
          <button
            type="button"
            onClick={() => {
              if (confirm("¿Eliminar esta plantilla?")) startTransition(() => void onDelete());
            }}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-black/50 transition hover:bg-rose-50 hover:text-[#9E1B32]"
          >
            <Trash2 size={14} /> Eliminar
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-[#9E1B32] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#7A1F2B] disabled:opacity-50"
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Guardar plantilla
        </button>
      </div>
    </div>
  );
}
