/**
 * aprender.mjs — ingesta de una composición pegada por un humano.
 *
 * Es la ÚNICA vía por la que crece el vocabulario, y exige que un humano haya
 * escrito una composición real. De ahí sale la propiedad de cierre del sistema: el
 * modelo solo puede usar lo que un humano ya demostró.
 *
 * Escribe en tools/semilla/corpus-crudo.txt —la fuente— y reconstruye, en vez de
 * parchear los .json generados. Si tocara los datos derivados, el siguiente build
 * borraría lo aprendido; y peor, la biblioteca dejaría de ser reproducible desde sus
 * fuentes, que es lo que permite auditarla.
 *
 * Lo nuevo entra en cuarentena: paleta `experimental`, `revisado: false`. E011 lo
 * rechaza en cualquier perfil que exija tier universal o moderno. Así el vocabulario
 * crece sin que la calidad se degrade sola, y queda exactamente un punto donde el
 * juicio humano es obligatorio: promocionarlo.
 */

import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  RAIZ_REPO, leerTexto, escribirTexto, respaldar, restaurar, existe,
} from './io.mjs';
import { cargar } from './biblioteca.mjs';
import { clasificar, aTokens } from './clasificar.mjs';
import { propiedades, hex, grafemas } from './texto.mjs';

const RUTA_CORPUS = path.join(RAIZ_REPO, 'tools', 'semilla', 'corpus-crudo.txt');

/**
 * Rol propuesto para un carácter que la biblioteca no conoce.
 *
 * En runtime no hay bloques Unicode —el regex de JS no soporta `\p{Block=...}` y el
 * UCD solo se usa al construir—, así que la detección de trazo va por rango de
 * codepoint: U+2500–U+259F cubre Box Drawing y Block Elements enteros.
 */
function rolPropuesto(p) {
  if (p.marca) return { rol: 'sig', porque: 'es marca combinante (\\p{M}): se pega al carácter anterior' };
  if (p.espacio_unicode || p.ignorable) return { rol: 'esp', porque: 'no deja tinta' };
  if (p.emoji_presentacion) return { rol: 'anc', porque: 'es emoji con presentación a color' };
  if (['Ps', 'Pi'].includes(p.gc)) return { rol: 'cor', porque: `abre (categoría ${p.gc})` };
  if (['Pe', 'Pf'].includes(p.gc)) return { rol: 'cor', porque: `cierra (categoría ${p.gc})` };
  if (p.cp >= 0x2500 && p.cp <= 0x259f) return { rol: 'trz', porque: 'está en el rango de Box Drawing / Block Elements' };
  if (p.gc === 'Pd') return { rol: 'trz', porque: 'es guion (Pd)' };
  return { rol: 'par', porque: `sin señal clara: categoría ${p.gc}, script ${p.script}` };
}

const hashTokens = (tokens) => 'sha256:' + createHash('sha256').update(tokens.join(' ')).digest('hex').slice(0, 16);

