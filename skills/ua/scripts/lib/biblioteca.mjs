/**
 * biblioteca.mjs — el diccionario cerrado.
 *
 * Es la pieza que convierte "no inventes glifos" de una petición en una propiedad
 * estructural. El ensamblador solo puede nombrar IDs; este módulo es lo único que
 * sabe traducir un ID a codepoints, y solo conoce los que un humano usó en una
 * composición real o agrupó a mano en el inventario. Un ID que no existe no produce
 * una cadena rara: produce un fallo de diccionario con vecinos reales sugeridos.
 */

import path from 'node:path';
import { DIR_DATOS, leerJSON, existe, ErrorUA } from './io.mjs';

let cache = null;

const ARCHIVOS = {
  caracteres: 'caracteres.json',
  compuestos: 'compuestos.json',
  alfabetos: 'alfabetos.json',
  paletas: 'paletas.json',
  esqueletos: 'esqueletos.json',
  perfiles: 'perfiles.json',
  superficies: 'superficies.json',
  corpus: 'corpus.json',
};

const CLAVE_LISTA = {
  caracteres: 'caracteres',
  compuestos: 'compuestos',
  alfabetos: 'alfabetos',
  esqueletos: 'esqueletos',
  perfiles: 'perfiles',
  superficies: 'superficies',
  corpus: 'composiciones',
};

export const ORDEN_TIER = { universal: 0, moderno: 1, riesgo: 2, desconocido: 3 };

export function cargar({ recargar = false } = {}) {
  if (cache && !recargar) return cache;

  const crudo = {};
  for (const [clave, archivo] of Object.entries(ARCHIVOS)) {
    const ruta = path.join(DIR_DATOS, archivo);
    crudo[clave] = existe(ruta) ? leerJSON(ruta) : null;
  }
  if (!crudo.caracteres) {
    throw new ErrorUA('E100', 'Falta data/caracteres.json. Genera la biblioteca con: node tools/construir-datos.mjs');
  }

  const listar = (clave) => (crudo[clave] ? (crudo[clave][CLAVE_LISTA[clave]] || []) : []);

  const caracteres = listar('caracteres');
  const compuestos = listar('compuestos');
  const unidades = [...caracteres, ...compuestos];

  const porId = new Map(unidades.map((u) => [u.id, u]));
  const porHex = new Map();
  for (const c of caracteres) porHex.set(c.hex[0], c);

  // Todo codepoint que la biblioteca puede producir. Es el conjunto contra el que se
  // comprueba E004: si en la salida resuelta aparece algo que no está aquí, es que
  // un glifo entró por un camino que no es el resolver.
  const codepointsPermitidos = new Set();
  for (const c of caracteres) for (const cp of c.cp) codepointsPermitidos.add(cp);
  for (const c of compuestos) for (const cp of c.cp) codepointsPermitidos.add(cp);
  for (const a of listar('alfabetos')) {
    for (const h of Object.values(a.mapa || {})) codepointsPermitidos.add(parseInt(h, 16));
    for (const lista of Object.values(a.variantes || {})) {
      for (const h of lista) codepointsPermitidos.add(parseInt(h, 16));
    }
  }
  // ASCII imprimible y salto de línea: el canal de texto del usuario los necesita y
  // está acotado aparte por E005.
  for (let cp = 0x20; cp <= 0x7e; cp++) codepointsPermitidos.add(cp);
  codepointsPermitidos.add(0x0a);

  cache = {
    meta: crudo.caracteres,
    caracteres,
    compuestos,
    unidades,
    alfabetos: listar('alfabetos'),
    paletas: crudo.paletas?.paletas || {},
    esqueletos: listar('esqueletos'),
    perfiles: listar('perfiles'),
    superficies: listar('superficies'),
    corpus: listar('corpus'),
    porId,
    porHex,
    codepointsPermitidos,
    porIdEsqueleto: new Map(listar('esqueletos').map((e) => [e.id, e])),
    porIdPerfil: new Map(listar('perfiles').map((p) => [p.id, p])),
    porIdSuperficie: new Map(listar('superficies').map((s) => [s.id, s])),
    porIdAlfabeto: new Map(listar('alfabetos').map((a) => [a.id, a])),
  };
  return cache;
}

