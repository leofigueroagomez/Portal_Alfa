"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

type ApiResult = {
  ok: boolean;
  status: "completada" | "aclaracion" | "error" | "sin_presupuesto";
  quote_id?: number;
  url?: string;
  grand_total_mxn?: number;
  assumptions?: string[];
  warnings?: string[];
  question?: string;
  options?: string[];
  cost_usd?: number;
  error?: string;
};

const EXAMPLE =
  "Cotización para Guillermo Orozco: 4 cámaras Hikvision para exterior, un NVR de 8 canales y la instalación.";

function money(value: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);
}

export default function VoiceDraftPanel() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [clarifyAnswer, setClarifyAnswer] = useState("");
  const [lastTranscript, setLastTranscript] = useState("");

  // Dictado por voz del navegador (progresivo; no todos lo soportan).
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<unknown>(null);
  const speechSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => {
    return () => {
      const rec = recognitionRef.current as { stop?: () => void } | null;
      rec?.stop?.();
    };
  }, []);

  const toggleListening = useCallback(() => {
    if (!speechSupported) return;
    if (listening) {
      (recognitionRef.current as { stop?: () => void } | null)?.stop?.();
      setListening(false);
      return;
    }
    const Ctor =
      (window as unknown as { SpeechRecognition?: new () => unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor() as {
      lang: string;
      interimResults: boolean;
      continuous: boolean;
      onresult: (e: unknown) => void;
      onend: () => void;
      start: () => void;
      stop: () => void;
    };
    rec.lang = "es-MX";
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (e: unknown) => {
      const event = e as { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number };
      let chunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        chunk += event.results[i][0].transcript;
      }
      setText((prev) => (prev ? `${prev} ${chunk}`.trim() : chunk));
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [listening, speechSupported]);

  async function submit(transcript: string) {
    const clean = transcript.trim();
    if (!clean || pending) return;
    setPending(true);
    setResult(null);
    setLastTranscript(clean);
    try {
      const res = await fetch("/api/quotes/draft-from-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: clean }),
      });
      const data = (await res.json()) as ApiResult;
      setResult(data);
      if (data.status === "completada" && data.quote_id) {
        setTimeout(() => router.push(`/quotes/${data.quote_id}/edit`), 1200);
      }
    } catch (err) {
      setResult({
        ok: false,
        status: "error",
        error: err instanceof Error ? err.message : "Falló la llamada.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <Link
        href="/quotes"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-black/50 transition hover:text-black"
      >
        <ArrowLeft size={14} /> Cotizaciones
      </Link>
      <h1 className="mt-1 text-2xl font-bold text-[#111111]">Dictar cotización</h1>
      <p className="mt-1 text-sm text-black/60">
        Di el cliente y los equipos. El asistente arma un borrador que tú revisas y autorizas.
      </p>

      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={EXAMPLE}
            className="w-full resize-none rounded-xl border border-black/15 bg-white px-3 py-2.5 pr-12 text-sm focus:border-[#9E1B32] focus:outline-none"
          />
          {speechSupported && (
            <button
              type="button"
              onClick={toggleListening}
              className={`absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
                listening
                  ? "bg-[#9E1B32] text-white"
                  : "bg-black/5 text-black/50 hover:bg-black/10"
              }`}
              aria-label={listening ? "Detener dictado" : "Dictar por voz"}
            >
              {listening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => submit(text)}
          disabled={pending || !text.trim()}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#9E1B32] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#7A1F2B] disabled:opacity-50"
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {pending ? "Armando borrador…" : "Armar borrador"}
        </button>
        <button
          type="button"
          onClick={() => setText(EXAMPLE)}
          className="mt-2 w-full text-center text-xs text-black/40 underline-offset-2 hover:underline"
        >
          Usar ejemplo
        </button>
      </div>

      {result && (
        <div className="mt-4">
          {result.status === "completada" && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <Check size={18} /> Borrador creado
                {typeof result.grand_total_mxn === "number" && (
                  <span className="font-semibold">· {money(result.grand_total_mxn)}</span>
                )}
              </div>
              {result.assumptions && result.assumptions.length > 0 && (
                <div className="mt-2 text-xs text-emerald-800">
                  <p className="font-semibold">Lo que asumí (revísalo):</p>
                  <ul className="mt-1 list-disc pl-4">
                    {result.assumptions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.warnings && result.warnings.length > 0 && (
                <div className="mt-2 text-xs text-amber-800">
                  <p className="font-semibold">Avisos:</p>
                  <ul className="mt-1 list-disc pl-4">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Link
                href={result.url ?? `/quotes/${result.quote_id}/edit`}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#9E1B32] px-4 py-2 text-xs font-bold text-white"
              >
                Abrir y revisar
              </Link>
            </div>
          )}

          {result.status === "aclaracion" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <TriangleAlert size={18} /> Necesito un dato
              </div>
              <p className="mt-2 text-sm text-amber-900">{result.question}</p>
              {result.options && result.options.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-sm text-amber-800">
                  {result.options.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex gap-2">
                <input
                  value={clarifyAnswer}
                  onChange={(e) => setClarifyAnswer(e.target.value)}
                  placeholder="Tu respuesta…"
                  className="flex-1 rounded-xl border border-black/15 bg-white px-3 py-2 text-sm focus:border-[#9E1B32] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    submit(`${lastTranscript}. Aclaración: ${clarifyAnswer}`);
                    setClarifyAnswer("");
                  }}
                  disabled={pending || !clarifyAnswer.trim()}
                  className="rounded-xl bg-[#9E1B32] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  Enviar
                </button>
              </div>
            </div>
          )}

          {(result.status === "error" || result.status === "sin_presupuesto") && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-900">
              {result.error ?? "No se pudo armar el borrador."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
