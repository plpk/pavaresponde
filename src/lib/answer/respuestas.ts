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
  /** Una persona la aprobó a mano (manda sobre todo lo demás). */
  revisada?: boolean;
  /** Redactada directamente a partir del texto íntegro, a la espera del revisor automático. */
  redactada?: string;
  notas?: string[];
};

const TODAS = respuestasJson as RespuestaGuardada[];
/** Se sirven las revisadas, las verificadas y las redactadas; el resto va al modelo en vivo. */
export const SERVIBLES = TODAS.filter((r) => (r.revisada ?? (r.verificada || Boolean(r.redactada))) && r.parrafos.length > 0);

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

// Palabras que no distinguen una pregunta de otra. Se conservan los
// interrogativos (quién, cuándo, dónde...) porque sí cambian el sentido.
const VACIAS = new Set(
  "de del la el los las un una unos unas y o u e en a al que se es son por para con sin su sus mi mis tu tus lo le les me te si ya hay ser esta este esto ese esa eso estas estos esas esos hasta sobre segun mas tambien puede pueden puedo tiene tienen tengo hace hacer va van voy".split(" "),
);

function terminos(s: string): Set<string> {
  const out = new Set<string>();
  for (const t of normalizar(s).split(" ")) {
    if (!t || VACIAS.has(t)) continue;
    // Plural simple: delegados → delegado, asambleas → asamblea.
    out.add(t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t);
  }
  return out;
}

const INDICE_TERMINOS = SERVIBLES.flatMap((r) => r.preguntas.map((p) => ({ r, t: terminos(p) })));

/** Umbral alto a propósito: mejor pasar al modelo que servir la respuesta equivocada. */
const UMBRAL_APROXIMADA = 0.8;

/**
 * Coincidencia aproximada por solapamiento de términos (coeficiente de Dice)
 * con cualquiera de las formas conocidas. Gratis; captura variaciones como
 * "quien puede votar" frente a "¿Quién puede votar el 11 de octubre?".
 */
export function buscarAproximada(question: string): RespuestaGuardada | null {
  const q = terminos(question);
  if (q.size < 2) return null;
  let mejor: { r: RespuestaGuardada; score: number } | null = null;
  for (const { r, t } of INDICE_TERMINOS) {
    let comunes = 0;
    for (const x of q) if (t.has(x)) comunes++;
    const score = (2 * comunes) / (q.size + t.size);
    if (!mejor || score > mejor.score) mejor = { r, score };
  }
  return mejor && mejor.score >= UMBRAL_APROXIMADA ? mejor.r : null;
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
