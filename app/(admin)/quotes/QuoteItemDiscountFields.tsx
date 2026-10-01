"use client";

import {
  describeDiscountSource,
  formatPercent,
  type LineDiscountResult,
} from "@/lib/quoteLineDiscounts";
import { formatCurrency } from "@/lib/format";

export type QuoteItemDiscountField =
  | "client_discount_percent"
  | "partner_profit_share_percent";

type Props = {
  lineDiscount: LineDiscountResult;
  clientValue: string;
  partnerValue: string;
  isPartnerQuote: boolean;
  disabled: boolean;
  onChange: (field: QuoteItemDiscountField, value: string) => void;
};

function sourceHint(percent: number, source: string) {
  const label = source ? ` (${source})` : "";
  return `${formatPercent(percent)}${label}`;
}

export default function QuoteItemDiscountFields({
  lineDiscount,
  clientValue,
  partnerValue,
  isPartnerQuote,
  disabled,
  onChange,
}: Props) {
  const rule = lineDiscount.brandRule;
  const inputClass =
    "w-full rounded-xl border border-[#2A2A30] bg-[#151518] px-4 py-3 text-sm outline-none focus:border-[#9E1B32] disabled:cursor-not-allowed disabled:opacity-70";

  return (
    <div className="mt-3 rounded-xl border border-[#2A2A30] p-4">
      <div
        className={`grid gap-3 ${isPartnerQuote ? "md:grid-cols-2" : "md:grid-cols-1"}`}
      >
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#77777D]">
            Descuento cliente % (equipo)
          </span>
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={clientValue}
            disabled={disabled}
            onChange={(event) =>
              onChange("client_discount_percent", event.target.value)
            }
            placeholder={sourceHint(
              lineDiscount.clientPercent,
              describeDiscountSource(lineDiscount.clientSource) || "sin descuento"
            )}
            className={`mt-2 ${inputClass}`}
          />
        </label>

        {isPartnerQuote ? (
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#77777D]">
              Aliado: % de la utilidad
            </span>
            <input
              type="number"
              min="0"
              max="100"
              step="5"
              value={partnerValue}
              disabled={disabled}
              onChange={(event) =>
                onChange("partner_profit_share_percent", event.target.value)
              }
              placeholder={sourceHint(
                lineDiscount.partnerSharePercent,
                describeDiscountSource(lineDiscount.partnerSource)
              )}
              className={`mt-2 ${inputClass}`}
            />
          </label>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#B3B3B8]">
        {rule ? (
          <span className="text-[#F4C66A]">
            Regla {rule.brand}:{" "}
            {rule.max_client_discount_percent === null
              ? "sin tope al cliente"
              : `max ${formatPercent(Number(rule.max_client_discount_percent))} al cliente`}
            {isPartnerQuote && rule.partner_profit_share_percent !== null
              ? ` · aliado ${formatPercent(Number(rule.partner_profit_share_percent))} de la utilidad`
              : ""}
          </span>
        ) : null}
        {lineDiscount.clientDiscountMxn > 0 ? (
          <span>Cliente -{formatCurrency(lineDiscount.clientDiscountMxn, "MXN")}</span>
        ) : null}
        {isPartnerQuote ? (
          <span>
            Utilidad equipo {formatCurrency(lineDiscount.equipmentProfitMxn, "MXN")} · Aliado{" "}
            {formatCurrency(lineDiscount.partnerDiscountMxn, "MXN")}
            {lineDiscount.laborPartnerDiscountMxn > 0
              ? ` · Aliado MO ${formatCurrency(lineDiscount.laborPartnerDiscountMxn, "MXN")}`
              : ""}
          </span>
        ) : null}
      </div>

      {lineDiscount.violation ? (
        <p className="mt-3 text-sm font-semibold text-[#F87171]">
          {lineDiscount.violation} No se podra guardar asi.
        </p>
      ) : null}
    </div>
  );
}
