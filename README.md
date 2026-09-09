# Pava Responde

Aplicación web de preguntas y respuestas, en español y pensada para el teléfono, sobre el Reglamento del Partido Popular Democrático (PPD) y la Asamblea General del domingo 11 de octubre de 2026 en Ponce.

Implementa el diseño `design/Pava Responde.dc.html` siguiendo la hoja `design/Pava Responde - Especificaciones.dc.html` (tokens, componentes, flujo del micrófono, accesibilidad y copy).

## Qué hay

- `/` — la pantalla pública con sus siete estados: vacío, escuchando, cargando, respuesta, fuera de alcance, error o sin señal y límite de preguntas. En escritorio se centra en una columna de 640 px con la barra blanca y el botón sesgado del PDF.
- `/admin` — contraseña, tabla de preguntas (hora, pregunta, artículos citados, sin respuesta, ¿ayudó?), filtros por fecha y «solo sin respuesta», resumen con el total de 👍 y 👎 del rango, y «Exportar CSV» (UTF-8 con BOM). No se indexa.
- `POST /api/ask` — contesta una pregunta. Límite de 6 preguntas por minuto por dispositivo (cookie anónima). Registra pregunta, hora, artículos y si hubo respuesta. Nunca IP, nombre ni teléfono.
- `POST /api/feedback` — guarda el pulgar de «¿Te ayudó?» en la columna `pulgar` de la misma fila de la pregunta (tabla `preguntas`). Se ve en `/admin` y en el CSV.
- `GET /api/admin/questions`, `GET /api/admin/export` — datos de la tabla y CSV; requieren la cookie de /admin.
- `public/reglamento.pdf` — el Reglamento; los chips de artículo abren `reglamento.pdf#page=N` con el mapa de `src/data/articulos.json`.

## Cómo contesta

`src/lib/answer/` sigue este orden para cada pregunta:

1. **Coincidencia literal** con una de las formas de preguntar guardadas en `src/data/respuestas.json` (ignora acentos y signos). Gratis.
2. **Coincidencia aproximada**, también gratis. `src/lib/answer/texto.ts` limpia la pregunta (acentos, números en letras, sinónimos del dominio, lematización ligera y corrección de errores de tecleo contra el vocabulario del banco) y `respuestas.ts` compara los términos ponderados por lo que distinguen: «quórum» pesa mucho, «partido» casi nada. Solo acepta si la mejor respuesta pasa de 0,8, ninguna otra queda cerca y la pregunta no pide algo que el grupo no menciona («…del comité municipal»); con un solo término de contenido («¿Qué hora es?») exige una forma casi idéntica. Ante la duda, pasa al modelo.
3. **Reconocimiento con el modelo**: `claude-sonnet-5` decide si la pregunta es una de las conocidas. Cuesta una fracción de centavo.
4. **Respuesta en vivo**: solo si nada coincide, el modelo contesta con el Reglamento completo como contexto cacheado y salida estructurada (`en_alcance`, `parrafos`, `articulos`).

Sin `ANTHROPIC_API_KEY` la app no contesta: muestra el estado de error y lo dice en el registro del servidor. No hay respuestas fijas de relleno.

### Las respuestas generadas

`src/data/preguntas.json` tiene 178 grupos de preguntas (2.258 formas de preguntar) que cubren los 121 artículos: los 113 grupos originales, y 65 más añadidos el 7 de septiembre de 2026 para los 12 artículos que faltaban y para repartir las respuestas que contestaban varias cosas a la vez (quién es miembro de qué organismo, qué hace cada funcionario, cada causa de descalificación, cada medida disciplinaria). Las formas ampliadas y las tarjetas nuevas están marcadas en `notas` como pendientes de revisión. `npm run respuestas` genera la respuesta de cada grupo con Sonnet 5 y la somete a un revisor (`claude-opus-5`) que la coteja con el texto íntegro de los artículos citados. El resultado va a `src/data/respuestas.json` con `verificada: true|false` y `notas`. La app sirve las verificadas, las que alguien marque `revisada: true` a mano y las redactadas a partir del texto íntegro (`redactada`, pendientes de revisión); el resto cae al modelo en vivo.

