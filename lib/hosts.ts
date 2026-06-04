type RequestLike = {
  headers: Headers;
  nextUrl?: {
    host?: string;
    hostname?: string;
  };
};

export function normalizeHost(host: string | null | undefined) {
  if (!host) {
    return "";
  }

  const firstHost = host.split(",")[0]?.trim().toLowerCase() || "";

  if (!firstHost) {
    return "";
  }

  const withoutProtocol = firstHost.replace(/^[a-z]+:\/\//, "");
  const withoutPath = withoutProtocol.split("/")[0] || "";
  const bracketlessIpv6 = withoutPath.startsWith("[")
    ? withoutPath.slice(1, withoutPath.indexOf("]"))
    : withoutPath;

  return bracketlessIpv6.replace(/:\d+$/, "");
}

export function getCurrentHost(request: RequestLike) {
  return normalizeHost(
    request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      request.nextUrl?.hostname ||
      request.nextUrl?.host
  );
}

function getHostFromConfig(value: string | undefined) {
  if (!value) {
    return "";
  }

  try {
    return normalizeHost(new URL(value).host);
  } catch {
    return normalizeHost(value);
  }
}

export function getConfiguredPortalHost() {
  return (
    getHostFromConfig(process.env.PORTAL_HOST) ||
    getHostFromConfig(process.env.PORTAL_URL) ||
    getHostFromConfig(process.env.NEXT_PUBLIC_PORTAL_URL)
  );
}
