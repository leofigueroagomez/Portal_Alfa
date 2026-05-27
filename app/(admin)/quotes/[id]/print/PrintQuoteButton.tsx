"use client";

export default function PrintQuoteButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-[#151518] text-white rounded px-5 py-3 text-sm font-semibold"
    >
      Imprimir / Guardar PDF
    </button>
  );
}
