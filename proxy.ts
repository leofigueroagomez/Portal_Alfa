import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getConfiguredPortalHost, getCurrentHost } from "@/lib/hosts";

const portalRoutes = ["/portal"];

const internalRoutes = [
  "/admin",
  "/dashboard",
  "/leads",
  "/customers",
  "/clients",
  "/projects",
  "/post-sale",
  "/contractors",
  "/services",
  "/invoices",
  "/products",
  "/quotes",
  "/engineering",
  "/engineering-quotes",
  "/users",
  "/settings",
  "/notifications",
  "/product-categories",
  "/product-tags",
];

function matchesRoute(pathname: string, routes: string[]) {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isProtectedPath(pathname: string) {
  return matchesRoute(pathname, portalRoutes) || matchesRoute(pathname, internalRoutes);
}

function isPortalHomeRequest(request: NextRequest) {
  const portalHost = getConfiguredPortalHost();

  return (
    Boolean(portalHost) &&
    getCurrentHost(request) === portalHost &&
    request.nextUrl.pathname === "/"
  );
}

export async function proxy(request: NextRequest) {
  if (isPortalHomeRequest(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next({
      request,
    });
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set(
      "redirectedFrom",
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    );

    return NextResponse.redirect(redirectUrl);
  }

  if (matchesRoute(request.nextUrl.pathname, internalRoutes)) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_active, user_type, is_internal")
      .eq("id", data.claims.sub)
      .maybeSingle();

    const role = String(profile?.role || "");
    const isClientPortal =
      role === "client" ||
      profile?.user_type === "client_portal" ||
      profile?.is_internal === false;
    const isInternal = Boolean(profile?.is_active && profile?.is_internal === true);

    if (profileError || !profile || isClientPortal || !isInternal) {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/dashboard/:path*",
    "/portal/:path*",
    "/leads/:path*",
    "/customers/:path*",
    "/clients/:path*",
    "/projects/:path*",
    "/post-sale/:path*",
    "/contractors/:path*",
    "/services/:path*",
    "/invoices/:path*",
    "/products/:path*",
    "/quotes/:path*",
    "/engineering/:path*",
    "/engineering-quotes/:path*",
    "/users/:path*",
    "/settings/:path*",
    "/notifications/:path*",
    "/product-categories/:path*",
    "/product-tags/:path*",
  ],
};
