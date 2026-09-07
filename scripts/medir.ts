// Mide qué parte de las preguntas de prueba (src/data/preguntas-prueba.json)
// atrapan los pasos gratuitos del buscador, sin tocar el modelo.
//
// El conjunto de prueba está escrito aparte de las formas del banco: preguntas
// dictadas sin acentos, con errores, cortas, coloquiales y largas, más un
// grupo de «cercanas» y «fuera» que NO deben coincidir con ninguna respuesta
// guardada (esperado: null), porque piden otra cosa.
//
// Veredictos:
//   correcta        la respuesta esperada, o ninguna cuando no debía haberla
//   modelo          no coincidió y va al modelo (cuesta, pero no es un error)
//   equivocada      se serviría OTRA respuesta guardada   ← lo grave
//   falso positivo  se serviría una respuesta a algo que pide otra cosa ← lo grave
//
// Uso: npm run medir              resumen por tipo + fallos
//      npm run medir -- --todo    lista también las que van al modelo
// Sale con código 1 si hay equivocadas o falsos positivos.
import pruebas from "../src/data/preguntas-prueba.json";
import { buscarAproximada, buscarExacta } from "../src/lib/answer/respuestas";

type Prueba = { pregunta: string; esperado: string | null; tipo: string };
type Paso = "exacta" | "aproximada" | "modelo";
type Veredicto = "correcta" | "modelo" | "equivocada" | "falso positivo";
type Resultado = { prueba: Prueba; paso: Paso; id: string | null; veredicto: Veredicto };

const TODO = process.argv.includes("--todo");

function evaluar(prueba: Prueba): Resultado {
  const exacta = buscarExacta(prueba.pregunta);
  const aprox = exacta ? null : buscarAproximada(prueba.pregunta);
  const id = exacta?.id ?? aprox?.id ?? null;
  const paso: Paso = exacta ? "exacta" : aprox ? "aproximada" : "modelo";
  let veredicto: Veredicto;
  if (prueba.esperado) veredicto = id === prueba.esperado ? "correcta" : id === null ? "modelo" : "equivocada";
  else veredicto = id === null ? "correcta" : "falso positivo";
  return { prueba, paso, id, veredicto };
}

const resultados = (pruebas as Prueba[]).map(evaluar);
const positivas = resultados.filter((r) => r.prueba.esperado);
const negativas = resultados.filter((r) => !r.prueba.esperado);

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : "—");
const pad = (s: string | number, n: number) => String(s).padStart(n);

console.log(`${resultados.length} preguntas de prueba · ${positivas.length} con respuesta en el banco · ${negativas.length} que deben ir al modelo\n`);

const tipos = [...new Set(resultados.map((r) => r.prueba.tipo))];
console.log(`${"tipo".padEnd(10)} ${pad("n", 4)} ${pad("exacta", 7)} ${pad("aprox", 6)} ${pad("modelo", 7)} ${pad("gratis", 7)} ${pad("graves", 7)}`);
for (const tipo of tipos) {
  const rs = resultados.filter((r) => r.prueba.tipo === tipo);
  const exacta = rs.filter((r) => r.paso === "exacta" && r.veredicto === "correcta").length;
  const aprox = rs.filter((r) => r.paso === "aproximada" && r.veredicto === "correcta").length;
  const modelo = rs.filter((r) => r.paso === "modelo").length;
  const graves = rs.filter((r) => r.veredicto === "equivocada" || r.veredicto === "falso positivo").length;
  const gratis = rs[0].prueba.esperado ? pct(exacta + aprox, rs.length) : pct(modelo, rs.length);
  console.log(`${tipo.padEnd(10)} ${pad(rs.length, 4)} ${pad(exacta, 7)} ${pad(aprox, 6)} ${pad(modelo, 7)} ${pad(gratis, 7)} ${pad(graves, 7)}`);
}

const gratis = positivas.filter((r) => r.veredicto === "correcta").length;
const alModelo = positivas.filter((r) => r.veredicto === "modelo").length;
const equivocadas = resultados.filter((r) => r.veredicto === "equivocada");
const falsos = resultados.filter((r) => r.veredicto === "falso positivo");
const negOk = negativas.filter((r) => r.veredicto === "correcta").length;

console.log(`\nCon respuesta en el banco: ${gratis} gratis (${pct(gratis, positivas.length)}) · ${alModelo} al modelo (${pct(alModelo, positivas.length)}) · ${equivocadas.length} equivocadas`);
console.log(`Sin respuesta en el banco: ${negOk} de ${negativas.length} van al modelo como deben · ${falsos.length} falsos positivos`);

if (equivocadas.length) {
  console.log("\nEQUIVOCADAS (se serviría otra respuesta):");
  for (const r of equivocadas) console.log(`  - «${r.prueba.pregunta}» → ${r.id} (esperado ${r.prueba.esperado}, paso ${r.paso})`);
}
if (falsos.length) {
  console.log("\nFALSOS POSITIVOS (pide otra cosa y se serviría una respuesta guardada):");
  for (const r of falsos) console.log(`  - «${r.prueba.pregunta}» → ${r.id} (paso ${r.paso})`);
}
if (TODO) {
  console.log("\nAL MODELO (tenían respuesta en el banco y no coincidieron):");
  for (const r of positivas.filter((x) => x.veredicto === "modelo")) console.log(`  - «${r.prueba.pregunta}» (esperado ${r.prueba.esperado})`);
}

if (equivocadas.length || falsos.length) process.exit(1);
