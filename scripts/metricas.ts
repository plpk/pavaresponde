// Métricas de Pava Responde en un solo comando: visitas (Vercel Web Analytics)
// y preguntas (tabla `preguntas` en Supabase). Existe para que «¿cuánta gente
// ha entrado?» se conteste en segundos, sin paneles ni herramientas intermedias.
//
// Uso: npm run metricas                       desde que se activó Analytics (2026-09-07) hasta ahora
//      npm run metricas -- --dias 7           hoy y los 6 días anteriores
//      npm run metricas -- --desde 2026-09-01 --hasta 2026-09-30   fechas en hora de Puerto Rico
//      npm run metricas -- --json             salida en JSON para otros programas
//
// Necesita:
//   - Token de Vercel: VERCEL_TOKEN en el entorno o la sesión de `vercel login`
//     (se lee del auth.json de la CLI). Habla directo con la API REST
//     /v1/query/web-analytics/visits/{count,aggregate}. La herramienta MCP de
//     Vercel `get_web_analytics` responde 404 para este proyecto: no sirve.
//   - DATABASE_URL (en .env.local; `vercel env pull` la trae) para las
//     preguntas. Sin ella, esa parte se omite y se avisa.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getSql, hasDatabase } from "../src/lib/db";

const PROYECTO = { projectId: "prj_CvNl7l0qqsL9gAk9WydMjY7hBC5h", teamId: "team_5V81Jo10yR4vMgjBHbWfqcnG" };
const API = "https://api.vercel.com";
const ZONA = "America/Puerto_Rico";
const DESFASE_PR_MS = 4 * 3_600_000; // Puerto Rico es UTC-4 todo el año, sin horario de verano
const DIA_MS = 24 * 3_600_000;
const FILAS_POR_TABLA = 8;
const LIMITE_API = 100; // la API de Web Analytics no acepta `limit` mayor

const AYUDA = `Uso: npm run metricas [-- opciones]
  --dias N                 hoy y los N-1 días anteriores (hora de Puerto Rico)
  --desde AAAA-MM-DD       primer día incluido (hora de Puerto Rico)
  --hasta AAAA-MM-DD       último día incluido (hora de Puerto Rico)
  --json                   salida en JSON
Sin opciones: desde que se activó Web Analytics hasta ahora.`;

// ---------- argumentos ----------
type Args = { dias?: number; desde?: string; hasta?: string; json: boolean };

function fallo(msg: string): never {
  console.error(`metricas: ${msg}`);
  process.exit(2);
}

function leerArgs(argv: string[]): Args {
  const args: Args = { json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const valor = () => argv[++i] ?? fallo(`Falta el valor de ${a}`);
    if (a === "--json") args.json = true;
    else if (a === "--dias") args.dias = Number(valor());
    else if (a === "--desde") args.desde = valor();
    else if (a === "--hasta") args.hasta = valor();
    else if (a === "--help" || a === "-h") {
      console.log(AYUDA);
      process.exit(0);
    } else fallo(`Opción desconocida: ${a}\n${AYUDA}`);
  }
  if (args.dias !== undefined && (args.desde || args.hasta)) fallo("--dias no se combina con --desde/--hasta");
  if (args.dias !== undefined && !(Number.isInteger(args.dias) && args.dias > 0)) fallo("--dias debe ser un entero mayor que 0");
  for (const f of [args.desde, args.hasta]) if (f && !/^\d{4}-\d{2}-\d{2}$/.test(f)) fallo(`Fecha inválida: ${f} (usa AAAA-MM-DD)`);
  return args;
}

// ---------- fechas en hora de Puerto Rico ----------
const fmtFecha = new Intl.DateTimeFormat("sv-SE", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" });
const fmtHora = new Intl.DateTimeFormat("sv-SE", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hour12: false });
const fechaPR = (d: Date) => fmtFecha.format(d);
const fechaHoraPR = (d: Date) => `${fmtFecha.format(d)} ${fmtHora.format(d)}`;
const medianochePR = (fecha: string) => new Date(Date.parse(`${fecha}T00:00:00.000Z`) + DESFASE_PR_MS);

type Rango = { since: Date; until: Date; etiqueta: string };

function calcularRango(args: Args, activadoEn: Date): Rango {
  const ahora = new Date();
  if (args.dias !== undefined) {
    const since = new Date(medianochePR(fechaPR(ahora)).getTime() - (args.dias - 1) * DIA_MS);
    return { since, until: ahora, etiqueta: `últimos ${args.dias} días (desde el ${fechaPR(since)}, hora de PR)` };
  }
  if (args.desde || args.hasta) {
    const since = args.desde ? medianochePR(args.desde) : activadoEn;
    const until = args.hasta ? new Date(medianochePR(args.hasta).getTime() + DIA_MS) : ahora;
    if (until <= since) fallo("--hasta es anterior a --desde");
    return { since, until, etiqueta: `del ${fechaPR(since)} al ${args.hasta ?? "ahora"} (hora de PR)` };
  }
  return { since: activadoEn, until: ahora, etiqueta: `desde que se activó Analytics (${fechaHoraPR(activadoEn)}) hasta ahora` };
}

