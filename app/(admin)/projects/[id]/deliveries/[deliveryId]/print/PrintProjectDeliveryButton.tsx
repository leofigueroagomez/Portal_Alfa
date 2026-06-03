"use client";

import { Printer } from "lucide-react";

export default function PrintProjectDeliveryButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print-actions inline-flex items-center gap-2 rounded bg-[#151518] px-5 py-3 text-sm font-semibold text-white"
    >
      <Printer size={15} />
      Imprimir PDF
    </button>
  );
}
