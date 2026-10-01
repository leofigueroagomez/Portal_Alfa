"use client";

import Link from "next/link";
import { useState } from "react";
import {
  formatPercent,
  normalizeBrandKey,
  type BrandRuleMap,
} from "@/lib/quoteLineDiscounts";

export type BrandDiscountSummary = {
  brand: string;
  lineCount: number;
};

type Props = {
  brands: BrandDiscountSummary[];
  rules: BrandRuleMap;
  isPartnerQuote: boolean;
  disabled: boolean;
  // Valores "" = quitar el override y volver a heredar.
  onApply: (brand: string, clientPercent: string, partnerPercent: string) => void;
};

export default function QuoteBrandDiscountsPanel({
  brands,
  rules,
  isPartnerQuote,
  disabled,
  onApply,
}: Props) {
  const [drafts, setDrafts] = useState<
    Record<string, { client: string; partner: string }>
  >({});

  if (brands.length === 0) return null;

  const inputClass =
    "w-24 rounded-xl border border-[#2A2A30] bg-[#151518] px-3 py-2 text-sm outline-none focus:border-[#9E1B32] disabled:cursor-not-allowed disabled:opacity-70";

  return (
    <div className="mt-4 rounded-xl border border-[#2A2A30] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">Descuentos por marca</p>
        <Link
          href="/quotes/brand-rules"
          className="text-xs font-semibold text-[#B3B3B8] hover:text-white"
        >
          Reglas por marca
        </Link>
      </div>
      <p className="mt-1 text-xs text-[#77777D]">
        Aplica un % a todas las partidas de una marca. Aliado = % de la utilidad
        que queda despues del descuento al cliente. Vacio = usar el % general o la
        regla de la marca.
      </p>

      <div className="mt-3 space-y-3">
        {brands.map(({ brand, lineCount }) => {
          const key = normalizeBrandKey(brand);
          const rule = rules.get(key);
          const draft = drafts[key] || { client: "", partner: "" };

          return (
            <div
              key={key}
              className="flex flex-wrap items-center gap-3 border-t border-[#2A2A30] pt-3"
            >
              <div className="min-w-32 flex-1">
                <p className="text-sm">{brand}</p>
                <p className="text-xs text-[#77777D]">
                  {lineCount} {lineCount === 1 ? "partida" : "partidas"}
                  {rule
                    ? ` · regla: ${
                        rule.max_client_discount_percent === null
                          ? "sin tope"
                          : `max ${formatPercent(Number(rule.max_client_discount_percent))}`
                      } cliente${
                        isPartnerQuote && rule.partner_profit_share_percent !== null
                          ? `, aliado ${formatPercent(Number(rule.partner_profit_share_percent))} de la utilidad`
                          : ""
                      }`
                    : ""}
                </p>
              </div>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="Cliente %"
                aria-label={`Descuento cliente ${brand}`}
                value={draft.client}
                disabled={disabled}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [key]: { ...draft, client: event.target.value },
                  }))
                }
                className={inputClass}
              />
              {isPartnerQuote ? (
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="Aliado % util."
                  aria-label={`Descuento aliado ${brand}`}
                  value={draft.partner}
                  disabled={disabled}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [key]: { ...draft, partner: event.target.value },
                    }))
                  }
                  className={inputClass}
                />
              ) : null}
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  onApply(brand, draft.client, isPartnerQuote ? draft.partner : "")
                }
                className="rounded-xl bg-[#151518] px-3 py-2 text-xs font-semibold hover:bg-[#2A2A30] disabled:cursor-not-allowed disabled:opacity-70"
              >
                Aplicar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
