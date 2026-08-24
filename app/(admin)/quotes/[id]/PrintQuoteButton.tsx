import Link from "next/link";

type Props = {
  quoteId: number;
  isPartnerQuote: boolean;
  canGeneratePartnerPrint: boolean;
  partnerMissingReason: string | null;
  canRefreshRate: boolean;
};

export default function PrintQuoteButton({
  quoteId,
  isPartnerQuote,
  canGeneratePartnerPrint,
  partnerMissingReason,
  canRefreshRate,
}: Props) {
  if (isPartnerQuote && !canGeneratePartnerPrint) {
    return (
      <span
        title={partnerMissingReason || "No autorizado para imprimir aliados"}
        className="pointer-events-none rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#77777D]"
      >
        Imprimir
      </span>
    );
  }

  const pdfUrl = isPartnerQuote
    ? `/api/quotes/${quoteId}/premium-pdf?branding=partner`
    : `/api/quotes/${quoteId}/premium-pdf`;

  if (canRefreshRate) {
    return (
      <Link
        href={`/quotes/${quoteId}/edit?refreshRate=1`}
        className="bg-[#9E1B32] hover:bg-[#B91C3C] border border-[#9E1B32] text-white rounded-xl px-5 py-3 font-semibold"
      >
        Imprimir
      </Link>
    );
  }

  return (
    <a
      href={pdfUrl}
      target="_blank"
      rel="noreferrer"
      className="bg-[#9E1B32] hover:bg-[#B91C3C] border border-[#9E1B32] text-white rounded-xl px-5 py-3 font-semibold"
    >
      Imprimir
    </a>
  );
}
