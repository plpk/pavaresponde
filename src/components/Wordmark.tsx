import Image from "next/image";

const SIZES = {
  xs: "text-[20px]",
  sm: "text-[22px]",
  md: "text-[26px]",
  lg: "text-[28px]",
  /** Cabecera: 20px en el móvil, 28px desde md. */
  header: "text-[20px] md:text-[28px]",
} as const;

/** Wordmark de texto (no imagen): escala y lo lee el lector de pantalla. */
export function Wordmark({ size = "md" }: { size?: keyof typeof SIZES }) {
  const cls = SIZES[size];
  return (
    <span className="flex items-baseline gap-[7px] leading-none">
      <span className={`font-display font-black uppercase text-red ${cls}`}>Pava</span>
      <span className={`inline-block -skew-x-[9deg] font-display font-black italic uppercase text-cyan-700 ${cls}`}>Responde</span>
    </span>
  );
}

/**
 * Marca de la pava + wordmark, para la cabecera. En el móvil la marca mide
 * 36px y el wordmark 20px, para que la pastilla de la Asamblea quepa al lado
 * en una pantalla de 360px; desde md, 44px y 28px.
 */
export function Brand() {
  return (
    <div className="flex items-center gap-2.5 md:gap-3.5">
      <Image
        src="/logo-pava.png"
        alt="Partido Popular Democrático"
        width={44}
        height={44}
        priority
        unoptimized
        className="h-9 w-9 flex-none object-contain md:h-11 md:w-11"
      />
      <Wordmark size="header" />
    </div>
  );
}
