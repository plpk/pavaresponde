// Exporta src/data/respuestas.json a un documento de Word para revisarlo fuera
// de la app: cada respuesta con su pregunta principal, las otras formas de
// preguntar, los párrafos tal como los ve la persona, los artículos citados
// (con enlace al PDF) y su estado de revisión.
//
// Uso:  npm run docx                 → docs/Pava Responde - Preguntas y respuestas.docx
//       npm run docx -- otra-ruta.docx
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import articulosJson from "../src/data/articulos.json";
import respuestasJson from "../src/data/respuestas.json";
import { ASAMBLEA } from "../src/lib/constants";

type Respuesta = {
  id: string;
  preguntas: string[];
  parrafos: string[];
  articulos: number[];
  verificada: boolean;
  revisada?: boolean;
  redactada?: string;
  notas?: string[];
};

const RESPUESTAS = respuestasJson as Respuesta[];
const ARTICULOS = articulosJson as Record<string, { page: number; title: string }>;
const PDF_URL = "https://pavaresponde.vercel.app/reglamento.pdf";
const SALIDA = process.argv[2] ?? "docs/Pava Responde - Preguntas y respuestas.docx";

// Las respuestas van en el orden del archivo, que ya es temático. Cada id de
// esta lista abre una sección nueva; todo lo que sigue cae en ella.
const SECCIONES: Record<string, string> = {
  "asamblea-cuando-donde": "La Asamblea General",
  "presidente-como-se-elige": "Elección de la Junta de Gobierno",
  "junta-que-es": "La Junta de Gobierno",
  "consejo-que-es": "El Consejo de Gobierno",
  "elector-afiliado": "Definiciones",
  "nombre-proposito": "Fundamentos del partido",
  "comite-central": "Comité Central y funcionarios",
  "comite-municipal-que-es": "Comités municipales",
  "presidente-precinto": "Precintos y unidades electorales",
  "jpn-que-es": "Organizaciones afiliadas y sectoriales",
  "candidatura-radicar": "Candidaturas",
  "medidas-disciplinarias": "Disciplina y querellas",
  "quorum-general": "Disposiciones generales",
};

// La nota estándar de redacción aparece en todas; se explica una vez en la
// introducción y no se repite en cada entrada.
const NOTA_ESTANDAR = /^Redactada por Claude/;

const GRIS = "666666";
const ROJO = "9B1C1C";
const CUERPO = 22; // 11 pt en medios puntos
const PEQUENA = 19;

function tituloArticulo(t: string): string {
  const s = t.trim();
  return s.charAt(0) + s.slice(1).toLowerCase();
}

function estadoDe(r: Respuesta): string {
  if (r.revisada) return "Revisada a mano";
  if (r.verificada) return "Verificada por el revisor automático";
  return "Pendiente de revisión";
}

function fechaLarga(d: Date): string {
  return d.toLocaleDateString("es-PR", { day: "numeric", month: "long", year: "numeric" });
}

function texto(text: string, extra: Partial<ConstructorParameters<typeof TextRun>[0] & object> = {}): TextRun {
  return new TextRun({ text, size: CUERPO, ...extra });
}

function parrafo(children: TextRun[] | string, opts: ConstructorParameters<typeof Paragraph>[0] & object = {}): Paragraph {
  const runs = typeof children === "string" ? [texto(children)] : children;
  return new Paragraph({ spacing: { after: 120 }, ...opts, children: runs });
}

function vineta(children: TextRun[] | string, opts: ConstructorParameters<typeof Paragraph>[0] & object = {}): Paragraph {
  return parrafo(children, { numbering: { reference: "vinetas", level: 0 }, spacing: { after: 60 }, ...opts });
}

