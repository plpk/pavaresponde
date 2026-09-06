"use client";

import { useCallback, useRef, useState } from "react";
import type { ArticleRef } from "@/lib/articulos";
import { ASK_TIMEOUT_MS, PDF_PATH, SUBTITLE } from "@/lib/constants";
import { DICTATION_MSG, useDictation } from "@/hooks/useDictation";
import { AsambleaCard } from "./AsambleaCard";
import { AskBox } from "./AskBox";
import { Footer } from "./Footer";
import { ListeningPanel } from "./ListeningPanel";
import { SampleChips } from "./SampleChips";
import { Brand } from "./Wordmark";
import { AnswerCard, ErrorCard, LoadingCard, OutOfScopeCard, RateLimitCard } from "./cards";

type Status = "empty" | "listening" | "loading" | "answer" | "outscope" | "error" | "ratelimit";

export type AskResponse =
  | { id: string; inScope: true; paragraphs: string[]; articles: ArticleRef[]; fuente: "respuestas" | "modelo" }
  | { id: string; inScope: false };

type Feedback = "up" | "down" | null;

export function PavaApp() {
  const [status, setStatus] = useState<Status>("empty");
  const [input, setInput] = useState("");
  const [echo, setEcho] = useState("");
  const [answer, setAnswer] = useState<Extract<AskResponse, { inScope: true }> | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const requestSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const focusField = useCallback(() => {
    // Tras un cambio de estado el campo puede no estar montado aún; se enfoca
    // en el siguiente tick (requestAnimationFrame se pausa en pestañas ocultas).
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const ask = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question) {
        focusField();
        return;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const seq = ++requestSeq.current;
      const timer = setTimeout(() => controller.abort(), ASK_TIMEOUT_MS);

      setStatus("loading");
      setEcho(question);
      setInput("");
      setAnswer(null);
      setFeedback(null);
      setNotice(null);

      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question }),
          signal: controller.signal,
        });
        if (seq !== requestSeq.current) return;
        if (res.status === 429) {
          setStatus("ratelimit");
          return;
        }
        if (!res.ok) {
          setStatus("error");
          return;
        }
        const data = (await res.json()) as AskResponse;
        if (seq !== requestSeq.current) return;
        if (!data.inScope) {
          setStatus("outscope");
          return;
        }
        setAnswer(data);
        setStatus("answer");
      } catch {
        if (seq === requestSeq.current) setStatus("error");
      } finally {
        clearTimeout(timer);
      }
    },
    [focusField],
  );

  const dictation = useDictation({
    onAutoClose: (text) => {
      setStatus("empty");
      setInput(text);
      if (!text) setNotice(DICTATION_MSG.empty);
      focusField();
    },
    onFail: (reason) => {
      setStatus("empty");
      setNotice(reason === "denied" ? DICTATION_MSG.denied : DICTATION_MSG.failed);
      focusField();
    },
  });

  function onMic() {
    if (!dictation.supported || !dictation.start()) {
      // El botón nunca desaparece: si no hay dictado, abre el teclado.
      setNotice(DICTATION_MSG.noSupport);
      focusField();
      return;
    }
    setNotice(null);
    setStatus("listening");
  }

  function onDone() {
    const text = dictation.stop();
    if (text) {
      void ask(text);
    } else {
      setStatus("empty");
      setNotice(DICTATION_MSG.empty);
      focusField();
    }
  }

  function onCancel() {
    dictation.cancel();
    setStatus("empty");
    setNotice(null);
    focusField();
  }

  async function sendFeedback(value: "up" | "down") {
    if (!answer || feedback) return;
    setFeedback(value);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: answer.id, value }),
      });
    } catch (error) {
      console.warn("No se pudo guardar el pulgar", error);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="hidden items-center justify-between gap-5 border-b border-line bg-white px-8 py-4 md:flex">
        <Brand size="lg" />
        <a href={PDF_PATH} target="_blank" rel="noopener" className="btn-skew">
          <span>Ver el Reglamento (PDF)</span>
        </a>
      </header>

      <main className="flex-1 px-4 pt-5 pb-6 md:px-8 md:pt-10 md:pb-8">
        <div className="mx-auto w-full max-w-[640px]">
          <div className="flex items-center justify-between gap-3 md:hidden">
            <Brand size="sm" />
            <a href={PDF_PATH} target="_blank" rel="noopener" className="btn-skew btn-skew-sm" aria-label="Ver el Reglamento en PDF">
              <span>Reglamento</span>
            </a>
          </div>
          <AsambleaCard />
          <p className="mt-4 text-[15px] leading-[1.45] text-ink-muted text-pretty md:mt-5 md:text-[16px] md:leading-[1.5]">{SUBTITLE}</p>

          {status === "listening" ? (
            <ListeningPanel
              phase={dictation.phase}
              transcript={dictation.transcript}
              hint={dictation.hint}
              onDone={onDone}
              onCancel={onCancel}
            />
          ) : (
            <AskBox value={input} onChange={setInput} onSend={() => void ask(input)} onMic={onMic} notice={notice} textareaRef={textareaRef} />
          )}

          {status === "empty" && <SampleChips onPick={(q) => void ask(q)} />}

          <div aria-live="polite">
            {status === "loading" && <LoadingCard echo={echo} />}
            {status === "answer" && answer && (
              <AnswerCard echo={echo} paragraphs={answer.paragraphs} articles={answer.articles} fuente={answer.fuente} feedback={feedback} onFeedback={(v) => void sendFeedback(v)} />
            )}
            {status === "outscope" && <OutOfScopeCard echo={echo} />}
            {status === "error" && <ErrorCard onRetry={() => void ask(echo)} />}
            {status === "ratelimit" && <RateLimitCard />}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
