/**
 * construir-datos.mjs — genera la biblioteca a partir del corpus humano + el UCD.
 *
 * Uso:  node tools/construir-datos.mjs [--ucd 16.0.0] [--sin-red]
 *
 * Regla de oro del proyecto: ningún hecho sobre un carácter se teclea a mano. Los
 * nombres, bloques, categorías, anchos y pliegues NFKC salen del Unicode Character
 * Database y de las propiedades nativas de Node. Lo único escrito por un humano es
 * tools/semilla/corpus-crudo.txt (composiciones reales) y tools/semilla/curacion.json
 * (criterio: roles, tiers, croquis, paletas).
 *
 * El vocabulario está cerrado por construcción: un carácter existe en la biblioteca
 * si y solo si aparece en una composición que un humano escribió. No hay forma de
 * "añadir un símbolo suelto porque parece bonito", y esa es justamente la propiedad
 * que evita que la biblioteca degenere en la lista plana que hace que las
 * decoraciones generadas por IA se noten a la legua.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  RAIZ_SKILL, RAIZ_REPO, DIR_DATOS, leerTexto, escribirJSON, argumentos, ErrorUA,
} from '../skills/ua/scripts/lib/io.mjs';
import {
  propiedades, grafemas, hex, aHex, analizarCluster, esMarca,
} from '../skills/ua/scripts/lib/texto.mjs';

const args = argumentos(process.argv.slice(2));
const VERSION_UCD = args.ucd || '16.0.0';
const DIR_UCD = path.join(RAIZ_REPO, 'tools', 'ucd');
const DIR_SEMILLA = path.join(RAIZ_REPO, 'tools', 'semilla');

const FUENTES = {
  'UnicodeData.txt': `https://www.unicode.org/Public/${VERSION_UCD}/ucd/UnicodeData.txt`,
  'Blocks.txt': `https://www.unicode.org/Public/${VERSION_UCD}/ucd/Blocks.txt`,
  'confusables.txt': 'https://www.unicode.org/Public/security/latest/confusables.txt',
};

/** Bloque Unicode → familia corta para los IDs. Mecánico, no es criterio. */
const FAMILIA_POR_BLOQUE = {
  'Basic Latin': 'ascii',
  'Latin-1 Supplement': 'lat1',
  'IPA Extensions': 'ipa',
  'Spacing Modifier Letters': 'modif',
  'Combining Diacritical Marks': 'comb',
  'Hebrew': 'hebreo',
  'Arabic': 'arabe',
  'Arabic Extended-A': 'arabe',
  'Arabic Extended-B': 'arabe',
  'Devanagari': 'deva',
  'Bengali': 'bengali',
  'Gurmukhi': 'gurmukhi',
  'Gujarati': 'gujarati',
  'Oriya': 'oriya',
  'Tamil': 'tamil',
  'Telugu': 'telugu',
  'Kannada': 'kannada',
  'Malayalam': 'malayalam',
  'Thai': 'thai',
  'Lao': 'lao',
  'Tibetan': 'tibet',
  'Myanmar': 'myanmar',
  'Georgian': 'georgiano',
  'Unified Canadian Aboriginal Syllabics': 'canad',
  'Tagalog': 'tagalo',
  'Buginese': 'bugi',
  'Tai Le': 'taile',
  'New Tai Lue': 'tailue',
  'Balinese': 'bali',
  'Sundanese': 'sunda',
  'Lepcha': 'lepcha',
  'Vai': 'vai',
  'Bamum': 'bamum',
  'Bamum Supplement': 'bamum',
  'Tai Viet': 'taiviet',
  'Meetei Mayek': 'meetei',
  'Syloti Nagri': 'syloti',
  'Yi Radicals': 'yi',
  'Yi Syllables': 'yi',
  'Vedic Extensions': 'vedico',
  'Devanagari Extended': 'deva',
  'Combining Diacritical Marks Extended': 'comb',
  'Combining Diacritical Marks Supplement': 'comb',
  'Combining Diacritical Marks for Symbols': 'comb',
  'General Punctuation': 'punt',
  'Superscripts and Subscripts': 'indice',
  'Letterlike Symbols': 'letra',
  'Number Forms': 'numero',
  'Arrows': 'flecha',
  'Mathematical Operators': 'mat',
  'Supplemental Mathematical Operators': 'mat',
  'Miscellaneous Mathematical Symbols-A': 'mat',
  'Miscellaneous Mathematical Symbols-B': 'mat',
  'Miscellaneous Technical': 'tecnico',
  'Box Drawing': 'caja',
  'Block Elements': 'bloque',
  'Geometric Shapes': 'geo',
  'Geometric Shapes Extended': 'geo',
  'Miscellaneous Symbols': 'simbolo',
  'Dingbats': 'dingbat',
  'Ornamental Dingbats': 'dingbat',
  'Braille Patterns': 'braille',
  'Supplemental Punctuation': 'punt',
  'Miscellaneous Symbols and Arrows': 'flecha',
  'CJK Symbols and Punctuation': 'cjk',
  'Hiragana': 'hiragana',
  'Katakana': 'katakana',
  'Hangul Compatibility Jamo': 'hangul',
  'Hangul Jamo': 'hangul',
  'CJK Unified Ideographs': 'kanji',
  'Halfwidth and Fullwidth Forms': 'ancho',
  'Small Form Variants': 'peq',
  'CJK Compatibility Forms': 'cjkcomp',
  'Vertical Forms': 'vert',
  'Mathematical Alphanumeric Symbols': 'matalfa',
  'Musical Symbols': 'musica',
  'Egyptian Hieroglyphs': 'egipcio',
  'Anatolian Hieroglyphs': 'anatolio',
  'Nyiakeng Puachue Hmong': 'hmong',
  'Miao': 'miao',
  'Tifinagh': 'tifinagh',
  'Adlam': 'adlam',
  'Emoticons': 'emoji',
  'Miscellaneous Symbols and Pictographs': 'emoji',
  'Supplemental Symbols and Pictographs': 'emoji',
  'Symbols and Pictographs Extended-A': 'emoji',
  'Transport and Map Symbols': 'emoji',
  'Phonetic Extensions': 'fonetico',
  'Phonetic Extensions Supplement': 'fonetico',
  'Modifier Tone Letters': 'tono',
  'Latin Extended-A': 'latext',
  'Latin Extended-B': 'latext',
  'Latin Extended-D': 'latext',
  'Latin Extended-E': 'latext',
  'Greek and Coptic': 'griego',
  'Cyrillic': 'cirilico',
  'Variation Selectors': 'varsel',
  'Specials': 'especial',
};

