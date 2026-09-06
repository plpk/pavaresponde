import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { answerQuestion, AnswerUnavailableError } from "@/lib/answer";
import { hasClaudeCredentials } from "@/lib/answer/prompt";
import { toArticleRefs } from "@/lib/articulos";
import { MAX_QUESTION_LENGTH } from "@/lib/constants";
import { getOrCreateDeviceId } from "@/lib/device";
import { checkRateLimit } from "@/lib/rateLimit";
import { getStore, type QuestionRecord } from "@/lib/store";

const AskBody = z.object({
  question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
});

export async function POST(request: Request) {
  if (!hasClaudeCredentials()) {
    console.error("[api/ask] ANTHROPIC_API_KEY no configurada: la app no puede contestar");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

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
    return NextResponse.json({ error: "rate_limit" }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } });
  }

  let resultado;
  try {
    resultado = await answerQuestion(question);
  } catch (error) {
    const detail = error instanceof AnswerUnavailableError ? error.message : String(error);
    console.error("[api/ask] sin respuesta:", detail, error instanceof AnswerUnavailableError ? (error.cause ?? "") : "");
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }

  const { answer, fuente, uso } = resultado;
  const record: QuestionRecord = {
    id: randomUUID(),
    at: new Date().toISOString(),
    question,
    articles: answer.inScope ? answer.articles : [],
    answered: answer.inScope,
    fuente,
    feedback: null,
    modelo: uso?.modelo ?? null,
    tokensEntrada: uso?.entrada ?? 0,
    tokensCacheLectura: uso?.cacheLectura ?? 0,
    tokensCacheEscritura: uso?.cacheEscritura ?? 0,
    tokensSalida: uso?.salida ?? 0,
    costoUsd: uso?.costoUsd ?? 0,
  };
  console.info(
    `[api/ask] ${fuente}${resultado.respuestaId ? ":" + resultado.respuestaId : ""} · ${answer.inScope ? "contestada" : "fuera de alcance"} · ` +
      (uso ? `${uso.modelo} entrada=${uso.entrada} cache=${uso.cacheLectura}/${uso.cacheEscritura} salida=${uso.salida} $${uso.costoUsd.toFixed(5)}` : "sin costo"),
  );
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
