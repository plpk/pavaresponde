export type Answer =
  | { inScope: true; paragraphs: string[]; articles: number[] }
  | { inScope: false };

export type UnavailableCode = "not_configured" | "upstream";

/** El servicio que contesta no está disponible (credenciales, red, modelo). */
export class AnswerUnavailableError extends Error {
  readonly code: UnavailableCode;
  constructor(message: string, options?: { cause?: unknown; code?: UnavailableCode }) {
    super(message, { cause: options?.cause });
    this.name = "AnswerUnavailableError";
    this.code = options?.code ?? "upstream";
  }
}
