"use client";

// Dictado con la Web Speech API del navegador. Sigue los siete pasos de la
// especificación: reposo, permiso, escuchando, silencio, listo, cancelar y
// sin soporte. Cada paso tiene salida.
import { useCallback, useEffect, useRef, useState } from "react";

export type DictationPhase = "idle" | "permission" | "listening";

export const DICTATION_MSG = {
  noSupport: "Este teléfono no puede escuchar. Escribe tu pregunta.",
  permission: "Tu teléfono te va a preguntar si nos dejas escuchar. Toca Permitir.",
  silence: "No te escuchamos. Acércate el teléfono y habla otra vez.",
  denied: "El micrófono está bloqueado en tu navegador. Puedes activarlo en los ajustes o escribir tu pregunta.",
  failed: "No pudimos escucharte. Escribe tu pregunta.",
  empty: "No te escuchamos. Escribe tu pregunta o toca el botón rojo otra vez.",
} as const;

const SILENCE_HINT_MS = 6_000;
const SILENCE_CLOSE_MS = 12_000;
const MIC_OK_KEY = "pr_mic_ok";

// Tipos mínimos: lib.dom no incluye webkitSpeechRecognition.
interface SRAlternative { transcript: string }
interface SRResult { readonly length: number; readonly isFinal: boolean; [i: number]: SRAlternative }
interface SRResultList { readonly length: number; [i: number]: SRResult }
interface SRLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((e: Event) => void) | null;
  onresult: ((e: { results: SRResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: ((e: Event) => void) | null;
}
type SRCtor = new () => SRLike;

function getCtor(): SRCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Options = {
  /** A los 12 s sin voz el panel se cierra solo y devuelve lo transcrito. */
  onAutoClose: (transcript: string) => void;
  /** Permiso denegado o fallo del navegador. */
  onFail: (reason: "denied" | "error") => void;
};

export function useDictation({ onAutoClose, onFail }: Options) {
  // Solo se usa en manejadores de eventos, nunca en el marcado, así que no
  // hay riesgo de desajuste entre servidor y cliente.
  const [supported] = useState<boolean>(() => getCtor() !== null);
  const [phase, setPhase] = useState<DictationPhase>("idle");
  const [transcript, setTranscript] = useState("");
  const [hint, setHint] = useState<string | null>(null);

  const recRef = useRef<SRLike | null>(null);
  const activeRef = useRef(false);
  const transcriptRef = useRef("");
  const hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const callbacks = useRef({ onAutoClose, onFail });
  useEffect(() => {
    callbacks.current = { onAutoClose, onFail };
  });

  const clearTimers = useCallback(() => {
    clearTimeout(hintTimer.current);
    clearTimeout(closeTimer.current);
  }, []);

  const teardown = useCallback(() => {
    clearTimers();
    activeRef.current = false;
    const rec = recRef.current;
    recRef.current = null;
    if (rec) {
      rec.onstart = rec.onresult = rec.onerror = rec.onend = null;
      try {
        rec.abort();
      } catch {
        // el navegador ya lo había cerrado
      }
    }
    setPhase("idle");
    setHint(null);
  }, [clearTimers]);

  const armTimers = useCallback(() => {
    clearTimers();
    hintTimer.current = setTimeout(() => setHint(DICTATION_MSG.silence), SILENCE_HINT_MS);
    closeTimer.current = setTimeout(() => {
      const text = transcriptRef.current;
      teardown();
      callbacks.current.onAutoClose(text);
    }, SILENCE_CLOSE_MS);
  }, [clearTimers, teardown]);

  useEffect(() => teardown, [teardown]);

  /** Devuelve false si el navegador no puede dictar. */
  const start = useCallback((): boolean => {
    const Ctor = getCtor();
    if (!Ctor) return false;
    teardown();

    let firstTime = true;
    try {
      firstTime = localStorage.getItem(MIC_OK_KEY) !== "1";
    } catch {
      // sin localStorage (modo privado): mostramos el aviso de permiso
    }

    const rec = new Ctor();
    rec.lang = "es-PR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    transcriptRef.current = "";
    setTranscript("");
    setHint(null);
    setPhase(firstTime ? "permission" : "listening");
    activeRef.current = true;
    recRef.current = rec;

    rec.onstart = () => {
      try {
        localStorage.setItem(MIC_OK_KEY, "1");
      } catch {
        // ignorar
      }
      setPhase("listening");
      armTimers();
    };
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      text = text.replace(/\s+/g, " ").trim();
      transcriptRef.current = text;
      setTranscript(text);
      setHint(null);
      armTimers();
    };
    rec.onerror = (e) => {
      // "no-speech" lo cubren nuestros temporizadores; "aborted" es nuestro.
      if (e.error === "no-speech" || e.error === "aborted") return;
      const denied = e.error === "not-allowed" || e.error === "service-not-allowed";
      teardown();
      callbacks.current.onFail(denied ? "denied" : "error");
    };
    rec.onend = () => {
      // Chrome cierra la sesión tras unos segundos de silencio; la reabrimos
      // mientras el panel siga abierto para no perder lo que se diga después.
      if (!activeRef.current || recRef.current !== rec) return;
      try {
        rec.start();
      } catch {
        // el panel sigue abierto con lo que ya se transcribió
      }
    };

    try {
      rec.start();
    } catch {
      teardown();
      return false;
    }
    return true;
  }, [armTimers, teardown]);

  /** Detiene el dictado y devuelve el texto tal como está. */
  const stop = useCallback((): string => {
    const text = transcriptRef.current;
    teardown();
    return text;
  }, [teardown]);

  const cancel = useCallback(() => {
    teardown();
    transcriptRef.current = "";
    setTranscript("");
  }, [teardown]);

  return { supported, phase, transcript, hint, start, stop, cancel };
}
