// Comprobaciones de coherencia de los datos y del buscador gratuito, para
// correr después de tocar las formas de preguntar o src/lib/answer/texto.ts:
//   1. preguntas.json y respuestas.json tienen los mismos grupos con las mismas formas
//      (los artículos pueden diferir: respuestas.json guarda los que el modelo citó);
//   2. frente a HEAD, ningún párrafo ni artículo cambia y ninguna forma original se pierde;
//   3. toda forma lleva ¿? y no se repite en otro grupo;
//   4. el conjunto de prueba sigue fuera del banco (salvo las marcadas «exacta»);
//   5. los interrogativos sobreviven a la lematización;
//   6. singular y plural de una misma palabra dan el mismo término;
//   7. ninguna forma se queda sin término de contenido, y dos grupos no comparten
//      un conjunto de términos idéntico (empatarían y la pregunta iría al modelo);
//   8. cada forma escrita tal cual la atrapa su propio grupo;
//   9. el camino completo de la app (answerQuestion) con varias preguntas;
//  10. tiempo por pregunta del buscador aproximado.
// Uso: npm run comprobar
import { execSync } from "node:child_process";
import preguntas from "../src/data/preguntas.json";
import respuestas from "../src/data/respuestas.json";
import prueba from "../src/data/preguntas-prueba.json";
import { INTERROGATIVOS, limpiar, palabras, termino, terminos } from "../src/lib/answer/texto";
import { VOCABULARIO, buscarAproximada, buscarExacta, candidatas } from "../src/lib/answer/respuestas";
import { answerQuestion } from "../src/lib/answer";
import { hasClaudeCredentials } from "../src/lib/answer/prompt";

type G = { id: string; preguntas: string[]; parrafos?: string[]; articulos: number[]; notas?: string[] };
const P = preguntas as G[], R = respuestas as G[];
const fallos: string[] = [];
const ok = (cond: boolean, msg: string) => { if (!cond) fallos.push(msg); };

