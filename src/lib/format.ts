// Formato de fechas y CSV para /admin. Todo en hora de Puerto Rico (UTC−4, sin
// cambio de horario).
import type { QuestionRecord } from "./store";

export const PR_TZ = "America/Puerto_Rico";
const PR_OFFSET = "-04:00";

const partsFmt = new Intl.DateTimeFormat("es-PR", {
  timeZone: PR_TZ,
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "05 oct · 9:14 a.m." */
export function formatHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = Object.fromEntries(partsFmt.formatToParts(d).map((p) => [p.type, p.value]));
  const h23 = Number(parts.hour);
  const h12 = h23 % 12 || 12;
  const period = h23 < 12 ? "a.m." : "p.m.";
  const month = (parts.month ?? "").replace(".", "");
  return `${parts.day} ${month} · ${h12}:${parts.minute} ${period}`;
}

/** Fecha de hoy en Puerto Rico como YYYY-MM-DD. */
export function todayPR(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: PR_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateRange(from?: string | null, to?: string | null): { from?: Date; to?: Date } {
  const out: { from?: Date; to?: Date } = {};
  if (from && YMD.test(from)) out.from = new Date(`${from}T00:00:00.000${PR_OFFSET}`);
  if (to && YMD.test(to)) out.to = new Date(`${to}T23:59:59.999${PR_OFFSET}`);
  return out;
}

export function formatArticles(list: number[]): string {
  return list.length ? list.join(", ") : "—";
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** CSV en UTF-8 con BOM para que Excel abra bien los acentos. */
export function toCsv(rows: QuestionRecord[]): string {
  const head = ["hora", "pregunta", "articulos_citados", "sin_respuesta", "fuente", "costo_usd"];
  const lines = rows.map((r) =>
    [formatHora(r.at), r.question, formatArticles(r.articles), r.answered ? "no" : "si", r.fuente, r.costoUsd.toFixed(5)]
      .map(csvCell)
      .join(","),
  );
  return "\uFEFF" + [head.map(csvCell).join(","), ...lines].join("\r\n") + "\r\n";
}
