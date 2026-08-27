"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";

type Props = {
  src: string;
  alt: string;
  brandName: string;
};

export default function ProductDetailImage({ src, alt, brandName }: Props) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  function handleError() {
    if (currentSrc.endsWith(".avif")) {
      setCurrentSrc(currentSrc.replace(/\.avif$/, ".png"));
    } else if (currentSrc.endsWith(".png")) {
      setCurrentSrc(currentSrc.replace(/\.png$/, ".jpg"));
    } else if (currentSrc.endsWith(".jpg")) {
      setCurrentSrc(currentSrc.replace(/\.jpg$/, ".jpeg"));
    } else if (currentSrc.endsWith(".jpeg")) {
      setCurrentSrc(currentSrc.replace(/\.jpeg$/, ".webp"));
    } else {
      setHasError(true);
    }
  }

  return (
    <div className="relative aspect-square w-full rounded-2xl bg-gradient-to-b from-white/[0.08] to-black/60 border border-white/10 p-6 flex items-center justify-center overflow-hidden shadow-2xl">
      {!hasError && currentSrc ? (
        <img
          src={currentSrc}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={handleError}
          className="h-full w-full object-contain p-4 rounded-xl transition duration-500 hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[#18181D] text-xs text-zinc-500 rounded-xl text-center p-4">
          Fotografía oficial en calibración
        </div>
      )}

      <div className="absolute top-4 left-4">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#E07A8B] bg-black/80 px-3 py-1 rounded-md border border-[#9E1B32]/40 backdrop-blur-md">
          <ShieldCheck className="h-3.5 w-3.5" />
          Equipo Genuino {brandName}
        </span>
      </div>
    </div>
  );
}
