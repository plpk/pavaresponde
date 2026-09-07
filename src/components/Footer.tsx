import { PDF_PATH, PHONE_DISPLAY, PHONE_TEL } from "@/lib/constants";
import { PhoneIcon } from "./icons";

/**
 * Footer permanente: la salida humana a la izquierda y el Reglamento a la
 * derecha, siempre a la vista. En el móvil el rótulo del teléfono va en dos
 * líneas y el botón usa la talla pequeña, para que ambos quepan en una sola
 * fila de 360px (60px de alto; 64px en escritorio).
 */
export function Footer() {
  return (
    <footer className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-line bg-white px-4 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] md:px-8">
      <a href={PHONE_TEL} className="flex min-h-11 items-center gap-2 md:min-h-12">
        <PhoneIcon size={16} />
        <span className="flex flex-col leading-[1.2] md:flex-row md:items-baseline md:gap-1 md:leading-normal">
          <span className="text-[12px] font-medium text-ink-muted md:text-[15px] md:font-semibold md:text-inherit">
            Hablar con una persona<span className="hidden md:inline">:</span>
          </span>
          <span className="text-[17px] font-bold md:text-[15px] md:font-semibold">{PHONE_DISPLAY}</span>
        </span>
      </a>
      <a
        href={PDF_PATH}
        target="_blank"
        rel="noopener"
        aria-label="Ver el Reglamento en PDF"
        className="btn-skew btn-skew-sm md:min-h-12 md:px-6 md:text-[15px] md:tracking-[0.08em]"
      >
        <span className="md:hidden">Reglamento (PDF)</span>
        <span className="hidden md:inline-block">Ver el Reglamento (PDF)</span>
      </a>
    </footer>
  );
}
