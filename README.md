# Pava Responde

Aplicación web de preguntas y respuestas, en español y pensada para el teléfono, sobre el Reglamento del Partido Popular Democrático (PPD) y la Asamblea General del domingo 11 de octubre de 2026 en Ponce.

Implementa el diseño `design/Pava Responde.dc.html` siguiendo la hoja `design/Pava Responde - Especificaciones.dc.html` (tokens, componentes, flujo del micrófono, accesibilidad y copy).

## Qué hay

- `/` — la pantalla pública con sus siete estados: vacío, escuchando, cargando, respuesta, fuera de alcance, error o sin señal y límite de preguntas. En escritorio se centra en una columna de 640 px con la barra blanca y el botón sesgado del PDF.
- `/admin` — contraseña, tabla de preguntas (hora, pregunta, artículos citados, sin respuesta), filtros por fecha y «solo sin respuesta», y «Exportar CSV» (UTF-8 con BOM). No se indexa.
- `POST /api/ask` — contesta una pregunta. Límite de 6 preguntas por minuto por dispositivo (cookie anónima). Registra pregunta, hora, artículos y si hubo respuesta. Nunca IP, nombre ni teléfono.
- `POST /api/feedback` — guarda el pulgar de «¿Te ayudó?».
- `GET /api/admin/questions`, `GET /api/admin/export` — datos de la tabla y CSV; requieren la cookie de /admin.
- `public/reglamento.pdf` — el Reglamento; los chips de artículo abren `reglamento.pdf#page=N` con el mapa de `src/data/articulos.json`.

## Cómo contesta

`src/lib/answer/` tiene dos modos:

- **claude** (producción): manda el Reglamento completo y los datos de la Asamblea como contexto cacheado a `claude-opus-5` y pide una salida estructurada (`en_alcance`, `parrafos`, `articulos`). Se activa solo con credenciales (`ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN` o un perfil `ANTHROPIC_PROFILE`).
- **kb** (desarrollo, demos): las cinco respuestas fijas del prototipo, por palabras clave. Es el modo por defecto cuando no hay credenciales.

`PAVA_ANSWER_MODE=claude|kb` fuerza uno de los dos.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # pon ADMIN_PASSWORD y, si la tienes, ANTHROPIC_API_KEY
npm run dev
```

Otros comandos: `npm run build`, `npm run lint`, `npm run typecheck`, `npm run data` (regenera `src/data/*.json` desde `design/reglamento-text.txt`).

## Variables de entorno

| Variable | Para qué |
| --- | --- |
| `ANTHROPIC_API_KEY` | Credencial de Claude. Sin ella, modo `kb`. |
| `PAVA_ANSWER_MODE` | `claude` o `kb`. Opcional. |
| `ADMIN_PASSWORD` | Contraseña de `/admin`. Sin ella, `/admin` no admite a nadie. |
| `ADMIN_SESSION_SECRET` | Firma de la cookie de sesión. Opcional; si falta se deriva de la contraseña. |
| `PAVA_DATA_DIR` | Carpeta del registro de preguntas. Por defecto `./data`. |
| `NEXT_PUBLIC_ASK_TIMEOUT_MS` | Espera máxima de una respuesta antes del estado de error. Por defecto 10000. |

## Decisiones que conviene conocer

- **Registro de preguntas.** `src/lib/store.ts` guarda en un archivo JSON (`data/questions.json`). Vale para un servidor propio. En Vercel el disco es efímero: implementa `QuestionStore` sobre tu base de datos y cámbialo en `getStore()`.
- **Tiempo de espera.** La especificación pide caer a «Sin conexión» a los 6 segundos. Con un modelo de lenguaje detrás, 6 s produce falsos errores en señal débil; el valor por defecto es 10 s y se ajusta con `NEXT_PUBLIC_ASK_TIMEOUT_MS`.
- **Lugar de la Asamblea.** `src/lib/constants.ts` dice «Complejo Ferial de Puerto Rico, en Ponce», tomado del prototipo. Confírmalo con la Secretaría General antes de publicar.
- **Marca de la pava.** `public/logo-pava.png` viene del logo oficial. El Artículo 3 reserva la insignia a la Junta de Gobierno: hace falta autorización escrita antes de publicar.
- **Micrófono.** `src/hooks/useDictation.ts` usa la Web Speech API del navegador (`es-PR`). Sin soporte o sin permiso, el botón enfoca el campo y muestra el aviso; nunca desaparece. A los 6 s sin voz avisa; a los 12 s cierra el panel y deja lo transcrito en el campo.
- **Divulgación legal.** La única mención a la inteligencia artificial está en el footer, como exige la Ley 105-2026.

## Diseño

La carpeta `design/` contiene los archivos exportados del proyecto de Claude Design: el prototipo, la hoja de especificaciones, `support.js` (runtime para abrirlos en el navegador), el logo recortado y el texto del Reglamento.
