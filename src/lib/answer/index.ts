import { answerFromKb } from "./kb";
import type { Answer } from "./types";

export type AnswerMode = "claude" | "kb";

/**
 * "claude" cuando hay credenciales (ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN o
 * un perfil ANTHROPIC_PROFILE); "kb" (respuestas fijas del prototipo) si no.
 * PAVA_ANSWER_MODE fuerza uno u otro.
 */
export function answerMode(): AnswerMode {
  const forced = process.env.PAVA_ANSWER_MODE;
  if (forced === "claude" || forced === "kb") return forced;
  const hasCreds = Boolean(
    process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE,
  );
  return hasCreds ? "claude" : "kb";
}

export async function answerQuestion(question: string): Promise<Answer> {
  if (answerMode() === "claude") {
    const { answerWithClaude } = await import("./claude");
    return answerWithClaude(question);
  }
  return answerFromKb(question);
}

export type { Answer } from "./types";
export { AnswerUnavailableError } from "./types";
