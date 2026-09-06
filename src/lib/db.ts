// Conexión a Postgres (Supabase). Una sola instancia por proceso.
import postgres from "postgres";

const globalRef = globalThis as { __pavaSql?: ReturnType<typeof postgres> };

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no configurada");
  // prepare:false porque el pooler de Supabase en modo transacción no admite
  // sentencias preparadas. Pocas conexiones: cada función de Vercel abre las suyas.
  globalRef.__pavaSql ??= postgres(url, { ssl: "require", max: 3, prepare: false, idle_timeout: 20, connect_timeout: 10 });
  return globalRef.__pavaSql;
}
