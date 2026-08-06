/**
 * inspeccionar.mjs — traduce una composición a una vista que un modelo sí puede leer.
 *
 * El problema que resuelve: está comprobado que mirar el glifo no funciona. `︶`
 * parece un arco decorativo y es U+FE36, un paréntesis de cierre cuyo NFKC es `)`;
 * `𝅄` parece una estrella y es un símbolo musical; `೭` parece un adorno y es el
 * dígito siete en kannada. Un modelo que decide a partir de la apariencia se
 * equivoca de forma sistemática.
 *
 * La salida tiene dos capas. La tabla da identidad exacta por token. El CROQUIS da un
 * mapa en ASCII puro —un carácter por grafema— donde forma, densidad, ritmo y
 * simetría se leen de un vistazo. Ese es el nivel de abstracción donde el criterio
 * del modelo sí es fiable, porque no depende de percibir nada.
 */

import { cargar } from './biblioteca.mjs';
import {
  grafemas, propiedades, aHex, hex, analisisNfkc, utf16, escapar,
} from './texto.mjs';

const LEYENDA = 'x=ancla  ~=filete  -=trazo  []=corchete  *=particula  .=sigilo  _=espaciador  A=texto  ?=fuera de biblioteca';

/**
 * Parte una cadena en tokens de biblioteca, con emparejamiento voraz al más largo.
 * Los compuestos van primero porque `ᥫ᭡` tiene que salir como una unidad y no como
 * dos mitades: media unidad es exactamente el error que delata una decoración mal
 * ensamblada.
 */
export function tokenizar(texto) {
  const b = cargar();
  const compuestosOrdenados = b.compuestos
    .slice()
    .sort((x, y) => y.cp.length - x.cp.length);

  const cps = [...texto].map((c) => c.codePointAt(0));
  const tokens = [];
  let i = 0;

  bucle:
  while (i < cps.length) {
    for (const c of compuestosOrdenados) {
      const n = c.cp.length;
      if (n > 1 && i + n <= cps.length && c.cp.every((v, k) => v === cps[i + k])) {
        tokens.push({ tipo: 'unidad', unidad: c, cps: c.cp.slice(), texto: String.fromCodePoint(...c.cp) });
        i += n;
        continue bucle;
      }
    }
    const cp = cps[i];
    const h = hex(cp);
    const car = b.porHex.get(h);
    if (car) {
      tokens.push({ tipo: 'unidad', unidad: car, cps: [cp], texto: String.fromCodePoint(cp) });
    } else if (cp >= 0x20 && cp <= 0x7e) {
      tokens.push({ tipo: 'texto', cps: [cp], texto: String.fromCodePoint(cp) });
    } else if (cp === 0x0a) {
      tokens.push({ tipo: 'salto', cps: [cp], texto: '\n' });
    } else {
      const enAlfabeto = (a) => Object.values(a.mapa || {}).includes(h)
        || Object.values(a.variantes || {}).some((l) => l.includes(h));
      const alf = b.alfabetos.find(enAlfabeto);
      if (alf) {
        const letra = Object.entries(alf.mapa).find(([, v]) => v === h)?.[0]
          ?? Object.entries(alf.variantes || {}).find(([, l]) => l.includes(h))?.[0];
        tokens.push({ tipo: 'letra', alfabeto: alf.id, letra, cps: [cp], texto: String.fromCodePoint(cp) });
      } else {
        tokens.push({ tipo: 'desconocido', cps: [cp], texto: String.fromCodePoint(cp) });
      }
    }
    i += 1;
  }
  return tokens;
}

const croquisDe = (t) => {
  if (t.tipo === 'unidad') return t.unidad.croquis || '?';
  if (t.tipo === 'texto') return t.texto === ' ' ? '_' : 'A';
  if (t.tipo === 'letra') return 'A';
  if (t.tipo === 'salto') return '\n';
  return '?';
};

const esEspaciador = (t) => (t.tipo === 'unidad' && t.unidad.rol === 'esp') || (t.tipo === 'texto' && t.texto === ' ');

/**
 * Vector de ritmo: longitudes de las tiradas consecutivas de espaciador.
 *
 * Convierte en números una de las señales más fuertes de autoría humana. En la línea
 * de dispersión del corpus las tiradas son 1, 3, 4, 3, 5 — nunca uniformes. Una
 * tirada constante (3 3 3 3 3) es la delación número uno de generación automática,
 * y así se puede comprobar en vez de opinar.
 */
