"use client";

import { Printer } from "lucide-react";

export default function PrintServiceProposalButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-[#9E1B32] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B91C3C]"
    >
      <Printer size={15} />
      Imprimir propuesta
    </button>
  );
}
