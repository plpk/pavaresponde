import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, adminCookieOptions, checkAdminPassword, createAdminToken, isAdminConfigured } from "@/lib/adminAuth";
import { getOrCreateDeviceId } from "@/lib/device";
import { checkRateLimit } from "@/lib/rateLimit";

const LoginBody = z.object({ password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  const device = await getOrCreateDeviceId();
  const limit = checkRateLimit(`login:${device}`, { max: 5, windowMs: 5 * 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: "rate_limit" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const parsed = LoginBody.safeParse(body);
  if (!parsed.success || !checkAdminPassword(parsed.data.password)) {
    return NextResponse.json({ error: "wrong_password" }, { status: 401 });
  }

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, createAdminToken(), adminCookieOptions);
  return new NextResponse(null, { status: 204 });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  return new NextResponse(null, { status: 204 });
}
