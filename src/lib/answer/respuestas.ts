// Respuestas ya generadas y verificadas (src/data/respuestas.json). Primero se
// busca una coincidencia exacta (gratis); si no la hay, el modelo decide si la
// pregunta es una de las conocidas. Solo lo que no coincide se genera en vivo.
import respuestasJson from "@/data/respuestas.json";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { usoDesdeRespuesta, type UsoModelo } from "../pricing";
import { MODELO_RESPUESTAS, getClient, traducirError } from "./prompt";
import { AnswerUnavailableError, type Answer } from "./types";

export type RespuestaGuardada = {
  id: string;
  preguntas: string[];
  parrafos: string[];
  articulos: number[];
  /** El revisor automático no encontró afirmaciones sin respaldo. */
  verificada: boolean;
  /** Una persona la aprobó a mano (manda sobre `verificada`). */
  revisada?: boolean;
  notas?: string[];
};

const TODAS = respuestasJson as RespuestaGuardada[];
/** Solo se sirven las verificadas o revisadas; el resto va al modelo en vivo. */
export const SERVIBLES = TODAS.filter((r) => (r.revisada ?? r.verificada) && r.parrafos.length > 0);

export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const INDICE_EXACTO = new Map<string, RespuestaGuardada>();
for (const r of SERVIBLES) for (const p of r.preguntas) INDICE_EXACTO.set(normalizar(p), r);

export function toAnswer(r: RespuestaGuardada): Answer {
  return { inScope: true, paragraphs: r.parrafos, articles: r.articulos };
}

/** Coincidencia literal (ignorando acentos, mayúsculas y signos). Gratis. */
export function buscarExacta(question: string): RespuestaGuardada | null {
  return INDICE_EXACTO.get(normalizar(question)) ?? null;
}

const CoincidenciaSchema = z.object({
  id: z
    .string()
    .nullable()
    .describe("El id de la pregunta conocida que pide exactamente lo mismo, o null si ninguna lo pide."),
});

const LISTA = SERVIBLES.map((r) => `${r.id}: ${r.preguntas.join(" | ")}`).join("\n");

const INSTRUCCIONES_COINCIDENCIA = `Tienes una lista de preguntas conocidas sobre el Reglamento del Partido Popular Democrático y su Asamblea General, cada una con un id y varias formas de preguntarla. Recibirás una pregunta nueva. Devuelve el id de la pregunta conocida que pide lo mismo, de modo que su respuesta contestaría por completo la pregunta nueva. Si la pregunta nueva pide otra cosa, un detalle que la conocida no cubre, o mezcla varios temas, devuelve null. Ante la duda, null.

PREGUNTAS CONOCIDAS
${LISTA}`;

/** Pide al modelo que reconozca la pregunta entre las conocidas. Cuesta una fracción de una respuesta. */
export async function buscarConModelo(question: string): Promise<{ respuesta: RespuestaGuardada | null; uso: UsoModelo }> {
  let response;
  try {
    response = await getClient().messages.parse({
      model: MODELO_RESPUESTAS,
      max_tokens: 120,
      system: [{ type: "text", text: INSTRUCCIONES_COINCIDENCIA, cache_control: { type: "ephemeral", ttl: "1h" } }],
      messages: [{ role: "user", content: question }],
      output_config: { format: zodOutputFormat(CoincidenciaSchema), effort: "low" },
    });
  } catch (error) {
    throw new AnswerUnavailableError(traducirError(error), { cause: error });
  }
  const uso = usoDesdeRespuesta(MODELO_RESPUESTAS, response.usage);
  const id = response.parsed_output?.id ?? null;
  const respuesta = id ? (SERVIBLES.find((r) => r.id === id) ?? null) : null;
  return { respuesta, uso };
}
