"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Copy, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/services/supabase";
import {
  formatTotpSecret,
  getMfaErrorMessage,
  MFA_TOTP_ISSUER,
  nextTotpFriendlyName,
  normalizeTotpCode,
  toSafeQrDataUrl,
} from "@/lib/mfa";

type VerifiedFactor = {
  id: string;
  friendlyName: string;
  createdAt: string | null;
};

type PendingEnrollment = {
  factorId: string;
  qrDataUrl: string | null;
  secret: string;
  uri: string;
};

type Notice = { tone: "error" | "success"; text: string } | null;

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
}

export default function SecuritySettingsClient() {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<VerifiedFactor[]>([]);
  const [knownFactors, setKnownFactors] = useState<Array<{ id: string; name: string }>>([]);
  const [unverifiedTotpIds, setUnverifiedTotpIds] = useState<string[]>([]);
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"enroll" | "verify" | "cancel" | "remove" | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const loadFactors = useCallback(async () => {
    const [{ data: aal }, { data, error }] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);

    setCurrentLevel(aal?.currentLevel ?? null);

    if (error || !data) {
      setNotice({ tone: "error", text: "No pudimos cargar tus factores. Recarga la página." });
      setLoading(false);
      return;
    }

    setFactors(
      data.totp.map((factor) => ({
        id: factor.id,
        friendlyName: factor.friendly_name || "App de autenticación",
        createdAt: factor.created_at ?? null,
      }))
    );
    setKnownFactors(
      data.all.map((factor) => ({ id: factor.id, name: factor.friendly_name || "" }))
    );
    setUnverifiedTotpIds(
      data.all
        .filter((factor) => factor.factor_type === "totp" && factor.status === "unverified")
        .map((factor) => factor.id)
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    // Carga inicial desde Supabase Auth; el setState ocurre despues del await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFactors();
  }, [loadFactors]);

  async function handleStartEnrollment() {
    setNotice(null);
    setBusy("enroll");

    // Altas abandonadas dejan factores "unverified" que bloquean el nombre.
    const removedIds = new Set<string>();
    for (const factorId of unverifiedTotpIds) {
      const { error: cleanupError } = await supabase.auth.mfa.unenroll({ factorId });
      if (!cleanupError) removedIds.add(factorId);
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: nextTotpFriendlyName(
        knownFactors.filter((factor) => !removedIds.has(factor.id)).map((factor) => factor.name)
      ),
      issuer: MFA_TOTP_ISSUER,
    });

    setBusy(null);

    if (error || !data) {
      setNotice({ tone: "error", text: getMfaErrorMessage(error) });
      await loadFactors();
      return;
    }

    setUnverifiedTotpIds([data.id]);
    setPending({
      factorId: data.id,
      qrDataUrl: toSafeQrDataUrl(data.totp.qr_code),
      secret: data.totp.secret,
      uri: data.totp.uri,
    });
    setCode("");
    setCopied(false);
  }

  async function handleVerifyEnrollment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pending) return;
    setNotice(null);

    const normalized = normalizeTotpCode(code);
    if (!normalized) {
      setNotice({ tone: "error", text: "Escribe los 6 dígitos que muestra tu app." });
      return;
    }

    setBusy("verify");
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: pending.factorId,
      code: normalized,
    });
    setBusy(null);

    if (error) {
      setNotice({ tone: "error", text: getMfaErrorMessage(error) });
      setCode("");
      return;
    }

    setPending(null);
    setCode("");
    setNotice({
      tone: "success",
      text: "Listo. A partir de ahora ALFA OS te pedirá un código al iniciar sesión.",
    });
    await loadFactors();
  }

  async function handleCancelEnrollment() {
    if (!pending) return;
    setBusy("cancel");
    await supabase.auth.mfa.unenroll({ factorId: pending.factorId });
    setBusy(null);
    setPending(null);
    setCode("");
    setNotice(null);
    await loadFactors();
  }

  async function handleRemove(factorId: string) {
    setNotice(null);

    if (currentLevel !== "aal2") {
      setNotice({
        tone: "error",
        text: "Por seguridad, solo puedes quitar un factor después de verificar tu código en esta sesión.",
      });
      setConfirmRemoveId(null);
      return;
    }

    setBusy("remove");
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(null);
    setConfirmRemoveId(null);

    if (error) {
      setNotice({ tone: "error", text: getMfaErrorMessage(error) });
      return;
    }

    // Refresca la sesion para que la cookie refleje la lista nueva de factores.
    await supabase.auth.refreshSession();
    setNotice({ tone: "success", text: "Factor eliminado." });
    await loadFactors();
  }

  async function handleCopySecret() {
    if (!pending) return;
    try {
      await navigator.clipboard.writeText(pending.secret);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const isEnabled = factors.length > 0;

  return (
    <main className="min-h-screen bg-[#F7F6F3] px-5 py-10 text-[#111111] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/settings"
          className="mb-10 inline-flex items-center gap-2 text-sm text-[#666666] transition hover:text-[#111111]"
        >
          <ArrowLeft size={16} />
          Volver a Configuración
        </Link>

        <div className="mb-12 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
            Seguridad
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-normal sm:text-5xl">
            Verificación en dos pasos.
          </h1>
          <p className="mt-5 text-base leading-8 text-[#666666]">
            Además de tu contraseña, ALFA OS te pedirá un código temporal de tu
            teléfono al iniciar sesión. Funciona con Google Authenticator,
            Microsoft Authenticator, 1Password o cualquier app compatible.
          </p>
        </div>

        {notice ? (
          <p
            role="status"
            className={`mb-8 border-l-2 py-1 pl-4 text-sm leading-6 ${
              notice.tone === "error"
                ? "border-[#7A1F2B] text-[#7A1F2B]"
                : "border-[#1F7A4D] text-[#1F5E3E]"
            }`}
          >
            {notice.text}
          </p>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-3 text-sm text-[#666666]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Cargando...
          </div>
        ) : (
          <div className="space-y-12">
            <section>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
                    isEnabled ? "bg-[#111111] text-white" : "bg-white text-[#999999]"
                  }`}
                >
                  <ShieldCheck size={17} />
                </span>
                <p className="text-lg font-semibold">
                  {isEnabled ? "Activada" : "Desactivada"}
                </p>
              </div>

              {isEnabled ? (
                <ul className="mt-6 divide-y divide-black/10 border-y border-black/10">
                  {factors.map((factor) => (
                    <li
                      key={factor.id}
                      className="flex flex-wrap items-center justify-between gap-4 py-5"
                    >
                      <div>
                        <p className="font-medium">{factor.friendlyName}</p>
                        {factor.createdAt ? (
                          <p className="mt-1 text-sm text-[#666666]">
                            Agregado el {formatDate(factor.createdAt)}
                          </p>
                        ) : null}
                      </div>

                      {confirmRemoveId === factor.id ? (
                        <div className="flex items-center gap-4 text-sm">
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveId(null)}
                            className="text-[#666666] transition hover:text-[#111111]"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={busy === "remove"}
                            onClick={() => handleRemove(factor.id)}
                            className="inline-flex items-center gap-2 font-semibold text-[#7A1F2B] transition hover:text-[#5E1621] disabled:opacity-60"
                          >
                            {busy === "remove" ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : null}
                            Confirmar y quitar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setNotice(null);
                            setConfirmRemoveId(factor.id);
                          }}
                          className="text-sm text-[#666666] transition hover:text-[#7A1F2B]"
                        >
                          Quitar
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}

              {!pending ? (
                <button
                  type="button"
                  onClick={handleStartEnrollment}
                  disabled={busy === "enroll"}
                  className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#111111] px-7 text-sm font-semibold text-white transition hover:bg-[#7A1F2B] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy === "enroll" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  {isEnabled ? "Agregar otro dispositivo" : "Activar verificación en dos pasos"}
                </button>
              ) : null}
            </section>

            {pending ? (
              <section className="border-t border-black/10 pt-12">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
                  Paso 1
                </p>
                <h2 className="mt-3 text-2xl font-semibold">Escanea el código con tu app.</h2>

                <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:items-start">
                  {pending.qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pending.qrDataUrl}
                      alt="Código QR para tu app de autenticación"
                      width={192}
                      height={192}
                      className="h-48 w-48 shrink-0 bg-white p-3"
                    />
                  ) : null}

                  <div className="min-w-0 text-sm leading-7 text-[#666666]">
                    <p>¿No puedes escanear? Escribe esta clave en tu app:</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <code className="break-all font-mono text-base tracking-wider text-[#111111] select-all">
                        {formatTotpSecret(pending.secret)}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopySecret}
                        className="inline-flex items-center gap-1.5 text-[#7A1F2B] transition hover:text-[#5E1621]"
                      >
                        {copied ? <Check size={15} /> : <Copy size={15} />}
                        {copied ? "Copiada" : "Copiar"}
                      </button>
                    </div>
                    <a
                      href={pending.uri}
                      className="mt-4 inline-block text-[#111111] underline decoration-black/20 underline-offset-4 transition hover:decoration-[#7A1F2B] sm:hidden"
                    >
                      Abrir en la app de este teléfono
                    </a>
                  </div>
                </div>

                <p className="mt-12 text-xs font-semibold uppercase tracking-[0.28em] text-[#7A1F2B]">
                  Paso 2
                </p>
                <h2 className="mt-3 text-2xl font-semibold">Escribe el código que aparece.</h2>

                <form onSubmit={handleVerifyEnrollment} className="mt-6 flex flex-wrap gap-4">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9 ]*"
                    maxLength={7}
                    required
                    aria-label="Código de verificación"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="000000"
                    className="h-12 w-44 border-b border-black/20 bg-transparent text-center text-xl font-semibold tracking-[0.4em] outline-none transition placeholder:text-black/20 focus:border-[#7A1F2B]"
                  />
                  <button
                    type="submit"
                    disabled={busy === "verify"}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#111111] px-7 text-sm font-semibold text-white transition hover:bg-[#7A1F2B] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy === "verify" ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : null}
                    Verificar y activar
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEnrollment}
                    disabled={busy === "cancel"}
                    className="h-12 px-2 text-sm text-[#666666] transition hover:text-[#111111] disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                </form>
              </section>
            ) : null}

            <p className="border-t border-black/10 pt-8 text-sm leading-7 text-[#666666]">
              Si pierdes tu teléfono, pide a dirección que retire tu factor; después
              podrás configurarlo de nuevo.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
