// Genera src/data/respuestas.json a partir de src/data/preguntas.json.
//
// Para cada grupo de preguntas: (1) Sonnet 5 contesta con el Reglamento
// completo como contexto cacheado; (2) Opus 5 revisa la respuesta contra el
// texto íntegro de los artículos citados y marca `verificada`. Lo que no pasa
// la revisión queda en el archivo con sus `notas`, pero la app no lo sirve
// hasta que alguien lo apruebe (`revisada: true`) o se regenere.
//
// Uso:  npm run respuestas                 (genera las que falten)
//       npm run respuestas -- --todas      (regenera todo)
//       npm run respuestas -- --solo id1,id2
//       npm run respuestas -- --sin-verificar
//       npm run respuestas -- --verificar  (solo revisa las respuestas ya
//                                          escritas, sin regenerarlas)
import { readFileSync, writeFileSync } from "node:fs";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import reglamento from "../src/data/reglamento.json";
import preguntas from "../src/data/preguntas.json";
import { normalizeArticles } from "../src/lib/articulos";
import { textoArticulos } from "../src/lib/answer/articulos-texto";
import {
  INFO_ASAMBLEA,
  MAX_TOKENS_RESPUESTA,
  MODELO_RESPUESTAS,
  MODELO_VERIFICACION,
  RespuestaSchema,
  getClient,
  hasClaudeCredentials,
  systemReglamento,
} from "../src/lib/answer/prompt";
import { sumarUso, usoDesdeRespuesta, type UsoModelo } from "../src/lib/pricing";

type Grupo = { id: string; preguntas: string[]; articulos: number[] };
type Salida = {
  id: string;
  preguntas: string[];
  parrafos: string[];
  articulos: number[];
  verificada: boolean;
  revisada?: boolean;
  redactada?: string;
  notas?: string[];
  generada_en?: string;
  verificada_en?: string;
};

const SALIDA = new URL("../src/data/respuestas.json", import.meta.url);
const CONCURRENCIA = 4;

const VerificacionSchema = z.object({
  respaldada: z.boolean().describe("true solo si no hay problemas de fondo."),
  problemas: z
    .array(z.string())
    .describe("Cada afirmación sin respaldo, número o plazo equivocado, artículo citado que no trata el tema, u omisión que cambie el sentido. Vacío si no hay."),
});

const INSTRUCCIONES_REVISOR = `Eres un revisor meticuloso. Recibes una pregunta, una respuesta propuesta y el texto íntegro de los artículos del Reglamento del Partido Popular Democrático que la respuesta cita, además de la información oficial de la Asamblea General. La respuesta la van a leer en voz alta voluntarios del partido a personas mayores, así que un dato equivocado importa.

Comprueba cada afirmación de la respuesta contra esos textos. Señala como problema:
- Afirmaciones que los artículos citados o la información de la Asamblea no respalden.
- Números, plazos, edades, fechas o cargos equivocados.
- Artículos citados que no tratan el tema de la respuesta.
- Omisiones que cambien el sentido (por ejemplo, una excepción o una condición).
- Que la respuesta conteste otra cosa distinta de lo que se preguntó.

No señales paráfrasis, tono, ni la omisión de detalles menores que no cambien la respuesta. Si la respuesta remite al artículo para más detalle, eso está bien. Devuelve respaldada=true solo si la lista de problemas queda vacía.`;

function args() {
  const a = process.argv.slice(2);
  const solo = a.find((x) => x.startsWith("--solo="))?.slice(7) ?? (a.includes("--solo") ? a[a.indexOf("--solo") + 1] : undefined);
  return {
    todas: a.includes("--todas"),
    sinVerificar: a.includes("--sin-verificar"),
    soloVerificar: a.includes("--verificar"),
    solo: solo?.split(",").map((s) => s.trim()).filter(Boolean),
  };
}

async function generar(grupo: Grupo): Promise<{ salida: Salida; uso: UsoModelo }> {
  const client = getClient();
  const [canonica, ...otras] = grupo.preguntas;
  const user =
    otras.length > 0
      ? `${canonica}\n\nOtras formas en que la gente hace esta misma pregunta (la respuesta debe servir para todas):\n${otras.map((p) => `- ${p}`).join("\n")}`
      : canonica;
  const res = await client.messages.parse({
    model: MODELO_RESPUESTAS,
    max_tokens: MAX_TOKENS_RESPUESTA,
    system: systemReglamento(reglamento.text),
    messages: [{ role: "user", content: user }],
    output_config: { format: zodOutputFormat(RespuestaSchema), effort: "medium" },
  });
  const uso = usoDesdeRespuesta(MODELO_RESPUESTAS, res.usage);
  const p = res.parsed_output;
  const notas: string[] = [];
  if (!p) notas.push(`sin JSON válido (stop_reason ${res.stop_reason})`);
  const parrafos = p?.en_alcance ? p.parrafos.map((s) => s.trim()).filter(Boolean).slice(0, 3) : [];
  if (p && !p.en_alcance) notas.push("el modelo la consideró fuera de alcance");
  const articulos = normalizeArticles(p?.articulos ?? []);
  if (parrafos.length > 0 && articulos.length === 0) notas.push("respuesta sin artículos citados");
  const sugeridosAusentes = grupo.articulos.filter((n) => !articulos.includes(n));
  if (parrafos.length > 0 && sugeridosAusentes.length === grupo.articulos.length) {
    notas.push(`no cita ninguno de los artículos esperados (${grupo.articulos.join(", ")})`);
  }
  return {
    salida: { id: grupo.id, preguntas: grupo.preguntas, parrafos, articulos, verificada: false, notas, generada_en: new Date().toISOString() },
    uso,
  };
}

