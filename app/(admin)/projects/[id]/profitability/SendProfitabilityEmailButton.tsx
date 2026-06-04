"use client";

import { useTransition } from "react";
import { Mail } from "lucide-react";
import { sendProfitabilityReportToDirector } from "./actions";

export default function SendProfitabilityEmailButton({
  projectId,
  disabled,
}: {
  projectId: number;
  disabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={disabled || isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await sendProfitabilityReportToDirector(projectId);
          alert(result.message);
        });
      }}
      className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Mail size={18} />
      {isPending ? "Enviando..." : "Enviar a direccion"}
    </button>
  );
}
