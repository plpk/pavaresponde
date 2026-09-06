"use client";

import { useEffect, useState } from "react";

type Row = {
  id: string;
  at: string;
  hora: string;
  question: string;
  articles: string;
  answered: boolean;
  fuente: "respuestas" | "modelo";
  feedback: "up" | "down" | null;
  costoUsd: number;
};

type Resumen = { total: number; sinRespuesta: number; alModelo: number; costoUsd: number };

type Props = { initialFrom: string; initialTo: string };

const GRID = "grid grid-cols-[120px_1fr_200px_130px] gap-4 px-5";

export function AdminTable({ initialFrom, initialTo }: Props) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [onlyNoAns, setOnlyNoAns] = useState(false);
  // Resultado y error se guardan junto con la consulta que los produjo: al
  // cambiar un filtro vuelven a "Cargando…" sin tocar estado dentro del efecto.
  const [result, setResult] = useState<{ query: string; rows?: Row[]; resumen?: Resumen; error?: string } | null>(null);

  const query = new URLSearchParams({ from, to, ...(onlyNoAns ? { onlyNoAns: "1" } : {}) }).toString();
  const rows = result?.query === query ? (result.rows ?? null) : null;
  const resumen = result?.query === query ? (result.resumen ?? null) : null;
  const error = result?.query === query ? (result.error ?? null) : null;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/questions?${query}`, { signal: controller.signal })
      .then(async (res) => {
        if (res.status === 401) {
          window.location.reload();
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { rows: Row[]; resumen: Resumen };
        setResult({ query, rows: data.rows, resumen: data.resumen });
      })
      .catch((err: unknown) => {
        if ((err as Error).name === "AbortError") return;
        setResult({ query, error: "No pudimos cargar las preguntas. Intenta otra vez." });
      });
    return () => controller.abort();
  }, [query]);

  const count = rows?.length ?? 0;

  return (
    <div className="p-5 md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="desde" className="micro-label mb-1.5 text-[11px]">
              Desde
            </label>
            <input id="desde" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="min-h-12 rounded-[10px] border-[1.5px] border-line-strong bg-white px-3 text-[16px] text-ink" />
          </div>
          <div>
            <label htmlFor="hasta" className="micro-label mb-1.5 text-[11px]">
              Hasta
            </label>
            <input id="hasta" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="min-h-12 rounded-[10px] border-[1.5px] border-line-strong bg-white px-3 text-[16px] text-ink" />
          </div>
          <label className="flex min-h-12 cursor-pointer items-center gap-2.5 text-[16px] font-medium text-ink">
            <input type="checkbox" checked={onlyNoAns} onChange={(e) => setOnlyNoAns(e.target.checked)} className="h-[22px] w-[22px] accent-red" />
            Solo sin respuesta
          </label>
        </div>
        <a href={`/api/admin/export?${query}`} download="pava-responde-preguntas.csv" className="btn-skew">
          <span>Exportar CSV</span>
        </a>
      </div>

      <div className="mt-5 overflow-x-auto rounded-[14px] bg-white shadow-flat">
        <div className="min-w-[760px]">
          <div className={`${GRID} border-b border-line py-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-ink-soft`} role="row">
            <div>Hora</div>
            <div>Pregunta</div>
            <div>Artículos citados</div>
            <div>Sin respuesta</div>
          </div>
          {rows?.map((r) => (
            <div key={r.id} className={`${GRID} items-center border-b border-echo py-3.5 text-meta text-ink`} role="row">
              <div className="text-ink-muted tabular-nums">{r.hora}</div>
              <div>{r.question}</div>
              <div className="font-medium text-blue">{r.articles}</div>
              <div>
                {r.answered ? (
                  <span className="text-ink-soft">No</span>
                ) : (
                  <span className="inline-flex min-h-[30px] items-center gap-1.5 rounded-full border-[1.5px] border-red-200 bg-red-50 px-2.5 text-[14px] font-semibold text-red-900">
                    <span aria-hidden="true">⚠</span> Sí
                  </span>
                )}
              </div>
            </div>
          ))}
          <div className="px-5 py-3.5 text-[14px] text-ink-soft" role="status">
            {error ??
              (rows === null
                ? "Cargando…"
                : `${count} ${count === 1 ? "pregunta" : "preguntas"} en el rango seleccionado` +
                  (resumen ? ` · ${resumen.alModelo} generadas en vivo · costo estimado $${resumen.costoUsd.toFixed(2)}` : ""))}
          </div>
        </div>
      </div>
    </div>
  );
}