// ---------- Vercel ----------
async function tokenVercel(): Promise<string> {
  if (process.env.VERCEL_TOKEN) return process.env.VERCEL_TOKEN;
  const casa = os.homedir();
  const candidatos = [
    process.env.XDG_DATA_HOME && path.join(process.env.XDG_DATA_HOME, "com.vercel.cli/auth.json"),
    path.join(casa, "Library/Application Support/com.vercel.cli/auth.json"),
    path.join(casa, ".local/share/com.vercel.cli/auth.json"),
    process.env.APPDATA && path.join(process.env.APPDATA, "com.vercel.cli/auth.json"),
  ].filter((p): p is string => Boolean(p));
  for (const archivo of candidatos) {
    if (!existsSync(archivo)) continue;
    const token = (JSON.parse(await readFile(archivo, "utf8")) as { token?: string }).token;
    if (token) return token;
  }
  return fallo("No hay token de Vercel. Haz `vercel login` o pon VERCEL_TOKEN en el entorno (vercel.com → Settings → Tokens).");
}

async function idsProyecto(): Promise<typeof PROYECTO> {
  try {
    const j = JSON.parse(await readFile(".vercel/project.json", "utf8")) as { projectId?: string; orgId?: string };
    if (j.projectId && j.orgId) return { projectId: j.projectId, teamId: j.orgId };
  } catch {
    // sin `vercel link` local: valen los identificadores fijos del proyecto
  }
  return PROYECTO;
}

async function vercel<T>(token: string, ruta: string, params: Record<string, string>): Promise<T> {
  const url = new URL(ruta, API);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const cuerpo = (await res.text()).slice(0, 300);
    if (res.status === 401 || res.status === 403) fallo(`Vercel rechazó el token (${res.status}). Repite \`vercel login\` o renueva VERCEL_TOKEN.\n${cuerpo}`);
    fallo(`Vercel devolvió ${res.status} en ${ruta}: ${cuerpo}`);
  }
  return (await res.json()) as T;
}

type Cuenta = { visitors: number; pageviews: number };
type FilaAgregada = Cuenta & { [dimension: string]: string | number | undefined };

async function fechaActivacion(token: string, ids: typeof PROYECTO): Promise<Date> {
  const p = await vercel<{ webAnalytics?: { enabledAt?: number } }>(token, `/v9/projects/${ids.projectId}`, { teamId: ids.teamId });
  const enabledAt = p.webAnalytics?.enabledAt;
  if (!enabledAt) fallo("Web Analytics no está activado en este proyecto. Actívalo en vercel.com → pavaresponde → Analytics → Enable.");
  return new Date(enabledAt);
}

// La API de Web Analytics redondea por su cuenta: `count` recorta since y until
// al día UTC (con until=ahora deja fuera el día de hoy), y los agregados por
// dimensión recortan a la hora. Para que el total, la tabla por día y las
// tablas por país o dispositivo cuadren, se pide siempre la ventana ampliada
// a días UTC completos.
const inicioDiaUtc = (d: Date) => new Date(Math.floor(d.getTime() / DIA_MS) * DIA_MS);
const finDiaUtc = (d: Date) => new Date(Math.ceil(d.getTime() / DIA_MS) * DIA_MS);
const ventanaUtc = (r: Rango) => ({ since: inicioDiaUtc(r.since), until: finDiaUtc(r.until) });

function paramsRango(ids: typeof PROYECTO, r: Rango): Record<string, string> {
  const v = ventanaUtc(r);
  return { projectId: ids.projectId, teamId: ids.teamId, since: v.since.toISOString(), until: v.until.toISOString() };
}

async function contarVisitas(token: string, ids: typeof PROYECTO, r: Rango): Promise<Cuenta> {
  const res = await vercel<{ data: Cuenta }>(token, "/v1/query/web-analytics/visits/count", paramsRango(ids, r));
  return res.data;
}

async function agruparVisitas(token: string, ids: typeof PROYECTO, r: Rango, by: string, limit = FILAS_POR_TABLA): Promise<FilaAgregada[]> {
  const res = await vercel<{ data: FilaAgregada[] }>(token, "/v1/query/web-analytics/visits/aggregate", { ...paramsRango(ids, r), by, limit: String(limit) });
  return res.data;
}

