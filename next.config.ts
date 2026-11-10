import type { NextConfig } from "next";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' blob: data: https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com https://www.facebook.com;
  font-src 'self' data: https://fonts.gstatic.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-src 'self' https://challenges.cloudflare.com https://www.googletagmanager.com;
  connect-src 'self' https://*.supabase.co https://api.facturama.com.mx https://apisandbox.facturama.com.mx https://challenges.cloudflare.com https://api.resend.com https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com https://*.google-analytics.com https://www.facebook.com;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: cspHeader,
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

// URLs del sitio anterior (HTML estatico) que Google todavia conserva
// indexadas bajo http://. Hoy responden 404; se redirigen 301 a su equivalente
// actual para no perder la senal que ya tienen acumulada.
const legacyRedirects = [
  { source: "/domotica.html", destination: "/servicios/iluminacion" },
  { source: "/camarasdeseguridad.html", destination: "/servicios/cctv" },
  { source: "/cercaelectrica.html", destination: "/servicios/control-de-acceso" },
  { source: "/controldeacceso.html", destination: "/servicios/control-de-acceso" },
  { source: "/audiovideo.html", destination: "/servicios/audio-video" },
  { source: "/redes.html", destination: "/servicios/redes" },
  { source: "/automatizacion.html", destination: "/servicios/iluminacion" },
  { source: "/index.html", destination: "/" },
  { source: "/nosotros.html", destination: "/" },
  { source: "/contacto.html", destination: "/" },
  // URLs de la tienda anterior que Google conserva. Las de `/products/*` caerian
  // en el proxy de ALFA OS y terminarian en `/login`, por eso van una por una:
  // nunca usar un comodin aqui, `/products` es una ruta interna.
  {
    source:
      "/products/bocina-inteligente-sonos-move-2-sonido-estereo-y-portatil-wi-fi-y-bluetooth",
    destination: "/marcas/sonos/sonos-move-2",
  },
  { source: "/products/sonos-arc", destination: "/marcas/sonos/sonos-arc" },
  {
    source: "/products/sonos-roam-el-sonido-que-te-sigue-a-todas-partes",
    destination: "/marcas/sonos/sonos-roam-2",
  },
  {
    source:
      "/products/cable-para-bocina-armado-2-hilos-con-conductores-de-cobre-de-grano-largo-solido-concentrico-geometria-de-par-trenzado-fullrange-con-banans-bfa-serie-100-calibre-15-awg",
    destination: "/servicios/audio-video",
  },
  {
    source:
      "/products/conductores-solidos-lgc-con-0-5-de-plata-disipacion-de-ruido-de-capa-metalica-aislamiento-de-espuma-de-polietileno-terminales-chapadas-en-oro-y-soldadas-en-frio-rca-rca-macho",
    destination: "/servicios/audio-video",
  },
  { source: "/collections/sonos", destination: "/marcas/sonos" },
  { source: "/collections/cables-de-interconexion", destination: "/servicios/audio-video" },
  { source: "/pages/contact", destination: "/" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium"],
  async redirects() {
    // 301 explicito (no `permanent: true`, que emite 308): es el codigo que
    // esperan Search Console y los crawlers/bookmarks del sitio anterior.
    return legacyRedirects.map((r) => ({ ...r, statusCode: 301 as const }));
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  outputFileTracingIncludes: {
    "/api/quotes/[id]/premium-pdf": [
      "./public/logo-print.png",
      "./node_modules/@sparticuz/chromium/**/*",
    ],
    "/api/quotes/*/premium-pdf": [
      "./public/logo-print.png",
      "./node_modules/@sparticuz/chromium/**/*",
    ],
    // Mismo render para el endpoint con token de servicio. Sin esto la funcion
    // se despliega sin el logo ni el binario de Chromium y responde 500.
    "/api/quotes/[id]/pdf-premium": [
      "./public/logo-print.png",
      "./node_modules/@sparticuz/chromium/**/*",
    ],
    "/api/quotes/*/pdf-premium": [
      "./public/logo-print.png",
      "./node_modules/@sparticuz/chromium/**/*",
    ],
  },
};

export default nextConfig;