- `npm run respuestas` genera las que falten; `-- --todas` regenera todo; `-- --solo id1,id2` unas pocas; `-- --sin-verificar` salta la revisión.
- `npm run contar-tokens` dice exactamente cuántos tokens tiene el prompt (gratis).
- `npm run revisar` pasa las comprobaciones automáticas sobre las respuestas (estilo, formas repetidas, artículos citados, números respaldados, y que cada forma de preguntar comparta algún término lematizado con su respuesta, sus artículos o la pregunta principal del grupo). Córrelo después de editar `respuestas.json`.
- `npm run medir` pasa las 373 preguntas del conjunto de prueba (`src/data/preguntas-prueba.json`, escritas aparte del banco: dictadas sin acentos, con errores, cortas, coloquiales, largas, y un grupo que NO debe coincidir con nada) por los dos pasos gratuitos y dice cuántas se contestan gratis, cuántas van al modelo y, sobre todo, si alguna recibiría una respuesta equivocada. Sale con error si hay alguna. Córrelo después de tocar `texto.ts`, `respuestas.ts` o las formas de preguntar.
- `npm run comprobar` verifica la coherencia de los datos y del buscador: que los dos archivos de datos tengan las mismas formas, que ninguna forma se repita ni empate con otro grupo, que el conjunto de prueba siga fuera del banco y que el camino completo de la app conteste lo esperado.
- `npm run explicar -- "pregunta"` enseña los términos que ve el buscador (con pesos y correcciones) y las cinco respuestas más parecidas con su puntuación. Para entender por qué una pregunta coincide o no.
- `node scripts/anadir-tarjetas.mjs tarjetas.json` añade tarjetas nuevas (`{ id, despues, preguntas, parrafos, articulos }`): cada una se inserta tras el grupo `despues`, y una forma de preguntar que ya exista en otro grupo se mueve a la tarjeta nueva. Así se reparte una respuesta que contesta varias cosas a la vez.
- `node scripts/anadir-formas.mjs formas.json` añade formas de preguntar a grupos que ya existen (`{ "id": ["¿...?", ...] }`) en los dos archivos de datos, descartando las repetidas, las que ya están en otro grupo y las que coinciden con el conjunto de prueba. Es la vía para promover a la lista las preguntas que llegan a `/admin`.
- `npm run docx` genera `docs/Pava Responde - Preguntas y respuestas.docx` con las 113 respuestas, sus formas de preguntar, los artículos enlazados al PDF y el estado de revisión de cada una, para revisarlas fuera de la app.

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
- **Métricas de visitas.** Vercel Web Analytics, sin cookies ni datos personales: visitantes, vistas de página, país y dispositivo, en vercel.com → proyecto `pavaresponde` → Analytics. `src/components/Analytics.tsx` manda las vistas y descarta las de `/admin`, que son del personal. Hay que activarlo una vez en ese mismo panel (botón Enable); sin eso el componente no manda nada.
- **Despliegue.** Vercel, proyecto `pavaresponde` conectado a este repositorio: cada push a `main` despliega. Variables de entorno en Vercel: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `ADMIN_PASSWORD`. Una variable nueva o cambiada solo entra en vigor con un despliegue nuevo: `vercel redeploy pavaresponde.vercel.app --scope plpk-projects` (o un push a `main`). `vercel env ls production` dice cuáles existen.
- **Tiempo de espera.** La especificación pide caer a «Sin conexión» a los 6 segundos. Con un modelo de lenguaje detrás, 6 s produce falsos errores en señal débil; el valor por defecto es 10 s y se ajusta con `NEXT_PUBLIC_ASK_TIMEOUT_MS`.
- **Datos de la Asamblea 2026.** `ASAMBLEA` en `src/lib/constants.ts`: fecha, lugar (Complejo Ferial de Puerto Rico, Ponce), votación de 8:00 a 11:00 a.m., asamblea abierta a todo elector activo al 30 de septiembre de 2026, y la papeleta. Fuentes: la convocatoria del Secretario General recogida por [NotiCel](https://noticel.com/noticias/20260803/ppd-celebrara-en-ponce-su-asamblea-general-para-escoger-su-junta-de-gobierno/), [Metro](https://www.metro.pr/noticias/2026/06/18/ppd-celebrara-asamblea-general-en-ponce-en-el-mes-de-octubre/), [Primera Hora](https://www.primerahora.com/noticias/gobierno-politica/notas/pablo-jose-hernandez-quiere-seguir-al-frente-del-ppd/) y [Foro Noticioso](https://foronoticioso.com/ppd-presenta-la-papeleta-para-su-junta-de-gobierno-en-la-asamblea-general-del-11-de-octubre-en-ponce/). Si la convocatoria cambia, se edita ahí y en `src/data/respuestas.json`.
- **Estilo de las respuestas.** Cortas (unas 30 palabras de media, máximo 70), la primera frase contesta, cifras en números, listas resumidas con remisión al artículo. Las 113 están en `src/data/respuestas.json`; el modelo en vivo sigue las mismas reglas en `src/lib/answer/prompt.ts`.
- **Marca de la pava.** `public/logo-pava.png` viene del logo oficial. El Artículo 3 reserva la insignia a la Junta de Gobierno: hace falta autorización escrita antes de publicar.
- **Micrófono.** `src/hooks/useDictation.ts` usa la Web Speech API del navegador (`es-PR`). Sin soporte o sin permiso, el botón enfoca el campo y muestra el aviso; nunca desaparece. A los 6 s sin voz avisa; a los 12 s cierra el panel y deja lo transcrito en el campo.
- **Divulgación legal.** La única mención a la inteligencia artificial acompaña a cada respuesta, dentro de la tarjeta, no a la pantalla inicial. El texto está en `src/lib/constants.ts` (`DISCLOSURE`) y se pinta en `src/components/cards.tsx`; el diseño original la ponía en el footer permanente, y volver a eso es un cambio de dos líneas. Confirma la ubicación con quien lleve el tema legal (Ley 105-2026).
- **Tarjeta de la Asamblea.** Bajo el subtítulo, con la fecha y el enlace a todosporelcambio.com para inscribirse. Datos en `ASAMBLEA` dentro de `src/lib/constants.ts`.
- **Volver al inicio.** Cada tarjeta final (respuesta, fuera de alcance, sin conexión, límite) termina con el botón «Regresar», que vuelve a la pantalla inicial con las preguntas frecuentes sin recargar. La primera pregunta añade una entrada al historial con la misma URL, así el botón Atrás del teléfono hace lo mismo en vez de salir de la app; «Regresar» retrocede esa entrada para no dejarla muerta. La pantalla inicial no cambia. Todo está en `src/components/PavaApp.tsx` (`reset`, `goBack`) y `BackButton` en `src/components/cards.tsx`.

## Diseño

La carpeta `design/` contiene los archivos exportados del proyecto de Claude Design: el prototipo, la hoja de especificaciones, `support.js` (runtime para abrirlos en el navegador), el logo recortado y el texto del Reglamento.
