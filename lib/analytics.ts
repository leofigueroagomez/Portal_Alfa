"use client";

// Types for global tracking objects
declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
  }
}

export type ConversionEvent =
  | "generate_lead"
  | "click_whatsapp"
  | "view_service"
  | "click_diagnostic_cta";

export interface AnalyticsEventParams {
  service?: string;
  customer_type?: string;
  interest?: string;
  budget_range?: string;
  placement?: string;
  [key: string]: any;
}

/**
 * Safely dispatches an analytics event to GTM (dataLayer), Google Analytics (gtag),
 * and Meta Pixel (fbq) if initialized. Never throws errors.
 */
export function trackEvent(
  eventName: ConversionEvent | string,
  params: AnalyticsEventParams = {}
) {
  if (typeof window === "undefined") return;

  try {
    // 1. Google Tag Manager (dataLayer)
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({
        event: eventName,
        ...params,
      });
    }

    // 2. Google Analytics 4 (gtag)
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, params);
    }

    // 3. Meta Pixel (fbq)
    if (typeof window.fbq === "function") {
      if (eventName === "generate_lead") {
        window.fbq("track", "Lead", {
          content_name: params.service || params.interest || "Diagnóstico",
          content_category: params.customer_type || "General",
          value: params.budget_range || "N/A",
        });
      } else if (eventName === "click_whatsapp") {
        window.fbq("trackCustom", "ClickWhatsApp", {
          service: params.service || "General",
          placement: params.placement || "Button",
        });
      } else {
        window.fbq("trackCustom", eventName, params);
      }
    }
  } catch (err) {
    console.debug("[Analytics] Error dispatching event:", err);
  }
}
