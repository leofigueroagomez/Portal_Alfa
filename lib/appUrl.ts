const DEFAULT_APP_BASE_URL = "https://portal-alfa-theta.vercel.app";

export function getAppBaseUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || DEFAULT_APP_BASE_URL;

  return configuredUrl.replace(/\/+$/, "");
}