async function verificar(s: Salida): Promise<{ respaldada: boolean; problemas: string[]; uso: UsoModelo }> {
  const client = getClient();
  const textos = textoArticulos(s.articulos) || "(no se citó ningún artículo)";
  const res = await client.messages.parse({
    model: MODELO_VERIFICACION,
    max_tokens: 1200,
    system: INSTRUCCIONES_REVISOR,
    messages: [
      {
        role: "user",
        content: `PREGUNTA\n${s.preguntas[0]}\n\nRESPUESTA PROPUESTA\n${s.parrafos.join("\n\n")}\n\nARTÍCULOS CITADOS (texto íntegro)\n${textos}\n\n${INFO_ASAMBLEA}`,
      },
    ],
    output_config: { format: zodOutputFormat(VerificacionSchema), effort: "medium" },
  });
  const uso = usoDesdeRespuesta(MODELO_VERIFICACION, res.usage);
  const v = res.parsed_output ?? { respaldada: false, problemas: ["el revisor no devolvió JSON válido"] };
  return { ...v, uso };
}

async function mapConcurrente<T, R>(items: T[], n: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

async function main() {
  if (!hasClaudeCredentials()) {
    console.error("Falta ANTHROPIC_API_KEY (ponla en .env.local y corre: npx dotenv -e .env.local -- npm run respuestas, o exporta la variable).");
    process.exit(1);
  }
  const opts = args();
  let existentes: Salida[] = [];
  try {
    existentes = JSON.parse(readFileSync(SALIDA, "utf8")) as Salida[];
  } catch {
    existentes = [];
  }
  const porId = new Map(existentes.map((e) => [e.id, e]));

  if (opts.soloVerificar) {
    const candidatas = existentes.filter((e) => e.parrafos.length > 0 && (!opts.solo || opts.solo.includes(e.id)));
    console.log(`Revisando ${candidatas.length} respuestas ya escritas con ${MODELO_VERIFICACION} (sin regenerar).`);
    let usoV: UsoModelo | null = null;
    await mapConcurrente(candidatas, CONCURRENCIA, async (e, i) => {
      const v = await verificar(e);
      usoV = sumarUso(usoV, v.uso);
      e.verificada = v.respaldada;
      e.verificada_en = new Date().toISOString();
      delete e.redactada; // a partir de aquí manda la revisión
      e.notas = v.problemas.length ? v.problemas : undefined;
      if (!e.notas) delete e.notas;
      console.log(`${v.respaldada ? "✓" : "⚠"} ${String(i + 1).padStart(3)}/${candidatas.length} ${e.id}${v.problemas.length ? " · " + v.problemas.join(" / ") : ""}`);
    });
    writeFileSync(SALIDA, JSON.stringify(existentes, null, 2) + "\n");
    const ok = existentes.filter((r) => r.verificada || r.revisada).length;
    const mal = existentes.filter((r) => !(r.verificada || r.revisada));
    console.log(`\n${ok} verificadas · ${mal.length} con problemas${mal.length ? ": " + mal.map((m) => m.id).join(", ") : ""}.`);
    const u = usoV as UsoModelo | null;
    if (u) console.log(`Costo estimado de la revisión: $${u.costoUsd.toFixed(2)}`);
    return;
  }

  const grupos = (preguntas as Grupo[]).filter((g) => {
    if (opts.solo) return opts.solo.includes(g.id);
    if (opts.todas) return true;
    return !porId.has(g.id);
  });
  console.log(`Generando ${grupos.length} de ${preguntas.length} grupos con ${MODELO_RESPUESTAS}; revisión con ${opts.sinVerificar ? "nadie" : MODELO_VERIFICACION}.`);

  let usoTotal: UsoModelo | null = null;
  const resultados = await mapConcurrente(grupos, CONCURRENCIA, async (g, i) => {
    const { salida, uso } = await generar(g);
    usoTotal = sumarUso(usoTotal, uso);
    if (!opts.sinVerificar && salida.parrafos.length > 0) {
      const v = await verificar(salida);
      usoTotal = sumarUso(usoTotal, v.uso);
      salida.verificada = v.respaldada;
      salida.notas = [...(salida.notas ?? []), ...v.problemas];
    }
    if ((salida.notas ?? []).length === 0) delete salida.notas;
    const estado = salida.verificada ? "✓" : "⚠";
    console.log(`${estado} ${String(i + 1).padStart(3)}/${grupos.length} ${g.id} · arts ${salida.articulos.join(",") || "—"}${salida.notas ? " · " + salida.notas.join(" / ") : ""}`);
    return salida;
  });

  for (const r of resultados) {
    const previa = porId.get(r.id);
    porId.set(r.id, { ...previa, ...r, revisada: previa?.revisada, redactada: undefined });
  }
  const orden = (preguntas as Grupo[]).map((g) => g.id);
  const final = orden.map((id) => porId.get(id)).filter((x): x is Salida => Boolean(x));
  writeFileSync(SALIDA, JSON.stringify(final, null, 2) + "\n");

  const verificadas = final.filter((r) => r.verificada || r.revisada).length;
  const pendientes = final.filter((r) => !(r.verificada || r.revisada));
  const u = usoTotal as UsoModelo | null;
  console.log(`\n${final.length} respuestas en src/data/respuestas.json · ${verificadas} listas para servir · ${pendientes.length} por revisar.`);
  if (pendientes.length) console.log("Por revisar: " + pendientes.map((p) => p.id).join(", "));
  if (u) {
    console.log(`Uso: entrada ${u.entrada} · cache lectura ${u.cacheLectura} · cache escritura ${u.cacheEscritura} · salida ${u.salida} tokens`);
    console.log(`Costo estimado de esta corrida: $${u.costoUsd.toFixed(2)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
