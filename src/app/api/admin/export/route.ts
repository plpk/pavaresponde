import { NextResponse } from "next/server";
import { filterFromSearch, isAdminRequest, listQuestions } from "@/lib/adminQuery";
import { toCsv } from "@/lib/format";

export async function GET(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const rows = await listQuestions(filterFromSearch(searchParams));
  return new NextResponse(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="pava-responde-preguntas.csv"',
      "cache-control": "no-store",
    },
  });
}