function ritmo(tokens) {
  const tiradas = [];
  let n = 0;
  for (const t of tokens) {
    if (esEspaciador(t)) n++;
    else { if (n) tiradas.push(n); n = 0; }
  }
  if (n) tiradas.push(n);
  const interiores = tiradas.length > 2 ? tiradas.slice(1, -1) : tiradas;
  const uniforme = interiores.length >= 3 && new Set(interiores).size === 1;
  return { tiradas, uniforme };
}

/**
 * Simetría por secuencia de IDs, no por apariencia.
 * Los corchetes cuentan como espejo de su pareja: `꒰…꒱` es simétrico aunque los dos
 * extremos sean IDs distintos.
 */
function simetria(tokens) {
  const b = cargar();
  const sig = tokens.filter((t) => !esEspaciador(t));
  const espejoDe = (t) => {
    if (t.tipo !== 'unidad') return t.texto;
    // Un compuesto atómico es su propio espejo. Sin este corte, `cmp.par-oriya`
    // casaba con el carácter suelto U+0B67 —que sí declara pareja— y un espejo
    // perfecto se reportaba como asimétrico.
    if (t.unidad.atomico) return t.unidad.id;
    // Solo los CORCHETES se reflejan en su pareja. Un filete como `︶` tiene pareja
    // registrada (`︵`) porque Unicode los define como paréntesis, pero en esta
    // estética el arco se usa simétrico: el mismo carácter a los dos lados. Tratarlo
    // como corchete rompía la simetría de espejos que sí son perfectos.
    if (t.unidad.rol !== 'cor') return t.unidad.id;
    const par = t.unidad.par;
    if (par) { const otro = b.porHex.get(par); if (otro) return otro.id; }
    for (const [, c] of b.porHex) if (c.par === t.unidad.hex?.[0] && c.rol === 'cor') return c.id;
    return t.unidad.id;
  };
  const izq = sig.map((t) => (t.tipo === 'unidad' ? t.unidad.id : t.texto));
  const der = sig.slice().reverse().map(espejoDe);
  let pares = 0;
  for (let i = 0; i < izq.length; i++) if (izq[i] === der[i]) pares++;
  return { simetrica: pares === izq.length && izq.length > 0, pares, total: izq.length };
}

function densidad(tokens) {
  const gs = tokens.filter((t) => t.tipo !== 'salto');
  if (!gs.length) return 0;
  const deco = gs.filter((t) => t.tipo === 'unidad' && t.unidad.rol !== 'esp').length;
  return Number((deco / gs.length).toFixed(3));
}

/** Analiza una línea y devuelve datos estructurados (sin formatear). */
export function analizarLinea(linea, n = 1) {
  const tokens = tokenizar(linea);
  const r = ritmo(tokens);
  const s = simetria(tokens);
  const nfkc = analisisNfkc(linea);
  const anclas = tokens.filter((t) => t.tipo === 'unidad' && t.unidad.rol === 'anc').length;
  const emojis = tokens.filter((t) => t.tipo === 'unidad' && t.unidad.emoji).length;
  const desconocidos = tokens.filter((t) => t.tipo === 'desconocido');
  const marcasPorBase = grafemas(linea).map((g) => [...g].slice(1).filter((c) => /\p{M}/u.test(c)).length);

  return {
    n,
    texto: linea,
    escapado: escapar(linea),
    tokens,
    utf16: utf16(linea),
    codepoints: [...linea].length,
    grafemas: grafemas(linea).length,
    densidad: densidad(tokens),
    anclas,
    emojis,
    ritmo: r,
    simetria: s,
    nfkc,
    desconocidos,
    max_marcas_base: marcasPorBase.length ? Math.max(...marcasPorBase) : 0,
    croquis: tokens.map(croquisDe).join(''),
    tiers: [...new Set(tokens.filter((t) => t.tipo === 'unidad').map((t) => t.unidad.tier))],
  };
}

export function analizar(texto) {
  return texto.split('\n').map((l, i) => analizarLinea(l, i + 1));
}