/** Palabras de los nombres UCD que no aportan nada al identificador. */
const RUIDO = new Set([
  'LETTER', 'SIGN', 'MARK', 'SYMBOL', 'CHARACTER', 'FORM', 'FOR', 'THE', 'OF', 'AND',
  'WITH', 'PRESENTATION', 'VERTICAL', 'COMBINING', 'MODIFIER', 'SMALL', 'DIGIT',
  'SYLLABLE', 'RADICAL', 'PATTERN', 'DRAWINGS', 'LIGHT', 'ELEMENT', 'POINT',
  'ACCENT', 'VOWEL', 'CONSONANT', 'INDEPENDENT', 'ORNAMENT',
]);

const NUM_A_PALABRA = {
  ZERO: '0', ONE: '1', TWO: '2', THREE: '3', FOUR: '4',
  FIVE: '5', SIX: '6', SEVEN: '7', EIGHT: '8', NINE: '9',
};

// ─────────────────────────────────────────────────────────── descarga y parseo UCD

async function obtenerUcd(nombre) {
  const destino = path.join(DIR_UCD, nombre);
  if (fs.existsSync(destino)) return leerTexto(destino);
  if (args['sin-red']) {
    throw new ErrorUA('E100', `Falta ${destino} y --sin-red impide descargarlo. Ejecuta sin --sin-red una vez.`);
  }
  process.stderr.write(`  descargando ${nombre}…\n`);
  const r = await fetch(FUENTES[nombre]);
  if (!r.ok) throw new ErrorUA('E100', `${FUENTES[nombre]} devolvió HTTP ${r.status}`);
  const txt = await r.text();
  fs.mkdirSync(DIR_UCD, { recursive: true });
  fs.writeFileSync(destino, txt, 'utf8');
  return txt;
}

/**
 * UnicodeData.txt: 15 campos por `;`, sin cabecera.
 * Los rangos grandes vienen colapsados en pares `<…, First>` / `<…, Last>`; los
 * expandimos porque si no se pierden ~1M de codepoints en silencio.
 */
function parsearUnicodeData(txt) {
  const nombres = new Map();
  let pendiente = null;
  for (const linea of txt.split('\n')) {
    if (!linea.trim()) continue;
    const c = linea.split(';');
    const cp = parseInt(c[0], 16);
    const nombre = c[1];
    if (nombre.endsWith(', First>')) { pendiente = { cp, etiqueta: nombre.slice(1, -8) }; continue; }
    if (nombre.endsWith(', Last>') && pendiente) {
      for (let i = pendiente.cp; i <= cp; i++) nombres.set(i, `${pendiente.etiqueta}-${hex(i)}`);
      pendiente = null;
      continue;
    }
    nombres.set(cp, nombre);
  }
  return nombres;
}

