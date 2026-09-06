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

`src/lib/answer/` sigue este orden para cada pregunta:

1. **Coincidencia literal** con una de las respuestas ya generadas en `src/data/respuestas.json` (ignora acentos y signos). Gratis.
2. **Reconocimiento con el modelo**: `claude-sonnet-5` decide si la pregunta es una de las conocidas. Cuesta una fracción de centavo.
3. **Respuesta en vivo**: solo si nada coincide, el modelo contesta con el Reglamento completo como contexto cacheado y salida estructurada (`en_alcance`, `parrafos`, `articulos`).

Sin `ANTHROPIC_API_KEY` la app no contesta: muestra el estado de error y lo dice en el registro del servidor. No hay respuestas fijas de relleno.

### Las respuestas generadas

`src/data/preguntas.json` tiene 113 grupos de preguntas (310 formas de preguntar) escritos a partir de los 121 artículos. `npm run respuestas` genera la respuesta de cada grupo con Sonnet 5 y la somete a un revisor (`claude-opus-5`) que la coteja con el texto íntegro de los artículos citados. El resultado va a `src/data/respuestas.json` con `verificada: true|false` y `notas`. La app solo sirve las verificadas o las que alguien marque `revisada: true` a mano; el resto cae al modelo en vivo.

- `npm run respuestas` genera las que falten; `-- --todas` regenera todo; `-- --solo id1,id2` unas pocas; `-- --sin-verificar` salta la revisión.
- `npm run contar-tokens` dice exactamente cuántos tokens tiene el prompt (gratis).

Las preguntas que llegan a `/admin` con «sin respuesta» o generadas en vivo son las candidatas a entrar en `preguntas.json`.

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
| `ANTHROPIC_API_KEY` | Credencial de Claude. Sin ella la app no contesta. |
| `DATABASE_URL` | Postgres de Supabase (pooler en modo transacción, puerto 6543). Sin ella, archivo local. |
| `ADMIN_PASSWORD` | Contraseña de `/admin`. Sin ella, `/admin` no admite a nadie. |
| `ADMIN_SESSION_SECRET` | Firma de la cookie de sesión. Opcional; si falta se deriva de la contraseña. |
| `PAVA_DATA_DIR` | Carpeta del registro de preguntas. Por defecto `./data`. |
| `NEXT_PUBLIC_ASK_TIMEOUT_MS` | Espera máxima de una respuesta antes del estado de error. Por defecto 10000. |

## Decisiones que conviene conocer

- **Registro de preguntas.** `src/lib/store.ts` guarda en Postgres (Supabase, proyecto `pavaresponde`, tabla `preguntas`) cuando hay `DATABASE_URL`; en desarrollo sin ella, en `data/questions.json`. La tabla guarda también el uso del modelo y el costo estimado de cada pregunta, que `/admin` suma.
- **Modelo.** `claude-sonnet-5` para contestar y reconocer preguntas; `claude-opus-5` solo como revisor en el script de generación. Precios en `src/lib/pricing.ts`.
- **Despliegue.** Vercel, proyecto `pavaresponde` conectado a este repositorio: cada push a `main` despliega. Variables de entorno en Vercel: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `ADMIN_PASSWORD`.
- **Tiempo de espera.** La especificación pide caer a «Sin conexión» a los 6 segundos. Con un modelo de lenguaje detrás, 6 s produce falsos errores en señal débil; el valor por defecto es 10 s y se ajusta con `NEXT_PUBLIC_ASK_TIMEOUT_MS`.
- **Datos de la Asamblea 2026.** `ASAMBLEA` en `src/lib/constants.ts`: fecha, lugar (Complejo Ferial de Puerto Rico, Ponce), votación de 8:00 a 11:00 a.m., asamblea abierta a todo elector activo al 30 de septiembre de 2026, y la papeleta. Fuentes: la convocatoria del Secretario General recogida por [NotiCel](https://noticel.com/noticias/20260803/ppd-celebrara-en-ponce-su-asamblea-general-para-escoger-su-junta-de-gobierno/), [Metro](https://www.metro.pr/noticias/2026/06/18/ppd-celebrara-asamblea-general-en-ponce-en-el-mes-de-octubre/), [Primera Hora](https://www.primerahora.com/noticias/gobierno-politica/notas/pablo-jose-hernandez-quiere-seguir-al-frente-del-ppd/) y [Foro Noticioso](https://foronoticioso.com/ppd-presenta-la-papeleta-para-su-junta-de-gobierno-en-la-asamblea-general-del-11-de-octubre-en-ponce/). Si la convocatoria cambia, se edita ahí y en `src/data/respuestas.json`.
- **Estilo de las respuestas.** Cortas (unas 30 palabras de media, máximo 70), la primera frase contesta, cifras en números, listas resumidas con remisión al artículo. Las 113 están en `src/data/respuestas.json`; el modelo en vivo sigue las mismas reglas en `src/lib/answer/prompt.ts`.
- **Marca de la pava.** `public/logo-pava.png` viene del logo oficial. El Artículo 3 reserva la insignia a la Junta de Gobierno: hace falta autorización escrita antes de publicar.
- **Micrófono.** `src/hooks/useDictation.ts` usa la Web Speech API del navegador (`es-PR`). Sin soporte o sin permiso, el botón enfoca el campo y muestra el aviso; nunca desaparece. A los 6 s sin voz avisa; a los 12 s cierra el panel y deja lo transcrito en el campo.
- **Divulgación legal.** La única mención a la inteligencia artificial acompaña a cada respuesta, dentro de la tarjeta, no a la pantalla inicial. El texto está en `src/lib/constants.ts` (`DISCLOSURE`) y se pinta en `src/components/cards.tsx`; el diseño original la ponía en el footer permanente, y volver a eso es un cambio de dos líneas. Confirma la ubicación con quien lleve el tema legal (Ley 105-2026).
- **Tarjeta de la Asamblea.** Bajo el subtítulo, con la fecha y el enlace a todosporelcambio.com para inscribirse. Datos en `ASAMBLEA` dentro de `src/lib/constants.ts`.

## Diseño

La carpeta `design/` contiene los archivos exportados del proyecto de Claude Design: el prototipo, la hoja de especificaciones, `support.js` (runtime para abrirlos en el navegador), el logo recortado y el texto del Reglamento.
