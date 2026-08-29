"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { PortfolioProject } from "@/lib/portfolio";
import ProjectQuoteModal from "./ProjectQuoteModal";

type Props = {
  project: PortfolioProject;
};

export default function ProjectQuoteModalWrapper({ project }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#9E1B32] hover:bg-[#B91C3C] py-3.5 text-xs font-semibold uppercase tracking-wider text-white transition shadow-lg shadow-[#9E1B32]/25"
      >
        <Sparkles className="h-4 w-4" />
        Solicitar Propuesta para mi Espacio
      </button>

      <ProjectQuoteModal
        project={project}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
