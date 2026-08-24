"use client";

export interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
  landing_page?: string;
  timestamp?: string;
}

const STORAGE_KEY = "alfa_marketing_attribution";

/**
 * Initializes and captures marketing attribution on first page visit.
 * Stores in sessionStorage for persistent first-touch attribution during user session.
 */
export function initAttribution(): AttributionData {
  if (typeof window === "undefined") return {};

  try {
    const searchParams = new URLSearchParams(window.location.search);
    const existingRaw = sessionStorage.getItem(STORAGE_KEY);
    let stored: AttributionData = existingRaw ? JSON.parse(existingRaw) : {};

    const utm_source = searchParams.get("utm_source") || undefined;
    const utm_medium = searchParams.get("utm_medium") || undefined;
    const utm_campaign = searchParams.get("utm_campaign") || undefined;
    const utm_term = searchParams.get("utm_term") || undefined;
    const utm_content = searchParams.get("utm_content") || undefined;
    const gclid = searchParams.get("gclid") || undefined;
    const fbclid = searchParams.get("fbclid") || undefined;

    const hasNewParams = Boolean(
      utm_source || utm_medium || utm_campaign || gclid || fbclid
    );

    // If there are new UTMs in the URL or no stored attribution exists yet, record it
    if (hasNewParams || !stored.landing_page) {
      stored = {
        utm_source: utm_source || stored.utm_source,
        utm_medium: utm_medium || stored.utm_medium,
        utm_campaign: utm_campaign || stored.utm_campaign,
        utm_term: utm_term || stored.utm_term,
        utm_content: utm_content || stored.utm_content,
        gclid: gclid || stored.gclid,
        fbclid: fbclid || stored.fbclid,
        referrer: stored.referrer || document.referrer || undefined,
        landing_page: stored.landing_page || window.location.pathname + window.location.search,
        timestamp: stored.timestamp || new Date().toISOString(),
      };

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    }

    return stored;
  } catch (err) {
    console.debug("[Attribution] Error reading or writing attribution:", err);
    return {};
  }
}

/**
 * Retrieves the currently stored attribution data for attaching to leads.
 */
export function getStoredAttribution(): AttributionData {
  if (typeof window === "undefined") return {};

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    return initAttribution();
  } catch {
    return {};
  }
}
