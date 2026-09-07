import articulosJson from "@/data/articulos.json";
import { MAX_ARTICLES, PDF_PATH } from "./constants";

type Entry = { page: number; title: string };
const ARTICULOS = articulosJson as Record<string, Entry>;

function articleExists(n: number): boolean {
  return Number.isInteger(n) && String(n) in ARTICULOS;
}

/** Enlace al PDF abierto en la página donde empieza el artículo. */
function articleHref(n: number): string {
  const entry = ARTICULOS[String(n)];
  return entry ? `${PDF_PATH}#page=${entry.page}` : PDF_PATH;
}

function articleLabel(n: number): string {
  return `Artículo ${n}`;
}

/** Deja solo números de artículo válidos, sin repetir, máximo cuatro. */
export function normalizeArticles(list: unknown): number[] {
  if (!Array.isArray(list)) return [];
  const out: number[] = [];
  for (const raw of list) {
    const n = typeof raw === "string" ? Number.parseInt(raw, 10) : Number(raw);
    if (articleExists(n) && !out.includes(n)) out.push(n);
    if (out.length >= MAX_ARTICLES) break;
  }
  return out;
}

export type ArticleRef = { n: number; label: string; href: string };

export function toArticleRefs(list: number[]): ArticleRef[] {
  return list.map((n) => ({ n, label: articleLabel(n), href: articleHref(n) }));
}
