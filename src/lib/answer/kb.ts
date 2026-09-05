// Base de respuestas por palabras clave, tomada del prototipo de diseño.
// Se usa cuando no hay credenciales de Claude (desarrollo local, demos) para
// que la app funcione de punta a punta. En producción responde el modelo.
import type { Answer } from "./types";

type Entry = { keys: string[]; q: string; paras: string[]; arts: number[] };

export const KB: Entry[] = [
  {
    keys: ["quien puede votar", "quien vota", "puedo votar", "votar el 11", "votar en la asamblea", "derecho al voto"],
    q: "¿Quién puede votar el 11 de octubre?",
    paras: [
      "Votan los miembros de la Asamblea General. El Reglamento la compone con un delegado por cada 400 votos del candidato popular más votado en la papeleta estatal de la elección anterior, divididos por municipio, y además con los alcaldes, senadores, representantes, legisladores municipales, los miembros de la Junta de Gobierno, del Comité Central y de los comités municipales, los presidentes de comité de unidad, las directivas de las asociaciones y los exfuncionarios que menciona el Artículo 8.",
      "Los delegados por votos los cubre tu Comité Municipal, con la lista de funcionarios de colegio de la pasada elección o los coordinadores electorales de unidad.",
      "La Junta de Gobierno decide si la elección se hace por voto de todos los afiliados o por los delegados a la Asamblea. Si no sabes si te toca, llama al partido y pregunta por tu Comité Municipal.",
    ],
    arts: [8, 9, 20],
  },
  {
    keys: ["que se elige", "que se vota", "se elige en la asamblea", "para que es la asamblea", "funciones de la asamblea", "que hace la asamblea"],
    q: "¿Qué se elige en la Asamblea General?",
    paras: [
      "Se eligen el Presidente del Partido, las dos vicepresidencias, los miembros por acumulación y los miembros por distrito de la Junta de Gobierno. Cada elector puede votar por hasta cinco personas para miembros por acumulación.",
      "La Asamblea General también fija las pautas fundamentales del Partido y, con el voto de tres cuartas partes de los delegados presentes, puede revocar decisiones de los organismos directivos y del Presidente.",
    ],
    arts: [7, 20, 23],
  },
  {
    keys: ["edad maxima", "juventud popular", "jpn", "joven", "jovenes", "35 anos", "edad para la juventud"],
    q: "¿Cuál es la edad máxima para la Juventud Popular?",
    paras: [
      "La Juventud Popular Nacional está compuesta por todos los populares con menos de treinta y cinco (35) años.",
      "Ojo con una diferencia: en las definiciones del Reglamento, joven o juventud es el elector afiliado con menos de treinta (30) años. La JPN llega hasta los 35.",
    ],
    arts: [41, 5],
  },
  {
    keys: ["donde es", "cuando es", "a que hora", "lugar de la asamblea", "ponce", "complejo ferial", "direccion"],
    q: "¿Dónde y cuándo es la Asamblea?",
    paras: [
      "La Asamblea es el domingo 11 de octubre de 2026 en el Complejo Ferial de Puerto Rico, en Ponce.",
      "El Secretario General cita a los miembros con al menos veintiún (21) días de anticipación, y lleva el registro de asistencia y el acta de los acuerdos.",
    ],
    arts: [10],
  },
  {
    keys: ["cada cuanto", "sesion ordinaria", "sesion extraordinaria", "se reune la asamblea", "convocatoria"],
    q: "¿Cada cuánto se reúne la Asamblea General?",
    paras: [
      "La Asamblea General celebra por lo menos una sesión ordinaria cada cuatro años, convocada por la Junta de Gobierno.",
      "Una sesión extraordinaria la puede convocar el Presidente del Partido, dos terceras partes de los miembros con voto en la Junta de Gobierno, o dos terceras partes de los miembros de la Asamblea General.",
    ],
    arts: [10, 11],
  },
];

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,]/g, "");
}

export function answerFromKb(question: string): Answer {
  const n = normalize(question);
  const hit = KB.find((e) => e.keys.some((k) => n.includes(k)));
  return hit ? { inScope: true, paragraphs: hit.paras, articles: hit.arts } : { inScope: false };
}
