"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteContractorMovement } from "./actions";

export default function DeleteContractorMovementButton({
  contractorId,
  movementId,
  movementLabel,
  amountLabel,
}: {
  contractorId: number;
  movementId: number;
  movementLabel: string;
  amountLabel: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        const confirmed = window.confirm(
          `Eliminar ${movementLabel} por ${amountLabel}?\n\nEsta accion no se puede deshacer.`
        );

        if (!confirmed) return;

        startTransition(async () => {
          const result = await deleteContractorMovement(contractorId, movementId);
          alert(result.message);
        });
      }}
      className="inline-flex items-center gap-1 rounded-lg border border-[#6A2A2A] bg-[#351818] px-3 py-2 text-xs font-semibold text-[#FFB4B4] hover:bg-[#4A2020] disabled:cursor-not-allowed disabled:opacity-50"
      title="Eliminar movimiento"
    >
      <Trash2 size={14} />
      {isPending ? "Eliminando" : "Eliminar"}
    </button>
  );
}
