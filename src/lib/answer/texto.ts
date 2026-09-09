// Normalización de texto para el buscador gratuito (sin modelo): acentos,
// números en letras, sinónimos del dominio, lematización ligera y corrección
// de errores de tecleo o dictado contra el vocabulario del banco.
//
// La misma función se aplica a las formas guardadas y a la pregunta nueva,
// así que lo que importa es la CONSISTENCIA, no la corrección lingüística:
// «asamblea» y «asambleas» tienen que dar el mismo término, y «votar»,
// «votación» y «votan» también. Un lematizador general (Snowball) no lo
// garantiza para este vocabulario; este sí, porque las palabras clave del
// Reglamento están en un mapa explícito y el resto pasa por reglas fijas.

/** Minúsculas, sin acentos (ñ → n), solo letras y números, y «ex senador» → «exsenador». */
export function limpiar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\bex[\s-]+(?=[a-z])/g, "ex")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Números en letras que aparecen en preguntas sobre el Reglamento.
const NUMEROS_MULTIPALABRA: [RegExp, string][] = [
  [/\bpor que\b/g, "porque"],
  [/\bque dia\b/g, "cuando"],
  [/\ben que fecha\b/g, "cuando"],
  [/\bcon que frecuencia\b/g, "cada cuanto"],
  [/\btreinta y cinco\b/g, "35"],
  [/\bveinte y uno\b/g, "21"],
  [/\btres cuartas partes\b/g, "3 4"],
  [/\bdos terceras partes\b/g, "2 3"],
  [/\bdos tercios\b/g, "2 3"],
];
const NUMEROS: Record<string, string> = {
  uno: "1", una: "1", dos: "2", tres: "3", cuatro: "4", cinco: "5", seis: "6", siete: "7", ocho: "8", nueve: "9",
  diez: "10", once: "11", doce: "12", catorce: "14", quince: "15", dieciocho: "18", veinte: "20", veintiuno: "21", veintiun: "21",
  treinta: "30", cuarenta: "40", cincuenta: "50", sesenta: "60", setenta: "70", cien: "100", cuatrocientos: "400", mil: "1000",
};

// Palabras que no distinguen una pregunta de otra: artículos, preposiciones,
// verbos auxiliares y la charla de una pregunta dictada («mire, yo quería
// saber si…»). Se conservan los interrogativos porque sí cambian el sentido.
export const VACIAS = new Set(
  (
    "de del la el los las un unos unas y o u e en a al se es son era eran sera seran fue fueron por para con sin su sus mi mis tu tus eres " +
    "nuestro nuestra nuestros nuestras lo le les me te nos si ya hay habra habia haber ser estar esta estan estoy estamos estaba estaban " +
    "este esto ese esa eso estas estos esas esos aquel aquella aquello sobre segun mas menos tambien ademas aparte igual asi bien mal " +
    "puede pueden puedo podria podrian podemos pudiera pudieran posible permitido permitida permite permiten permitir tiene tienen tengo tener " +
    "tenemos tenia tenian hacer hago hizo hicieron va van voy vamos ir iba iban debe deben debo debemos deberia deberian obligatorio " +
    "obligatoria obligado obligada yo usted ustedes ella ellos ellas nada solo solamente todo toda todos todas algo alguien alguna alguno " +
    "algunos algunas otro otra otros otras mismo misma mismos mismas hola buenas buenos saludos mire mira oiga oye favor gracias quiero " +
    "quisiera queria necesito necesitaba deseo gustaria saber conocer informacion informar explicar explicame expliqueme dime digame diga " +
    "decir pregunta preguntita ahi aqui alla entonces pues bueno ok sea osea ver veo dale ahora senor senora don dona companero companera " +
    "muy mucho mucha muchos muchas poco poca pocos pocas tan tanto tanta tantos tantas cosa cosas acerca respecto referente relacionado " +
    "entre ante contra tras durante mediante hacia dentro toma toman tomar tomo lleva llevar llevan llevo tiempo vez veces parte " +
    "significa significan significado quiere dejar deja dejas dejan dejo existe existen existir"
  ).split(" "),
);

