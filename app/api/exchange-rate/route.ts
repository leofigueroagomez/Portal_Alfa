import { NextResponse } from "next/server";

type ExchangeRateSuccess = {
  rate: number;
  source: string;
  date: string;
  error: null;
};

type ExchangeRateFailure = {
  rate: null;
  source: string;
  date: string;
  error: string;
};

type BanxicoResponse = {
  bmx?: {
    series?: Array<{
      datos?: Array<{
        fecha?: string;
        dato?: string;
      }>;
    }>;
  };
};

const today = new Date().toISOString().slice(0, 10);

function normalizeBanxicoDate(value?: string) {
  if (!value) return today;

  const [day, month, year] = value.split("/");

  if (!day || !month || !year) return today;

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

async function fetchBanxicoRate(): Promise<ExchangeRateSuccess | null> {
  // Add BANXICO_TOKEN to .env.local:
  // BANXICO_TOKEN=your_token_from_banxico_sie
  //
  // Token can be requested in Banxico's SIE API portal. Series SF43718 is
  // "Tipo de cambio para solventar obligaciones denominadas en moneda
  // extranjera, fecha de determinacion (FIX)".
  const token = process.env.BANXICO_TOKEN;

  if (!token) return null;

  const response = await fetch(
    "https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno",
    {
      headers: {
        "Bmx-Token": token,
      },
      next: {
        revalidate: 60 * 60 * 6,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Banxico respondió ${response.status}`);
  }

  const json = (await response.json()) as BanxicoResponse;
  const item = json.bmx?.series?.[0]?.datos?.[0];
  const rate = Number(item?.dato?.replace(",", ""));

  if (!rate) {
    throw new Error("Banxico no devolvió un dato FIX válido");
  }

  return {
    rate,
    source: "Banxico SIE SF43718",
    date: normalizeBanxicoDate(item?.fecha),
    error: null,
  };
}

async function fetchPublicFallbackRate(): Promise<ExchangeRateSuccess | null> {
  const response = await fetch("https://open.er-api.com/v6/latest/USD", {
    next: {
      revalidate: 60 * 60 * 6,
    },
  });

  if (!response.ok) {
    throw new Error(`Fuente pública respondió ${response.status}`);
  }

  const json = await response.json();
  const rate = Number(json?.rates?.MXN);

  if (!rate) {
    throw new Error("Fuente pública no devolvió USD/MXN válido");
  }

  return {
    rate,
    source: "open.er-api.com USD/MXN",
    date: json?.time_last_update_utc
      ? new Date(json.time_last_update_utc).toISOString().slice(0, 10)
      : today,
    error: null,
  };
}

export async function GET() {
  const errors: string[] = [];

  try {
    const banxicoRate = await fetchBanxicoRate();

    if (banxicoRate) {
      return NextResponse.json(banxicoRate);
    }

    errors.push("BANXICO_TOKEN no está configurado");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error cargando tipo de cambio Banxico:", error);
    errors.push(`Banxico: ${message}`);
  }

  try {
    const fallbackRate = await fetchPublicFallbackRate();

    if (fallbackRate) {
      return NextResponse.json(fallbackRate);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error cargando tipo de cambio público:", error);
    errors.push(`Fuente pública: ${message}`);
  }

  const failure: ExchangeRateFailure = {
    rate: null,
    source: "unavailable",
    date: today,
    error: errors.join(" | ") || "No se pudo cargar tipo de cambio",
  };

  return NextResponse.json(failure, {
    status: 503,
  });
}
