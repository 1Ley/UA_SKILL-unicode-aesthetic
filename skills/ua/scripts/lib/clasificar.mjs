/**
 * clasificar.mjs — deduce a qué esqueleto responde una composición ya escrita.
 *
 * Lo usan dos sitios: el generador de la biblioteca (para decompilar el corpus
 * semilla) y `ua aprender` (para clasificar lo que se pega). Que sea el mismo código
 * importa: si la ingesta clasificara distinto que el build, el corpus se volvería
 * incoherente consigo mismo con cada composición nueva.
 *
 * Cuando nada encaja devuelve `esq.libre`, que se guarda pero nunca se le ofrece al
 * ensamblador. Es preferible admitir "esto no lo sé clasificar" a forzar una
 * composición humana dentro de una plantilla que no le corresponde.
 */

import { analizarLinea } from './inspeccionar.mjs';

const rolDe = (t) => (t.tipo === 'unidad' ? t.unidad.rol : (t.tipo === 'texto' && t.texto === ' ' ? 'esp' : 'txt'));

/**
 * Clasifica UNA línea. Devuelve el id de esqueleto y por qué, para que un humano
 * pueda discrepar con criterio en vez de tener que fiarse.
 */
export function clasificarLinea(linea) {
  const a = analizarLinea(linea);
  const toks = a.tokens;
  const sig = toks.filter((t) => rolDe(t) !== 'esp');
  const roles = sig.map(rolDe);
  const tieneTexto = toks.some((t) => t.tipo === 'letra' || (t.tipo === 'texto' && t.texto !== ' ' && /\S/.test(t.texto)));
  const nEsp = toks.length - sig.length;
  const ratioEsp = toks.length ? nEsp / toks.length : 0;

  if (!sig.length) return { esqueleto: 'esq.libre', motivo: 'la línea no tiene contenido significativo', analisis: a };

  // Marco: empieza con una esquina o una vertical de caja.
  const primerTrazo = sig[0];
  if (rolDe(primerTrazo) === 'trz' || (sig.length > 1 && rolDe(sig[0]) === 'txt' && rolDe(sig[1]) === 'trz')) {
    const esEsquina = sig.some((t) => t.tipo === 'unidad' && /esq|corner|down-right|up-right|arc/.test(t.unidad.id));
    if (esEsquina || (rolDe(primerTrazo) === 'trz' && tieneTexto)) {
      return { esqueleto: 'esq.marco', motivo: 'la línea abre con trazo de caja y cuelga contenido', analisis: a };
    }
  }

  // Espejo: palíndromo exacto por ID, sin texto.
  if (!tieneTexto && a.simetria.simetrica && sig.length >= 3) {
    return { esqueleto: 'esq.espejo', motivo: `palíndromo exacto de ${a.simetria.total} tokens`, analisis: a };
  }

  // Barra: solo trazo y filete, repetidos.
  const soloRegla = roles.every((r) => ['trz', 'fil', 'par', 'anc', 'cor'].includes(r));
  const proporcionTrazo = roles.filter((r) => r === 'trz' || r === 'fil').length / roles.length;
  if (!tieneTexto && soloRegla && proporcionTrazo >= 0.5) {
    return { esqueleto: 'esq.barra', motivo: `${Math.round(proporcionTrazo * 100)}% trazo o filete, sin texto`, analisis: a };
  }

  // Dispersión: mucho aire, pocos motivos, ritmo irregular.
  if (ratioEsp >= 0.45 && sig.length >= 2 && sig.length <= 8) {
    return {
      esqueleto: 'esq.dispersion',
      motivo: `${Math.round(ratioEsp * 100)}% espaciadores con ${sig.length} motivos; tiradas ${a.ritmo.tiradas.join(',')}`,
      analisis: a,
    };
  }

  // Chip: hay texto y algo que lo abre y lo cierra.
  if (tieneTexto && sig.length >= 3) {
    return { esqueleto: 'esq.chip', motivo: 'hueco de texto con aderezos a ambos lados', analisis: a };
  }

  // Espejo imperfecto: se admite hasta el 50 % porque los humanos rara vez hacen
  // palíndromos exactos, pero por debajo de ahí ya no es un espejo — llamarlo así
  // hacía que el validador avisara luego de una asimetría que él mismo había
  // inventado al clasificar.
  const ratio = a.simetria.total ? a.simetria.pares / a.simetria.total : 0;
  if (!tieneTexto && sig.length >= 2 && ratio >= 0.5) {
    return { esqueleto: 'esq.espejo', motivo: `sin texto, ${a.simetria.pares}/${a.simetria.total} pares simétricos (espejo imperfecto)`, analisis: a };
  }
  if (!tieneTexto && sig.length >= 2) {
    return { esqueleto: 'esq.barra', motivo: `sin texto y sin simetría (${a.simetria.pares}/${a.simetria.total}): es una regla, no un espejo`, analisis: a };
  }

  return { esqueleto: 'esq.libre', motivo: 'no encaja en ningún esqueleto conocido', analisis: a };
}

/** Clasifica una composición completa. Varias líneas coherentes forman una pila. */
export function clasificar(texto) {
  const lineas = texto.split('\n').filter((l) => l.length);
  const porLinea = lineas.map((l, i) => ({ n: i + 1, ...clasificarLinea(l) }));

  let esqueleto = porLinea[0]?.esqueleto || 'esq.libre';
  let motivo = porLinea[0]?.motivo || '';
  if (lineas.length > 1) {
    const marcos = porLinea.filter((p) => p.esqueleto === 'esq.marco').length;
    if (marcos >= Math.ceil(lineas.length / 2)) {
      esqueleto = 'esq.marco';
      motivo = `${marcos} de ${lineas.length} líneas cuelgan de un trazo de caja`;
    } else {
      esqueleto = 'esq.pila';
      motivo = `${lineas.length} líneas de esqueletos compatibles: ${[...new Set(porLinea.map((p) => p.esqueleto))].join(', ')}`;
    }
  }
  return { esqueleto, motivo, lineas: porLinea };
}

/** Secuencia de tokens con las tiradas de espaciador colapsadas a `id:N`. */
export function aTokens(analisis) {
  const out = [];
  let esp = null; let n = 0;
  const volcar = () => { if (esp) out.push(n > 1 ? `${esp}:${n}` : esp); esp = null; n = 0; };
  for (const t of analisis.tokens) {
    const id = t.tipo === 'unidad' ? t.unidad.id
      : t.tipo === 'letra' ? `${t.alfabeto}«${t.letra}»`
        : t.tipo === 'texto' ? (t.texto === ' ' ? '__ESP__' : `txt«${t.texto}»`)
          : `??U+${t.cps.map((c) => c.toString(16).toUpperCase()).join('+')}`;
    const esEsp = (t.tipo === 'unidad' && t.unidad.rol === 'esp') || id === '__ESP__';
    const real = id === '__ESP__' ? 'esp.ascii.space' : id;
    if (esEsp) { if (esp === real) n++; else { volcar(); esp = real; n = 1; } } else { volcar(); out.push(real); }
  }
  volcar();
  return out;
}