// Interrogativos: cuentan para el sentido, pero no como «contenido». Una
// pregunta con un solo término de contenido («¿Qué hora es?») es demasiado
// corta para arriesgar una respuesta aproximada.
export const INTERROGATIVOS = new Set(["que", "quien", "como", "cuando", "donde", "cuanto", "porque", "hasta", "desde"]);

// Clases de interrogativo: dentro de una clase preguntan lo mismo a efectos
// de esta app («¿quién elige?» ≈ «¿cómo se elige?»); entre clases, no
// («¿quién nombra?» ≠ «¿cuándo se elige?»).
const CLASE_INTERROGATIVA: Record<string, string> = {
  que: "que", quien: "quien", como: "quien", cuando: "cuando", hasta: "cuando", desde: "cuando", donde: "donde", cuanto: "cuanto", porque: "porque",
};
export function clasesInterrogativas(ts: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const t of ts) if (CLASE_INTERROGATIVA[t]) out.add(CLASE_INTERROGATIVA[t]);
  return out;
}

// Sinónimos y formas del dominio → término final. El valor NO vuelve a pasar
// por el lematizador, así que puede ser la palabra entera. Las claves van sin
// acentos y con ñ → n (como las deja `limpiar`).
const LEMAS: Record<string, string[]> = {
  // organismos
  asamblea: ["asamblea", "asambleas", "convencion", "convenciones"],
  junta: ["junta", "juntas"],
  gobierno: ["gobierno"],
  consejo: ["consejo", "consejos"],
  comite: ["comite", "comites"],
  partido: ["partido", "partidos", "ppd", "popular", "populares", "pepede"],
  reglamento: ["reglamento", "reglamentos", "estatuto", "estatutos"],
  regla: ["regla", "reglas", "norma", "normas"],
  municipio: ["municipio", "municipios", "municipal", "municipales", "pueblo", "pueblos"],
  organizacion: ["organizacion", "organizaciones", "asociacion", "asociaciones", "agrupacion", "agrupaciones"],
  sector: ["sector", "sectores", "sectorial", "sectoriales"],
  juventud: ["juventud", "juventudes", "jpn"],
  joven: ["joven", "jovenes"],
  mujer: ["mujer", "mujeres", "femenina", "femeninas", "feminas", "damas"],
  servidor: ["servidor", "servidores", "aspp", "empleado", "empleados", "empleada", "empleadas"],
  tribunal: ["tribunal", "tribunales", "corte", "cortes", "juez", "jueza", "jueces", "judicial", "judiciales"],
  ley: ["ley", "leyes", "codigo", "codigos"],
  // cargos
  presidente: ["presidente", "presidenta", "presidentes", "presidentas", "presidencia", "presidencias"],
  vicepresidente: ["vicepresidente", "vicepresidenta", "vicepresidentes", "vicepresidentas", "vicepresidencia", "vicepresidencias", "vice"],
  secretario: ["secretario", "secretaria", "secretarios", "secretarias"],
  subsecretario: ["subsecretario", "subsecretaria", "subsecretarios"],
  tesorero: ["tesorero", "tesorera", "tesoreros", "tesoreria"],
  comisionado: ["comisionado", "comisionada", "comisionados", "comisionadas"],
  delegado: ["delegado", "delegada", "delegados", "delegadas"],
  alcalde: ["alcalde", "alcaldesa", "alcaldes", "alcaldesas"],
  gobernador: ["gobernador", "gobernadora", "gobernadores", "gobernacion"],
  legislador: ["legislador", "legisladora", "legisladores", "legisladoras"],
  representante: ["representante", "representantes"],
  senador: ["senador", "senadora", "senadores", "senadoras"],
  funcionario: ["funcionario", "funcionaria", "funcionarios", "funcionarias", "dirigente", "dirigentes", "lider", "lideres"],
  candidato: [
    "candidato", "candidata", "candidatos", "candidatas", "candidatura", "candidaturas", "aspirante", "aspirantes", "aspirar", "aspiro", "aspira",
    "aspiran", "aspire", "postular", "postularse", "postularme", "postulo", "postula", "postulan", "correr", "corro", "corra", "corran",
  ],
  miembro: [
    "miembro", "miembros", "integrante", "integrantes", "integran", "integra", "componen", "compone", "componer", "conforman", "conforma", "forman",
  ],
  persona: ["persona", "personas", "gente"],
  elector: ["elector", "electora", "electores", "electoras", "votante", "votantes"],
  afiliar: ["afiliado", "afiliada", "afiliados", "afiliadas", "afiliar", "afiliarme", "afiliarse", "afilio", "afilia", "afiliacion", "militante", "militantes"],
  cargo: ["cargo", "cargos", "puesto", "puestos", "posicion", "posiciones"],
  funcion: [
    "funcion", "funciones", "deber", "deberes", "obligacion", "obligaciones", "responsabilidad", "responsabilidades", "tarea", "tareas",
    "facultad", "facultades", "poder", "poderes", "atribucion", "atribuciones", "rol", "roles", "papel", "hace", "hacen", "sirve", "sirven", "servir",
  ],
  // acciones
  votar: ["votar", "vota", "votan", "voto", "votos", "votacion", "votaciones", "votamos", "vote", "votando", "votado", "votada"],
  elegir: [
    "elegir", "elige", "eligen", "elijo", "elija", "elijan", "elegido", "elegidos", "elegida", "electo", "electos", "electa", "eleccion", "elecciones",
    "escoger", "escoge", "escogen", "escojo", "escoja", "escogido", "escogidos", "escogida", "escogemos", "seleccionar", "selecciona", "seleccionan",
  ],
  nombrar: ["nombrar", "nombra", "nombran", "nombro", "nombramiento", "nombramientos", "designar", "designa", "designan", "designado", "designada"],
  interes: ["interes", "intereses"],
  convocar: ["convocar", "convoca", "convocan", "convoco", "convocatoria", "convocado", "convocada"],
  citar: ["citar", "cita", "citan", "citacion", "citado", "citados"],
  reunion: ["reunion", "reuniones", "reunir", "reune", "reunen", "reunirse", "reunimos", "reunirnos", "sesion", "sesiones"],
  avisar: [
    "avisar", "aviso", "avisan", "avisen", "avisa", "notificar", "notifican", "notifica", "notificacion", "notifiquen", "anunciar", "anuncian", "anuncia",
    "anticipacion", "antelacion", "anticipado", "anticipada",
  ],
  sancion: [
    "sancion", "sanciones", "sancionar", "sancionan", "sancionado", "sancione", "sancionen", "castigo", "castigos", "castigar", "castigan", "castiguen",
    "penalidad", "penalidades", "disciplinar", "disciplinaria", "disciplinarias", "disciplinario", "disciplinarios", "disciplina",
  ],
  querella: ["querella", "querellas", "querellar", "querellarse", "queja", "quejas", "denuncia", "denuncias", "demanda", "demandas"],
  apelar: ["apelar", "apelo", "apela", "apelan", "apele", "apelacion", "apelaciones"],
  revocar: ["revocar", "revoca", "revocan", "revoque", "revocacion"],
  enmendar: ["enmendar", "enmienda", "enmiendas", "enmiende", "modificar", "modifica", "modifican", "modificacion"],
  cambiar: ["cambiar", "cambia", "cambian", "cambio", "cambios", "cambie"],
  sustituir: ["sustituir", "sustituye", "sustituyen", "sustituto", "sustituta", "reemplazar", "reemplaza", "reemplazo", "suple", "suplir", "suplente"],
  renunciar: ["renunciar", "renuncia", "renuncie", "renuncio"],
  faltar: ["faltar", "falta", "falto", "falte", "faltan", "faltas", "ausencia", "ausencias", "ausente", "ausentarse", "inasistencia"],
  durar: ["dura", "duran", "durar", "duracion", "dure"],
  pagar: ["pagar", "pago", "pagos", "pagan", "pague", "pagando", "pagado"],
  fondos: ["fondos", "dinero", "plata", "chavos", "finanzas", "financiero", "financieros"],
  documento: ["documento", "documentos", "papeles", "papeleria"],
  certificar: ["certificar", "certifico", "certifica", "certifican", "certificacion", "certificado", "certificaron", "certificada"],
  firmar: ["firmar", "firmo", "firma", "firmaron", "firmas", "firmado"],
  aprobar: ["aprobar", "aprueba", "aprueban", "aprobo", "aprobacion", "aprobado", "aprobada"],
  vigente: ["vigente", "vigentes", "vigencia", "vigor", "rige", "rigen", "regir", "aplicar", "aplica", "aplican", "aplique"],
  derogar: ["derogar", "deroga", "derogan", "derogado"],
  anterior: ["anterior", "anteriores", "viejo", "vieja", "viejos", "viejas", "antiguo", "antigua", "antiguos", "antiguas"],
  nuevo: ["nuevo", "nueva", "nuevos", "nuevas"],
  publicar: ["publicar", "publica", "publican", "publico?", "publicacion"],
  suspender: ["suspender", "suspenden", "suspende", "suspendido", "suspendida", "suspendan", "suspension", "suspensiones"],
  expulsar: ["expulsar", "expulsan", "expulsado", "expulsion"],
  sumaria: ["sumaria", "sumario", "sumariamente"],
  expedito: ["expedito", "expedita"],
  reconsiderar: ["reconsiderar", "reconsideracion"],
  revisar: ["revisar", "revisa", "revision"],
  reconocer: ["reconocer", "reconoce", "reconocen", "reconocimiento", "reconocida", "reconocidas", "reconocido", "reconocidos"],
  rechazar: ["rechazar", "rechaza", "rechazan", "rechazo"],
  quitar: ["quitar", "quita", "quitan", "quitarle", "quiten", "retirar", "retira", "retiro", "retiran"],
  crear: ["crear", "crea", "crean", "creacion", "formar", "formo", "formamos", "fundar", "constituir", "constituye"],
  proponer: ["proponer", "propongo", "propone", "proponen", "someter", "someto", "somete", "sugerir", "sugiero", "plantear", "planteo", "traer", "traigo"],
  asunto: ["asunto", "asuntos", "tema", "temas", "propuesta", "propuestas"],
  radicar: ["radicar", "radico", "radica", "radican", "radicacion", "presentar", "presento", "presenta", "presentan", "someterla", "inscribir?"],
  entregar: ["entregar", "entrego", "entrega", "entregan", "entregue", "devolver", "devuelve"],
  debatir: ["debatir", "debate", "debaten", "debato", "discutir", "discuta", "discute", "discuten", "contrastar", "contrasto", "comparar", "comparo"],
  criticar: ["criticar", "critica", "critico", "critican", "criticas"],
  apoyar: ["apoyar", "apoyo", "apoya", "apoyan", "apoye", "respaldar", "respaldo", "respalda", "respaldan", "endosar", "endoso", "endosa", "endosan"],
  perder: ["perder", "pierdo", "pierde", "pierden", "perdi", "perdio", "perdemos", "perdida", "perdieron"],
  ganar: ["ganar", "gano", "gana", "ganan", "gane"],
  cubrir: ["cubrir", "cubre", "cubren", "llenar", "llena", "llenan", "ocupar", "ocupa", "ocupan"],
  vacante: ["vacante", "vacantes"],
  decidir: ["decidir", "decide", "deciden", "decida", "decidio", "determinar", "determina", "determinan", "decision", "decisiones", "determinacion", "acuerdo", "acuerdos"],
  resolver: ["resolver", "resuelve", "resuelven", "resolucion", "resoluciones", "resolverse", "atender", "atiende", "atienden"],
  interpretar: ["interpretar", "interpreta", "interpretan", "interpretacion"],
  controversia: ["controversia", "controversias", "disputa", "disputas", "conflicto", "conflictos"],
  duda: ["duda", "dudas", "entiendo", "entender", "entienden", "entiende"],
  preguntar: ["preguntar", "pregunto", "preguntas", "consultar", "consulto", "consulta"],
  tardar: ["tarda", "tardan", "tardar", "demora", "demoran", "demorar"],
  contestar: ["contestar", "contesto", "contesta", "contestan", "responder", "respondo", "responde", "responden", "respuesta"],
  requisito: ["requisito", "requisitos", "criterio", "criterios"],
  delito: ["delito", "delitos", "convicto", "convicta", "convictos", "conviccion", "convicciones"],
  primaria: ["primaria", "primarias"],
  virtual: ["virtual", "virtuales", "virtualmente", "videoconferencia", "videollamada", "zoom", "remoto", "remota", "distancia", "telematica"],
  electronico: ["electronico", "electronica", "electronicamente", "electronicos", "internet", "web", "online", "linea", "digital", "computadora", "app", "aplicacion"],
  telefono: ["telefono", "telefonica", "celular", "movil"],
  insignia: ["insignia", "logo", "logotipo", "emblema", "simbolo", "escudo", "pava"],
  proposito: ["proposito", "propositos", "fin", "fines", "objetivo", "objetivos", "mision"],
  tipo: ["tipo", "clase"],
  autoridad: ["autoridad", "autoridades"],
  maximo: ["maximo", "maxima", "mayor", "limite", "tope"],
  quorum: ["quorum", "cuorum", "corum", "quorun", "cuorun"],
  mayoria: ["mayoria", "mayorias"],
  acta: ["acta", "actas", "minuta", "minutas"],
  asistencia: ["asistencia", "asistir", "asisten", "asista", "asistente", "asistentes"],
  plazo: ["plazo", "plazos"],
  dia: ["dia", "dias"],
  cuando: ["cuando", "fecha", "fechas", "hora", "horario"],
  donde: ["donde", "adonde", "lugar", "sitio"],
  que: ["que", "cual", "cuales"],
  quien: ["quien", "quienes"],
  como: ["como"],
  porque: ["porque"],
  hasta: ["hasta"],
  desde: ["desde"],
  cuanto: ["cuanto", "cuanta", "cuantos", "cuantas", "monto", "montos", "cantidad", "importe"],
  extraordinaria: ["extraordinaria", "extraordinario", "extraordinarias"],
  papeleta: ["papeleta", "papeletas", "boleta", "boletas"],
  calificar: ["calificar", "calificadora", "calificacion"],
  precinto: ["precinto", "precintos"],
  unidad: ["unidad", "unidades"],
  edad: ["edad", "edades"],
  ano: ["ano", "anos"],
};

