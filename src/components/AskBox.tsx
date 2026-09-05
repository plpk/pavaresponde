"use client";

import { useEffect, type KeyboardEvent, type RefObject } from "react";
import { MAX_QUESTION_LENGTH } from "@/lib/constants";
import { MicIcon } from "./icons";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onMic: () => void;
  notice: string | null;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
};

const MAX_FIELD_HEIGHT = 124; // cuatro líneas; a partir de ahí hace scroll

export function AskBox({ value, onChange, onSend, onMic, notice, textareaRef }: Props) {
  // Dos líneas visibles; crece hasta cuatro y no más.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 72), MAX_FIELD_HEIGHT)}px`;
  }, [value, textareaRef]);

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <section className="mt-[22px] md:mt-6" aria-labelledby="pregunta-label">
      <label id="pregunta-label" htmlFor="pregunta" className="micro-label mb-2">
        Tu pregunta
      </label>
      <div className="flex items-start gap-2.5 md:gap-3">
        <textarea
          id="pregunta"
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Escribe tu pregunta…"
          rows={2}
          maxLength={MAX_QUESTION_LENGTH}
          autoComplete="off"
          enterKeyHint="send"
          className="field min-w-0 flex-1 resize-none px-4 py-3.5 md:h-[76px] md:px-4 md:py-4"
          style={{ height: 72 }}
        />
        <button
          type="button"
          onClick={onMic}
          aria-label="Hablar tu pregunta"
          className="flex h-[72px] w-[72px] flex-none flex-col items-center justify-center gap-0.5 rounded-full bg-red shadow-mic active:translate-y-px active:opacity-[0.96] md:h-[76px] md:w-[76px]"
        >
          <MicIcon size={26} />
          <span className="font-display text-[9px] font-bold uppercase tracking-[0.1em] text-white">Hablar</span>
        </button>
      </div>
      <p className="mt-2 text-[14px] leading-[1.4] text-ink-muted">Toca el botón rojo y habla. También puedes escribir.</p>
      {notice && (
        <p role="status" className="mt-2 text-meta font-medium text-red-700">
          {notice}
        </p>
      )}
      <button type="button" onClick={onSend} className="btn-primary mt-3 md:mt-3.5">
        Preguntar
        <span className="font-sans text-xl font-normal" aria-hidden="true">
          →
        </span>
      </button>
    </section>
  );
}