/** Blocks.txt: `INICIO..FIN; Nombre del bloque`. Es el dato que JS no puede dar. */
function parsearBlocks(txt) {
  const rangos = [];
  for (const linea of txt.split('\n')) {
    const m = linea.match(/^([0-9A-F]+)\.\.([0-9A-F]+);\s*(.+?)\s*$/i);
    if (m) rangos.push({ ini: parseInt(m[1], 16), fin: parseInt(m[2], 16), nombre: m[3] });
  }
  rangos.sort((a, b) => a.ini - b.ini);
  return (cp) => {
    let lo = 0; let hi = rangos.length - 1;
    while (lo <= hi) {
      const m = (lo + hi) >> 1;
      if (cp < rangos[m].ini) hi = m - 1;
      else if (cp > rangos[m].fin) lo = m + 1;
      else return rangos[m].nombre;
    }
    return 'Sin bloque';
  };
}

/**
 * confusables.txt (UTS #39): mapa curado por humanos de "esto se ve como aquello".
 * Es lo que permite reconocer que `ᥱ` (Tai Le) hace de `e` — un parecido que ninguna
 * propiedad de Unicode expresa y que NFKC no captura.
 */
function parsearConfusables(txt) {
  const mapa = new Map();
  for (const linea of txt.split('\n')) {
    if (!linea.trim() || linea.startsWith('#')) continue;
    const m = linea.split('#')[0].split(';');
    if (m.length < 2) continue;
    const origen = m[0].trim();
    const destino = m[1].trim().split(/\s+/);
    if (origen.includes(' ') || destino.length !== 1) continue;
    const cpOrigen = parseInt(origen, 16);
    const cpDestino = parseInt(destino[0], 16);
    if (cpDestino >= 0x30 && cpDestino <= 0x7a) mapa.set(cpOrigen, cpDestino);
  }
  return mapa;
}

// ────────────────────────────────────────────────────────────────── corpus semilla