const LEMA = new Map<string, string>();
for (const [lema, formas] of Object.entries(LEMAS)) {
  for (const f of formas) {
    if (f.endsWith("?")) continue; // recordatorios de formas ambiguas que NO se mapean
    const clave = limpiar(f);
    if (LEMA.has(clave) && LEMA.get(clave) !== lema) throw new Error(`«${clave}» está en dos lemas: ${LEMA.get(clave)} y ${lema}`);
    LEMA.set(clave, lema);
  }
  LEMA.set(lema, lema);
}

// Sufijos para las palabras que no están en el mapa. Se quita el primero que
// deje al menos tres letras; luego, si sobra una vocal final, también.
const SUFIJOS = [
  "aciones", "iciones", "amientos", "imientos", "amiento", "imiento", "ciones", "idades", "acion", "icion", "mente", "iendo", "ando", "ados", "adas",
  "idos", "idas", "ieron", "aron", "aban", "abas", "amos", "emos", "imos", "aran", "eran", "iran", "cion", "idad", "aba", "ian", "ias", "ara",
  "era", "ira", "ado", "ada", "ido", "ida", "ar", "er", "ir", "an", "en", "ia", "es", "os", "as", "a", "e", "o", "s",
];

function singular(w: string): string {
  if (w.length > 4 && w.endsWith("ces")) return w.slice(0, -3) + "z";
  if (w.length > 5 && w.endsWith("es") && /[nrldzsjx]es$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && /[aeiou]s$/.test(w)) return w.slice(0, -1);
  return w;
}

