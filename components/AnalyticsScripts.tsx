"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { initAttribution } from "@/lib/utmTracking";
import { isPublicAnalyticsPath } from "@/lib/analyticsScope";

export default function AnalyticsScripts() {
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const googleAdsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

  const pathname = usePathname();
  // Solo el sitio público se mide. ALFA OS, el portal de clientes y el login
  // comparten este layout, pero sus títulos y rutas pueden traer datos de
  // clientes, que no deben llegar a Google ni a Meta.
  const trackable = isPublicAnalyticsPath(pathname);
  const firstPageView = useRef(true);

  useEffect(() => {
    initAttribution();
  }, []);

  // GA4: el script inicial manda la primera vista; aquí se mandan las vistas de
  // cada navegación pública y se bloquea GA por completo en rutas privadas.
  // En el flujo de GA4 debe estar apagada la medición mejorada de "cambios de
  // historial del navegador" para que no se cuelen vistas de rutas privadas.
  useEffect(() => {
    if (!gaId) return;
    const w = window as unknown as Record<string, unknown>;
    w[`ga-disable-${gaId}`] = !trackable;
    if (firstPageView.current) {
      firstPageView.current = false;
      return;
    }
    if (trackable && typeof window.gtag === "function") {
      window.gtag("event", "page_view", {
        send_to: gaId,
        page_location: window.location.href,
        page_path: pathname,
        page_title: document.title,
      });
    }
  }, [gaId, pathname, trackable]);

  if (!trackable) return null;

  return (
    <>
      {/* 1. Google Tag Manager (GTM) */}
      {gtmId ? (
        <>
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${gtmId}');
              `,
            }}
          />
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        </>
      ) : null}

      {/* 2. Google Analytics 4 (GA4) & Google Ads Tag */}
      {!gtmId && (gaId || googleAdsId) ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId || googleAdsId}`}
            strategy="afterInteractive"
          />
          <Script
            id="gtag-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                window.gtag = gtag;
                gtag('js', new Date());
                ${gaId ? `gtag('config', '${gaId}', { send_page_view: false });
                gtag('event', 'page_view', { send_to: '${gaId}', page_location: window.location.href, page_path: window.location.pathname, page_title: document.title });` : ""}
                ${googleAdsId ? `gtag('config', '${googleAdsId}');` : ""}
              `,
            }}
          />
        </>
      ) : null}

      {/* 3. Meta Pixel (Facebook / Instagram Ads) */}
      {pixelId ? (
        <>
          <Script
            id="meta-pixel-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${pixelId}');
                fbq('track', 'PageView');
              `,
            }}
          />
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              alt=""
              src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
            />
          </noscript>
        </>
      ) : null}
    </>
  );
}
