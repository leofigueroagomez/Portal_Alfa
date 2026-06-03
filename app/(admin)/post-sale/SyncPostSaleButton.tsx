"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { syncPostSaleProjectStages } from "./actions";

export default function SyncPostSaleButton() {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSync() {
    if (!window.confirm("Sincronizar estados de postventa para proyectos historicos?")) {
      return;
    }

    setMessage("");
    startTransition(async () => {
      const result = await syncPostSaleProjectStages();
      setMessage(result.message);
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={isPending}
        className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#2A2A30] bg-[#222228] px-5 py-3 font-semibold text-[#B3B3B8] hover:bg-[#2A2A30] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw size={18} />
        {isPending ? "Sincronizando..." : "Sincronizar estado postventa"}
      </button>
      {message ? <p className="text-sm text-[#B3B3B8]">{message}</p> : null}
    </div>
  );
}
