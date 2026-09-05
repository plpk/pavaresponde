import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { answerQuestion, AnswerUnavailableError } from "@/lib/answer";
import { toArticleRefs } from "@/lib/articulos";
import { MAX_QUESTION_LENGTH } from "@/lib/constants";
import { getOrCreateDeviceId } from "@/lib/device";
import { checkRateLimit } from "@/lib/rateLimit";
import { getStore, type QuestionRecord } from "@/lib/store";

const AskBody = z.object({
  question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const parsed = AskBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_question" }, { status: 400 });
  }
  const question = parsed.data.question;

  const device = await getOrCreateDeviceId();
  const limit = checkRateLimit(`ask:${device}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limit" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  let answer;
  try {
    answer = await answerQuestion(question);
  } catch (error) {
    const detail = error instanceof AnswerUnavailableError ? error.message : String(error);
    console.error("[api/ask] sin respuesta:", detail, error instanceof AnswerUnavailableError ? error.cause : "");
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }

  const record: QuestionRecord = {
    id: randomUUID(),
    at: new Date().toISOString(),
    question,
    articles: answer.inScope ? answer.articles : [],
    answered: answer.inScope,
    feedback: null,
  };
  try {
    await getStore().add(record);
  } catch (error) {
    // La respuesta vale más que el registro: se contesta igual y se deja rastro.
    console.error("[api/ask] no se pudo registrar la pregunta:", error);
  }

  if (!answer.inScope) {
    return NextResponse.json({ id: record.id, inScope: false });
  }
  return NextResponse.json({
    id: record.id,
    inScope: true,
    paragraphs: answer.paragraphs,
    articles: toArticleRefs(answer.articles),
  });
}
