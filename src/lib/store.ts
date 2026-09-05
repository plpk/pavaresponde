// Registro de preguntas para /admin. Nunca guarda datos personales:
// solo el texto de la pregunta, la hora, los artículos citados, si hubo
// respuesta y el pulgar.
//
// Implementación: un archivo JSON en PAVA_DATA_DIR (por defecto ./data).
// Sirve para un solo servidor. En Vercel el disco es efímero: sustituye
// FileStore por una implementación sobre tu base de datos cumpliendo la
// misma interfaz QuestionStore.
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export type Feedback = "up" | "down" | null;

export interface QuestionRecord {
  id: string;
  at: string; // ISO 8601, UTC
  question: string;
  articles: number[];
  answered: boolean;
  feedback: Feedback;
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
        .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    });
  }
}

// Una sola instancia por proceso, también con recarga en caliente de Next.
const globalRef = globalThis as { __pavaStore?: QuestionStore };

export function getStore(): QuestionStore {
  globalRef.__pavaStore ??= new FileStore(process.env.PAVA_DATA_DIR ?? path.join(process.cwd(), "data"));
  return globalRef.__pavaStore;
}
