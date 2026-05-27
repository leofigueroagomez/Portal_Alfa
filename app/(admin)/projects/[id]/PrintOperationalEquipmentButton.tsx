"use client";

import { Printer } from "lucide-react";

export default function PrintOperationalEquipmentButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="project-screen-only inline-flex w-fit items-center gap-2 rounded-xl bg-[#9E1B32] px-5 py-3 font-semibold text-white hover:bg-[#B91C3C]"
    >
      <Printer size={18} />
      Imprimir listado operativo
    </button>
  );
}
