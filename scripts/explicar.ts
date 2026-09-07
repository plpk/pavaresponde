// Explica qué ve el buscador gratuito en una pregunta: los términos que
// extrae (con correcciones), y las cinco respuestas más parecidas con su
// puntuación y la forma guardada que más se acerca. Para entender por qué
// una pregunta coincide, no coincide o coincide con la respuesta equivocada.
//
// Uso: npm run explicar -- "¿Quién es la presidenta de Mujeres Populares?"
import { MARGEN_AMBIGUEDAD, UMBRAL_APROXIMADA, VOCABULARIO, buscarAproximada, buscarExacta, candidatas, peso } from "../src/lib/answer/respuestas";
import { INTERROGATIVOS, palabras, terminos } from "../src/lib/answer/texto";

const pregunta = process.argv.slice(2).join(" ").trim();
if (!pregunta) {
  console.error('Uso: npm run explicar -- "pregunta"');
  process.exit(1);
}

const crudas = palabras(pregunta);
const corregidas = crudas.map((w) => VOCABULARIO.corregir(w));
const ts = terminos(pregunta, VOCABULARIO);

console.log(`Pregunta: ${pregunta}`);
console.log(`Palabras: ${crudas.join(" ")}`);
if (corregidas.some((c, i) => c !== crudas[i])) console.log(`Corregidas: ${corregidas.join(" ")}`);
console.log(`Términos: ${[...ts].map((t) => `${t}${INTERROGATIVOS.has(t) ? "?" : ""}(${peso(t).toFixed(1)})`).join(" ")}`);

const exacta = buscarExacta(pregunta);
const aprox = exacta ? null : buscarAproximada(pregunta);
console.log(`Resultado: ${exacta ? `exacta → ${exacta.id}` : aprox ? `aproximada → ${aprox.id}` : "al modelo"}  (umbral ${UMBRAL_APROXIMADA}, margen ${MARGEN_AMBIGUEDAD})\n`);
for (const c of candidatas(pregunta).slice(0, 5)) {
  console.log(`  ${c.score.toFixed(3)}  ${c.respuesta.id.padEnd(34)} ${c.forma}`);
}
