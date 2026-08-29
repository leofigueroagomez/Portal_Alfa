"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, Maximize2, X, ChevronLeft, ChevronRight, Film, Image as ImageIcon } from "lucide-react";
import { PortfolioMediaItem } from "@/lib/portfolio";

type Props = {
  gallery: PortfolioMediaItem[];
  projectTitle: string;
};

export default function PortfolioMediaGallery({ gallery, projectTitle }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const currentItem = selectedIndex !== null ? gallery[selectedIndex] : null;

  function handleNext() {
    if (selectedIndex === null) return;
    setSelectedIndex((selectedIndex + 1) % gallery.length);
  }

  function handlePrev() {
    if (selectedIndex === null) return;
    setSelectedIndex((selectedIndex - 1 + gallery.length) % gallery.length);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif text-white">
            Galería Multimedia del Proyecto
          </h2>
          <p className="text-xs text-zinc-400 font-light mt-1">
            Explora las fotografías de detalle y el recorrido en video del espacio.
          </p>
        </div>
        <span className="text-xs text-zinc-500 font-mono">
          {gallery.length} elementos multimedia
        </span>
      </div>

      {/* Grid de Medios */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {gallery.map((item, index) => {
          const isVideo = item.type === "video";

          return (
            <div
              key={index}
              onClick={() => setSelectedIndex(index)}
              className="group relative aspect-[4/3] w-full cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#141418] shadow-lg transition duration-300 hover:border-[#9E1B32]/60 hover:shadow-2xl hover:shadow-[#9E1B32]/10"
            >
              {isVideo ? (
                <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-900 via-black to-zinc-950 p-4">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#9E1B32] text-white shadow-xl shadow-[#9E1B32]/40 transition duration-300 group-hover:scale-110">
                      <Play className="h-6 w-6 fill-white ml-0.5" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                      <Film className="h-3.5 w-3.5 text-[#E07A8B]" />
                      Reproducir Video
                    </span>
                  </div>
                </div>
              ) : (
                <img
                  src={item.url}
                  alt={`${projectTitle} - ${item.caption}`}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = "/projects/audio-hifi-bw-mcintosh.jpeg";
                  }}
                />
              )}

              {/* Overlay con Gradiente */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-80 transition duration-300 group-hover:opacity-95" />

              {/* Caption & Badge */}
              <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between gap-2">
                <p className="text-xs text-zinc-200 line-clamp-2 font-light">
                  {item.caption}
                </p>
                <span className="flex-shrink-0 rounded-lg bg-black/60 backdrop-blur-md p-1.5 text-zinc-400 group-hover:text-white border border-white/10 transition">
                  <Maximize2 className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal / Lightbox de Pantalla Completa */}
      {selectedIndex !== null && currentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 sm:p-8 backdrop-blur-md">
          {/* Botón Cerrar */}
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute top-5 right-5 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-[#9E1B32] transition"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Navegación Anterior / Siguiente */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
            aria-label="Siguiente"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Contenedor Principal */}
          <div className="relative max-h-[85vh] max-w-5xl w-full flex flex-col items-center justify-center">
            {currentItem.type === "video" ? (
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
                <video
                  src={currentItem.url}
                  controls
                  autoPlay
                  className="h-full w-full object-contain"
                >
                  Tu navegador no soporta la reproducción de video HTML5.
                </video>
              </div>
            ) : (
              <div className="relative max-h-[75vh] w-full flex items-center justify-center overflow-hidden rounded-2xl">
                <img
                  src={currentItem.url}
                  alt={currentItem.caption}
                  className="max-h-[75vh] w-auto object-contain rounded-2xl shadow-2xl"
                  onError={(e) => {
                    e.currentTarget.src = "/projects/audio-hifi-bw-mcintosh.jpeg";
                  }}
                />
              </div>
            )}

            {/* Texto de Pie */}
            <div className="mt-4 text-center max-w-2xl px-4">
              <p className="text-sm font-medium text-zinc-200">
                {currentItem.caption}
              </p>
              <p className="text-xs text-zinc-500 font-mono mt-1">
                {selectedIndex + 1} de {gallery.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
