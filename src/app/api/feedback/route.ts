import { NextResponse } from "next/server";
import { z } from "zod";
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
  const ok = await getStore().setFeedback(parsed.data.id, parsed.data.value);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
