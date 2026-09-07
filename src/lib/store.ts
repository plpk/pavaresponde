// Registro de preguntas para /admin. Nunca guarda datos personales: solo el
// texto de la pregunta, la hora, los artículos citados, si hubo respuesta, de
// dónde salió, el pulgar y el uso del modelo (para saber lo que cuesta).
//
// Con DATABASE_URL usa Postgres (Supabase). Sin ella, un archivo JSON local
// para desarrollo (PAVA_DATA_DIR, por defecto ./data).
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSql, hasDatabase } from "./db";

type Feedback = "up" | "down" | null;
type Fuente = "respuestas" | "modelo";

export interface QuestionRecord {
  id: string;
  at: string; // ISO 8601, UTC
  question: string;
  articles: number[];
  answered: boolean;
  fuente: Fuente;
  feedback: Feedback;
  modelo: string | null;
  tokensEntrada: number;
  tokensCacheLectura: number;
  tokensCacheEscritura: number;
  tokensSalida: number;
  costoUsd: number;
}

export interface ListFilter {
  from?: Date;
  to?: Date;
  onlyUnanswered?: boolean;
}

export interface QuestionStore {
  add(record: QuestionRecord): Promise<void>;
  setFeedback(id: string, feedback: Exclude<Feedback, null>): Promise<boolean>;
  list(filter: ListFilter): Promise<QuestionRecord[]>;
}

const MAX_ROWS = 5000;

class PostgresStore implements QuestionStore {
  async add(r: QuestionRecord): Promise<void> {
    const sql = getSql();
    await sql`
      insert into preguntas (id, creada_en, pregunta, articulos, contestada, fuente, pulgar, modelo,
        tokens_entrada, tokens_cache_lectura, tokens_cache_escritura, tokens_salida, costo_usd)
      values (${r.id}::uuid, ${r.at}::timestamptz, ${r.question}, ${"{" + r.articles.join(",") + "}"}::smallint[], ${r.answered}::boolean, ${r.fuente}, ${r.feedback}, ${r.modelo},
        ${r.tokensEntrada}::int, ${r.tokensCacheLectura}::int, ${r.tokensCacheEscritura}::int, ${r.tokensSalida}::int, ${r.costoUsd}::numeric)`;
  }

  async setFeedback(id: string, feedback: Exclude<Feedback, null>): Promise<boolean> {
    const sql = getSql();
    const rows = await sql`update preguntas set pulgar = ${feedback} where id = ${id}::uuid returning id`;
    return rows.length > 0;
  }

  async list(filter: ListFilter): Promise<QuestionRecord[]> {
    const sql = getSql();
    const from = filter.from ?? new Date(0);
    const to = filter.to ?? new Date("2999-12-31T23:59:59.999Z");
    const rows = await sql<
      {
        id: string;
        creada_en: Date;
        pregunta: string;
        articulos: number[];
        contestada: boolean;
        fuente: Fuente;
        pulgar: Feedback;
        modelo: string | null;
        tokens_entrada: number;
        tokens_cache_lectura: number;
        tokens_cache_escritura: number;
        tokens_salida: number;
        costo_usd: string;
      }[]
    >`
      select * from preguntas
      where creada_en between ${from.toISOString()}::timestamptz and ${to.toISOString()}::timestamptz
        and (${!filter.onlyUnanswered}::boolean or contestada = false)
      order by creada_en desc
      limit ${MAX_ROWS}`;
    return rows.map((r) => ({
      id: r.id,
      at: r.creada_en.toISOString(),
      question: r.pregunta,
      articles: r.articulos ?? [],
      answered: r.contestada,
      fuente: r.fuente,
      feedback: r.pulgar,
      modelo: r.modelo,
      tokensEntrada: r.tokens_entrada,
      tokensCacheLectura: r.tokens_cache_lectura,
      tokensCacheEscritura: r.tokens_cache_escritura,
      tokensSalida: r.tokens_salida,
      costoUsd: Number(r.costo_usd),
    }));
  }
}

class FileStore implements QuestionStore {
  private queue: Promise<unknown> = Promise.resolve();
  private readonly file: string;

  constructor(dir: string) {
    this.file = path.join(dir, "questions.json");
  }

  private run<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queue.then(task, task);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async readAll(): Promise<QuestionRecord[]> {
    try {
      const raw = await readFile(this.file, "utf8");
      const data: unknown = JSON.parse(raw);
      return Array.isArray(data) ? (data as QuestionRecord[]) : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private async writeAll(records: QuestionRecord[]): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(records), "utf8");
    await rename(tmp, this.file);
  }

  add(record: QuestionRecord): Promise<void> {
    return this.run(async () => {
      const all = await this.readAll();
      all.push(record);
      await this.writeAll(all);
    });
  }

  setFeedback(id: string, feedback: Exclude<Feedback, null>): Promise<boolean> {
    return this.run(async () => {
      const all = await this.readAll();
      const rec = all.find((r) => r.id === id);
      if (!rec) return false;
      rec.feedback = feedback;
      await this.writeAll(all);
      return true;
    });
  }

  list(filter: ListFilter): Promise<QuestionRecord[]> {
    return this.run(async () => {
      const all = await this.readAll();
      const from = filter.from?.getTime() ?? -Infinity;
      const to = filter.to?.getTime() ?? Infinity;
      return all
        .filter((r) => {
          const t = Date.parse(r.at);
          if (t < from || t > to) return false;
          if (filter.onlyUnanswered && r.answered) return false;
          return true;
        })
        .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
        .slice(0, MAX_ROWS);
    });
  }
}

// Una sola instancia por proceso, también con recarga en caliente de Next.
const globalRef = globalThis as { __pavaStore?: QuestionStore };

export function getStore(): QuestionStore {
  if (!globalRef.__pavaStore) {
    if (hasDatabase()) {
      globalRef.__pavaStore = new PostgresStore();
    } else {
      const dir = process.env.PAVA_DATA_DIR ?? path.join(process.cwd(), "data");
      console.warn(`[store] DATABASE_URL no configurada: registro de preguntas en ${dir}/questions.json`);
      globalRef.__pavaStore = new FileStore(dir);
    }
  }
  return globalRef.__pavaStore;
}
