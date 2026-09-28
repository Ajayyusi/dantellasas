import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic redirect only: visitors without a session cookie are sent to
 * /login. The cookie is NOT trusted here — every page and action verifies it
 * server-side (src/lib/auth/session.ts, src/lib/tenancy/context.ts).
 */
const SESSION_COOKIE = "__session";

export function proxy(req: NextRequest) {
  if (!req.cookies.has(SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    const next = req.nextUrl.pathname + req.nextUrl.search;
    url.pathname = "/login";
    url.search = next && next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except public auth pages, API routes and static assets.
  matcher: [
    "/((?!login|signup|forgot-password|reset-password|auth/action|api|_next|favicon.ico|icon|apple-icon|robots.txt|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js|woff2?)$).*)",
  ],
};
