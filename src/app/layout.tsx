import type { Metadata, Viewport } from "next";
import { Archivo, Cairo } from "next/font/google";
import { Analytics } from "@/components/Analytics";
import "./globals.css";

// Dos fuentes, cuatro pesos en total para el cuerpo y dos para display.
// next/font las sirve desde el mismo dominio con font-display: swap.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-archivo",
  display: "swap",
});

const cairo = Cairo({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-cairo",
  display: "swap",
});

// Dirección pública, para que las vistas previas al compartir apunten bien.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3210");

const DESCRIPTION =
  "Preguntas sobre el Reglamento del Partido Popular Democrático y la Asamblea General del 11 de octubre de 2026 en Ponce.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Pava Responde", template: "%s · Pava Responde" },
  description: DESCRIPTION,
  applicationName: "Pava Responde",
  openGraph: {
    title: "Pava Responde",
    description: DESCRIPTION,
    siteName: "Pava Responde",
    locale: "es_PR",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Pava Responde", description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: "#f7f5f2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PR" className={`${archivo.variable} ${cairo.variable} h-full`}>
      <body className="min-h-full bg-warm font-sans text-ink">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