function celda(text: string, opts: { ancho: number; sombra?: boolean; negrita?: boolean; alinear?: (typeof AlignmentType)[keyof typeof AlignmentType] }): TableCell {
  return new TableCell({
    width: { size: opts.ancho, type: WidthType.DXA },
    shading: opts.sombra ? { type: ShadingType.CLEAR, fill: "F2F2F2", color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [new Paragraph({ spacing: { after: 0 }, alignment: opts.alinear, children: [texto(text, { bold: opts.negrita })] })],
  });
}

function tablaResumen(filas: [string, string][]): Table {
  const anchos = [6480, 2880];
  return new Table({
    width: { size: anchos[0] + anchos[1], type: WidthType.DXA },
    columnWidths: anchos,
    rows: filas.map(
      ([k, v]) =>
        new TableRow({
          children: [celda(k, { ancho: anchos[0], sombra: true }), celda(v, { ancho: anchos[1], negrita: true, alinear: AlignmentType.RIGHT })],
        }),
    ),
  });
}

// ---------------------------------------------------------------------------

type Seccion = { titulo: string; entradas: { n: number; r: Respuesta }[] };

function agrupar(): Seccion[] {
  const secciones: Seccion[] = [];
  RESPUESTAS.forEach((r, i) => {
    const titulo = SECCIONES[r.id];
    if (titulo) secciones.push({ titulo, entradas: [] });
    const actual = secciones.at(-1);
    if (!actual) throw new Error(`La primera respuesta (${r.id}) no abre ninguna sección; añádela a SECCIONES.`);
    actual.entradas.push({ n: i + 1, r });
  });
  const sinUsar = Object.keys(SECCIONES).filter((id) => !RESPUESTAS.some((r) => r.id === id));
  if (sinUsar.length) throw new Error(`SECCIONES cita ids que no existen en respuestas.json: ${sinUsar.join(", ")}`);
  return secciones;
}

function portada(secciones: Seccion[]): (Paragraph | Table)[] {
  const formas = RESPUESTAS.reduce((a, r) => a + r.preguntas.length, 0);
  const citados = new Set(RESPUESTAS.flatMap((r) => r.articulos)).size;
  const revisadas = RESPUESTAS.filter((r) => r.revisada).length;
  const verificadas = RESPUESTAS.filter((r) => !r.revisada && r.verificada).length;
  const pendientes = RESPUESTAS.length - revisadas - verificadas;
  const redactadaEn = RESPUESTAS.map((r) => r.redactada?.match(/\d{4}-\d{2}-\d{2}/)?.[0]).find(Boolean);
  const fechaRedaccion = redactadaEn ? fechaLarga(new Date(`${redactadaEn}T12:00:00`)) : null;

  return [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun("Pava Responde")] }),
    parrafo([texto("Preguntas y respuestas para revisar", { size: 30, color: GRIS })], { spacing: { after: 240 } }),
    parrafo(
      `Reglamento del Partido Popular Democrático y Asamblea General del ${ASAMBLEA.fecha}, ${ASAMBLEA.lugar}.`,
    ),
    parrafo([texto(`Generado el ${fechaLarga(new Date())} a partir de src/data/respuestas.json. Al regenerarlo, este documento refleja lo que la app contesta en ese momento.`, { color: GRIS, size: PEQUENA })], {
      spacing: { after: 240 },
    }),
    tablaResumen([
      ["Respuestas", String(RESPUESTAS.length)],
      ["Formas de preguntar que llevan a una de ellas", String(formas)],
      ["Artículos del Reglamento citados (de 121)", String(citados)],
      ["Secciones", String(secciones.length)],
      ["Revisadas a mano", String(revisadas)],
      ["Verificadas por el revisor automático", String(verificadas)],
      ["Pendientes de revisión", String(pendientes)],
    ]),
    new Paragraph({ spacing: { after: 0 } }),

    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Cómo leer cada entrada")] }),
    vineta([texto("La ", {}), texto("pregunta principal", { bold: true }), texto(" va numerada como título. Debajo, en gris, las otras formas de preguntar lo mismo; en la app, cualquiera de ellas devuelve esta misma respuesta.")]),
    vineta("La respuesta aparece tal como la ve la persona en el teléfono: uno o dos párrafos, sin recortes."),
    vineta("«Artículos citados» son los que la app muestra como chips bajo la respuesta, del más importante al menos. Cada uno enlaza a la página del PDF del Reglamento donde empieza."),
    vineta("«Estado» dice si alguien aprobó la respuesta a mano, si pasó el revisor automático o si sigue pendiente. Cuando una entrada tiene una nota propia, va ahí mismo."),

    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("De dónde salen las respuestas")] }),
    parrafo(
      `Las respuestas pendientes las redactó Claude${fechaRedaccion ? ` el ${fechaRedaccion}` : ""} a partir del texto íntegro del Reglamento. Las que tocan la Asamblea de 2026 toman los datos de la convocatoria (asamblea abierta, voto de todos los electores activos, horario) de la cobertura de prensa: NotiCel, Metro, Primera Hora y Foro Noticioso. Esos datos conviene confirmarlos con la Secretaría General.`,
    ),
    parrafo(
      "La app sirve hoy las 113 respuestas. Una pregunta que coincide con alguna de las formas listadas recibe la respuesta guardada; solo las preguntas que no coinciden con ninguna se contestan en el momento con el modelo y el Reglamento completo.",
    ),

    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Qué hacer con este documento")] }),
    vineta("Anota correcciones con comentarios o control de cambios de Word, o directamente sobre el papel."),
    vineta([texto("Una respuesta correcta se marca en "), texto("respuestas.json", { font: "Consolas", size: 20 }), texto(" con "), texto("revisada: true", { font: "Consolas", size: 20 }), texto(". Una equivocada se corrige en sus párrafos y se vuelve a pasar "), texto("npm run revisar", { font: "Consolas", size: 20 }), texto(".")]),
    vineta("Si falta una pregunta que la gente hace, se añade a preguntas.json; las que llegan a /admin sin respuesta son las primeras candidatas."),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function indice(secciones: Seccion[]): Paragraph[] {
  const out: Paragraph[] = [new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Índice")] })];
  for (const s of secciones) {
    out.push(parrafo([texto(`${s.titulo} (${s.entradas.length})`, { bold: true })], { spacing: { before: 160, after: 60 }, keepNext: true }));
    for (const { n, r } of s.entradas) {
      out.push(parrafo([texto(`${n}. ${r.preguntas[0]}`, { size: 20 })], { spacing: { after: 20 }, indent: { left: 360, hanging: 360 } }));
    }
  }
  out.push(new Paragraph({ children: [new PageBreak()] }));
  return out;
}

function enlaceArticulo(n: number): (TextRun | ExternalHyperlink)[] {
  const a = ARTICULOS[String(n)];
  if (!a) return [texto(`Artículo ${n}`, { size: 20 })];
  return [
    new ExternalHyperlink({
      link: `${PDF_URL}#page=${a.page}`,
      children: [new TextRun({ text: `Artículo ${n}`, size: 20, style: "Hyperlink" })],
    }),
    texto(`, ${tituloArticulo(a.title)} (PDF pág. ${a.page})`, { size: 20 }),
  ];
}

function entrada(n: number, r: Respuesta): Paragraph[] {
  const [principal, ...otras] = r.preguntas;
  const out: Paragraph[] = [];
  out.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(`${n}. ${principal}`)] }));

  if (otras.length > 0) {
    out.push(parrafo([texto("También se pregunta así:", { italics: true, color: GRIS, size: PEQUENA })], { keepNext: true, spacing: { after: 40 } }));
    otras.forEach((p, i) => {
      out.push(vineta([texto(p, { color: GRIS, size: PEQUENA })], { keepNext: true, spacing: { after: i === otras.length - 1 ? 120 : 20 } }));
    });
  }

  r.parrafos.forEach((p) => out.push(parrafo(p, { keepLines: true })));

  const citas: (TextRun | ExternalHyperlink)[] = [texto("Artículos citados: ", { bold: true, size: 20 })];
  r.articulos.forEach((a, i) => {
    if (i > 0) citas.push(texto(" · ", { size: 20 }));
    citas.push(...enlaceArticulo(a));
  });
  out.push(new Paragraph({ spacing: { after: 40 }, children: citas }));

  const notas = (r.notas ?? []).filter((x) => !NOTA_ESTANDAR.test(x));
  const estado = [`Estado: ${estadoDe(r)}.`, ...notas].join(" ");
  out.push(
    parrafo([texto(estado, { italics: true, color: GRIS, size: 18 })], {
      spacing: { after: 280 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "DDDDDD", space: 6 } },
    }),
  );
  return out;
}

