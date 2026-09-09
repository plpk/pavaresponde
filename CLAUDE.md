# Pava Responde: notas para agentes

- **Métricas de visitas y preguntas: `npm run metricas`.** Es la única vía; no hace falta investigar nada más. Imprime visitantes y vistas (Vercel Web Analytics, activo desde el 2026-09-07) y el resumen de la tabla `preguntas` de Supabase. Opciones: `-- --dias 7`, `-- --desde AAAA-MM-DD --hasta AAAA-MM-DD`, `-- --json`. Usa la API REST de Vercel con el token de `vercel login` y `DATABASE_URL` de `.env.local`.
- **No uses la herramienta MCP de Vercel `get_web_analytics` en este proyecto.** Responde 404 «Web Analytics not found» aunque Analytics está activo. No la depures ni busques alternativas: corre el comando.
- Las reglas de Next.js para agentes están en `AGENTS.md`.
