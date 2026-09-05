import Image from "next/image";

const SIZES = { sm: "text-[20px]", md: "text-[26px]", lg: "text-[28px]" } as const;

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

/** Marca de la pava (44px) + wordmark. */
export function Brand({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <div className={`flex items-center ${size === "lg" ? "gap-3.5" : "gap-3"}`}>
      <Image src="/logo-pava.png" alt="Partido Popular Democrático" width={44} height={44} priority className="h-11 w-11 flex-none object-contain" />
      <Wordmark size={size} />
    </div>
  );
}