/** Render legible del análisis. Esto es lo que el modelo lee de verdad. */
export function formatear(analisis, { tabla = true } = {}) {
  const out = [];
  for (const a of analisis) {
    out.push('');
    out.push(`LÍNEA ${a.n} · utf16=${a.utf16} · codepoints=${a.codepoints} · grafemas=${a.grafemas} · densidad=${a.densidad}`
      + ` · anclas=${a.anclas} · simétrica=${a.simetria.simetrica ? 'SÍ' : `NO (${a.simetria.pares}/${a.simetria.total})`}`);

    if (tabla && a.tokens.length) {
      out.push('');
      out.push('  #   ID                                   U+          GC  ROL  PESO TIER       NFKC');
      a.tokens.forEach((t, i) => {
        const num = String(i + 1).padStart(3);
        const cps = t.cps.map(hex).join('+');
        if (t.tipo === 'unidad') {
          const u = t.unidad;
          // Los compuestos no tienen gc ni nfkc propios: son secuencias, no codepoints.
          const pliegue = u.nfkc_activo_ascii
            ? `→ ${(u.nfkc || []).map((x) => 'U+' + x).join('+')} ¡ACTIVO!`
            : (u.nfkc_cambia ? `→ U+${(u.nfkc || []).join('+')}` : (u.atomico ? 'compuesto' : 'estable'));
          out.push(`  ${num} ${String(u.id).padEnd(36)} ${cps.padEnd(11)} ${String(u.gc || '--').padEnd(3)} `
            + `${String(u.rol || '?').padEnd(4)} ${String(u.peso_visual ?? '-').padEnd(4)} ${String(u.tier || '?').padEnd(10)} ${pliegue}`);
        } else if (t.tipo === 'letra') {
          out.push(`  ${num} ${(t.alfabeto + ' «' + t.letra + '»').padEnd(36)} ${cps.padEnd(11)} --  letra --   --         (letra alternativa)`);
        } else if (t.tipo === 'texto') {
          const p = propiedades(t.cps[0]);
          out.push(`  ${num} ${('texto ASCII «' + t.texto + '»').padEnd(36)} ${cps.padEnd(11)} ${p.gc.padEnd(3)} txt  --   universal  estable`);
        } else if (t.tipo === 'desconocido') {
          const p = propiedades(t.cps[0]);
          out.push(`  ${num} ${'*** FUERA DE BIBLIOTECA ***'.padEnd(36)} ${cps.padEnd(11)} ${p.gc.padEnd(3)} ??   --   ???        ${p.nfkc_activo_ascii ? '¡ACTIVO!' : ''}`);
        }
      });
    }

    out.push('');
    out.push(`  CROQUIS  ${a.croquis}`);
    out.push(`  LEYENDA  ${LEYENDA}`);
    if (a.simetria.total > 1) {
      const mitad = Math.floor(a.croquis.length / 2);
      out.push(`  EJE      ${'─'.repeat(mitad)}┼${'─'.repeat(Math.max(0, a.croquis.length - mitad - 1))}   ${a.simetria.pares}/${a.simetria.total} pares`);
    }
    out.push(`  RITMO    espaciadores: ${a.ritmo.tiradas.join(' ') || '(ninguno)'}   ${a.ritmo.uniforme ? '⚠ UNIFORME — delata generación automática (W104)' : '✓ irregular'}`);
    out.push(`  TIERS    ${a.tiers.join(', ') || '(sin unidades)'}`);
    if (a.max_marcas_base > 2) out.push(`  MARCAS   ⚠ hasta ${a.max_marcas_base} marcas sobre una misma base`);
    if (a.nfkc.culpables.length) {
      out.push(`  NFKC     ⚠ ${a.nfkc.culpables.length} carácter(es) pliegan a ASCII activo:`);
      for (const c of a.nfkc.culpables) {
        out.push(`             U+${c.de.join('+')} → «${c.texto_a}»  (rompe en superficies que normalizan, p. ej. bio de Instagram)`);
      }
    }
    if (a.desconocidos.length) {
      out.push(`  FUERA    ⚠ ${a.desconocidos.length} carácter(es) no están en la biblioteca:`);
      for (const d of a.desconocidos) {
        const p = propiedades(d.cps[0]);
        out.push(`             U+${p.hex}  gc=${p.gc}  ${p.script}   → añádelo componiendo con él vía \`ua aprender\``);
      }
    }
  }
  return out.join('\n');
}
