// Copy y constantes compartidas entre cliente y servidor.
// Todo el texto de la interfaz vive aquí o en los componentes; nada se traduce en runtime.

export const PHONE_DISPLAY = "(787) 721-2000";
export const PHONE_TEL = "tel:+17877212000";
export const PDF_PATH = "/reglamento.pdf";

export const SUBTITLE = "Preguntas sobre el Reglamento del PPD y la Asamblea del 11 de octubre";

// Divulgación exigida por la Ley 105-2026. Es la única mención a la
// inteligencia artificial en la interfaz y acompaña a cada respuesta (no a la
// pantalla inicial). La mayoría de las respuestas vienen preparadas de
// antemano, no se generan en el momento.
export const DISCLOSURE = {
  /** Respuesta del conjunto preparado de antemano (la mayoría). */
  respuestas: "Respuesta preparada de antemano con inteligencia artificial. Verifica con el Reglamento oficial.",
  /** Respuesta generada en el momento por el modelo (preguntas que no coinciden con las preparadas). */
  modelo: "Respuesta generada en este momento con inteligencia artificial y sujeta a error. Verifica con el Reglamento oficial.",
} as const;

export const OUT_OF_SCOPE_TEXT =
  "Eso no está en el Reglamento ni en la información de la Asamblea. Para orientación, llama al partido al (787) 721-2000.";

export const SAMPLE_QUESTIONS = [
  "¿Quién puede votar el 11 de octubre?",
  "¿Qué se elige en la Asamblea General?",
  "¿Cuál es la edad máxima para la Juventud Popular?",
] as const;

export const MAX_QUESTION_LENGTH = 500;
export const MAX_PARAGRAPHS = 3;
export const MAX_ARTICLES = 4;

// La especificación pide caer al estado de error si la respuesta tarda más de
// 6 segundos. Con un modelo de lenguaje detrás, 6 s produce falsos errores en
// señal débil; el valor por defecto es 10 s y se ajusta con la variable de entorno.
export const ASK_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_ASK_TIMEOUT_MS ?? 10_000);

// Límite por dispositivo (cookie), no por persona.
export const RATE_LIMIT = { max: 6, windowMs: 60_000 } as const;

// Datos de la Asamblea General. El lugar viene del prototipo de diseño;
// confírmalo con la Secretaría General antes de publicar.
export const ASAMBLEA = {
  fecha: "domingo 11 de octubre de 2026",
  fechaCorta: "Domingo 11 de octubre de 2026",
  dia: "11",
  mes: "oct",
  ciudad: "Ponce",
  lugar: "Complejo Ferial de Puerto Rico, en Ponce",
  telefono: PHONE_DISPLAY,
  /** Sitio oficial del evento, donde la gente se inscribe. */
  url: "https://www.todosporelcambio.com/",
  urlCorta: "todosporelcambio.com",
} as const;
