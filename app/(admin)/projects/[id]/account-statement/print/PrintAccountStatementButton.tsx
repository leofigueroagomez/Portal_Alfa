"use client";

export default function PrintAccountStatementButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-[#9E1B32] px-5 py-3 text-sm font-semibold text-white hover:bg-[#B91C3C]"
    >
      Imprimir
    </button>
  );
}
