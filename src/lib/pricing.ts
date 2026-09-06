// Precios oficiales por millón de tokens (platform.claude.com/docs/en/about-claude/pricing, 2026-09-06).
// Sirven para estimar el costo de cada pregunta a partir del uso que devuelve la API.
import type Anthropic from "@anthropic-ai/sdk";

type Precio = { entrada: number; cacheEscritura1h: number; cacheLectura: number; salida: number };

export const PRECIOS_USD_POR_MTOK: Record<string, Precio> = {
  "claude-opus-5": { entrada: 5, cacheEscritura1h: 10, cacheLectura: 0.5, salida: 25 },
  "claude-sonnet-5": { entrada: 2, cacheEscritura1h: 4, cacheLectura: 0.2, salida: 10 },
  "claude-haiku-4-5": { entrada: 1, cacheEscritura1h: 2, cacheLectura: 0.1, salida: 5 },
};

export type UsoModelo = {
  modelo: string;
  entrada: number;
  cacheLectura: number;
  cacheEscritura: number;
  salida: number;
  costoUsd: number;
};

export function usoDesdeRespuesta(modelo: string, usage: Anthropic.Usage): UsoModelo {
  const entrada = usage.input_tokens ?? 0;
  const cacheLectura = usage.cache_read_input_tokens ?? 0;
  const cacheEscritura = usage.cache_creation_input_tokens ?? 0;
  const salida = usage.output_tokens ?? 0;
  const p = PRECIOS_USD_POR_MTOK[modelo];
  const costoUsd = p
    ? (entrada * p.entrada + cacheLectura * p.cacheLectura + cacheEscritura * p.cacheEscritura1h + salida * p.salida) / 1_000_000
    : 0;
  return { modelo, entrada, cacheLectura, cacheEscritura, salida, costoUsd };
}

export function sumarUso(a: UsoModelo | null, b: UsoModelo | null): UsoModelo | null {
  if (!a) return b;
  if (!b) return a;
  return {
    modelo: a.modelo === b.modelo ? a.modelo : `${a.modelo}+${b.modelo}`,
    entrada: a.entrada + b.entrada,
    cacheLectura: a.cacheLectura + b.cacheLectura,
    cacheEscritura: a.cacheEscritura + b.cacheEscritura,
    salida: a.salida + b.salida,
    costoUsd: a.costoUsd + b.costoUsd,
  };
}
