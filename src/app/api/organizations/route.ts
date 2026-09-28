import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

import { getSession } from "@/lib/auth/session";
import { createOrganization, listUserOrgs } from "@/lib/tenancy/service";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ organizations: await listUserOrgs(session.uid) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const result = await createOrganization(session, body);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: "invalid_body", issues: err.issues }, { status: 400 });
    }
    console.error("createOrganization failed", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
