import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminToken } from "./adminAuth";
import { parseDateRange } from "./format";
import { getStore, type ListFilter, type QuestionRecord } from "./store";

export async function isAdminRequest(): Promise<boolean> {
  const jar = await cookies();
  return verifyAdminToken(jar.get(ADMIN_COOKIE)?.value);
}

export function filterFromSearch(searchParams: URLSearchParams): ListFilter {
  const range = parseDateRange(searchParams.get("from"), searchParams.get("to"));
  return { ...range, onlyUnanswered: searchParams.get("onlyNoAns") === "1" };
}

export function listQuestions(filter: ListFilter): Promise<QuestionRecord[]> {
  return getStore().list(filter);
}
