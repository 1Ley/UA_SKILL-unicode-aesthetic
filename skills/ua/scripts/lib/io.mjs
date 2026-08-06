/**
 * io.mjs — entrada/salida en UTF-8, con asertos.
 *
 * Toda lectura y escritura del proyecto pasa por aquí. La razón es concreta y está
 * comprobada en esta máquina: PowerShell 5.1 escribe UTF-16LE cuando rediriges con
 * `>` y ANSI cp1252 con `Set-Content` sin `-Encoding`. cp1252 no puede representar
 * un jeroglífico, así que lo sustituye por `?` sin lanzar ningún error, y git ve
 * bytes NUL en el UTF-16 y marca el archivo como binario. Ambos fallos son
 * silenciosos y destruyen datos.
 *
 * Node escribe UTF-8 sin BOM por defecto. Nada aquí usa redirección de shell.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bienFormado, tieneReemplazo, escapar } from './texto.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));

/** Raíz de la skill (skills/ua/), resuelta desde este archivo. Sirve igual si la
 *  skill está clonada, copiada en ~/.claude/skills/ o instalada como plugin. */
export const RAIZ_SKILL = path.resolve(AQUI, '..', '..');
export const DIR_DATOS = path.join(RAIZ_SKILL, 'data');
export const RAIZ_REPO = path.resolve(RAIZ_SKILL, '..', '..');

export class ErrorUA extends Error {
  constructor(codigo, mensaje, detalle = null) {
    super(mensaje);
    this.codigo = codigo;
    this.detalle = detalle;
  }
}

/** Verifica que una cadena es segura antes de escribirla. */
export function verificarCadena(s, contexto) {
  if (typeof s !== 'string') {
    throw new ErrorUA('E008', `${contexto}: se esperaba una cadena, llegó ${typeof s}`);
  }
  if (!bienFormado(s)) {
    throw new ErrorUA('E008', `${contexto}: la cadena tiene surrogates sueltos; al codificar a UTF-8 se volverían U+FFFD`);
  }
  if (tieneReemplazo(s)) {
    throw new ErrorUA('E008', `${contexto}: la cadena contiene U+FFFD, huella de una corrupción previa de codificación`);
  }
  return s;
}

export function leerTexto(p) {
  const s = fs.readFileSync(p, 'utf8');
  if (tieneReemplazo(s)) {
    throw new ErrorUA('E008', `${p}: el archivo contiene U+FFFD; se escribió con una codificación equivocada`);
  }
  return s;
}

export function escribirTexto(p, s) {
  verificarCadena(s, p);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s, 'utf8');
  // Releer y comparar: la única prueba real de que el round-trip aguantó.
  const vuelta = fs.readFileSync(p, 'utf8');
  if (vuelta !== s) {
    throw new ErrorUA('E008', `${p}: el archivo releído no coincide con lo escrito (¿conversión de fin de línea?)`);
  }
  return p;
}

export function leerJSON(p) {
  return JSON.parse(leerTexto(p));
}

/**
 * Escribe JSON con los caracteres crudos en UTF-8 (no `\u` escapado).
 * Crudo es mejor para revisar y para hacer diff; el `.gitattributes` marca estos
 * archivos `-text` para que ninguna conversión de fin de línea los toque.
 */
export function escribirJSON(p, obj) {
  const s = JSON.stringify(obj, null, 2) + '\n';
  return escribirTexto(p, s);
}

/** Copia de seguridad con marca temporal, previa a cualquier mutación de datos. */
export function respaldar(p, sello) {
  if (!fs.existsSync(p)) return null;
  const destino = p.replace(/\.json$/, `.respaldo-${sello}.json`);
  fs.copyFileSync(p, destino);
  return destino;
}

export function restaurar(respaldo, destino) {
  fs.copyFileSync(respaldo, destino);
}

export function existe(p) {
  return fs.existsSync(p);
}

/** Lee de un archivo o de stdin cuando la ruta es `-`. */
export async function leerEntrada(ruta) {
  if (ruta && ruta !== '-') return leerTexto(ruta);
  const trozos = [];
  for await (const t of process.stdin) trozos.push(t);
  const s = Buffer.concat(trozos).toString('utf8');
  if (tieneReemplazo(s)) {
    throw new ErrorUA('E008', 'stdin: llegó U+FFFD; el transporte corrompió la entrada. Usa --entrada <archivo>.');
  }
  return s;
}

/**
 * Imprime una cadena decorativa junto a su gemelo escapado.
 * El gemelo es ASCII puro: si el terminal, el portapapeles o un pipe cp1252 rompen
 * la primera línea, la segunda sigue reconstruyendo el original exacto.
 */
export function emitirConGemelo(s, { etiqueta = 'RESULTADO' } = {}) {
  const lineas = [];
  lineas.push(`--- ${etiqueta} (crudo) ---`);
  lineas.push(s);
  lineas.push(`--- ${etiqueta} (escapado, ASCII puro — recuperable siempre) ---`);
  lineas.push(escapar(s));
  return lineas.join('\n');
}

/** Parser de argumentos mínimo: `--clave valor` y `--bandera`. */
export function argumentos(argv = process.argv.slice(3)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const clave = a.slice(2);
      const sig = argv[i + 1];
      if (sig === undefined || sig.startsWith('--')) out[clave] = true;
      else { out[clave] = sig; i++; }
    } else out._.push(a);
  }
  return out;
}
