import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "pr_admin";
const SESSION_HOURS = 12;

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function sha256(input: string): Buffer {
  return createHash("sha256").update(input).digest();
}

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET || sha256(`pava-admin:${process.env.ADMIN_PASSWORD ?? ""}`).toString("hex");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function checkAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // Se comparan los hashes para que la comparación sea de tiempo constante
  // y no dependa del largo de la contraseña.
  return timingSafeEqual(sha256(input), sha256(expected));
}

export function createAdminToken(): string {
  const exp = String(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  return `${exp}.${sign(exp)}`;
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token || !isAdminConfigured()) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig) return false;
  const expected = sign(exp);
  if (sig.length !== expected.length) return false;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  return Number(exp) > Date.now();
}

export const adminCookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_HOURS * 60 * 60,
};
