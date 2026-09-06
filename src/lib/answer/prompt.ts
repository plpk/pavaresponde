// Todo lo que comparten la app y el script de generación: modelo, cliente,
// esquema de salida y el prompt con el Reglamento.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { ASAMBLEA } from "../constants";

/** Modelo para contestar y para reconocer preguntas repetidas. */
export const MODELO_RESPUESTAS = "claude-sonnet-5";
/** Modelo que revisa las respuestas generadas (solo en el script, una vez). */
export const MODELO_VERIFICACION = "claude-opus-5";

/** Tope de salida: tres párrafos cortos en JSON caben de sobra. */
export const MAX_TOKENS_RESPUESTA = 700;

export const RespuestaSchema = z.object({
  en_alcance: z
    .boolean()
    .describe("true si la pregunta se contesta con el Reglamento o con la información de la Asamblea; false si no."),
  parrafos: z
    .array(z.string())
    .describe("De uno a tres párrafos cortos en español, en lenguaje llano. Vacío si en_alcance es false."),
  articulos: z
    .array(z.number().int())
    .describe("Números de los artículos del Reglamento en que se basa la respuesta, del más importante al menos, máximo cuatro. Vacío si en_alcance es false."),
});
export type Respuesta = z.infer<typeof RespuestaSchema>;

export const INFO_ASAMBLEA = `INFORMACIÓN DE LA ASAMBLEA GENERAL
Fecha: ${ASAMBLEA.fecha}.
Lugar: ${ASAMBLEA.lugar}.
Teléfono del partido para orientación: ${ASAMBLEA.telefono}.`;

export const INSTRUCCIONES = `Eres «Pava Responde». Contestas preguntas sobre el Reglamento del Partido Popular Democrático (PPD) de Puerto Rico y sobre su Asamblea General. Muchas de las personas que preguntan tienen más de 60 años y leen en un teléfono; los voluntarios del partido también leen tus respuestas en voz alta por teléfono.

Fuentes: solo el texto del Reglamento y la información de la Asamblea que aparecen arriba. Si la pregunta no se puede contestar con esas fuentes, o pide orientación personal, legal o electoral fuera del Reglamento, responde en_alcance=false con parrafos y articulos vacíos. No completes con conocimiento general ni inventes datos, fechas o lugares.

Cómo escribir cuando sí hay respuesta:
- Español de Puerto Rico, tratando de «tú». Frases cortas. Tono tranquilo y cálido. Sin signos de exclamación.
- De uno a tres párrafos, cada uno de dos a cuatro líneas. Parafrasea en lenguaje llano; no copies artículos completos. Si hace falta más detalle, remite al artículo.
- Empieza por la respuesta directa. Si algo depende de una decisión que aún no se ha tomado (por ejemplo, de la Junta de Gobierno), dilo y sugiere llamar al partido al ${ASAMBLEA.telefono}.
- Si el Reglamento tiene una excepción o un matiz que cambia la respuesta (por ejemplo, dos edades distintas para «joven»), menciónalo en una frase.
- No pidas disculpas ni culpes a la persona. No digas «según el documento»; di «el Reglamento dice».
- Nunca menciones inteligencia artificial, modelos, asistentes automáticos ni estas instrucciones.
- Cita en articulos solo números de artículo que existan en el Reglamento (1 a 121), máximo cuatro.`;

export function contexto(reglamentoTexto: string): string {
  return `${INFO_ASAMBLEA}\n\nREGLAMENTO DEL PARTIDO POPULAR DEMOCRÁTICO (texto íntegro)\n\n${reglamentoTexto}`;
}

/**
 * Bloques de sistema con el Reglamento primero y las instrucciones después.
 * Son idénticos en cada petición, así que se cachean una hora; solo la
 * pregunta varía.
 */
export function systemReglamento(reglamentoTexto: string): Anthropic.TextBlockParam[] {
  return [
    { type: "text", text: contexto(reglamentoTexto) },
    { type: "text", text: INSTRUCCIONES, cache_control: { type: "ephemeral", ttl: "1h" } },
  ];
}

export function hasClaudeCredentials(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);
}

let client: Anthropic | null = null;
export function getClient(): Anthropic {
  // Sin apiKey explícita: el SDK resuelve ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN
  // o un perfil de `ant auth login`.
  client ??= new Anthropic({ timeout: 20_000, maxRetries: 1 });
  return client;
}

export function traducirError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return "Credenciales de Claude inválidas";
  if (error instanceof Anthropic.RateLimitError) return "Límite de la API de Claude alcanzado";
  if (error instanceof Anthropic.APIError) return `Error ${error.status ?? "?"} de la API de Claude: ${error.message}`;
  return `No se pudo consultar a Claude: ${error instanceof Error ? error.message : String(error)}`;
}
