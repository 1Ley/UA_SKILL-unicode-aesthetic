/**
 * texto.mjs — análisis de caracteres sin dependencias.
 *
 * Toda propiedad de un carácter sale de aquí, nunca de mirar el glifo. Está
 * comprobado que la inspección visual falla: `︶` parece un arco decorativo y en
 * realidad es U+FE36 `Pe`, un paréntesis de cierre de CJK Compatibility Forms cuyo
 * NFKC es `)`. Confundir eso mete markdown activo en una bio de Instagram.
 *
 * Node cubre en regex nativo General_Category, Script, Script_Extensions,
 * White_Space, Default_Ignorable_Code_Point y Emoji_Presentation, así que en runtime
 * no hace falta ningún archivo del UCD. Lo único que el regex de JS NO soporta es
 * `\p{Block=...}` — por eso los nombres y bloques se hornean en build-time.
 */

/** General_Category en orden de prueba. El primero que casa gana; son disjuntas. */
const CATEGORIAS = [
  'Lu', 'Ll', 'Lt', 'Lm', 'Lo',
  'Mn', 'Mc', 'Me',
  'Nd', 'Nl', 'No',
  'Pc', 'Pd', 'Ps', 'Pe', 'Pi', 'Pf', 'Po',
  'Sm', 'Sc', 'Sk', 'So',
  'Zs', 'Zl', 'Zp',
  'Cc', 'Cf', 'Co', 'Cs', 'Cn',
];

/**
 * Scripts que probamos en runtime. No es la lista completa de Unicode: son los que
 * aparecen o pueden aparecer en esta estética, más los comunes. Un carácter que no
 * casa ninguno se reporta como `Desconocido`, lo cual es una señal útil en la
 * ingesta (algo muy exótico entró y merece revisión humana).
 */
const SCRIPTS_CANDIDATOS = [
  'Common', 'Inherited', 'Latin', 'Greek', 'Cyrillic', 'Han', 'Hiragana', 'Katakana',
  'Hangul', 'Arabic', 'Hebrew', 'Thai', 'Lao', 'Tibetan', 'Myanmar', 'Georgian',
  'Armenian', 'Devanagari', 'Bengali', 'Gurmukhi', 'Gujarati', 'Oriya', 'Tamil',
  'Telugu', 'Kannada', 'Malayalam', 'Sinhala', 'Khmer', 'Mongolian', 'Ethiopic',
  'Cherokee', 'Canadian_Aboriginal', 'Ogham', 'Runic', 'Tagalog', 'Hanunoo', 'Buhid',
  'Tagbanwa', 'Limbu', 'Tai_Le', 'New_Tai_Lue', 'Buginese', 'Tai_Tham', 'Balinese',
  'Sundanese', 'Batak', 'Lepcha', 'Ol_Chiki', 'Vai', 'Bamum', 'Syloti_Nagri',
  'Phags_Pa', 'Saurashtra', 'Kayah_Li', 'Rejang', 'Javanese', 'Cham', 'Tai_Viet',
  'Meetei_Mayek', 'Egyptian_Hieroglyphs', 'Anatolian_Hieroglyphs', 'Cuneiform',
  'Yi', 'Lisu', 'Miao', 'Nyiakeng_Puachue_Hmong', 'Tifinagh', 'Nko', 'Adlam',
  'Thaana', 'Syriac', 'Samaritan', 'Mandaic', 'Coptic', 'Glagolitic', 'Deseret',
  'Osage', 'Gothic', 'Old_Italic', 'Braille', 'Bopomofo',
];

/**
 * Filtra los nombres de script que esta versión de Node no reconoce.
 *
 * El conjunto de scripts válidos depende de la versión de Unicode compilada en V8, y
 * un nombre inválido en `\p{Script=…}` no devuelve `false`: lanza un SyntaxError que
 * tumba el proceso entero. Validar la lista una vez al cargar el módulo hace que el
 * código siga funcionando en cualquier Node, ahora y dentro de tres versiones.
 */
const SCRIPTS = SCRIPTS_CANDIDATOS.filter((s) => {
  try { new RegExp(`^\\p{Script=${s}}$`, 'u'); return true; } catch { return false; }
});