// 1. consistencia entre archivos
ok(P.length === R.length && P.every((g, i) => g.id === R[i].id), "ids u orden distintos entre preguntas.json y respuestas.json");
for (const [i, g] of P.entries()) {
  ok(JSON.stringify(g.preguntas) === JSON.stringify(R[i].preguntas), `${g.id}: formas distintas entre archivos`);
}
// 2. contra HEAD: párrafos y artículos intactos, ninguna forma original perdida
const headR = JSON.parse(execSync("git show HEAD:src/data/respuestas.json", { encoding: "utf8" })) as G[];
const headP = JSON.parse(execSync("git show HEAD:src/data/preguntas.json", { encoding: "utf8" })) as G[];
// Una forma puede MOVERSE a otro grupo (al repartir una tarjeta grande), pero
// nunca desaparecer; y la pregunta principal de cada grupo no cambia.
const todasLasFormas = new Set(R.flatMap((g) => g.preguntas.map(limpiar)));
for (const h of headR) {
  const r = R.find((x) => x.id === h.id);
  ok(Boolean(r), `${h.id}: grupo desaparecido`);
  if (!r) continue;
  ok(JSON.stringify(h.parrafos) === JSON.stringify(r.parrafos), `${h.id}: párrafos cambiados`);
  ok(JSON.stringify(h.articulos) === JSON.stringify(r.articulos), `${h.id}: artículos cambiados`);
  for (const f of h.preguntas) ok(todasLasFormas.has(limpiar(f)), `${h.id}: forma original perdida: ${f}`);
  ok(h.preguntas[0] === r.preguntas[0], `${h.id}: la pregunta principal cambió`);
}
for (const h of headP) ok(JSON.stringify(h.articulos) === JSON.stringify(P.find((x) => x.id === h.id)?.articulos), `${h.id}: articulos cambiados en preguntas.json`);
// 3. formato y duplicados
const vistas = new Map<string, string>();
for (const g of R) for (const f of g.preguntas) {
  ok(/¿.*\?$/.test(f), `${g.id}: sin ¿?: ${f}`);
  ok(!/\s{2}|^\s|\s$/.test(f), `${g.id}: espacios raros: «${f}»`);
  const k = limpiar(f);
  ok(!vistas.has(k), `duplicada: «${f}» en ${g.id} y ${vistas.get(k)}`);
  vistas.set(k, g.id);
}
// 4. conjunto de prueba aislado
for (const t of prueba as { pregunta: string; esperado: string | null; tipo: string }[]) {
  const k = limpiar(t.pregunta);
  if (t.tipo !== "exacta") ok(!vistas.has(k), `prueba en el banco: «${t.pregunta}» (${vistas.get(k)})`);
  else ok(vistas.get(k) === t.esperado, `exacta mal etiquetada: «${t.pregunta}»`);
  ok(!t.esperado || R.some((g) => g.id === t.esperado), `id de prueba inválido: ${t.esperado}`);
}
// 5. interrogativos preservados
for (const x of INTERROGATIVOS) ok(termino(x) === x, `interrogativo ${x} → ${termino(x)}`);
// 6. consistencia singular/plural en el vocabulario del banco
const vocab = new Set<string>();
for (const g of R) for (const f of g.preguntas) for (const w of palabras(f)) vocab.add(w);
const inconsistentes: string[] = [];
// «papeles» son documentos y «papel» es el rol: se lematizan distinto a propósito.
const EXCEPCIONES_PLURAL = new Set(["papeles"]);
for (const w of vocab) {
  if (EXCEPCIONES_PLURAL.has(w)) continue;
  const sing = w.endsWith("es") && vocab.has(w.slice(0, -2)) ? w.slice(0, -2) : w.endsWith("s") && vocab.has(w.slice(0, -1)) ? w.slice(0, -1) : null;
  if (sing && termino(w) !== termino(sing)) inconsistentes.push(`${w}→${termino(w)} vs ${sing}→${termino(sing)}`);
}
// 7. formas sin contenido y colisiones de conjuntos de términos entre grupos
const porClave = new Map<string, Map<string, string>>();
const sinContenido: string[] = [];
for (const g of R) for (const f of g.preguntas) {
  const ts = terminos(f);
  if ([...ts].filter((t) => !INTERROGATIVOS.has(t)).length === 0) sinContenido.push(`${g.id}: ${f}`);
  const k = [...ts].sort().join(" ");
  const s = porClave.get(k) ?? new Map<string, string>();
  if (!s.has(g.id)) s.set(g.id, f);
  porClave.set(k, s);
}
const colisiones = [...porClave.entries()].filter(([, s]) => s.size > 1).map(([, s]) => [...s.entries()].map(([id, f]) => `${id}: «${f}»`).join("  =  "));
// 8. cada forma, escrita tal cual, la atrapa su propio grupo (exacta) y la aproximada no la manda a otro
let propias = 0;
const ajenas: string[] = [];
for (const g of R) for (const f of g.preguntas) {
  const e = buscarExacta(f);
  if (e?.id === g.id) propias++;
  const top = candidatas(f)[0];
  if (top && top.respuesta.id !== g.id && top.score >= 0.999) ajenas.push(`${g.id}: «${f}» empata con ${top.respuesta.id}`);
}
// 9. camino de la app (answerQuestion), sin credenciales
const pruebasApp: [string, string][] = [
  ["¿Quién puede votar el 11 de octubre?", "respuestas:asamblea-quien-vota"],
  ["quienes pueden votar en ponce", "respuestas:asamblea-quien-vota"],
  ["cual es el corum de la asamblea", "respuestas:asamblea-quorum"],
  ["¿Cuántos delegados tiene Ponce?", "error:not_configured"],
];
const resultadosApp: string[] = [];
async function main() {
for (const [q, esperado] of hasClaudeCredentials() ? pruebasApp.slice(0, 3) : pruebasApp) {
  let got: string;
  try {
    const r = await answerQuestion(q);
    got = `${r.fuente}:${r.respuestaId}`;
  } catch (e) {
    got = `error:${(e as { code?: string }).code}`;
  }
  resultadosApp.push(`${got === esperado ? "✓" : "✗"} «${q}» → ${got}`);
  ok(got === esperado, `app: «${q}» → ${got}, esperado ${esperado}`);
}
// 10. tiempo por pregunta
const t0 = performance.now();
for (let i = 0; i < 300; i++) buscarAproximada("cuantas personas hacen falta para que haya quorum en la asamblea general del partido");
const ms = (performance.now() - t0) / 300;

console.log(`formas: ${R.reduce((a, g) => a + g.preguntas.length, 0)} · vocabulario: ${vocab.size} palabras · corrige «asanblea»→${VOCABULARIO.corregir("asanblea")}, «presidnete»→${VOCABULARIO.corregir("presidnete")}, «ponce»→${VOCABULARIO.corregir("ponce")}, «caguas»→${VOCABULARIO.corregir("caguas")}`);
console.log(`exactas propias: ${propias} · empates con otro grupo: ${ajenas.length}`);
console.log(`singular/plural inconsistentes: ${inconsistentes.length}${inconsistentes.length ? "\n  " + inconsistentes.slice(0, 20).join("\n  ") : ""}`);
console.log(`formas sin término de contenido: ${sinContenido.length}${sinContenido.length ? "\n  " + sinContenido.join("\n  ") : ""}`);
console.log(`conjuntos de términos idénticos en dos grupos: ${colisiones.length}${colisiones.length ? "\n  " + colisiones.join("\n  ") : ""}`);
console.log(resultadosApp.join("\n"));
console.log(`aproximada: ${ms.toFixed(2)} ms por pregunta`);
console.log(fallos.length ? `\n${fallos.length} FALLO(S):\n  ${fallos.join("\n  ")}` : "\nSin fallos en las comprobaciones 1-9.");
}
main();