function parsearCorpus(txt) {
  const bloques = [];
  let actual = null;
  for (const linea of txt.split('\n')) {
    if (linea.startsWith('###') || (linea.startsWith('#') && !actual)) continue;
    const m = linea.match(/^===\s*(\S+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(.+?)\s*$/);
    if (m) {
      if (actual) bloques.push(actual);
      actual = { id: m[1], perfil: m[2], paleta: m[3], nota: m[4], lineas: [] };
      continue;
    }
    if (actual) actual.lineas.push(linea);
  }
  if (actual) bloques.push(actual);
  for (const b of bloques) {
    while (b.lineas.length && !b.lineas[0].trim()) b.lineas.shift();
    while (b.lineas.length && !b.lineas[b.lineas.length - 1].trim()) b.lineas.pop();
  }
  return bloques.filter((b) => b.lineas.length);
}

/**
 * inventario-crudo.txt: grupos de símbolos que el humano recolectó pero con los que
 * todavía no compuso. Las agrupaciones son criterio puro — que `‧ ₊ ˖ • ･` vayan
 * juntos no se deduce de ninguna propiedad Unicode, viven en cuatro bloques
 * distintos y solo se parecen en cómo se usan.
 */
function parsearInventario(txt) {
  const grupos = [];
  let actual = null;
  for (const linea of txt.split('\n')) {
    if (linea.startsWith('#')) continue;
    const m = linea.match(/^---\s*(\S+)\s*\|\s*([^|]+?)\s*\|\s*(.+?)\s*$/);
    if (m) {
      if (actual) grupos.push(actual);
      actual = { rol: m[1], paleta: m[2], nota: m[3], texto: '' };
      continue;
    }
    if (actual) actual.texto += linea;
  }
  if (actual) grupos.push(actual);
  return grupos;
}

// ────────────────────────────────────────────────────────────── clasificación

/** Estilo tipográfico de una letra alternativa, deducido de su nombre UCD. */
function estiloAlfabeto(nombre) {
  const n = nombre.toUpperCase();
  if (n.includes('SANS-SERIF') && n.includes('BOLD') && n.includes('ITALIC')) return 'sans-negrita-cursiva';
  if (n.includes('SANS-SERIF') && n.includes('BOLD')) return 'sans-negrita';
  if (n.includes('SANS-SERIF') && n.includes('ITALIC')) return 'sans-cursiva';
  if (n.includes('SANS-SERIF')) return 'sans';
  if (n.includes('MONOSPACE')) return 'mono';
  if (n.includes('DOUBLE-STRUCK')) return 'doble';
  if (n.includes('FRAKTUR')) return 'fraktur';
  if (n.includes('SCRIPT') && n.includes('BOLD')) return 'script-negrita';
  if (n.includes('SCRIPT')) return 'script';
  if (n.includes('BOLD') && n.includes('ITALIC')) return 'negrita-cursiva';
  if (n.includes('BOLD')) return 'negrita';
  if (n.includes('ITALIC')) return 'cursiva';
  if (n.includes('SMALL CAPITAL')) return 'versalita';
  if (n.includes('FULLWIDTH')) return 'ancho';
  if (n.includes('SUPERSCRIPT')) return 'alto';
  if (n.includes('SUBSCRIPT')) return 'bajo';
  if (n.includes('MODIFIER LETTER SMALL')) return 'alto';
  return 'homoglifo';
}

/** Rol propuesto por heurística. La curación lo sobrescribe cuando se equivoca. */
function rolHeuristico(p, bloque, curacion) {
  const porCuracion = curacion.roles[p.hex];
  if (porCuracion) return { rol: porCuracion, seguro: true };
  if (p.marca) return { rol: 'sig', seguro: true };
  if (p.espacio_unicode || curacion.espaciadores[p.hex]) return { rol: 'esp', seguro: true };
  if (p.emoji_presentacion) return { rol: 'anc', seguro: true };
  if (['Ps', 'Pi'].includes(p.gc) || ['Pe', 'Pf'].includes(p.gc)) return { rol: 'cor', seguro: true };
  if (bloque === 'Box Drawing' || bloque === 'Block Elements') return { rol: 'trz', seguro: true };
  if (p.gc === 'Pd') return { rol: 'trz', seguro: true };
  return { rol: 'par', seguro: false };
}

/**
 * Peso visual 1–4: cuánta tinta aporta. Es lo que gobierna el ritmo.
 * Un emoji grita, una marca modificadora susurra; mezclarlos sin criterio produce
 * el aspecto plano y saturado que delata una decoración generada.
 */
function pesoVisual(p, rol) {
  if (p.emoji_presentacion) return 4;
  if (rol === 'esp') return 0;
  if (p.marca || ['Sk', 'Lm'].includes(p.gc)) return 1;
  if (rol === 'anc' || rol === 'cor') return 3;
  if (['So', 'Nd', 'Lo', 'Lu', 'Ll'].includes(p.gc)) return 2;
  return 2;
}

/** Slug para nombres en español: pliega acentos en vez de comérselos. */
function slugEs(txt, max = 20) {
  return txt.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max).replace(/-+$/, '');
}

function slug(txt, max = 18) {
  const partes = txt.toUpperCase().split(/[\s-]+/)
    .map((w) => NUM_A_PALABRA[w] || w)
    .filter((w) => w && !RUIDO.has(w));
  const usar = partes.slice(-2).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '');
  return (usar || 'x').slice(0, max).replace(/-+$/, '');
}

// ───────────────────────────────────────────────────────────────────── construcción

