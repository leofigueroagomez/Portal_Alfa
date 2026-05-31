import type { Metadata } from "next";
import SeoContentPage from "@/components/SeoContentPage";

export const metadata: Metadata = {
  title: "Audio y video profesional | ALFA High End Services",
  description:
    "Diseño e integración de audio y video profesional para salas de juntas, espacios corporativos, residencias y experiencias audiovisuales de alto nivel.",
};

export default function AudioVideoPage() {
  return (
    <SeoContentPage
      eyebrow="Servicios"
      title="Audio y video profesional para espacios exigentes."
      description="Integramos sistemas audiovisuales pensados para comunicación, entretenimiento, colaboración y experiencias premium."
      points={[
        "Salas de juntas, videoconferencia y colaboración profesional.",
        "Audio distribuido, video, pantallas y sistemas de control.",
        "Diseño técnico alineado a la acústica, uso y operación del espacio.",
        "Implementación, documentación y soporte especializado.",
      ]}
    />
  );
}
