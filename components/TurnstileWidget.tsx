"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Widget de Cloudflare Turnstile para los formularios publicos.
 *
 * Solo aparece si existe NEXT_PUBLIC_TURNSTILE_SITE_KEY; sin ella no carga
 * nada de Cloudflare y los formularios funcionan como antes. El servidor
 * valida el token en lib/turnstile.ts.
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export const turnstileEnabled = Boolean(SITE_KEY);
export const TURNSTILE_PENDING_MESSAGE =
  "Espera a que termine la verificación de seguridad e intenta de nuevo.";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Permite reintentar en el siguiente montaje (bloqueador, red caida).
      scriptPromise = null;
      script.remove();
      reject(new Error("turnstile script failed to load"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

type TurnstileWidgetProps = {
  onToken: (token: string | null) => void;
  /** Cambiar este numero pide un token nuevo (cada token sirve una sola vez). */
  resetSignal?: number;
  theme?: "light" | "dark" | "auto";
  className?: string;
};

export default function TurnstileWidget({
  onToken,
  resetSignal = 0,
  theme = "auto",
  className,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useEffect(() => {
    if (!turnstileEnabled) return;

    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme,
          language: "es",
          size: "flexible",
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => onTokenRef.current(null));

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [theme]);

  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [resetSignal]);

  if (!turnstileEnabled) return null;

  return <div ref={containerRef} className={className} />;
}

/** Estado del token para un formulario: `token`, `reset()` y las props del widget. */
export function useTurnstile() {
  const [token, setToken] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  const reset = useCallback(() => {
    setToken(null);
    setResetSignal((value) => value + 1);
  }, []);

  return {
    enabled: turnstileEnabled,
    token,
    /** true cuando el widget esta activo y todavia no entrega token. */
    pending: turnstileEnabled && !token,
    reset,
    widgetProps: { onToken: setToken, resetSignal },
  };
}
