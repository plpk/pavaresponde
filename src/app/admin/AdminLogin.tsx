"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.status === 204) {
        router.refresh();
        return;
      }
      if (res.status === 429) setError("Demasiados intentos. Espera unos minutos.");
      else if (res.status === 401) setError("La contraseña no es correcta.");
      else setError("No pudimos verificar la contraseña. Intenta otra vez.");
    } catch {
      setError("No pudimos verificar la contraseña. Revisa tu conexión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex justify-center px-5 py-16">
      <form onSubmit={onSubmit} className="card w-full max-w-[380px] p-7">
        <h1 className="m-0 font-display text-2xl font-bold uppercase text-red">Entrar</h1>
        <p className="mt-2.5 text-meta text-ink-muted">Solo para el personal del partido.</p>
        <label htmlFor="admin-pass" className="micro-label mt-[22px] mb-2">
          Contraseña
        </label>
        <input
          id="admin-pass"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="field min-h-[52px] rounded-btn px-3.5"
        />
        {error && (
          <p role="alert" className="mt-2.5 text-meta font-medium text-red-700">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="btn-primary btn-primary-sm mt-3.5 min-h-[52px] disabled:opacity-70">
          {busy ? "Verificando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
