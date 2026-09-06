// Comprobaciones automáticas sobre src/data/respuestas.json. No sustituyen
// una lectura, pero atrapan lo mecánico:
//   - estilo: sin exclamaciones, sin «usted», sin dobles espacios, párrafos
//     que empiezan en mayúscula y terminan en punto, ninguno de más de 60 palabras;
//   - preguntas con ¿ y ?, y ninguna forma repetida en dos respuestas;
//   - artículos citados que existen y comparten términos con la respuesta;
//   - todo número de una respuesta aparece en los artículos que cita
//     (salvo los datos de la convocatoria de 2026 y el teléfono);
//   - cada forma de preguntar comparte términos con su respuesta o sus artículos.
// Uso: npm run revisar
import { readFileSync } from "node:fs";

const data = JSON.parse(readFileSync(new URL("../src/data/respuestas.json", import.meta.url), "utf8"));
const reglamento = JSON.parse(readFileSync(new URL("../src/data/reglamento.json", import.meta.url), "utf8")).text;

const arts = new Map();
let actual = null;
let buf = [];
for (const linea of reglamento.split("\n")) {
  const m = linea.match(/^\s*ART[ÍI]CULO (\d+)\.\s+(.*)$/);
  if (m) {
    if (actual !== null) arts.set(actual, buf.join("\n"));
    actual = Number(m[1]);
    buf = [linea];
  } else if (actual !== null) buf.push(linea);
}
if (actual !== null) arts.set(actual, buf.join("\n"));

const norm = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .match(/[a-zñ0-9]+/g) ?? [];
const VACIAS = new Set(
  "de del la el los las un una unos unas y o u e en a al que se es son por para con sin su sus mi mis tu tus lo le les me te si ya hay ser esta este esto ese esa eso estas estos esas esos hasta sobre segun mas tambien puede pueden puedo tiene tienen tengo hace hacer va van voy partido reglamento".split(" "),
);
const INTERROGATIVOS = new Set("quien quienes como cuando donde cual cuales cuanto cuantos cuanta cuantas que pasa puede hay ser es soy esta mi se asamblea general junta gobierno ppd".split(" "));
// Números que vienen de la convocatoria de 2026 o del teléfono, no del Reglamento,
// y cifras que el Reglamento escribe en letras («tres cuartas partes», «tres enmiendas»).
const NUMEROS_EXTERNOS = new Set(["2026", "8", "00", "11", "787", "721", "2000", "30", "2025", "28", "3", "4"]);

const problemas = [];
const vistas = new Map();
for (const e of data) {
  const texto = e.parrafos.join(" ");
  if (/[!¡]/.test(texto)) problemas.push([e.id, "signo de exclamación"]);
  if (/ {2}/.test(texto)) problemas.push([e.id, "doble espacio"]);
  if (/\busted\b/i.test(texto)) problemas.push([e.id, "trato de usted"]);
  if (/inteligencia artificial/i.test(texto)) problemas.push([e.id, "menciona la inteligencia artificial"]);
  for (const p of e.parrafos) {
    if (!/[.»]$/.test(p.trim())) problemas.push([e.id, `párrafo sin punto final: …${p.slice(-25)}`]);
    if (/^[a-záéíóúñ]/.test(p)) problemas.push([e.id, "párrafo que empieza en minúscula"]);
    if (p.split(/\s+/).length > 60) problemas.push([e.id, `párrafo de ${p.split(/\s+/).length} palabras`]);
  }
  for (const q of e.preguntas) {
    if (!/^¿.*\?$/.test(q) && !/¿.*\?$/.test(q)) problemas.push([e.id, `pregunta sin ¿?: ${q}`]);
    const clave = norm(q).join(" ");
    if (vistas.has(clave) && vistas.get(clave) !== e.id) problemas.push([e.id, `forma repetida en ${vistas.get(clave)}: ${q}`]);
    vistas.set(clave, e.id);
  }
  const terminosRespuesta = new Set(norm(texto).filter((t) => !VACIAS.has(t)));
  const citado = e.articulos.map((n) => arts.get(n) ?? "").join("\n");
  for (const n of e.articulos) {
    if (!arts.has(n)) {
      problemas.push([e.id, `artículo ${n} no existe`]);
      continue;
    }
    const ta = new Set(norm(arts.get(n)).filter((t) => !VACIAS.has(t)));
    const comunes = [...terminosRespuesta].filter((t) => ta.has(t)).length;
    if (comunes < 2) problemas.push([e.id, `artículo ${n} comparte ${comunes} términos con la respuesta`]);
  }
  for (const num of new Set(texto.match(/\d+/g) ?? [])) {
    if (!citado.includes(num) && !NUMEROS_EXTERNOS.has(num)) problemas.push([e.id, `el número ${num} no aparece en los artículos ${e.articulos.join(", ")}`]);
  }
  const terminosCitados = new Set(norm(citado).filter((t) => !VACIAS.has(t)));
  for (const q of e.preguntas) {
    const qt = norm(q).filter((t) => !VACIAS.has(t) && !INTERROGATIVOS.has(t) && t.length > 3);
    if (qt.length < 2) continue;
    const alguno = qt.some((t) => [...terminosRespuesta, ...terminosCitados].some((w) => w.startsWith(t.slice(0, 5))));
    if (!alguno) problemas.push([e.id, `la respuesta no toca los términos de «${q}»`]);
  }
}

const palabras = data.map((e) => e.parrafos.join(" ").split(/\s+/).length);
console.log(`${data.length} respuestas · ${data.reduce((s, e) => s + e.preguntas.length, 0)} formas de preguntar · ${Math.round(palabras.reduce((a, b) => a + b, 0) / palabras.length)} palabras de media · máximo ${Math.max(...palabras)}`);
if (problemas.length === 0) {
  console.log("Sin problemas.");
} else {
  console.log(`${problemas.length} problema(s):`);
  for (const [id, msg] of problemas) console.log(`  - ${id}: ${msg}`);
  process.exit(1);
}
