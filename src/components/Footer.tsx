import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/constants";
import { PhoneIcon } from "./icons";

/** Footer permanente: la salida humana, siempre a la vista. El PDF vive en la cabecera. */
export function Footer() {
  return (
    <footer className="sticky bottom-0 z-10 border-t border-line bg-white px-4 pb-[max(4px,env(safe-area-inset-bottom))] md:px-8">
      <a href={PHONE_TEL} className="flex min-h-12 items-center gap-2 text-[15px] font-semibold md:min-h-14">
        <PhoneIcon size={16} />
        Hablar con una persona: {PHONE_DISPLAY}
      </a>
    </footer>
  );
}
