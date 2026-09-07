// Respuestas ya generadas (src/data/respuestas.json). Primero se busca una
// coincidencia exacta (gratis); luego una aproximada (gratis, con
// lematización, sinónimos y corrección de errores); si no la hay, el modelo
// decide si la pregunta es una de las conocidas. Solo lo que no coincide se
// genera en vivo.
import respuestasJson from "@/data/respuestas.json";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { usoDesdeRespuesta, type UsoModelo } from "../pricing";
import { MODELO_RESPUESTAS, getClient, traducirError } from "./prompt";
import { INTERROGATIVOS, Vocabulario, clasesInterrogativas, limpiar, terminos } from "./texto";
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

const INDICE_EXACTO = new Map<string, RespuestaGuardada>();
for (const r of SERVIBLES) for (const p of r.preguntas) INDICE_EXACTO.set(limpiar(p), r);

export function toAnswer(r: RespuestaGuardada): Answer {
  return { inScope: true, paragraphs: r.parrafos, articles: r.articulos };
}

/** Coincidencia literal (ignorando acentos, mayúsculas y signos). Gratis. */
export function buscarExacta(question: string): RespuestaGuardada | null {
  return INDICE_EXACTO.get(limpiar(question)) ?? null;
}

// --- Coincidencia aproximada -----------------------------------------------

/** Vocabulario del banco, para corregir errores de tecleo o dictado en la pregunta. */
export const VOCABULARIO = new Vocabulario(SERVIBLES.flatMap((r) => r.preguntas));

const INDICE_TERMINOS = SERVIBLES.flatMap((r) => r.preguntas.map((forma) => ({ r, forma, t: terminos(forma) })));
/** Todos los términos de todas las formas de cada respuesta: el «tema» del grupo. */
const TERMINOS_GRUPO = new Map<string, Set<string>>();
for (const { r, t } of INDICE_TERMINOS) {
  const g = TERMINOS_GRUPO.get(r.id) ?? new Set<string>();
  for (const x of t) g.add(x);
  TERMINOS_GRUPO.set(r.id, g);
}

// Peso de cada término: cuanto en menos grupos aparece, más distingue. «que» o
// «partido» pesan poco; «quorum» o «tesorero», mucho. Un término que no está
// en ningún grupo («Ponce», «nieto») pesa más que ninguno: la pregunta pide
// algo que el banco no cubre.
const N_GRUPOS = SERVIBLES.length;
const FRECUENCIA = new Map<string, number>();
for (const r of SERVIBLES) {
  const vistos = new Set<string>();
  for (const p of r.preguntas) for (const t of terminos(p)) vistos.add(t);
  for (const t of vistos) FRECUENCIA.set(t, (FRECUENCIA.get(t) ?? 0) + 1);
}
const PESO_DESCONOCIDO = Math.log((N_GRUPOS + 1) / 0.5);
export function peso(t: string): number {
  const df = FRECUENCIA.get(t);
  return df ? Math.log((N_GRUPOS + 1) / (df + 0.5)) : PESO_DESCONOCIDO;
}
function pesoTotal(ts: Iterable<string>): number {
  let s = 0;
  for (const t of ts) s += peso(t);
  return s;
}

/** Umbral alto a propósito: mejor pasar al modelo que servir la respuesta equivocada. */
export const UMBRAL_APROXIMADA = 0.8;
/** Con un solo término de contenido («¿Qué hora es?») solo vale una forma casi idéntica. */
export const UMBRAL_UN_TERMINO = 0.9;
/** Un término «de contenido» distingue: no es interrogativo y no aparece en media biblioteca («partido»). */
const PESO_MINIMO_CONTENIDO = 1.0;
/** Si la pregunta y la forma preguntan cosas distintas («¿quién?» frente a «¿cuándo?»), el parecido vale menos. */
const CASTIGO_INTERROGATIVO = 0.85;
/** Si dos respuestas distintas quedan casi empatadas, la pregunta es ambigua y la decide el modelo. */
export const MARGEN_AMBIGUEDAD = 0.05;

export type Coincidencia = { respuesta: RespuestaGuardada; forma: string; score: number };

/** Las mejores coincidencias por respuesta, ordenadas de mayor a menor. Para depurar y medir. */
export function candidatas(question: string): Coincidencia[] {
  const q = terminos(question, VOCABULARIO);
  if (q.size < 2) return [];
  const pq = pesoTotal(q);
  const clasesQ = clasesInterrogativas(q);
  const mejorPorId = new Map<string, Coincidencia>();
  for (const { r, forma, t } of INDICE_TERMINOS) {
    let comun = 0;
    for (const x of q) if (t.has(x)) comun += peso(x);
    if (comun === 0) continue;
    const clasesT = clasesInterrogativas(t);
    const mismaPregunta = clasesQ.size === 0 || clasesT.size === 0 || [...clasesQ].some((c) => clasesT.has(c));
    // Lo que la pregunta pide y la forma guardada no menciona («…del comité
    // municipal») cuenta doble si tampoco aparece en ninguna otra forma del
    // grupo: es la dirección peligrosa, la de contestar otra cosa. Si el
    // grupo sí habla de eso («Ponce» en las formas de la Asamblea), resta lo
    // normal. Lo que sobra en la forma guardada siempre resta lo normal.
    const grupo = TERMINOS_GRUPO.get(r.id);
    let sobraEnPregunta = 0;
    for (const x of q) if (!t.has(x)) sobraEnPregunta += grupo?.has(x) ? 0 : peso(x);
    const score = ((2 * comun) / (pq + sobraEnPregunta + pesoTotal(t))) * (mismaPregunta ? 1 : CASTIGO_INTERROGATIVO);
    const previa = mejorPorId.get(r.id);
    if (!previa || score > previa.score) mejorPorId.set(r.id, { respuesta: r, forma, score });
  }
  return [...mejorPorId.values()].sort((a, b) => b.score - a.score);
}

/**
 * Coincidencia aproximada, gratis: solapamiento de términos ponderado por lo
 * que distingue cada uno (coeficiente de Dice con pesos). Acepta solo si la
 * mejor respuesta supera el umbral y ninguna otra queda cerca.
 */
export function buscarAproximada(question: string): RespuestaGuardada | null {
  const [mejor, segunda] = candidatas(question);
  if (!mejor) return null;
  const contenido = [...terminos(question, VOCABULARIO)].filter((t) => !INTERROGATIVOS.has(t) && peso(t) >= PESO_MINIMO_CONTENIDO).length;
  if (mejor.score < (contenido < 2 ? UMBRAL_UN_TERMINO : UMBRAL_APROXIMADA)) return null;
  if (segunda && mejor.score - segunda.score < MARGEN_AMBIGUEDAD) return null;
  return mejor.respuesta;
}

// --- Reconocimiento con el modelo -------------------------------------------

const CoincidenciaSchema = z.object({
  id: z
    .string()
    .nullable()
    .describe("El id de la pregunta conocida que pide exactamente lo mismo, o null si ninguna lo pide."),
});

/** Formas por grupo que ve el modelo: las primeras bastan para reconocer el tema y el prompt se mantiene corto. */
const FORMAS_EN_LISTA = 8;
const LISTA = SERVIBLES.map((r) => `${r.id}: ${r.preguntas.slice(0, FORMAS_EN_LISTA).join(" | ")}`).join("\n");

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
