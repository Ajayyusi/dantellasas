import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 "proxy" (formerly middleware). Optimistic check only: if there
 * is no session cookie, redirect protected routes to /login. The cookie is
 * NOT verified here — server components/route handlers do that via
 * `getSession()` / `requireOrg()`.
 */
const COOKIE = process.env.SESSION_COOKIE_NAME ?? "__session";
const PROTECTED_PREFIXES = ["/orgs", "/o/"];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
  if (isProtected && !req.cookies.has(COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/orgs/:path*", "/o/:path*"],
};