/** Raíz de una palabra que no está en el mapa. Determinista y consistente entre formas. */
export function raiz(w: string): string {
  if (/^\d+$/.test(w)) return w;
  const s = singular(w);
  const l = LEMA.get(s);
  if (l) return l;
  let r = s;
  for (const suf of SUFIJOS) {
    if (r.endsWith(suf) && r.length - suf.length >= 3) {
      r = r.slice(0, -suf.length);
      break;
    }
  }
  if (r.length >= 5 && /[aeiou]$/.test(r)) r = r.slice(0, -1);
  return r;
}

/** Término final de una palabra ya limpia: número, lema del dominio o raíz. */
export function termino(w: string): string {
  if (NUMEROS[w]) return NUMEROS[w];
  return LEMA.get(w) ?? raiz(w);
}

/** Palabras limpias de una frase, sin las vacías y con números en cifras. */
export function palabras(s: string): string[] {
  let t = limpiar(s);
  for (const [re, rep] of NUMEROS_MULTIPALABRA) t = t.replace(re, rep);
  return t
    .split(" ")
    .filter((w) => w && !VACIAS.has(w))
    .map((w) => NUMEROS[w] ?? w);
}

// --- Corrección de errores contra un vocabulario ------------------------------

/** Distancia de Damerau-Levenshtein (sustitución, inserción, borrado y transposición). */
export function distancia(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 2) return 3;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array<number>(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + costo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[m][n];
}

