import { PDF_PATH, PHONE_DISPLAY, PHONE_TEL } from "@/lib/constants";
import { PhoneIcon } from "./icons";

/** Footer permanente: fijo al fondo del viewport en móvil, nunca se esconde. */
export function Footer() {
  return (
    <footer className="sticky bottom-0 z-10 border-t border-line bg-white px-4 pb-[max(8px,env(safe-area-inset-bottom))] pt-1 md:flex md:items-center md:gap-8 md:px-8 md:py-3">
      <a href={PDF_PATH} target="_blank" rel="noopener" className="flex min-h-11 items-center text-[15px] font-semibold md:min-h-12">
        Ver el Reglamento (PDF)
      </a>
      <a href={PHONE_TEL} className="flex min-h-11 items-center gap-2 border-t border-echo text-[15px] font-semibold md:min-h-12 md:border-t-0">
        <PhoneIcon size={16} />
        Hablar con una persona: {PHONE_DISPLAY}
      </a>
    </footer>
  );
}
