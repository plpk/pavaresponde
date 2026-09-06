import { ASAMBLEA } from "@/lib/constants";

/**
 * Tarjeta del evento: fecha grande en rojo, como las tarjetas de cuenta
 * regresiva del sitio oficial, y el enlace para inscribirse. Toda la tarjeta
 * es el enlace, con un área táctil holgada.
 */
export function AsambleaCard() {
  return (
    <a
      href={ASAMBLEA.url}
      target="_blank"
      rel="noopener"
      aria-label={`Asamblea General, ${ASAMBLEA.fecha} en ${ASAMBLEA.ciudad}. Inscríbete en ${ASAMBLEA.urlCorta}`}
      className="mt-4 flex items-center gap-3 rounded-card bg-white px-3.5 py-3 no-underline shadow-flat transition-shadow hover:shadow-card active:translate-y-px md:mt-5 md:gap-4 md:px-4"
    >
      <div className="flex w-10 flex-none flex-col items-center leading-none" aria-hidden="true">
        <span className="font-display text-[30px] font-black text-red">{ASAMBLEA.dia}</span>
        <span className="mt-1 font-sans text-[11px] font-semibold uppercase tracking-[0.15em] text-red-700">{ASAMBLEA.mes}</span>
      </div>
      <div className="h-10 w-px flex-none bg-line" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.15em] text-ink-soft">Asamblea General · {ASAMBLEA.ciudad}</div>
        <div className="mt-0.5 text-meta font-medium text-ink">{ASAMBLEA.fechaCorta}</div>
        <div className="mt-0.5 text-[14px] font-semibold text-blue md:text-[15px]">Inscríbete en {ASAMBLEA.urlCorta}</div>
      </div>
      <span className="flex-none text-xl font-semibold text-blue" aria-hidden="true">
        ›
      </span>
    </a>
  );
}