// La API agrupa por periodos en UTC con topes propios: como mucho LIMITE_API
// filas y, por semanas, 26 semanas. Más allá de 100 días se pasa a semanas y
// más allá de 26 semanas a meses.
function granularidad(r: Rango): { by: "day" | "week" | "month"; etiqueta: string } {
  const dias = Math.ceil((r.until.getTime() - r.since.getTime()) / DIA_MS);
  if (dias <= LIMITE_API) return { by: "day", etiqueta: "Día (UTC)" };
  if (dias <= 26 * 7) return { by: "week", etiqueta: "Semana (UTC)" };
  return { by: "month", etiqueta: "Mes (UTC)" };
}

const etiqueta = (v: unknown, vacio: string) => (v === undefined || v === null || v === "" ? vacio : String(v));

// ---------- preguntas (Postgres) ----------
type Preguntas = {
  total: number;
  textosDistintos: number;
  contestadas: number;
  alModelo: number;
  pulgarArriba: number;
  pulgarAbajo: number;
  costoUsd: number;
  porDia: { dia: string; preguntas: number; alModelo: number; costoUsd: number }[];
  articulos: { articulo: number; veces: number }[];
};

async function leerPreguntas(r: Rango): Promise<Preguntas> {
  const sql = getSql();
  try {
    const [t] = await sql<
      { total: number; textos_distintos: number; contestadas: number; al_modelo: number; pulgar_arriba: number; pulgar_abajo: number; costo_usd: number }[]
    >`
      select count(*)::int as total,
             count(distinct pregunta)::int as textos_distintos,
             count(*) filter (where contestada)::int as contestadas,
             count(*) filter (where fuente = 'modelo')::int as al_modelo,
             count(*) filter (where pulgar = 'up')::int as pulgar_arriba,
             count(*) filter (where pulgar = 'down')::int as pulgar_abajo,
             coalesce(sum(costo_usd), 0)::float as costo_usd
      from preguntas where creada_en >= ${r.since} and creada_en < ${r.until}`;
    const porDia = await sql<{ dia: string; preguntas: number; al_modelo: number; costo_usd: number }[]>`
      select to_char(creada_en at time zone ${ZONA}, 'YYYY-MM-DD') as dia,
             count(*)::int as preguntas,
             count(*) filter (where fuente = 'modelo')::int as al_modelo,
             coalesce(sum(costo_usd), 0)::float as costo_usd
      from preguntas where creada_en >= ${r.since} and creada_en < ${r.until}
      group by 1 order by 1`;
    const articulos = await sql<{ articulo: number; veces: number }[]>`
      select articulo::int as articulo, count(*)::int as veces
      from preguntas, unnest(articulos) as articulo
      where creada_en >= ${r.since} and creada_en < ${r.until}
      group by 1 order by 2 desc, 1 limit ${FILAS_POR_TABLA}`;
    return {
      total: t.total,
      textosDistintos: t.textos_distintos,
      contestadas: t.contestadas,
      alModelo: t.al_modelo,
      pulgarArriba: t.pulgar_arriba,
      pulgarAbajo: t.pulgar_abajo,
      costoUsd: t.costo_usd,
      porDia: porDia.map((f) => ({ dia: f.dia, preguntas: f.preguntas, alModelo: f.al_modelo, costoUsd: f.costo_usd })),
      articulos: articulos.map((f) => ({ articulo: f.articulo, veces: f.veces })),
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

// ---------- salida ----------
function tabla(cabecera: string[], filas: (string | number)[][]): string {
  if (filas.length === 0) return "  (sin datos)";
  const celdas = [cabecera, ...filas.map((f) => f.map(String))];
  const anchos = cabecera.map((_, i) => Math.max(...celdas.map((f) => f[i].length)));
  const linea = (f: string[]) => "  " + f.map((c, i) => (i === 0 ? c.padEnd(anchos[i]) : c.padStart(anchos[i]))).join("  ");
  return celdas.map(linea).join("\n");
}

const usd = (n: number) => `US$${n.toFixed(4)}`;

async function main() {
  const args = leerArgs(process.argv.slice(2));
  const [token, ids] = await Promise.all([tokenVercel(), idsProyecto()]);
  const activadoEn = await fechaActivacion(token, ids);
  const rango = calcularRango(args, activadoEn);
  const periodo = granularidad(rango);

  const [total, porDia, pais, dispositivo, navegador, procedencia, preguntas] = await Promise.all([
    contarVisitas(token, ids, rango),
    agruparVisitas(token, ids, rango, periodo.by, LIMITE_API),
    agruparVisitas(token, ids, rango, "country"),
    agruparVisitas(token, ids, rango, "deviceType"),
    agruparVisitas(token, ids, rango, "browserName"),
    agruparVisitas(token, ids, rango, "referrerHostname"),
    hasDatabase() ? leerPreguntas(rango) : Promise.resolve(null),
  ]);

  const visitas = {
    visitantes: total.visitors,
    vistas: total.pageviews,
    periodo: periodo.by,
    porPeriodoUtc: porDia.filter((f) => f.pageviews > 0).map((f) => ({ inicio: String(f.timestamp).slice(0, 10), visitantes: f.visitors, vistas: f.pageviews })),
    pais: pais.map((f) => ({ pais: etiqueta(f.country, "(sin dato)"), visitantes: f.visitors, vistas: f.pageviews })),
    dispositivo: dispositivo.map((f) => ({ dispositivo: etiqueta(f.deviceType, "(sin dato)"), visitantes: f.visitors, vistas: f.pageviews })),
    navegador: navegador.map((f) => ({ navegador: etiqueta(f.browserName, "(sin dato)"), visitantes: f.visitors, vistas: f.pageviews })),
    procedencia: procedencia.map((f) => ({ procedencia: etiqueta(f.referrerHostname, "directo"), visitantes: f.visitors, vistas: f.pageviews })),
  };

  const ventana = ventanaUtc(rango);
  const ultimoDiaUtc = new Date(ventana.until.getTime() - DIA_MS).toISOString().slice(0, 10);
  const notaVentana = `días UTC del ${ventana.since.toISOString().slice(0, 10)} al ${ultimoDiaUtc} inclusive`;

  if (args.json) {
    const salidaJson = {
      generado: new Date().toISOString(),
      rango: { desde: rango.since.toISOString(), hasta: rango.until.toISOString(), etiqueta: rango.etiqueta, ventanaVisitasUtc: { desde: ventana.since.toISOString(), hasta: ventana.until.toISOString() } },
      visitas,
      preguntas,
    };
    console.log(JSON.stringify(salidaJson, null, 2));
    return;
  }

  const salida: string[] = [];
  salida.push(`Pava Responde · métricas · ${fechaHoraPR(new Date())} (hora de PR)`);
  salida.push(`Rango: ${rango.etiqueta}`);
  salida.push("");
  salida.push("VISITAS  (Vercel Web Analytics, producción, sin /admin)");
  salida.push(`  Visitantes: ${visitas.visitantes}    Vistas de página: ${visitas.vistas}`);
  salida.push(`  La API cuenta por días UTC completos: ${notaVentana}.`);
  salida.push("");
  salida.push(tabla([periodo.etiqueta, "Visitantes", "Vistas"], visitas.porPeriodoUtc.map((f) => [f.inicio, f.visitantes, f.vistas])));
  salida.push("");
  salida.push(tabla(["País", "Visitantes", "Vistas"], visitas.pais.map((f) => [f.pais, f.visitantes, f.vistas])));
  salida.push("");
  salida.push(tabla(["Dispositivo", "Visitantes", "Vistas"], visitas.dispositivo.map((f) => [f.dispositivo, f.visitantes, f.vistas])));
  salida.push("");
  salida.push(tabla(["Navegador", "Visitantes", "Vistas"], visitas.navegador.map((f) => [f.navegador, f.visitantes, f.vistas])));
  salida.push("");
  salida.push(tabla(["Procedencia", "Visitantes", "Vistas"], visitas.procedencia.map((f) => [f.procedencia, f.visitantes, f.vistas])));
  salida.push("");
  salida.push("PREGUNTAS  (tabla preguntas en Supabase)");
  if (!preguntas) {
    salida.push("  Sin DATABASE_URL: esta parte se omite. `vercel env pull` la trae a .env.local.");
  } else {
    salida.push(`  Total: ${preguntas.total}    Distintas: ${preguntas.textosDistintos}    Contestadas: ${preguntas.contestadas}    Al modelo: ${preguntas.alModelo}    Costo: ${usd(preguntas.costoUsd)}`);
    salida.push(`  Pulgar: ${preguntas.pulgarArriba} arriba, ${preguntas.pulgarAbajo} abajo`);
    salida.push("");
    salida.push(tabla(["Día (PR)", "Preguntas", "Al modelo", "Costo"], preguntas.porDia.map((f) => [f.dia, f.preguntas, f.alModelo, usd(f.costoUsd)])));
    salida.push("");
    salida.push(`  Artículos más citados: ${preguntas.articulos.map((a) => `${a.articulo} (${a.veces})`).join(", ") || "ninguno"}`);
  }
  console.log(salida.join("\n"));
}

main().catch((e: unknown) => fallo(e instanceof Error ? e.message : String(e)));
