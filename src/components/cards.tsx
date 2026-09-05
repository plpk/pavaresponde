import type { ArticleRef } from "@/lib/articulos";
import { OUT_OF_SCOPE_TEXT, PHONE_DISPLAY, PHONE_TEL } from "@/lib/constants";
import { PhoneIcon, SignalOffIcon } from "./icons";

function Echo({ text }: { text: string }) {
  return <div className="echo md:px-4 md:py-3.5 md:text-[17px]">{text}</div>;
}

function Card({ children, padded = "p-4 md:p-6" }: { children: React.ReactNode; padded?: string }) {
  return <article className={`card mt-[22px] md:mt-7 ${padded}`}>{children}</article>;
}

export function LoadingCard({ echo }: { echo: string }) {
  return (
    <Card>
      <Echo text={echo} />
      <div className="mt-4 flex flex-col gap-3" role="status" aria-label="Buscando la respuesta">
        <div className="skeleton-line" />
        <div className="skeleton-line" />
        <div className="skeleton-line w-[72%]" />
      </div>
      <div className="mt-4 text-[14px] text-ink-soft">Buscando en el Reglamento…</div>
    </Card>
  );
}

type AnswerProps = {
  echo: string;
  paragraphs: string[];
  articles: ArticleRef[];
  feedback: "up" | "down" | null;
  onFeedback: (v: "up" | "down") => void;
};

export function AnswerCard({ echo, paragraphs, articles, feedback, onFeedback }: AnswerProps) {
  const thumb = (v: "up" | "down") =>
    `min-h-12 min-w-14 rounded-[10px] border-[1.5px] text-xl active:translate-y-px ${
      feedback === v ? "border-blue bg-blue-50" : "border-line-strong bg-white"
    } ${feedback && feedback !== v ? "opacity-60" : ""}`;
  return (
    <Card>
      <Echo text={echo} />
      <div className="mt-4 flex flex-col gap-3.5 md:mt-[18px] md:gap-4">
        {paragraphs.map((p, i) => (
          <p key={i} className="m-0 text-answer text-ink text-pretty md:text-answer-lg">
            {p}
          </p>
        ))}
      </div>
      {articles.length > 0 && (
        <div className="mt-[18px] md:mt-[22px]">
          <h3 className="micro-label mb-2">En el Reglamento</h3>
          <div className="flex flex-wrap gap-2">
            {articles.map((a) => (
              <a key={a.n} href={a.href} target="_blank" rel="noopener" className="art-chip md:px-[18px] md:text-[16px]">
                {a.label}
                <span className="text-[13px] font-normal">PDF ↗</span>
              </a>
            ))}
          </div>
        </div>
      )}
      <div className="mt-[18px] flex flex-wrap items-center gap-2.5 border-t border-line pt-3.5 md:mt-[22px] md:gap-3 md:pt-4">
        <span className="text-meta font-medium text-ink-echo md:text-[17px]">¿Te ayudó?</span>
        <button type="button" onClick={() => onFeedback("up")} aria-label="Sí, me ayudó" aria-pressed={feedback === "up"} disabled={feedback !== null} className={thumb("up")}>
          👍
        </button>
        <button type="button" onClick={() => onFeedback("down")} aria-label="No me ayudó" aria-pressed={feedback === "down"} disabled={feedback !== null} className={thumb("down")}>
          👎
        </button>
        {feedback && (
          <span role="status" className="text-[15px] text-ink-muted">
            Gracias por decirnos.
          </span>
        )}
      </div>
    </Card>
  );
}

export function OutOfScopeCard({ echo }: { echo: string }) {
  return (
    <Card padded="px-4 py-[18px] md:p-6">
      <Echo text={echo} />
      <p className="mt-4 text-answer text-ink text-pretty md:text-answer-lg">{OUT_OF_SCOPE_TEXT}</p>
      <a href={PHONE_TEL} className="btn-primary btn-primary-sm mt-4">
        <PhoneIcon size={20} color="#fff" />
        Llamar al partido
      </a>
    </Card>
  );
}

export function ErrorCard({ onRetry }: { onRetry: () => void }) {
  return (
    <Card padded="px-4 py-[18px] md:p-6">
      <div className="flex items-center gap-2.5">
        <SignalOffIcon size={26} />
        <h2 className="m-0 font-display text-[22px] font-bold uppercase text-ink">Sin conexión</h2>
      </div>
      <p className="mt-3 text-answer text-ink text-pretty md:text-answer-lg">No pudimos buscar tu pregunta. Revisa tu señal y vuelve a intentar.</p>
      <button type="button" onClick={onRetry} className="btn-primary btn-primary-sm mt-4">
        Intentar otra vez
      </button>
      <a href={PHONE_TEL} className="btn-tertiary mt-2.5">
        Llamar al {PHONE_DISPLAY}
      </a>
    </Card>
  );
}

export function RateLimitCard() {
  return (
    <Card padded="px-4 py-[18px] md:p-6">
      <h2 className="m-0 font-display text-[22px] font-bold uppercase text-ink">Espera un momento</h2>
      <p className="mt-3 text-answer text-ink text-pretty md:text-answer-lg">Recibimos varias preguntas tuyas seguidas. Espera un minuto y vuelve a preguntar.</p>
      <p className="mt-2.5 text-[17px] leading-[1.5] text-ink-muted">Si es algo urgente, llama al partido.</p>
      <a href={PHONE_TEL} className="btn-primary btn-primary-sm mt-4">
        Llamar al {PHONE_DISPLAY}
      </a>
    </Card>
  );
}