/** ASCII que Discord y otros parsers tratan como markdown o como sintaxis. */
const ASCII_ACTIVO = /[*_~`|#>[\]()\\@-]/;

const SEG_GRAFEMA = new Intl.Segmenter('es', { granularity: 'grapheme' });

const cacheGc = new Map();
const cacheScript = new Map();

/** Codepoints de una cadena (no unidades UTF-16). */
export function codepoints(s) {
  return [...s].map((c) => c.codePointAt(0));
}

/** Clusters de grafema. Es la unidad que un humano percibe como "un carácter". */
export function grafemas(s) {
  return [...SEG_GRAFEMA.segment(s)].map((g) => g.segment);
}

/**
 * Longitud en unidades UTF-16 — el presupuesto pesimista.
 * Discord cuenta de forma inconsistente entre superficies (el contenido de mensaje
 * parece contar codepoints, el estado personalizado cuenta unidades UTF-16), así que
 * presupuestamos siempre por la más cara. Un jeroglífico como 𓂃 cuesta 2.
 */
export function utf16(s) {
  return s.length;
}

/** Codepoint → "FE36" (mayúsculas, mínimo 4 dígitos). */
export function hex(cp) {
  return cp.toString(16).toUpperCase().padStart(4, '0');
}

/** "FE36" o "U+FE36" → 65078. */
export function desdeHex(h) {
  return parseInt(String(h).replace(/^U\+/i, ''), 16);
}

/** Cadena → array de codepoints en hex. */
export function aHex(s) {
  return codepoints(s).map(hex);
}

/** Array de codepoints (números o hex) → cadena. */
export function desdeCodepoints(cps) {
  return String.fromCodePoint(...cps.map((c) => (typeof c === 'number' ? c : desdeHex(c))));
}

/**
 * Gemelo escapado: ASCII puro con `\uXXXX` por unidad UTF-16.
 *
 * Toda salida de la skill lleva este gemelo al lado. Es un seguro barato contra el
 * peligro real de esta máquina: PowerShell 5.1 escribe UTF-16LE con `>` y cp1252 con
 * `Set-Content`, y cp1252 destruye los caracteres astrales en silencio, sin error.
 * El gemelo es ASCII, así que sobrevive a cualquier transporte y siempre reconstruye
 * el original.
 */
export function escapar(s, { conservarAscii = true } = {}) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const u = s.charCodeAt(i);
    if (conservarAscii && u >= 0x20 && u <= 0x7e && u !== 0x5c) out += s[i];
    else out += '\\u' + u.toString(16).toUpperCase().padStart(4, '0');
  }
  return out;
}

/** Inverso de `escapar`. */
export function desescapar(s) {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/**
 * Reduce cualquier entrada a UN solo codepoint.
 *
 * Esto no es defensivo por gusto: un regex `\p{...}` sin anclar aplicado a un cluster
 * casa si CUALQUIER codepoint del cluster casa. Al analizar `𖤐` seguido de la marca
 * tibetana U+0F18 —que forman un único grafema— el script salía "Tibetan" y el ancho
 * salía 3. Anclar con `^…$` sobre un codepoint aislado es lo que hace fiable todo lo
 * que hay debajo.
 */
function unCodepoint(entrada) {
  const ch = typeof entrada === 'number' ? String.fromCodePoint(entrada) : String(entrada);
  const primero = ch.codePointAt(0);
  return String.fromCodePoint(primero);
}

/** General_Category de un codepoint, p. ej. "Pe". */
export function gcDe(entrada) {
  const ch = unCodepoint(entrada);
  if (cacheGc.has(ch)) return cacheGc.get(ch);
  let r = 'Cn';
  for (const c of CATEGORIAS) {
    if (new RegExp(`^\\p{General_Category=${c}}$`, 'u').test(ch)) { r = c; break; }
  }
  cacheGc.set(ch, r);
  return r;
}

/** Script de un codepoint, p. ej. "Oriya". `Desconocido` si no casa la lista. */
export function scriptDe(entrada) {
  const ch = unCodepoint(entrada);
  if (cacheScript.has(ch)) return cacheScript.get(ch);
  let r = 'Desconocido';
  for (const s of SCRIPTS) {
    if (new RegExp(`^\\p{Script=${s}}$`, 'u').test(ch)) { r = s; break; }
  }
  cacheScript.set(ch, r);
  return r;
}

/**
 * Todas las propiedades comprobables de un carácter, en una sola pasada.
 *
 * `espacio_unicode` es la que decide si Discord e Instagram lo recortan: el trim
 * mira la propiedad White_Space, no "parece un espacio". Por eso `ㅤ` (U+3164) y `⠀`
 * (U+2800) sobreviven y ` ` (U+00A0, NBSP) no, aunque los tres se vean vacíos.
 */
export function propiedades(entrada) {
  const ch = unCodepoint(entrada);
  const cp = ch.codePointAt(0);
  const gc = gcDe(ch);
  const nfkc = ch.normalize('NFKC');
  return {
    cp,
    hex: hex(cp),
    gc,
    script: scriptDe(ch),
    utf16: ch.length,
    marca: gc.startsWith('M'),
    espacio_unicode: /^\p{White_Space}$/u.test(ch),
    ignorable: /^\p{Default_Ignorable_Code_Point}$/u.test(ch),
    emoji: /^\p{Emoji}$/u.test(ch),
    emoji_presentacion: /^\p{Emoji_Presentation}$/u.test(ch),
    rtl: /^(?:\p{Script=Hebrew}|\p{Script=Arabic}|\p{Script=Syriac}|\p{Script=Thaana}|\p{Script=Nko})$/u.test(ch)
      && !gc.startsWith('M'),
    nfkc: aHex(nfkc),
    nfkc_cambia: nfkc !== ch,
    nfkc_activo_ascii: ASCII_ACTIVO.test(nfkc),
  };
}

/**
 * Analiza un cluster de grafema completo: base + marcas, con propiedades por
 * codepoint. Úsalo cuando lo que tienes es "lo que el usuario ve como un carácter";
 * usa `propiedades()` cuando lo que tienes es un codepoint concreto.
 */
export function analizarCluster(cluster) {
  const cps = [...cluster];
  return {
    cluster,
    utf16: cluster.length,
    codepoints: cps.map((c) => propiedades(c)),
    base: propiedades(cps[0]),
    marcas: cps.slice(1).map((c) => propiedades(c)).filter((p) => p.marca),
  };
}

/** ¿Es marca combinante? Es el filtro más importante de toda la biblioteca. */
export function esMarca(entrada) {
  return /^\p{M}$/u.test(unCodepoint(entrada));
}

/**
 * Análisis NFKC de una cadena completa.
 * Devuelve qué caracteres pliegan a ASCII activo — la regla E014. En Instagram, que
 * normaliza, `﹏` se convierte en `_` y `﹫` en `@`: la decoración se vuelve sintaxis.
 */
export function analisisNfkc(s) {
  const culpables = [];
  for (const ch of grafemas(s)) {
    const n = ch.normalize('NFKC');
    if (n !== ch && ASCII_ACTIVO.test(n)) {
      culpables.push({ ch, de: aHex(ch), a: aHex(n), texto_a: n });
    }
  }
  return { cambia: s.normalize('NFKC') !== s, culpables };
}

/** ¿No hay surrogates sueltos? Debe comprobarse antes de escribir a disco. */
export function bienFormado(s) {
  return typeof s.isWellFormed === 'function' ? s.isWellFormed() : !/[\uD800-\uDFFF]/.test(
    s.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ''),
  );
}

/** U+FFFD es la huella dactilar de toda corrupción de codificación. */
export function tieneReemplazo(s) {
  return s.includes('�');
}

/**
 * Corte seguro a N unidades UTF-16, sin partir un par surrogate ni un cluster.
 * `"𓂃ab".slice(0,1)` produce un surrogate suelto que al codificar a UTF-8 se vuelve
 * U+FFFD — corrupción silenciosa. Esto corta por cluster de grafema.
 */
export function cortarSeguro(s, maxUtf16) {
  let out = '';
  for (const g of grafemas(s)) {
    if (out.length + g.length > maxUtf16) break;
    out += g;
  }
  return out;
}

/** Agrupa una cadena en {base, marcas[]} por cluster — para el límite de marcas. */
export function clustersConMarcas(s) {
  return grafemas(s).map((g) => {
    const cps = [...g];
    return { cluster: g, base: cps[0], marcas: cps.slice(1).filter(esMarca) };
  });
}