async function main() {
  process.stderr.write(`UA · construyendo biblioteca (UCD ${VERSION_UCD})\n`);

  const [udTxt, blTxt, cfTxt] = await Promise.all(
    Object.keys(FUENTES).map((n) => obtenerUcd(n)),
  );
  const nombreDe = parsearUnicodeData(udTxt);
  const bloqueDe = parsearBlocks(blTxt);
  const confusable = parsearConfusables(cfTxt);
  const curacion = JSON.parse(leerTexto(path.join(DIR_SEMILLA, 'curacion.json')));
  const corpus = parsearCorpus(leerTexto(path.join(DIR_SEMILLA, 'corpus-crudo.txt')));
  const inventario = parsearInventario(leerTexto(path.join(DIR_SEMILLA, 'inventario-crudo.txt')));

  process.stderr.write(`  UCD: ${nombreDe.size} nombres · confusables: ${confusable.size}\n`);
  process.stderr.write(`  corpus: ${corpus.length} composiciones · inventario: ${inventario.length} grupos\n`);

  // Preserva la curación previa si ya existe un caracteres.json generado.
  const rutaCaracteres = path.join(DIR_DATOS, 'caracteres.json');
  const previo = fs.existsSync(rutaCaracteres)
    ? new Map(JSON.parse(leerTexto(rutaCaracteres)).caracteres.map((c) => [c.hex[0], c]))
    : new Map();

  /**
   * ¿Puede este codepoint hacer de letra ASCII?
   *
   * Restringido a categorías `L*` a propósito. Sin esa restricción, confusables.txt
   * se lleva `୨` (ORIYA DIGIT TWO) a la capa de alfabetos porque se parece a un
   * dígito — y `୨୧` es el par ornamental más característico de toda esta estética.
   * Una regla mecánica correcta en abstracto destruía el elemento más reconocible
   * del estilo. Los dígitos decorativos se quedan donde deben.
   */
  function letraAlternativa(cp, p) {
    if (!p.gc.startsWith('L')) return null;
    const ch = String.fromCodePoint(cp);
    const n = ch.normalize('NFKC');
    if (n.length === 1 && /^[0-9A-Za-z]$/.test(n)) return n;
    if (confusable.has(cp)) return String.fromCodePoint(confusable.get(cp));
    return null;
  }

  const esAsciiAlnum = (cp) => (cp >= 0x30 && cp <= 0x39) || (cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a);

  // 1 · uso real por codepoint, distinguiendo DENTRO DE PALABRA de SUELTO.
  //
  // La posición es la evidencia que decide si un carácter es letra u ornamento. `ᥱ`
  // dentro de `tᥱᥣᥣ` hace de `e`; el mismo `ᥱ` rodeado de espacios es decoración. Un
  // carácter puede ser ambas cosas, así que no se clasifica de forma excluyente.
  const uso = new Map();
  const tocar = (cp, paleta, origen, { enPalabra = false, rolSugerido = null } = {}) => {
    const h = hex(cp);
    if (!uso.has(h)) {
      uso.set(h, {
        cp, paletas: new Set(), origen: new Set(), veces: 0,
        enPalabra: 0, suelto: 0, rolSugerido: null, deInventario: false,
      });
    }
    const u = uso.get(h);
    u.paletas.add(paleta);
    u.origen.add(origen);
    u.veces++;
    if (enPalabra) u.enPalabra++; else u.suelto++;
    if (rolSugerido) { u.rolSugerido = rolSugerido; u.deInventario = true; }
  };

  for (const comp of corpus) {
    for (const linea of comp.lineas) {
      const cps = [...linea].map((c) => c.codePointAt(0));
      const props = cps.map((c) => propiedades(c));
      const esLetra = cps.map((c, i) => esAsciiAlnum(c) || Boolean(letraAlternativa(c, props[i])));
      cps.forEach((cp, i) => {
        const vecinoLetra = (esLetra[i - 1] === true) || (esLetra[i + 1] === true);
        tocar(cp, comp.paleta, comp.id, { enPalabra: esLetra[i] && vecinoLetra });
      });
    }
  }
  const soloCorpus = uso.size;

  for (const g of inventario) {
    for (const cp of [...g.texto]) {
      const c = cp.codePointAt(0);
      if (c === 0x20 || c === 0x0d || c === 0x09) continue;
      tocar(c, g.paleta, `inv:${g.rol}`, { rolSugerido: g.rol });
    }
  }
  process.stderr.write(`  codepoints distintos: ${soloCorpus} del corpus, ${uso.size - soloCorpus} nuevos del inventario\n`);

  // 2 · clasifica: literal ASCII / letra alternativa / carácter decorativo
  const caracteres = [];
  const alfabetos = new Map();
  const usados = new Set();
  let literales = 0;

  for (const [h, u] of [...uso.entries()].sort((a, b) => a[1].cp - b[1].cp)) {
    const p = propiedades(u.cp);
    const nombre = nombreDe.get(u.cp) || `SIN NOMBRE EN UCD ${VERSION_UCD}`;
    const bloque = bloqueDe(u.cp);

    // ASCII imprimible que no es espacio: es el texto del ejemplo, no vocabulario.
    if (u.cp >= 0x21 && u.cp <= 0x7e) { literales++; continue; }

    const destino = letraAlternativa(u.cp, p);
    if (destino && u.enPalabra > 0) {
      const estilo = estiloAlfabeto(nombre);
      if (!alfabetos.has(estilo)) alfabetos.set(estilo, {});
      const tabla = alfabetos.get(estilo);
      // Varias letras distintas pueden servir para la misma letra ASCII: `Ꭵ`
      // (cherokee) y `ι` (griega) hacen las dos de `i`. Guardar solo la primera
      // hacía desaparecer a la otra de la biblioteca entera —ni alfabeto ni
      // carácter—, y con ella la línea del corpus donde el humano la había usado.
      if (!tabla[destino]) tabla[destino] = { hex: h, cp: u.cp, nombre, bloque, variantes: [h] };
      else if (!tabla[destino].variantes.includes(h)) tabla[destino].variantes.push(h);
      // Si SOLO aparece dentro de palabra, es letra y nada más. Si además aparece
      // suelto, sigue hacia abajo y entra también como carácter decorativo.
      if (u.suelto === 0) continue;
    }

    const heur = rolHeuristico(p, bloque, curacion);
    // El rol del grupo de inventario es criterio humano: pesa más que la heurística,
    // pero menos que una curación explícita por codepoint.
    const rol = curacion.roles[h] || (u.rolSugerido && !heur.seguro ? u.rolSugerido : heur.rol);
    const seguro = heur.seguro || Boolean(u.rolSugerido && u.deInventario && u.suelto > 0 && !u.deCorpus);

    const familia = FAMILIA_POR_BLOQUE[bloque] || slug(bloque, 10);
    const anterior = previo.get(h);
    // El ID definitivo se resuelve ANTES de reservarlo. Antes se reservaba el ID
    // generado pero se emitía el preservado de una curación previa, así que dos
    // registros podían acabar con el mismo identificador y `unidad(id)` devolvía
    // uno arbitrario de los dos.
    const preferido = anterior?.revisado ? anterior.id : `${rol}.${familia}.${slug(nombre)}`;
    let id = preferido;
    let n = 2;
    while (usados.has(id)) id = `${preferido}-${n++}`;
    usados.add(id);

    const esp = curacion.espaciadores[h];
    const registro = {
      id,
      cp: [u.cp],
      hex: [h],
      nombre,
      bloque,
      gc: p.gc,
      script: p.script,
      utf16: p.utf16,
      espacio_unicode: p.espacio_unicode,
      ignorable: p.ignorable,
      emoji: p.emoji,
      nfkc: p.nfkc,
      nfkc_cambia: p.nfkc_cambia,
      nfkc_activo_ascii: p.nfkc_activo_ascii,
      rol,
      peso_visual: pesoVisual(p, rol),
      croquis: curacion.croquis[h] || curacion.croquis_por_rol[rol] || '?',
      tier: curacion.tiers_por_bloque[bloque] || 'riesgo',
      paletas: [...u.paletas].sort(),
      frecuencia: u.veces,
      origen: [...u.origen].sort(),
      fuente: u.origen.size && [...u.origen].some((o) => o.startsWith('cps.')) ? 'corpus' : 'inventario',
      revisado: Boolean(anterior?.revisado) || seguro,
    };
    if (esp) { registro.ancho = esp.ancho; registro.espaciador_preferido = esp.preferido; registro.nota = esp.nota; }
    if (curacion.pares[h]) registro.par = curacion.pares[h];
    if (p.marca) registro.requiere_base_previa = true;
    if (p.rtl) registro.rtl = true;
    if (destino) registro.tambien_letra = destino;

    if (anterior?.revisado) {
      for (const k of ['rol', 'croquis', 'tier', 'par', 'adyacencia', 'peso_visual']) {
        if (anterior[k] !== undefined) registro[k] = anterior[k];
      }
    }
    caracteres.push(registro);
  }

  // 4 · compuestos: clusters de más de un codepoint que aparecen en el corpus
  const compuestos = new Map();
  const porHex = new Map(caracteres.map((c) => [c.hex[0], c]));
  for (const comp of corpus) {
    for (const linea of comp.lineas) {
      for (const g of grafemas(linea)) {
        const cps = [...g];
        if (cps.length < 2) continue;
        const hexes = aHex(g);
        // Un cluster cuya base es un espaciador no es una unidad: es el artefacto de
        // una marca combinante pegándose al espacio anterior. Registrarlo como
        // compuesto convertiría en vocabulario el mismo fallo contra el que avisa
        // E006. Que aparezca en el corpus es, eso sí, la evidencia de R1: el humano
        // compensó escribiendo un espacio de más justo después.
        if (porHex.get(hexes[0])?.rol === 'esp') continue;
        const clave = hexes.join('+');
        if (compuestos.has(clave)) { compuestos.get(clave).frecuencia++; continue; }
        const a = analizarCluster(g);
        const miembros = hexes.map((x) => porHex.get(x)?.id).filter(Boolean);
        const tiers = hexes.map((x) => porHex.get(x)?.tier).filter(Boolean);
        const orden = { universal: 0, moderno: 1, riesgo: 2, desconocido: 3 };
        const tier = tiers.length
          ? tiers.sort((x, y) => orden[y] - orden[x])[0]
          : 'desconocido';
        const baseCmp = `cmp.${slug(nombreDe.get(cps[0].codePointAt(0)) || 'x', 12)}.${hexes.length}`;
        let idCmp = baseCmp;
        let k = 2;
        while (usados.has(idCmp)) idCmp = `${baseCmp}-${k++}`;
        usados.add(idCmp);
        compuestos.set(clave, {
          id: idCmp,
          cp: cps.map((c) => c.codePointAt(0)),
          hex: hexes,
          miembros,
          utf16: g.length,
          marcas: a.marcas.length,
          rol: porHex.get(hexes[0])?.rol || 'par',
          gc: '--',
          peso_visual: Math.max(...hexes.map((x) => porHex.get(x)?.peso_visual ?? 2)),
          croquis: hexes.map((x) => porHex.get(x)?.croquis || '?').join('').slice(0, 2),
          tier,
          atomico: true,
          requiere_base_previa: esMarca(cps[0]),
          paletas: [comp.paleta],
          frecuencia: 1,
          origen: [comp.id],
          revisado: false,
        });
      }
    }
  }

  // 4b · compuestos curados: unidades que Unicode ve como varios grafemas pero que
  // funcionan como una sola cosa. `ᥫ᭡` es el caso ejemplar — dos clusters de dos
  // scripts sin relación que juntos leen como un corazón. La detección automática por
  // grafema no los ve, y sin ellos el ensamblador produciría medios corazones.
  const ordenTier = { universal: 0, moderno: 1, riesgo: 2, desconocido: 3 };
  for (const c of curacion.compuestos_curados || []) {
    const clave = c.hex.join('+');
    const miembros = c.hex.map((h) => porHex.get(h));
    if (miembros.some((m) => !m)) {
      process.stderr.write(`  aviso: compuesto curado ${clave} referencia un carácter ausente; se omite\n`);
      continue;
    }
    const texto = c.hex.map((h) => String.fromCodePoint(parseInt(h, 16))).join('');
    const idCurado = `cmp.${slugEs(c.nombre_es)}`;
    if (usados.has(idCurado) && compuestos.get(clave)?.id !== idCurado) {
      process.stderr.write(`  aviso: el compuesto curado ${idCurado} choca con un ID existente\n`);
    }
    usados.add(idCurado);
    compuestos.set(clave, {
      id: idCurado,
      cp: c.hex.map((h) => parseInt(h, 16)),
      hex: c.hex,
      nombre: c.nombre_es,
      miembros: miembros.map((m) => m.id),
      utf16: texto.length,
      grafemas: grafemas(texto).length,
      rol: c.rol,
      croquis: c.croquis,
      tier: miembros.map((m) => m.tier).sort((x, y) => ordenTier[y] - ordenTier[x])[0],
      motivo_tier: `mínimo de los miembros: ${miembros.map((m) => `${m.hex[0]}=${m.tier}`).join(', ')}`,
      atomico: true,
      requiere_base_previa: esMarca(c.hex[0] && String.fromCodePoint(parseInt(c.hex[0], 16))),
      paletas: c.paletas,
      frecuencia: compuestos.get(clave)?.frecuencia || 1,
      origen: ['curacion'],
      revisado: true,
    });
  }

  // 5 · corpus decompilado con métricas calculadas
  const corpusSalida = corpus.map((c) => ({
    id: c.id,
    fuente: 'usuario:semilla',
    perfil_probable: c.perfil,
    paleta: c.paleta,
    nota: c.nota,
    lineas: c.lineas.map((l, i) => {
      const gs = grafemas(l);
      const decorativos = gs.filter((g) => {
        const cp = g.codePointAt(0);
        return !(cp >= 0x21 && cp <= 0x7e) && cp !== 0x20;
      }).length;
      return {
        n: i + 1,
        texto: l,
        escapado: [...l].map((c) => (c.codePointAt(0) >= 0x20 && c.codePointAt(0) <= 0x7e ? c : '\\u' + hex(c.codePointAt(0)))).join(''),
        utf16: l.length,
        codepoints: [...l].length,
        grafemas: gs.length,
        densidad: gs.length ? Number((decorativos / gs.length).toFixed(3)) : 0,
      };
    }),
    revisado: true,
  }));

  // 6 · alfabetos ordenados
  const alfabetosSalida = [...alfabetos.entries()]
    .map(([estilo, tabla]) => ({
      id: `alf.${estilo}`,
      estilo,
      cobertura: Object.keys(tabla).length,
      mapa: Object.fromEntries(Object.entries(tabla).sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, v.hex])),
      variantes: Object.fromEntries(Object.entries(tabla).sort(([a], [b]) => a.localeCompare(b))
        .filter(([, v]) => v.variantes.length > 1).map(([k, v]) => [k, v.variantes])),
      bloques: [...new Set(Object.values(tabla).map((v) => v.bloque))].sort(),
    }))
    .sort((a, b) => b.cobertura - a.cobertura);

  const meta = {
    version: 1,
    ucd: VERSION_UCD,
    generado_por: 'tools/construir-datos.mjs',
    aviso: 'Generado. No editar a mano: los cambios se pierden. El criterio humano va en tools/semilla/curacion.json; el vocabulario, en tools/semilla/corpus-crudo.txt.',
  };

  fs.mkdirSync(DIR_DATOS, { recursive: true });
  escribirJSON(path.join(DIR_DATOS, 'caracteres.json'), { ...meta, total: caracteres.length, caracteres });
  escribirJSON(path.join(DIR_DATOS, 'compuestos.json'), { ...meta, total: compuestos.size, compuestos: [...compuestos.values()] });
  escribirJSON(path.join(DIR_DATOS, 'alfabetos.json'), { ...meta, total: alfabetosSalida.length, alfabetos: alfabetosSalida });
  escribirJSON(path.join(DIR_DATOS, 'corpus.json'), { ...meta, total: corpusSalida.length, composiciones: corpusSalida });
  escribirJSON(path.join(DIR_DATOS, 'paletas.json'), { ...meta, paletas: curacion.paletas });

  // 7 · SEGUNDA PASADA. La decompilación del corpus necesita la biblioteca ya
  // escrita en disco: solo entonces se puede tokenizar una línea contra ella. De ahí
  // que el build sea de dos pasadas y no de una.
  const { cargar } = await import('../skills/ua/scripts/lib/biblioteca.mjs');
  const { clasificar, aTokens } = await import('../skills/ua/scripts/lib/clasificar.mjs');
  cargar({ recargar: true });

  const conteoEsq = {};
  for (const comp of corpusSalida) {
    const texto = comp.lineas.map((l) => l.texto).join('\n');
    const c = clasificar(texto);
    comp.esqueleto = c.esqueleto;
    comp.motivo_esqueleto = c.motivo;
    conteoEsq[c.esqueleto] = (conteoEsq[c.esqueleto] || 0) + 1;
    comp.lineas.forEach((l, i) => {
      const cl = c.lineas[i];
      if (!cl) return;
      l.esqueleto = cl.esqueleto;
      l.tokens = aTokens(cl.analisis);
      l.croquis = cl.analisis.croquis;
      l.simetrica = cl.analisis.simetria.simetrica;
      l.ritmo = cl.analisis.ritmo.tiradas;
      l.anclas = cl.analisis.anclas;
      l.emojis = cl.analisis.emojis;
      l.max_marcas_base = cl.analisis.max_marcas_base;
      l.fuera_de_biblioteca = cl.analisis.desconocidos.length;
    });
  }
  escribirJSON(path.join(DIR_DATOS, 'corpus.json'), { ...meta, total: corpusSalida.length, composiciones: corpusSalida });

  // Resumen para el humano que revisa
  const porRol = {};
  const porTier = {};
  for (const c of caracteres) {
    porRol[c.rol] = (porRol[c.rol] || 0) + 1;
    porTier[c.tier] = (porTier[c.tier] || 0) + 1;
  }
  process.stderr.write('\nBIBLIOTECA GENERADA\n');
  process.stderr.write(`  caracteres decorativos : ${caracteres.length}\n`);
  process.stderr.write(`  compuestos             : ${compuestos.size}\n`);
  process.stderr.write(`  alfabetos              : ${alfabetosSalida.length}\n`);
  process.stderr.write(`  ASCII literal omitido  : ${literales}\n`);
  process.stderr.write(`  por rol                : ${Object.entries(porRol).map(([k, v]) => `${k}=${v}`).join(' ')}\n`);
  process.stderr.write(`  por tier               : ${Object.entries(porTier).map(([k, v]) => `${k}=${v}`).join(' ')}\n`);
  const sinRevisar = caracteres.filter((c) => !c.revisado).length;
  process.stderr.write(`  pendientes de revisión : ${sinRevisar}\n`);
  process.stderr.write(`  corpus por esqueleto   : ${Object.entries(conteoEsq).map(([k, v]) => `${k.replace('esq.', '')}=${v}`).join(' ')}\n`);
  const huerfanos = corpusSalida.reduce((n, c) => n + c.lineas.reduce((m, l) => m + (l.fuera_de_biblioteca || 0), 0), 0);
  process.stderr.write(`  fuera de biblioteca    : ${huerfanos} (debe ser 0: todo el corpus tiene que ser reconstruible)\n`);
}

main().catch((e) => {
  process.stderr.write(`\nERROR ${e.codigo || ''}: ${e.message}\n`);
  process.exit(1);
});
