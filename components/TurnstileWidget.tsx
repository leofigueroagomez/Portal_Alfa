"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NAP } from "@/lib/localBusiness";

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
const TURNSTILE_FALLBACK_WHATSAPP_URL = `https://wa.me/${NAP.whatsapp}?text=${encodeURIComponent(
  "Hola ALFA, quise enviar un formulario en su sitio y la verificación de seguridad no cargó."
)}`;

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
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

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
          callback: (token: string) => {
            setFailed(false);
            onTokenRef.current(token);
          },
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": (code?: string) => {
            console.error("[turnstile] el widget reporto un error:", code);
            setFailed(true);
            onTokenRef.current(null);
          },
        });
      })
      .catch((error) => {
        // Llave invalida, dominio no autorizado, bloqueador o red caida. Sin
        // este aviso el formulario se queda esperando un token que no llega.
        console.error("[turnstile] no se pudo cargar el widget:", error);
        if (cancelled) return;
        setFailed(true);
        onTokenRef.current(null);
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [theme, attempt]);

  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [resetSignal]);

  if (!turnstileEnabled) return null;

  return (
    <div className={className}>
      <div ref={containerRef} />
      {failed ? (
        <p
          role="alert"
          className={`mt-2 text-xs leading-5 ${
            theme === "dark" ? "text-[#F0B8C0]" : "text-[#9E1B32]"
          }`}
        >
          No pudimos cargar la verificación de seguridad. Desactiva tu bloqueador
          de anuncios o{" "}
          <button
            type="button"
            className="font-semibold underline underline-offset-2"
            onClick={() => {
              setFailed(false);
              setAttempt((value) => value + 1);
            }}
          >
            inténtalo de nuevo
          </button>
          . También puedes escribirnos por{" "}
          <a
            href={TURNSTILE_FALLBACK_WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline underline-offset-2"
          >
            WhatsApp
          </a>
          .
        </p>
      ) : null}
    </div>
  );
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
