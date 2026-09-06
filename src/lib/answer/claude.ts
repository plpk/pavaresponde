// Respuesta generada en vivo por el modelo. Solo se usa cuando la pregunta no
// coincide con ninguna de las respuestas ya generadas (src/data/respuestas.json).
import reglamento from "@/data/reglamento.json";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { MAX_PARAGRAPHS } from "../constants";
import { normalizeArticles } from "../articulos";
import { usoDesdeRespuesta, type UsoModelo } from "../pricing";
import { MAX_TOKENS_RESPUESTA, MODELO_RESPUESTAS, RespuestaSchema, getClient, systemReglamento, traducirError } from "./prompt";
import { AnswerUnavailableError, type Answer } from "./types";

export async function answerWithClaude(question: string): Promise<{ answer: Answer; uso: UsoModelo }> {
  let response;
  try {
    response = await getClient().messages.parse({
      model: MODELO_RESPUESTAS,
      max_tokens: MAX_TOKENS_RESPUESTA,
      system: systemReglamento(reglamento.text),
      messages: [{ role: "user", content: question }],
      output_config: {
        format: zodOutputFormat(RespuestaSchema),
        // Pregunta y respuesta cortas con el contexto cacheado: prioridad a la latencia.
        effort: "low",
      },
    });
  } catch (error) {
    throw new AnswerUnavailableError(traducirError(error), { cause: error });
  }

  const uso = usoDesdeRespuesta(MODELO_RESPUESTAS, response.usage);

  if (response.stop_reason === "refusal") {
    console.warn("[answer] el modelo declinó la pregunta", response.stop_details?.category ?? null);
    return { answer: { inScope: false }, uso };
  }

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new AnswerUnavailableError(`Respuesta sin JSON válido (stop_reason: ${response.stop_reason})`);
  }

  const paragraphs = parsed.parrafos.map((p) => p.trim()).filter(Boolean).slice(0, MAX_PARAGRAPHS);
  const articles = normalizeArticles(parsed.articulos);
  if (!parsed.en_alcance || paragraphs.length === 0) return { answer: { inScope: false }, uso };
  return { answer: { inScope: true, paragraphs, articles }, uso };
}
