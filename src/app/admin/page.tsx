import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Wordmark } from "@/components/Wordmark";
import { ADMIN_COOKIE, isAdminConfigured, verifyAdminToken } from "@/lib/adminAuth";
import { todayPR } from "@/lib/format";
import { AdminLogin } from "./AdminLogin";
import { AdminTable } from "./AdminTable";

export const metadata: Metadata = {
  title: "Uso interno",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const configured = isAdminConfigured();
  const jar = await cookies();
  const authed = configured && verifyAdminToken(jar.get(ADMIN_COOKIE)?.value);

  return (
    <div className="flex min-h-dvh flex-col bg-warm">
      <header className="flex items-center gap-3 border-b border-line bg-white px-5 py-3.5 md:px-7">
        <Wordmark size="xs" />
        <span className="micro-label text-[11px]">Uso interno</span>
      </header>
      {!configured ? (
        <NotConfigured />
      ) : authed ? (
        <AdminTable initialFrom={todayPR(-7)} initialTo={todayPR()} />
      ) : (
        <AdminLogin />
      )}
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="flex justify-center px-5 py-16">
      <div className="card w-full max-w-[420px] p-7">
        <h1 className="m-0 font-display text-2xl font-bold uppercase text-red">Sin configurar</h1>
        <p className="mt-2.5 text-meta text-ink-muted">
          Falta la variable de entorno <code className="font-mono text-[15px]">ADMIN_PASSWORD</code>. Hasta que exista, esta pantalla no admite a nadie.
        </p>
      </div>
    </div>
  );
}
