// Límite de preguntas por dispositivo, en memoria (por instancia del servidor).
import { RATE_LIMIT } from "./constants";

type Limits = { max: number; windowMs: number };

const globalRef = globalThis as { __pavaRate?: Map<string, number[]> };
function buckets(): Map<string, number[]> {
  globalRef.__pavaRate ??= new Map();
  return globalRef.__pavaRate;
}

export function checkRateLimit(
  key: string,
  limits: Limits = RATE_LIMIT,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const map = buckets();
  const recent = (map.get(key) ?? []).filter((t) => now - t < limits.windowMs);
  if (recent.length >= limits.max) {
    const retryAfterSec = Math.max(1, Math.ceil((recent[0] + limits.windowMs - now) / 1000));
    map.set(key, recent);
    return { ok: false, retryAfterSec };
  }
  recent.push(now);
  map.set(key, recent);
  // Poda ocasional para que el mapa no crezca sin límite.
  if (map.size > 5000) {
    for (const [k, ts] of map) {
      if (ts.every((t) => now - t >= limits.windowMs)) map.delete(k);
    }
  }
  return { ok: true };
}
