// Copy y constantes compartidas entre cliente y servidor.
// Todo el texto de la interfaz vive aquí o en los componentes; nada se traduce en runtime.

export const PHONE_DISPLAY = "(787) 721-2000";
export const PHONE_TEL = "tel:+17877212000";
export const PDF_PATH = "/reglamento.pdf";

export const SUBTITLE = "Preguntas sobre el Reglamento del PPD y la Asamblea del 11 de octubre";

// Divulgación exigida por la Ley 105-2026. Es el único lugar de la interfaz
// donde se menciona la inteligencia artificial.
export const DISCLOSURE =
  "Las respuestas se generan con inteligencia artificial y pueden contener errores. Verifica con el Reglamento oficial.";

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
  lugar: "Complejo Ferial de Puerto Rico, en Ponce",
  telefono: PHONE_DISPLAY,
} as const;
