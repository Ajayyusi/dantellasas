import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createSessionCookie } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/env.server";
import { getAdminAuth } from "@/lib/firebase/admin";

const bodySchema = z.object({ idToken: z.string().min(1) });

function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Exchange a fresh Firebase ID token for an httpOnly session cookie. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  try {
    const { cookie, expiresIn } = await createSessionCookie(parsed.data.idToken);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(expiresIn / 1000),
    });
    return res;
  } catch (err) {
    const code =
      err instanceof Error && err.message === "recent_login_required"
        ? "recent_login_required"
        : "unauthorized";
    return NextResponse.json({ error: code }, { status: 401 });
  }
}

/** Sign out: clear the cookie and revoke refresh tokens for this user. */
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      const decoded = await getAdminAuth().verifySessionCookie(token);
      await getAdminAuth().revokeRefreshTokens(decoded.sub);
    } catch {
      // Already invalid — just clear it.
    }
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
