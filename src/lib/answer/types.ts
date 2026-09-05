export type Answer =
  | { inScope: true; paragraphs: string[]; articles: number[] }
  | { inScope: false };

/** El servicio que contesta no está disponible (red, credenciales, modelo). */
export class AnswerUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AnswerUnavailableError";
  }
}
