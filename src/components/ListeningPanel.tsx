"use client";

import { MicIcon } from "./icons";
import { DICTATION_MSG, type DictationPhase } from "@/hooks/useDictation";

type Props = {
  phase: DictationPhase;
  transcript: string;
  hint: string | null;
  onDone: () => void;
  onCancel: () => void;
};

export function ListeningPanel({ phase, transcript, hint, onDone, onCancel }: Props) {
  const waitingPermission = phase === "permission";
  return (
    <section
      className="mt-[22px] rounded-card border-[1.5px] border-red-100 bg-white px-4 py-5 shadow-flat"
      aria-label={waitingPermission ? "Esperando permiso del micrófono" : "Escuchando tu pregunta"}
    >
      <div className="flex flex-col items-center gap-3.5">
        <div className="relative flex h-[104px] w-[104px] items-center justify-center" aria-hidden="true">
          <div className="absolute inset-0 animate-ring rounded-full border-[3px] border-red" />
          <div className="absolute inset-0 animate-ring rounded-full border-[3px] border-red [animation-delay:0.8s]" />
          <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-red">
            <MicIcon size={30} />
          </div>
        </div>
        <div className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-red-700">
          {waitingPermission ? "Permite el micrófono" : "Te estamos escuchando"}
        </div>
        <div className="min-h-[84px] w-full rounded-btn bg-warm p-3.5 text-answer text-ink" aria-live="polite">
          {transcript || (
            <span className="text-ink-soft">{waitingPermission ? DICTATION_MSG.permission : "Habla ahora…"}</span>
          )}
        </div>
      </div>
      {hint && (
        <p role="status" className="mt-3 text-meta font-medium text-ink-muted">
          {hint}
        </p>
      )}
      <div className="mt-4 flex gap-2.5">
        <button type="button" onClick={onDone} className="btn-primary flex-1">
          Listo
        </button>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar y volver"
          className="min-h-14 w-14 flex-none rounded-btn border-[1.5px] border-line-btn bg-white text-[22px] text-ink active:translate-y-px active:opacity-[0.96]"
        >
          ✕
        </button>
      </div>
    </section>
  );
}
