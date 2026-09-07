// Texto de cada artículo del Reglamento, separado por su encabezado
// "ARTÍCULO N. TÍTULO". Lo usa el revisor automático del script de generación.
import reglamento from "@/data/reglamento.json";

const ENCABEZADO = /^\s*ART[ÍI]CULO (\d+)\.\s+(.*)$/;

function partir(texto: string): Map<number, string> {
  const map = new Map<number, string>();
  let actual: number | null = null;
  let buffer: string[] = [];
  const cerrar = () => {
    if (actual !== null) map.set(actual, buffer.join("\n").trim());
  };
  for (const linea of texto.split("\n")) {
    const m = linea.match(ENCABEZADO);
    if (m) {
      cerrar();
      actual = Number(m[1]);
      buffer = [linea.trim()];
    } else if (actual !== null) {
      buffer.push(linea);
    }
  }
  cerrar();
  return map;
}

const ARTICULOS = partir(reglamento.text);

function textoArticulo(n: number): string | null {
  return ARTICULOS.get(n) ?? null;
}

export function textoArticulos(lista: number[]): string {
  return lista
    .map((n) => textoArticulo(n))
    .filter((t): t is string => Boolean(t))
    .join("\n\n");
}
