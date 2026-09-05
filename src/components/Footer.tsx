import { DISCLOSURE, PDF_PATH, PHONE_DISPLAY, PHONE_TEL } from "@/lib/constants";
import { PhoneIcon } from "./icons";

/** Footer permanente: fijo al fondo del viewport en móvil, nunca se esconde. */
export function Footer() {
  return (
    <footer className="sticky bottom-0 z-10 border-t border-line bg-white px-4 pt-2.5 pb-[max(12px,env(safe-area-inset-bottom))] md:flex md:flex-wrap md:items-center md:justify-between md:gap-5 md:px-8 md:py-4">
      <p className="m-0 text-legal text-ink-muted text-pretty md:max-w-[520px] md:text-[14px] md:leading-[1.45]">{DISCLOSURE}</p>
      <div className="mt-0.5 flex flex-col md:mt-0 md:flex-row md:items-center md:gap-6">
        <a href={PDF_PATH} target="_blank" rel="noopener" className="flex min-h-11 items-center text-[15px] font-semibold md:min-h-12">
          Ver el Reglamento (PDF)
        </a>
        <a href={PHONE_TEL} className="flex min-h-11 items-center gap-2 border-t border-echo text-[15px] font-semibold md:min-h-12 md:border-t-0">
          <PhoneIcon size={16} />
          Hablar con una persona: {PHONE_DISPLAY}
        </a>
      </div>
    </footer>
  );
}
