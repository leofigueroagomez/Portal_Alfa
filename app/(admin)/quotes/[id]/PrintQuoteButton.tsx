"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Printer } from "lucide-react";

type Props = {
  quoteId: number;
  isPartnerQuote: boolean;
  commercialPartnerName?: string | null;
  canGeneratePartnerPrint: boolean;
  partnerMissingReason: string | null;
  canRefreshRate: boolean;
};

export default function PrintQuoteButton({
  quoteId,
  isPartnerQuote,
  commercialPartnerName,
  canGeneratePartnerPrint,
  partnerMissingReason,
  canRefreshRate,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!isPartnerQuote) {
    if (canRefreshRate) {
      return (
        <Link
          href={`/quotes/${quoteId}/edit?refreshRate=1`}
          className="inline-flex items-center gap-2 rounded-xl border border-[#9E1B32] bg-[#9E1B32] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#B91C3C]"
        >
          <Printer size={16} />
          Imprimir
        </Link>
      );
    }

    return (
      <a
        href={`/api/quotes/${quoteId}/premium-pdf`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-xl border border-[#9E1B32] bg-[#9E1B32] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#B91C3C]"
      >
        <Printer size={16} />
        Imprimir
      </a>
    );
  }

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-xl border border-[#9E1B32] bg-[#9E1B32] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#B91C3C]"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Printer size={16} />
        <span>Imprimir</span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-[#2A2A30] bg-[#151518] p-2 shadow-2xl">
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#77777D]">
            Opciones de impresión
          </div>

          {/* Opción 1: Para Cliente (Marca Aliado) */}
          {canGeneratePartnerPrint ? (
            <OptionItem
              href={
                canRefreshRate
                  ? `/quotes/${quoteId}/edit?refreshRate=1&branding=partner`
                  : `/api/quotes/${quoteId}/premium-pdf?branding=partner`
              }
              isDirect={!canRefreshRate}
              onClick={() => setIsOpen(false)}
              title={
                commercialPartnerName
                  ? `Para Cliente (${commercialPartnerName})`
                  : "Para Cliente (Marca Aliado)"
              }
              badge="Cliente"
              badgeColor="border-[#F4C66A]/30 bg-[#F4C66A]/10 text-[#F4C66A]"
              description="Logo del aliado y precio sugerido al cliente final (sin desglose de descuento)."
            />
          ) : (
            <div
              title={partnerMissingReason || "No autorizado para imprimir formato del aliado"}
              className="cursor-not-allowed rounded-xl p-3 opacity-50"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">
                  {commercialPartnerName
                    ? `Para Cliente (${commercialPartnerName})`
                    : "Para Cliente (Marca Aliado)"}
                </span>
                <span className="rounded-full border border-[#2A2A30] bg-[#222228] px-2 py-0.5 text-[9px] font-semibold uppercase text-[#77777D]">
                  Cliente
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[#F28B82]">
                {partnerMissingReason || "No disponible"}
              </p>
            </div>
          )}

          <div className="my-1 border-t border-[#1F1F24]" />

          {/* Opción 2: Para Aliado (Marca ALFA) */}
          <OptionItem
            href={
              canRefreshRate
                ? `/quotes/${quoteId}/edit?refreshRate=1&branding=alfa`
                : `/api/quotes/${quoteId}/premium-pdf`
            }
            isDirect={!canRefreshRate}
            onClick={() => setIsOpen(false)}
            title="Para Aliado (Marca ALFA)"
            badge="ALFA"
            badgeColor="border-[#9E1B32]/40 bg-[#9E1B32]/20 text-[#FF8F9E]"
            description="Logo de ALFA, desglose de descuento de aliado y total neto a liquidar a ALFA."
          />
        </div>
      )}
    </div>
  );
}

function OptionItem({
  href,
  isDirect,
  onClick,
  title,
  badge,
  badgeColor,
  description,
}: {
  href: string;
  isDirect: boolean;
  onClick: () => void;
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
}) {
  const innerContent = (
    <div className="group rounded-xl p-3 transition-colors hover:bg-[#222228]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white group-hover:text-[#F4C66A]">
          {title}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${badgeColor}`}
        >
          {badge}
        </span>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-[#B3B3B8]">
        {description}
      </p>
    </div>
  );

  if (isDirect) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        onClick={onClick}
        className="block text-left"
      >
        {innerContent}
      </a>
    );
  }

  return (
    <Link href={href} onClick={onClick} className="block text-left">
      {innerContent}
    </Link>
  );
}
