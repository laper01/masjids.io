import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const GUEST_ROUTES = [
  "/login",
  "/register",
  "/register-community",
  "/reset-password",
  "/verify", 
  "/auth/verify",
  "/verify-email",
  "/forgot-password",
];

// Root domain — differs between local vs production
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

// Subdomains that must NOT be treated as a masjid site
// (they have their own destination/infra: api → separate VPS, www/admin → this Next.js app's own routes)
const RESERVED_SUBDOMAINS = ["api", "www", "admin"];

function getSubdomain(hostname: string): string | null {
  // Strip port if present, for consistency
  const host = hostname.toLowerCase();
  const root = ROOT_DOMAIN.toLowerCase();

  if (host === root || host === `www.${root}`) return null;
  if (!host.endsWith(`.${root}`)) return null;

  const subdomain = host.replace(`.${root}`, "");
  if (RESERVED_SUBDOMAINS.includes(subdomain)) return null;

  return subdomain;
}

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") || "";
  const pathname = req.nextUrl.pathname;

  // ─── 1. Subdomain rewrite (public masjid site) — before auth check ───────
  const subdomain = getSubdomain(hostname);
  if (subdomain) {
    const url = req.nextUrl.clone();
    url.pathname = `/site/${subdomain}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // ─── 2. Auth logic ─────────────────────────────────────────────
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName:
      process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
  });

  const isAuth = !!token;
  const isRootRoute = pathname === "/";
  const isGuestRoute = GUEST_ROUTES.some((route) => pathname.startsWith(route));

  if (isRootRoute || isGuestRoute) {
    if (isAuth) return NextResponse.redirect(new URL("/dashboard", req.url));
    return NextResponse.next();
  }

  if (!isAuth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // ─── 3. Stripe payment success redirect ────────────────────────
  // Stripe's checkout success_url points to /dashboard?payment=success.
  // Once the user is authenticated, forward them straight to /monetization
  // instead of letting them land on the generic dashboard.
  if (pathname === "/dashboard" && req.nextUrl.searchParams.get("payment") === "success") {
    const url = req.nextUrl.clone();
    url.pathname = "/monetization";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|api/masjids|api/events/discover|api/events/feed|api/events/[^/]+$|_next/static|_next/image|favicon.ico|public-masjids|images|fonts|icons|.*\\..*$).*)",
  ],
};