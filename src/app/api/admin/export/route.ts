import { NextResponse } from "next/server";
import { filterFromSearch, isAdminRequest, listQuestions } from "@/lib/adminQuery";
import { toCsv } from "@/lib/format";

export async function GET(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  let rows;
  try {
    rows = await listQuestions(filterFromSearch(searchParams));
  } catch (error) {
    console.error("[api/admin/export] no se pudo leer el registro:", error);
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
  return new NextResponse(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="pava-responde-preguntas.csv"',
      "cache-control": "no-store",
    },
  });
}