function cuerpo(secciones: Seccion[]): Paragraph[] {
  const out: Paragraph[] = [];
  for (const s of secciones) {
    out.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(s.titulo)] }));
    for (const { n, r } of s.entradas) out.push(...entrada(n, r));
  }
  return out;
}

// ---------------------------------------------------------------------------

async function main() {
  const secciones = agrupar();
  const doc = new Document({
    creator: "Pava Responde",
    title: "Pava Responde: preguntas y respuestas",
    description: "Respuestas guardadas de la app, para revisión.",
    styles: {
      default: {
        document: { run: { font: "Calibri", size: CUERPO, language: { value: "es-PR" } }, paragraph: { spacing: { line: 276 } } },
      },
      paragraphStyles: [
        {
          id: "Title",
          name: "Title",
          basedOn: "Normal",
          next: "Normal",
          run: { size: 56, bold: true, color: ROJO, font: "Calibri" },
          paragraph: { spacing: { before: 0, after: 60 } },
        },
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 32, bold: true, color: ROJO, font: "Calibri" },
          paragraph: { spacing: { before: 480, after: 160 }, keepNext: true, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, color: "1A1A1A", font: "Calibri" },
          paragraph: { spacing: { before: 320, after: 100 }, keepNext: true, outlineLevel: 1 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: "vinetas",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: "Pava Responde · Preguntas y respuestas · borrador para revisión", size: 18, color: GRIS })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ children: ["Página ", PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES], size: 18, color: GRIS })],
              }),
            ],
          }),
        },
        children: [...portada(secciones), ...indice(secciones), ...cuerpo(secciones)],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  mkdirSync(dirname(SALIDA), { recursive: true });
  writeFileSync(SALIDA, buffer);
  console.log(`${SALIDA}: ${RESPUESTAS.length} respuestas en ${secciones.length} secciones (${(buffer.length / 1024).toFixed(0)} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
