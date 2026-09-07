import { ASAMBLEA } from "@/lib/constants";

/**
 * Tarjeta del evento, en la cabecera junto a la marca. Toda la tarjeta es el
 * enlace al sitio donde la gente se inscribe. Fondo cálido sobre la cabecera
 * blanca (al revés que el resto de tarjetas) para que siga leyéndose como un
 * objeto.
 *
 * Móvil: pastilla con la fecha y «Asamblea General» en azul de enlace; mide
 * unos 115px y cabe junto a la marca en una pantalla de 360px. Escritorio:
 * fecha, qué y dónde, y la línea de inscripción. El nombre accesible lleva la
 * información completa en ambos casos.
 */
export function AsambleaCard() {
  return (
    <a
      href={ASAMBLEA.url}
      target="_blank"
      rel="noopener"
      aria-label={`Asamblea General, ${ASAMBLEA.fecha} en ${ASAMBLEA.ciudad}. Inscríbete en ${ASAMBLEA.urlCorta}`}
      className="flex flex-none items-center gap-1.5 rounded-[12px] border border-line bg-warm px-[7px] py-[5px] no-underline transition-colors hover:border-blue-200 active:translate-y-px md:gap-3 md:rounded-field md:py-1.5 md:pr-3.5 md:pl-3"
    >
      <span className="flex w-[26px] flex-none flex-col items-center leading-none md:w-9" aria-hidden="true">
        <span className="font-display text-[20px] font-black text-red md:text-[22px]">{ASAMBLEA.dia}</span>
        <span className="mt-px font-sans text-[9px] font-semibold uppercase tracking-[0.15em] text-red-700 md:mt-0.5 md:text-[10px]">{ASAMBLEA.mes}</span>
      </span>
      <span className="hidden h-8 w-px flex-none bg-line md:block" aria-hidden="true" />
      {/* Móvil: dos líneas en azul de enlace. */}
      <span className="flex flex-col text-[12px] font-semibold leading-[1.2] text-blue md:hidden">
        <span>Asamblea</span>
        <span>General</span>
      </span>
      {/* Escritorio: qué y dónde, y la línea de inscripción. */}
      <span className="hidden min-w-0 leading-[1.3] md:block">
        <span className="block whitespace-nowrap font-sans text-[11px] font-semibold uppercase tracking-[0.15em] text-ink-soft">Asamblea General · {ASAMBLEA.ciudad}</span>
        <span className="mt-px block whitespace-nowrap text-[13px] font-semibold text-blue">Inscríbete en {ASAMBLEA.urlCorta}</span>
      </span>
      <span className="flex-none text-[16px] font-semibold leading-none text-blue md:text-lg" aria-hidden="true">
        ›
      </span>
    </a>
  );
}
