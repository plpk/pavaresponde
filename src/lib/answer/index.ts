import type { UsoModelo } from "../pricing";
import { sumarUso } from "../pricing";
import { answerWithClaude } from "./claude";
import { hasClaudeCredentials } from "./prompt";
import { SERVIBLES, buscarConModelo, buscarExacta, toAnswer } from "./respuestas";
import { AnswerUnavailableError, type Answer } from "./types";

export type Fuente = "respuestas" | "modelo";

export type ResultadoPregunta = {
  answer: Answer;
  fuente: Fuente;
  respuestaId: string | null;
  uso: UsoModelo | null;
};

/**
 * Orden: coincidencia literal con una respuesta generada (gratis), luego el
 * modelo reconoce si es una pregunta conocida (muy barato), y solo si no,
 * genera una respuesta en vivo. Sin credenciales falla en voz alta.
 */
export async function answerQuestion(question: string): Promise<ResultadoPregunta> {
  if (!hasClaudeCredentials()) {
    throw new AnswerUnavailableError("ANTHROPIC_API_KEY no configurada: la app no puede contestar");
  }

  const exacta = buscarExacta(question);
  if (exacta) return { answer: toAnswer(exacta), fuente: "respuestas", respuestaId: exacta.id, uso: null };

  let usoBusqueda: UsoModelo | null = null;
  if (SERVIBLES.length > 0) {
    const { respuesta, uso } = await buscarConModelo(question);
    usoBusqueda = uso;
    if (respuesta) return { answer: toAnswer(respuesta), fuente: "respuestas", respuestaId: respuesta.id, uso };
  }

  const { answer, uso } = await answerWithClaude(question);
  return { answer, fuente: "modelo", respuestaId: null, uso: sumarUso(usoBusqueda, uso) };
}

export type { Answer } from "./types";
export { AnswerUnavailableError } from "./types";
