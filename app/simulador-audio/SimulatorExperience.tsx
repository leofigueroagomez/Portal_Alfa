"use client";

import { useState } from "react";
import type { AssistantAnswers } from "@/lib/simuladorAudio/assistant";
import Assistant from "./Assistant";
import Simulator from "./Simulator";

type ViewerKind = "interno" | "portal" | "visitante";

/**
 * Recorrido completo: primero el asistente (preguntas y solucion inicial),
 * despues el simulador, que abre con lo que el asistente recomendo.
 */
export default function SimulatorExperience({ viewerKind }: { viewerKind: ViewerKind }) {
  const [phase, setPhase] = useState<"asistente" | "simulador">("asistente");
  const [spaces, setSpaces] = useState<AssistantAnswers[]>([]);

  if (phase === "simulador") {
    return (
      <Simulator
        viewerKind={viewerKind}
        assistantSpaces={spaces}
        onBackToAssistant={() => setPhase("asistente")}
      />
    );
  }

  return (
    <Assistant
      viewerKind={viewerKind}
      spaces={spaces}
      onSpacesChange={setSpaces}
      onOpenSimulator={() => setPhase("simulador")}
      onSkip={() => {
        setSpaces([]);
        setPhase("simulador");
      }}
    />
  );
}
