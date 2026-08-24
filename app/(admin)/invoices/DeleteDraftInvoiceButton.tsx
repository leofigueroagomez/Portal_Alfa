"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteDraftInvoice } from "./actions";

type Props = {
  invoiceId: number;
  status: string | null | undefined;
  facturamaId: string | null | undefined;
  internalFolio: string | null | undefined;
};

export default function DeleteDraftInvoiceButton({
  invoiceId,
  status,
  facturamaId,
  internalFolio,
}: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  if (status !== "draft" || facturamaId) {
    return null;
  }

  async function handleDelete() {
    const folioLabel = internalFolio || `#${invoiceId}`;
    const confirmed = window.confirm(
      `¿Eliminar el borrador ${folioLabel}? No se puede deshacer. Solo se elimina porque nunca se timbró.`
    );

    if (!confirmed) return;

    setDeleting(true);
    const result = await deleteDraftInvoice(invoiceId);
    setDeleting(false);

    if (!result.ok) {
      alert(`No se pudo eliminar el borrador: ${result.error}`);
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      title="Eliminar borrador"
      className="rounded-xl border border-[#6A2A2A] bg-[#351818] px-3 py-2 text-xs font-semibold text-[#FFB4B4] hover:bg-[#4A2222] disabled:opacity-50"
    >
      {deleting ? "Eliminando..." : "Eliminar"}
    </button>
  );
}
