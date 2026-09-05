import { SAMPLE_QUESTIONS } from "@/lib/constants";

export function SampleChips({ onPick }: { onPick: (q: string) => void }) {
  return (
    <section className="mt-[26px] md:mt-7" aria-labelledby="frecuentes-label">
      <h2 id="frecuentes-label" className="micro-label mb-2.5">
        Preguntas frecuentes
      </h2>
      <div className="flex flex-col gap-2.5 md:grid md:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] md:gap-3">
        {SAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            className="flex min-h-[60px] w-full items-center justify-between gap-3 rounded-field border border-line-chip bg-white p-3.5 text-left text-chip font-medium text-ink shadow-flat active:translate-y-px active:opacity-[0.96] md:min-h-[88px] md:flex-col md:items-start md:gap-2.5 md:text-[16px]"
          >
            <span>{q}</span>
            <span className="flex-none text-xl font-semibold text-blue md:text-lg" aria-hidden="true">
              ›
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
