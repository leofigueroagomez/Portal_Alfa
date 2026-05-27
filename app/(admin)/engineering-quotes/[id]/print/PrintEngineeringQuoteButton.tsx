"use client";

export default function PrintEngineeringQuoteButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded bg-[#151518] px-5 py-3 text-sm font-semibold text-white"
    >
      Imprimir / Guardar PDF
    </button>
  );
}
