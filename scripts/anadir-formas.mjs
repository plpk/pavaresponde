// Añade formas de preguntar a grupos que ya existen en src/data/preguntas.json
// y src/data/respuestas.json (las respuestas no se tocan). La entrada es un
// JSON { id: ["¿...?", ...] }. Descarta las repetidas (ignorando acentos y
// signos), las que ya existen en OTRO grupo (serían ambiguas), las que no
// llevan ¿? y las que coinciden con una pregunta del conjunto de prueba
// (src/data/preguntas-prueba.json), para no contaminar la medición.
//
// Uso: node scripts/anadir-formas.mjs formas.json
import { readFileSync, writeFileSync } from "node:fs";

const archivo = process.argv[2];
if (!archivo) {
  console.error("Uso: node scripts/anadir-formas.mjs formas.json");
  process.exit(1);
}
const RUTA_PREGUNTAS = new URL("../src/data/preguntas.json", import.meta.url);
const RUTA_RESPUESTAS = new URL("../src/data/respuestas.json", import.meta.url);
const preguntas = JSON.parse(readFileSync(RUTA_PREGUNTAS, "utf8"));
const respuestas = JSON.parse(readFileSync(RUTA_RESPUESTAS, "utf8"));
const prueba = JSON.parse(readFileSync(new URL("../src/data/preguntas-prueba.json", import.meta.url), "utf8"));
const nuevas = JSON.parse(readFileSync(archivo, "utf8"));

const norm = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const existentes = new Map();
for (const g of respuestas) for (const p of g.preguntas) existentes.set(norm(p), g.id);
const enPrueba = new Set(prueba.map((t) => norm(t.pregunta)));
const porIdP = new Map(preguntas.map((g) => [g.id, g]));
const porIdR = new Map(respuestas.map((g) => [g.id, g]));
const FECHA = new Date().toISOString().slice(0, 10);

let anadidas = 0;
const avisos = [];
for (const [id, formas] of Object.entries(nuevas)) {
  const gp = porIdP.get(id);
  const gr = porIdR.get(id);
  if (!gp || !gr) {
    avisos.push(`${id}: no existe en los datos`);
    continue;
  }
  let n = 0;
  for (const bruta of formas) {
    const f = bruta.trim();
    if (!/¿.*\?$/.test(f)) {
      avisos.push(`${id}: sin ¿?: ${f}`);
      continue;
    }
    const k = norm(f);
    if (!k) continue;
    if (enPrueba.has(k)) {
      avisos.push(`${id}: está en el conjunto de prueba, se omite: ${f}`);
      continue;
    }
    const dueno = existentes.get(k);
    if (dueno === id) continue;
    if (dueno) {
      avisos.push(`${id}: ya existe en ${dueno}: ${f}`);
      continue;
    }
    gp.preguntas.push(f);
    gr.preguntas.push(f);
    existentes.set(k, id);
    n++;
  }
  if (n > 0) {
    const nota = `Formas de preguntar ampliadas por Claude el ${FECHA}, pendientes de revisión.`;
    gr.notas = gr.notas ?? [];
    if (!gr.notas.some((x) => x.startsWith("Formas de preguntar ampliadas"))) gr.notas.push(nota);
  }
  anadidas += n;
  console.log(`${id.padEnd(36)} +${String(n).padStart(2)} → ${gr.preguntas.length}`);
}

writeFileSync(RUTA_PREGUNTAS, JSON.stringify(preguntas, null, 2) + "\n");
writeFileSync(RUTA_RESPUESTAS, JSON.stringify(respuestas, null, 2) + "\n");
const total = respuestas.reduce((a, g) => a + g.preguntas.length, 0);
console.log(`\n${anadidas} formas añadidas · ${total} en total`);
if (avisos.length) {
  console.log(`\n${avisos.length} aviso(s):`);
  for (const a of avisos) console.log("  - " + a);
}
