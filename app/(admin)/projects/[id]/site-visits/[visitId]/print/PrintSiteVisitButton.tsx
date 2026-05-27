"use client";

export default function PrintSiteVisitButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print-actions rounded bg-[#151518] px-5 py-3 text-sm font-semibold text-white"
    >
      Imprimir
    </button>
  );
}