/** Distancia de edición normalizada entre dos secuencias de token. */
function cercania(a, b) {
  const m = a.length; const n = b.length;
  if (!m || !n) return 1;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const fila = [i];
    for (let j = 1; j <= n; j++) {
      fila[j] = Math.min(prev[j] + 1, fila[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = fila;
  }
  return prev[n] / Math.max(m, n);
}

/**
 * Analiza una composición pegada sin escribir nada.
 * Devuelve todo lo que el humano necesita para decidir si la acepta.
 */
export function analizarIngesta(texto, { perfil, paleta } = {}) {
  const b = cargar();
  const limpio = texto.replace(/\r/g, '').replace(/\n+$/, '');
  const c = clasificar(limpio);

  const nuevos = new Map();
  const conocidos = new Set();
  for (const l of c.lineas) {
    for (const t of l.analisis.tokens) {
      if (t.tipo === 'unidad') { conocidos.add(t.unidad.id); continue; }
      if (t.tipo !== 'desconocido') continue;
      const cp = t.cps[0];
      const h = hex(cp);
      if (nuevos.has(h)) { nuevos.get(h).veces++; continue; }
      const p = propiedades(cp);
      const { rol, porque } = rolPropuesto(p);
      nuevos.set(h, {
        hex: h, cp, gc: p.gc, script: p.script, utf16: p.utf16,
        marca: p.marca, ignorable: p.ignorable, emoji: p.emoji,
        nfkc_activo_ascii: p.nfkc_activo_ascii,
        rol_propuesto: rol, porque, veces: 1,
      });
    }
  }

  // Duplicado exacto o casi: en vez de añadir otra composición, lo que aporta es
  // subir la frecuencia de lo que ya existe — que es lo que da sentido al orden de
  // `ua buscar`, porque hace que lo más usado por humanos salga primero.
  const tokens = c.lineas.flatMap((l) => aTokens(l.analisis));
  const hash = hashTokens(tokens);
  let duplicado = null;
  for (const comp of b.corpus) {
    const suyos = comp.lineas.flatMap((l) => l.tokens || []);
    if (comp.hash_tokens === hash) { duplicado = { id: comp.id, tipo: 'exacto', similitud: 1 }; break; }
    const d = cercania(tokens, suyos);
    if (d < 0.15) { duplicado = { id: comp.id, tipo: 'muy parecido', similitud: Number((1 - d).toFixed(3)) }; break; }
  }

  const siguienteId = 'cps.' + String(
    Math.max(0, ...b.corpus.map((x) => parseInt(String(x.id).replace('cps.', ''), 10) || 0)) + 1,
  ).padStart(4, '0');

  return {
    id: siguienteId,
    texto: limpio,
    lineas: limpio.split('\n'),
    clasificacion: c,
    tokens,
    hash,
    duplicado,
    nuevos: [...nuevos.values()],
    conocidos: [...conocidos],
    perfil: perfil || c.lineas[0]?.esqueleto === 'esq.marco' ? 'discord-bienvenida' : (perfil || 'bios'),
    paleta: paleta || 'experimental',
    marcas_max: Math.max(0, ...limpio.split('\n').map((l) => Math.max(0,
      ...grafemas(l).map((g) => [...g].slice(1).filter((x) => /\p{M}/u.test(x)).length)))),
  };
}

/** Informe en español del simulacro. No escribe nada. */
export function informe(a) {
  const o = [];
  o.push(`INGESTA · ${a.id}   (simulacro: no se ha escrito nada)`);
  o.push('');
  o.push(`  esqueleto detectado : ${a.clasificacion.esqueleto}`);
  o.push(`  motivo              : ${a.clasificacion.motivo}`);
  o.push(`  líneas              : ${a.lineas.length}`);
  o.push(`  tokens              : ${a.tokens.length}`);
  o.push(`  hash                : ${a.hash}`);
  o.push('');

  if (a.duplicado) {
    o.push(`  ⚠ DUPLICADO de ${a.duplicado.id} (${a.duplicado.tipo}, similitud ${a.duplicado.similitud}).`);
    o.push('    Al aplicarlo se subirá la frecuencia de lo existente en vez de añadir una entrada.');
    o.push('    No es un fallo: es lo que hace que `ua buscar` ordene por uso humano real.');
    o.push('');
  }

  o.push(`  ya en biblioteca    : ${a.conocidos.length} unidad(es)`);
  o.push(`  vocabulario nuevo   : ${a.nuevos.length} carácter(es)`);
  if (a.nuevos.length) {
    o.push('');
    o.push('    U+       GC  UTF16 ROL PROPUESTO   POR QUÉ');
    for (const n of a.nuevos) {
      o.push(`    ${n.hex.padEnd(8)} ${n.gc.padEnd(3)} ${String(n.utf16).padEnd(5)} ${n.rol_propuesto.padEnd(15)} ${n.porque}`);
      if (n.nfkc_activo_ascii) o.push('             ⚠ pliega a ASCII activo bajo NFKC: rompería en una bio de Instagram');
    }
    o.push('');
    o.push('    Todo esto entra EN CUARENTENA: paleta `experimental`, revisado: false.');
    o.push('    E011 lo rechaza en cualquier perfil que exija tier universal o moderno.');
    o.push('    Para promocionarlo, edita tools/semilla/curacion.json y vuelve a construir.');
  }

  o.push('');
  for (const l of a.clasificacion.lineas) {
    o.push(`  L${l.n} · ${l.esqueleto}  densidad=${l.analisis.densidad}  ritmo=${l.analisis.ritmo.tiradas.join(',') || '—'}`
      + `${l.analisis.ritmo.uniforme ? '  ⚠ uniforme' : ''}`);
    o.push(`       croquis  ${l.analisis.croquis}`);
  }

  o.push('');
  o.push('  Para aplicarlo:  ua aprender --entrada <archivo> --aplicar');
  return o.join('\n');
}

/**
 * Aplica la ingesta: añade al corpus semilla y reconstruye la biblioteca.
 * Con respaldo previo y restauración si la reconstrucción falla.
 */
export async function aplicar(a, { sello = String(Date.now()) } = {}) {
  if (!existe(RUTA_CORPUS)) throw new Error(`No encuentro el corpus semilla en ${RUTA_CORPUS}`);
  const respaldoCorpus = path.join(RAIZ_REPO, 'tools', 'semilla', `corpus-crudo.respaldo-${sello}.txt`);
  const antes = leerTexto(RUTA_CORPUS);
  escribirTexto(respaldoCorpus, antes);

  const nota = a.duplicado
    ? `variante de ${a.duplicado.id} (similitud ${a.duplicado.similitud})`
    : `aprendido ${new Date(Number(sello)).toISOString().slice(0, 10)}`;
  const bloque = [
    '',
    `=== ${a.id} | ${a.perfil} | ${a.paleta} | ${nota}`,
    ...a.lineas,
  ].join('\n');

  escribirTexto(RUTA_CORPUS, antes.replace(/\n*$/, '\n') + bloque + '\n');

  try {
    const { spawnSync } = await import('node:child_process');
    const r = spawnSync(process.execPath, [path.join(RAIZ_REPO, 'tools', 'construir-datos.mjs'), '--sin-red'], {
      encoding: 'utf8', cwd: RAIZ_REPO,
    });
    if (r.status !== 0) throw new Error(`la reconstrucción falló:\n${r.stderr}`);
    return { ok: true, respaldo: respaldoCorpus, salida: r.stderr };
  } catch (e) {
    restaurar(respaldoCorpus, RUTA_CORPUS);
    throw new Error(`${e.message}\n\nSe restauró el corpus desde ${respaldoCorpus}. La biblioteca no ha cambiado.`);
  }
}
