// Añade tarjetas nuevas (grupos de pregunta y respuesta) a src/data/preguntas.json
// y src/data/respuestas.json. La entrada es un JSON con una lista de
// { id, despues, preguntas, parrafos, articulos }: cada tarjeta se inserta
// justo después del grupo `despues` (que puede ser una tarjeta del mismo
// archivo, insertada antes). Una forma de preguntar que ya exista en OTRO
// grupo se MUEVE a la tarjeta nueva (así se reparten las tarjetas grandes);
// las que coinciden con el conjunto de prueba se omiten. Las respuestas
// quedan marcadas como redactadas, pendientes de revisión.
//
// Uso: node scripts/anadir-tarjetas.mjs tarjetas.json
import { readFileSync, writeFileSync } from "node:fs";

const archivo = process.argv[2];
if (!archivo) {
  console.error("Uso: node scripts/anadir-tarjetas.mjs tarjetas.json");
  process.exit(1);
}
const RUTA_PREGUNTAS = new URL("../src/data/preguntas.json", import.meta.url);
const RUTA_RESPUESTAS = new URL("../src/data/respuestas.json", import.meta.url);
const preguntas = JSON.parse(readFileSync(RUTA_PREGUNTAS, "utf8"));
const respuestas = JSON.parse(readFileSync(RUTA_RESPUESTAS, "utf8"));
const articulos = JSON.parse(readFileSync(new URL("../src/data/articulos.json", import.meta.url), "utf8"));
const prueba = JSON.parse(readFileSync(new URL("../src/data/preguntas-prueba.json", import.meta.url), "utf8"));
const tarjetas = JSON.parse(readFileSync(archivo, "utf8"));

const norm = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const enPrueba = new Set(prueba.map((t) => norm(t.pregunta)));
const FECHA = new Date().toISOString().slice(0, 10);
const errores = [];
const avisos = [];
let movidas = 0;

for (const t of tarjetas) {
  const fallo = (m) => errores.push(`${t.id ?? "(sin id)"}: ${m}`);
  if (!t.id || !/^[a-z0-9-]+$/.test(t.id)) fallo("id inválido");
  if (respuestas.some((g) => g.id === t.id)) fallo("el id ya existe");
  const iP = preguntas.findIndex((g) => g.id === t.despues);
  const iR = respuestas.findIndex((g) => g.id === t.despues);
  if (iP < 0 || iR < 0) fallo(`no existe el grupo «${t.despues}» tras el que insertar`);
  if (!Array.isArray(t.parrafos) || t.parrafos.length < 1 || t.parrafos.length > 3 || t.parrafos.some((p) => !p.trim())) fallo("parrafos: de 1 a 3, no vacíos");
  if (!Array.isArray(t.articulos) || t.articulos.length < 1 || t.articulos.length > 4 || t.articulos.some((n) => !(String(n) in articulos))) fallo("articulos: de 1 a 4 y existentes");
  if (!Array.isArray(t.preguntas) || t.preguntas.length < 1) fallo("sin formas de preguntar");
  if (errores.length) continue;

  const formas = [];
  const vistas = new Set();
  for (const bruta of t.preguntas) {
    const f = bruta.trim();
    const k = norm(f);
    if (!/¿.*\?$/.test(f)) {
      avisos.push(`${t.id}: sin ¿?, se omite: ${f}`);
      continue;
    }
    if (vistas.has(k)) continue;
    if (enPrueba.has(k)) {
      avisos.push(`${t.id}: está en el conjunto de prueba, se omite: ${f}`);
      continue;
    }
    const dueno = respuestas.find((g) => g.preguntas.some((p) => norm(p) === k));
    if (dueno) {
      if (dueno.preguntas.length <= 1) {
        avisos.push(`${t.id}: «${f}» es la única forma de ${dueno.id}, no se mueve`);
        continue;
      }
      for (const lista of [preguntas.find((g) => g.id === dueno.id), dueno]) {
        lista.preguntas = lista.preguntas.filter((p) => norm(p) !== k);
      }
      avisos.push(`${t.id}: movida desde ${dueno.id}: ${f}`);
      movidas++;
    }
    vistas.add(k);
    formas.push(f);
  }
  if (formas.length === 0) {
    errores.push(`${t.id}: se quedó sin formas de preguntar`);
    continue;
  }
  preguntas.splice(iP + 1, 0, { id: t.id, preguntas: formas, articulos: t.articulos });
  respuestas.splice(iR + 1, 0, {
    id: t.id,
    preguntas: formas,
    parrafos: t.parrafos.map((p) => p.trim()),
    articulos: t.articulos,
    verificada: false,
    redactada: `claude-code-${FECHA}`,
    notas: [
      `Redactada por Claude a partir del texto íntegro del Reglamento el ${FECHA}. Pendiente de la revisión automática: npm run respuestas -- --verificar.`,
    ],
  });
  console.log(`${t.id.padEnd(40)} tras ${t.despues.padEnd(34)} ${formas.length} formas · arts ${t.articulos.join(",")}`);
}

if (errores.length) {
  console.error(`\n${errores.length} error(es), no se escribió nada:\n  ${errores.join("\n  ")}`);
  process.exit(1);
}
writeFileSync(RUTA_PREGUNTAS, JSON.stringify(preguntas, null, 2) + "\n");
writeFileSync(RUTA_RESPUESTAS, JSON.stringify(respuestas, null, 2) + "\n");
console.log(`\n${tarjetas.length} tarjetas añadidas · ${movidas} formas movidas · ${respuestas.length} respuestas · ${respuestas.reduce((a, g) => a + g.preguntas.length, 0)} formas`);
if (avisos.length) console.log(`\n${avisos.length} aviso(s):\n  ${avisos.join("\n  ")}`);