/**
 * Corrector de palabras contra el vocabulario del banco. Solo corrige palabras
 * de 6 letras o más a distancia 1 (o de 9 o más a distancia 2), y solo si hay
 * una única candidata: «asanblea» → «asamblea», «presidnete» → «presidente».
 * Una palabra corta o desconocida sin candidata clara se deja como está, para
 * no convertir «Ponce» en otra cosa.
 */
export class Vocabulario {
  private readonly palabras: Set<string>;
  private readonly porLongitud = new Map<number, string[]>();

  constructor(frases: Iterable<string>) {
    this.palabras = new Set<string>();
    for (const f of frases) for (const w of palabras(f)) if (!/^\d+$/.test(w)) this.palabras.add(w);
    for (const w of LEMA.keys()) if (!NUMEROS[w]) this.palabras.add(w);
    for (const w of this.palabras) {
      const lista = this.porLongitud.get(w.length) ?? [];
      lista.push(w);
      this.porLongitud.set(w.length, lista);
    }
  }

  conoce(w: string): boolean {
    return this.palabras.has(w);
  }

  corregir(w: string): string {
    if (w.length < 6 || /^\d+$/.test(w) || this.palabras.has(w)) return w;
    const maxDist = w.length >= 9 ? 2 : 1;
    let mejor: string | null = null;
    let mejorDist = maxDist + 1;
    let empate = false;
    for (let len = w.length - maxDist; len <= w.length + maxDist; len++) {
      for (const c of this.porLongitud.get(len) ?? []) {
        const d = distancia(w, c);
        if (d < mejorDist) {
          mejor = c;
          mejorDist = d;
          empate = false;
        } else if (d === mejorDist && c !== mejor) {
          empate = true;
        }
      }
    }
    return mejor && !empate ? mejor : w;
  }
}

/** Términos finales de una frase: limpieza, vacías fuera, corrección opcional, lema o raíz. */
export function terminos(s: string, vocabulario?: Vocabulario): Set<string> {
  const out = new Set<string>();
  for (const w of palabras(s)) {
    const c = vocabulario ? vocabulario.corregir(w) : w;
    if (VACIAS.has(c)) continue;
    out.add(termino(c));
  }
  return out;
}
