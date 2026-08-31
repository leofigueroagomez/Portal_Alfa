import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ALFA OS | High End Services",
    short_name: "ALFA OS",
    description: "Sistema Operativo y Portal ALFA High End Services",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0B0B0C",
    theme_color: "#9E1B32",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
