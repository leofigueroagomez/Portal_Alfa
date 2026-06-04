import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getConfiguredPortalHost, getCurrentHost } from "@/lib/hosts";

const protectedRoutes = [
  "/dashboard",
  "/leads",
  "/customers",
  "/clients",
  "/products",
  "/quotes",
  "/engineering",
  "/engineering-quotes",
  "/users",
  "/settings",
  "/product-categories",
  "/product-tags",
];

function isProtectedPath(pathname: string) {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
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

  return response;
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/leads/:path*",
    "/customers/:path*",
    "/clients/:path*",
    "/products/:path*",
    "/quotes/:path*",
    "/engineering/:path*",
    "/engineering-quotes/:path*",
    "/users/:path*",
    "/settings/:path*",
    "/product-categories/:path*",
    "/product-tags/:path*",
  ],
};
