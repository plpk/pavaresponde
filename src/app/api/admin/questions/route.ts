import { NextResponse } from "next/server";
import { filterFromSearch, isAdminRequest, listQuestions } from "@/lib/adminQuery";
import { formatArticles, formatHora } from "@/lib/format";

export async function GET(request: Request) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const rows = await listQuestions(filterFromSearch(searchParams));
  const resumen = {
    total: rows.length,
    sinRespuesta: rows.filter((r) => !r.answered).length,
    alModelo: rows.filter((r) => r.fuente === "modelo").length,
    costoUsd: rows.reduce((s, r) => s + r.costoUsd, 0),
  };
  return NextResponse.json({
    resumen,
    rows: rows.map((r) => ({
      id: r.id,
      at: r.at,
      hora: formatHora(r.at),
      question: r.question,
      articles: formatArticles(r.articles),
      answered: r.answered,
      fuente: r.fuente,
      feedback: r.feedback,
      costoUsd: r.costoUsd,
    })),
  });
}
