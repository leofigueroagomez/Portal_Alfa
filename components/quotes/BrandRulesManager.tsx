"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { formatPercent, type BrandCommercialRule } from "@/lib/quoteLineDiscounts";
import {
  deleteBrandRule,
  saveBrandRule,
  type BrandRuleInput,
} from "@/app/(admin)/quotes/brand-rules/actions";

type Props = {
  rules: BrandCommercialRule[];
  brandOptions: string[];
  canManage: boolean;
  loadError: string | null;
};

const EMPTY_DRAFT: BrandRuleInput = {
  id: null,
  brand: "",
  max_client_discount_percent: "",
  partner_profit_share_percent: "",
  notes: "",
};

const inputClass =
  "w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm focus:border-[#9E1B32] focus:outline-none";

function toDraft(rule: BrandCommercialRule): BrandRuleInput {
  return {
    id: rule.id ?? null,
    brand: rule.brand,
    max_client_discount_percent:
      rule.max_client_discount_percent === null ? "" : String(rule.max_client_discount_percent),
    partner_profit_share_percent:
      rule.partner_profit_share_percent === null ? "" : String(rule.partner_profit_share_percent),
    notes: rule.notes || "",
  };
}

export default function BrandRulesManager({ rules, brandOptions, canManage, loadError }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<BrandRuleInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      const result = await saveBrandRule(draft);
      if (!result.ok) {
        setError(result.error || "No se pudo guardar.");
        return;
      }
      setDraft(null);
      router.refresh();
    });
  }

  function handleDelete(rule: BrandCommercialRule) {
    if (!rule.id) return;
    if (!confirm(`¿Quitar la regla de ${rule.brand}?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteBrandRule(rule.id as number);
      if (!result.ok) {
        setError(result.error || "No se pudo quitar.");
        return;
      }
      router.refresh();
    });
  }

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
          <h1 className="mt-1 text-2xl font-bold text-[#111111]">Reglas por marca</h1>
          <p className="mt-1 text-sm text-black/60">
            Cuánto descuento puede recibir el cliente y qué parte de la utilidad se lleva el aliado.
          </p>
        </div>
        {canManage && !draft && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setDraft({ ...EMPTY_DRAFT });
            }}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#9E1B32] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#7A1F2B]"
          >
            <Plus size={14} /> Nueva regla
          </button>
        )}
      </div>

      <p className="mt-6 text-sm leading-relaxed text-black/60">
        Primero se aplica el descuento al cliente; la utilidad que queda se reparte con
        el aliado (50% por defecto). Una partida puede cambiar estos valores dentro de la
        cotización, pero no puede pasar el tope al cliente ni quedar por debajo de su costo.
      </p>

      {loadError ? (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-900">
          No se pudieron leer las reglas: {loadError}
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-900">
          {error}
        </div>
      ) : null}

      {draft ? (
        <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block sm:col-span-3">
              <span className="mb-1 block text-xs font-semibold text-black/60">Marca</span>
              <input
                list="brand-rule-options"
                value={draft.brand}
                onChange={(event) => setDraft({ ...draft, brand: event.target.value })}
                className={inputClass}
                placeholder="Sonos"
              />
              <datalist id="brand-rule-options">
                {brandOptions.map((brand) => (
                  <option key={brand} value={brand} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-black/60">
                Tope descuento cliente %
              </span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={draft.max_client_discount_percent}
                onChange={(event) =>
                  setDraft({ ...draft, max_client_discount_percent: event.target.value })
                }
                className={inputClass}
                placeholder="Sin tope"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-black/60">
                Aliado: % de la utilidad
              </span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={draft.partner_profit_share_percent}
                onChange={(event) =>
                  setDraft({ ...draft, partner_profit_share_percent: event.target.value })
                }
                className={inputClass}
                placeholder="El de la cotización"
              />
            </label>
            <label className="block sm:col-span-3">
              <span className="mb-1 block text-xs font-semibold text-black/60">Nota</span>
              <input
                value={draft.notes}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                className={inputClass}
                placeholder="Por qué existe esta regla"
              />
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-full px-4 py-2 text-xs font-semibold text-black/60 transition hover:bg-black/5"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#9E1B32] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#7A1F2B] disabled:opacity-60"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              Guardar
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-8 divide-y divide-black/10">
        {rules.length === 0 && !loadError ? (
          <p className="py-6 text-sm text-black/50">
            Sin reglas. Todas las marcas usan el % general de cada cotización.
          </p>
        ) : null}
        {rules.map((rule) => (
          <div key={rule.id ?? rule.brand} className="flex items-start justify-between gap-4 py-5">
            <div className="min-w-0">
              <p className="text-lg font-semibold text-[#111111]">{rule.brand}</p>
              <p className="mt-1 text-sm text-black/60">
                Cliente:{" "}
                {rule.max_client_discount_percent === null
                  ? "sin tope"
                  : `máx ${formatPercent(Number(rule.max_client_discount_percent))}`}
                {" · "}
                Aliado:{" "}
                {rule.partner_profit_share_percent === null
                  ? "el de la cotización"
                  : `${formatPercent(Number(rule.partner_profit_share_percent))} de la utilidad`}
              </p>
              {rule.notes ? <p className="mt-1 text-xs text-black/40">{rule.notes}</p> : null}
            </div>
            {canManage ? (
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label={`Editar ${rule.brand}`}
                  onClick={() => {
                    setError(null);
                    setDraft(toDraft(rule));
                  }}
                  className="rounded-full p-2 text-black/40 transition hover:bg-black/5 hover:text-black"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  aria-label={`Quitar ${rule.brand}`}
                  disabled={isPending}
                  onClick={() => handleDelete(rule)}
                  className="rounded-full p-2 text-black/40 transition hover:bg-black/5 hover:text-black"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