export function unidad(id) {
  return cargar().porId.get(id) || null;
}

/** Distancia de edición acotada, para sugerir vecinos reales ante un ID inventado. */
function distancia(a, b) {
  const m = a.length; const n = b.length;
  if (Math.abs(m - n) > 12) return 99;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const fila = [i];
    for (let j = 1; j <= n; j++) {
      fila[j] = Math.min(prev[j] + 1, fila[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = fila;
  }
  return prev[n];
}

/**
 * Vecinos plausibles de un ID que no existe.
 *
 * Es la diferencia entre "rechazado" y "corregible": el modelo se equivocó de nombre,
 * no de intención, así que se le devuelven candidatos del mismo rol y de la misma
 * familia en vez de un simple no. Sin esto, el bucle de reparación es "adivina otra
 * vez", que no converge.
 */
export function vecinos(idBuscado, { limite = 6 } = {}) {
  const b = cargar();
  const [rol, familia] = String(idBuscado).split('.');
  const candidatos = b.unidades.filter((u) => u.rol === rol);
  const conjunto = candidatos.length ? candidatos : b.unidades;
  return conjunto
    .map((u) => {
      let puntos = distancia(u.id, String(idBuscado));
      if (familia && u.id.split('.')[1] === familia) puntos -= 6;
      puntos -= Math.min(3, Math.log10(1 + (u.frecuencia || 0)) * 3);
      return { id: u.id, rol: u.rol, tier: u.tier, croquis: u.croquis, paletas: u.paletas, puntos };
    })
    .sort((x, y) => x.puntos - y.puntos)
    .slice(0, limite);
}

/** Consulta filtrada. Devuelve metadatos e IDs, nunca glifos crudos. */
export function buscar({
  rol, paleta, tier, q, fuente, incluirCompuestos = true, soloRevisados = false, limite = 25,
} = {}) {
  const b = cargar();
  let lista = incluirCompuestos ? b.unidades : b.caracteres;

  if (rol) { const roles = String(rol).split(','); lista = lista.filter((u) => roles.includes(u.rol)); }
  if (paleta) lista = lista.filter((u) => (u.paletas || []).includes(paleta));
  if (tier) {
    const max = ORDEN_TIER[tier];
    lista = lista.filter((u) => ORDEN_TIER[u.tier] <= max);
  }
  if (fuente) lista = lista.filter((u) => u.fuente === fuente);
  if (soloRevisados) lista = lista.filter((u) => u.revisado);
  if (q) {
    const t = String(q).toLowerCase();
    lista = lista.filter((u) => u.id.toLowerCase().includes(t)
      || (u.nombre || '').toLowerCase().includes(t)
      || (u.bloque || '').toLowerCase().includes(t));
  }

  // Orden por frecuencia de uso humano: lo que más se ha usado sale primero, así el
  // ensamblador gravita hacia lo que la gente escribe de verdad.
  return lista
    .slice()
    .sort((x, y) => (y.frecuencia || 0) - (x.frecuencia || 0) || x.id.localeCompare(y.id))
    .slice(0, Number(limite));
}

export function esqueleto(id) {
  return cargar().porIdEsqueleto.get(id) || null;
}
export function perfil(id) {
  return cargar().porIdPerfil.get(id) || null;
}
export function superficie(id) {
  return cargar().porIdSuperficie.get(id) || null;
}
export function alfabeto(id) {
  return cargar().porIdAlfabeto.get(id) || null;
}

/** Texto de una unidad. Es el ÚNICO camino de ID a glifo en todo el proyecto. */
export function textoDe(id) {
  const u = unidad(id);
  if (!u) throw new ErrorUA('E001', `ID desconocido: ${id}`, { vecinos: vecinos(id) });
  return String.fromCodePoint(...u.cp);
}
