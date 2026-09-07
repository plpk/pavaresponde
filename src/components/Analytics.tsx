"use client";

import { Analytics as VercelAnalytics } from "@vercel/analytics/next";

// Métricas de visitas con Vercel Web Analytics: sin cookies ni datos
// personales. Las visitas a /admin son del personal y no cuentan como público.
export function Analytics() {
  return (
    <VercelAnalytics
      beforeSend={(event) => (new URL(event.url, window.location.origin).pathname.startsWith("/admin") ? null : event)}
    />
  );
}
