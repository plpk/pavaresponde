import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

// Identificador anónimo por dispositivo. Solo sirve para el límite de
// preguntas; no se guarda con las preguntas ni se cruza con nada.
export const DEVICE_COOKIE = "pr_dispositivo";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getOrCreateDeviceId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(DEVICE_COOKIE)?.value;
  if (existing && /^[a-f0-9]{32}$/.test(existing)) return existing;
  const id = randomBytes(16).toString("hex");
  jar.set(DEVICE_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
  return id;
}
