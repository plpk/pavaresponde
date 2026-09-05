// Genera, a partir de design/reglamento-text.txt (texto extraído del PDF con
// marcadores "-- N of 44 --"):
//   - src/data/articulos.json  → { "8": { page: 10, title: "COMPOSICIÓN" }, ... }
//     Se usa para enlazar cada chip de artículo a reglamento.pdf#page=N.
//   - src/data/reglamento.json → { text } con el texto limpio (sin índice ni
//     marcadores) que se le pasa al modelo como contexto.
import { readFileSync, writeFileSync } from "node:fs";

const raw = readFileSync(new URL("../design/reglamento-text.txt", import.meta.url), "utf8");
const lines = raw.split(/\r?\n/);

const pageMarker = /^-- (\d+) of \d+ --$/;
const heading = /^\s*ART[ÍI]CULO (\d+)\.\s+(.*)$/;
const tocLeader = /\.{4,}/;

let page = 0;
const articulos = {};
const clean = [];
for (const line of lines) {
  const m = line.match(pageMarker);
  if (m) {
    page = Number(m[1]);
    continue;
  }
  if (tocLeader.test(line)) continue; // líneas del índice
  const h = line.match(heading);
  // La última aparición gana: así el índice nunca pisa el título real.
  if (h) articulos[h[1]] = { page, title: h[2].trim() };
  clean.push(line.replace(/\s+$/, ""));
}

const text = clean.join("\n").replace(/\n{3,}/g, "\n\n").trim();
writeFileSync(new URL("../src/data/articulos.json", import.meta.url), JSON.stringify(articulos, null, 2) + "\n");
writeFileSync(new URL("../src/data/reglamento.json", import.meta.url), JSON.stringify({ text }) + "\n");
console.log(`artículos: ${Object.keys(articulos).length} · páginas: ${page} · texto: ${text.length} caracteres`);
