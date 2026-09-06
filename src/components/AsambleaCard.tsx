import { ASAMBLEA } from "@/lib/constants";

/**
 * Tarjeta del evento, deliberadamente discreta: fecha en rojo como las
 * tarjetas de cuenta regresiva del sitio oficial, sin sombra y con texto
 * pequeño, para que el campo de pregunta siga siendo lo primero que se ve.
 * Toda la tarjeta es el enlace.
 */
export function AsambleaCard() {
  return (
    <a
      href={ASAMBLEA.url}
      target="_blank"
      rel="noopener"
      aria-label={`Asamblea General, ${ASAMBLEA.fecha} en ${ASAMBLEA.ciudad}. Inscríbete en ${ASAMBLEA.urlCorta}`}
      className="mt-4 flex items-center gap-3 rounded-field border border-line bg-white px-3 py-2 no-underline transition-colors hover:border-blue-200 active:translate-y-px md:mt-5 md:px-3.5"
    >
      <div className="flex w-9 flex-none flex-col items-center leading-none" aria-hidden="true">
        <span className="font-display text-[22px] font-black text-red">{ASAMBLEA.dia}</span>
        <span className="mt-0.5 font-sans text-[10px] font-semibold uppercase tracking-[0.15em] text-red-700">{ASAMBLEA.mes}</span>
      </div>
      <div className="h-8 w-px flex-none bg-line" aria-hidden="true" />
      <div className="min-w-0 flex-1 leading-[1.3]">
        <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.15em] text-ink-soft">Asamblea General · {ASAMBLEA.ciudad}</div>
        <div className="mt-px text-[14px] font-medium text-ink">{ASAMBLEA.fechaCorta}</div>
        <div className="text-[13px] font-semibold text-blue">Inscríbete en {ASAMBLEA.urlCorta}</div>
      </div>
      <span className="flex-none text-lg font-semibold text-blue" aria-hidden="true">
        ›
      </span>
    </a>
  );
}
