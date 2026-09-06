import { ImageResponse } from "next/og";
import { ASAMBLEA, SUBTITLE } from "@/lib/constants";

// Imagen que muestran WhatsApp, Facebook y compañía al compartir el enlace.
// Se genera una vez al construir la app.
export const alt = "Pava Responde";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Descarga una fuente de Google Fonts en TTF o WOFF (Satori no lee woff2). Si
// falla, la imagen sale con la fuente por defecto en vez de romper la construcción.
async function fuente(familia: string, peso: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=${familia}:wght@${peso}&display=swap`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:35.0) Gecko/20100101 Firefox/35.0" },
    }).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype|woff)'\)/)?.[1];
    if (!url) return null;
    return await fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function OpenGraphImage() {
  const [cairo, archivo, archivoBold] = await Promise.all([fuente("Cairo", 900), fuente("Archivo", 400), fuente("Archivo", 600)]);
  const fonts = [
    cairo && { name: "Cairo", data: cairo, weight: 900 as const, style: "normal" as const },
    archivo && { name: "Archivo", data: archivo, weight: 400 as const, style: "normal" as const },
    archivoBold && { name: "Archivo", data: archivoBold, weight: 600 as const, style: "normal" as const },
  ].filter((f): f is NonNullable<typeof f> => Boolean(f));
  const display = cairo ? "Cairo" : "sans-serif";
  const texto = archivo ? "Archivo" : "sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F7F5F2",
          padding: 72,
          fontFamily: texto,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 24, fontFamily: display }}>
          <span style={{ fontSize: 112, fontWeight: 900, color: "#E41E26", lineHeight: 1 }}>PAVA</span>
          <span style={{ fontSize: 112, fontWeight: 900, color: "#0089BF", lineHeight: 1, transform: "skewX(-9deg)" }}>RESPONDE</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          <div style={{ display: "flex", fontSize: 40, color: "#0E1116", lineHeight: 1.25, maxWidth: 1000 }}>{SUBTITLE}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "#FFFFFF",
                borderRadius: 22,
                padding: "16px 30px 18px",
                boxShadow: "0 8px 24px rgba(14,17,22,0.08)",
              }}
            >
              <span style={{ fontFamily: display, fontSize: 72, fontWeight: 900, color: "#E41E26", lineHeight: 1 }}>{ASAMBLEA.dia}</span>
              <span style={{ fontSize: 22, fontWeight: 600, color: "#C4161C", letterSpacing: 5, marginTop: 6 }}>{ASAMBLEA.mes.toUpperCase()}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 600, color: "#5A6068", letterSpacing: 5 }}>ASAMBLEA GENERAL · {ASAMBLEA.ciudad.toUpperCase()}</span>
              <span style={{ fontSize: 38, fontWeight: 600, color: "#0E1116" }}>{ASAMBLEA.fechaCorta}</span>
            </div>
          </div>
        </div>
      </div>
    ),
    // Sin fuentes descargadas, Satori necesita su fuente por defecto: no se pasa la lista vacía.
    fonts.length ? { ...size, fonts } : { ...size },
  );
}
