import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AnalyticsScripts from "@/components/AnalyticsScripts";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.alfait.com.mx";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ALFA High End Services | Integración Tecnológica Premium",
    template: "%s | ALFA",
  },
  description:
    "Soluciones tecnológicas llave en mano para residencias y empresas. Audio premium, redes de alta velocidad, videovigilancia, automatización y soporte especializado.",
  openGraph: {
    type: "website",
    locale: "es_MX",
    siteName: "ALFA High End Services",
  },
  twitter: {
    card: "summary_large_image",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AnalyticsScripts />
        {children}
      </body>
    </html>
  );
}