import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateDeviceId } from "@/lib/device";
import { checkRateLimit } from "@/lib/rateLimit";
import { getStore } from "@/lib/store";

const FeedbackBody = z.object({
  id: z.string().uuid(),
  value: z.enum(["up", "down"]),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const parsed = FeedbackBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_feedback" }, { status: 400 });
  }
  const device = await getOrCreateDeviceId();
  const limit = checkRateLimit(`feedback:${device}`, { max: 20, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: "rate_limit" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  }
  let ok: boolean;
  try {
    ok = await getStore().setFeedback(parsed.data.id, parsed.data.value);
  } catch (error) {
    console.error("[api/feedback] no se pudo guardar el pulgar:", error);
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
