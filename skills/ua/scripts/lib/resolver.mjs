/**
 * resolver.mjs — convierte un plan de IDs en texto. Es el único camino de ID a glifo.
 *
 * Aquí es donde el mundo cerrado deja de ser una petición y pasa a ser una propiedad
 * estructural. El modelo no escribe glifos porque el plan no tiene ningún hueco donde
 * quepan: los slots `ref` solo admiten IDs de biblioteca y los slots `texto` están
 * acotados por E005 a ASCII imprimible más acentos del español.
 *
 * La diferencia con validar a posteriori importa: el fallo que hay que evitar no es
 * que el modelo desobedezca, es que NO PUEDE VER lo que escribe. Quitar los glifos de
 * su canal de salida elimina la clase de error entera en vez de vigilarla.
 */

import {
  cargar, unidad, vecinos, esqueleto as buscarEsqueleto, perfil as buscarPerfil,
  superficie as buscarSuperficie, alfabeto as buscarAlfabeto, ORDEN_TIER,
} from './biblioteca.mjs';
import { validar } from './validar.mjs';
import { escapar, utf16 } from './texto.mjs';

/** Texto del usuario admitido: ASCII imprimible más lo que necesita el español. */
const TEXTO_PERMITIDO = /^[\x20-\x7EáéíóúüñÁÉÍÓÚÜÑ¿¡]*$/;

function err(codigo, mensaje, detalle) { return { codigo, mensaje, detalle, severidad: 'error' }; }

class Contexto {
  constructor(plan, opciones) {
    this.b = cargar();
    this.plan = plan;
    this.errores = [];
    this.avisos = [];
    this.perfil = buscarPerfil(opciones.perfil || plan.perfil) || null;
    this.superficie = buscarSuperficie(opciones.superficie || plan.superficie) || null;
    const esp = plan.espaciador && unidad(plan.espaciador);
    this.espaciador = esp ? esp : this.b.porHex.get('0020');
  }

  /** Resuelve un ID. Un ID inexistente no produce texto raro: produce E001 con vecinos. */
  refA(id, slot) {
    const u = unidad(id);
    if (!u) {
      this.errores.push(err('E001', `ID desconocido «${id}» en el slot «${slot}»`, { vecinos: vecinos(id) }));
      return '';
    }
    if (this.perfil) {
      const max = ORDEN_TIER[this.perfil.tier_minimo] ?? 3;
      if ((ORDEN_TIER[u.tier] ?? 3) > max) {
        this.errores.push(err('E011',
          `«${id}» es tier ${u.tier} y el perfil ${this.perfil.id} exige ${this.perfil.tier_minimo} o mejor`,
          { motivo: u.motivo_tier || `bloque ${u.bloque}` }));
        return '';
      }
    }
    return String.fromCodePoint(...u.cp);
  }

  /** Contraparte de un corchete, para los ensamblados en espejo. */
  espejoDe(id, slot) {
    const u = unidad(id);
    if (!u) return this.refA(id, slot);
    if (u.atomico) return this.refA(id, slot); // un compuesto es su propio espejo
    // Solo los corchetes se reflejan en su pareja; un arco se usa simétrico.
    if (u.rol !== 'cor') return this.refA(id, slot);
    if (u.par) { const otro = this.b.porHex.get(u.par); if (otro) return this.refA(otro.id, slot); }
    for (const c of this.b.caracteres) {
      if (c.par === u.hex?.[0] && c.rol === 'cor') return this.refA(c.id, slot);
    }
    return this.refA(id, slot);
  }

  espacios(n) {
    return String.fromCodePoint(...this.espaciador.cp).repeat(Math.max(0, n));
  }

  /**
   * Texto del usuario, con la transformación de alfabeto declarada.
   * Es el único hueco por donde podría entrar un glifo que nadie eligió, así que
   * está cerrado por los dos lados: se comprueba el rango de entrada (E005) y el
   * alfabeto tiene que ser uno declarado en la biblioteca.
   */
  texto(valor, slot, permitidos) {
    if (valor === undefined || valor === null) return '';
    const bruto = typeof valor === 'string' ? { valor } : valor;
    const v = String(bruto.valor ?? '');
    if (!TEXTO_PERMITIDO.test(v)) {
      const malos = [...v].filter((c) => !TEXTO_PERMITIDO.test(c))
        .map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')} «${c}»`);
      this.errores.push(err('E005',
        `El slot de texto «${slot}» solo admite ASCII imprimible y acentos del español. Fuera de rango: ${malos.join(', ')}`,
        { pista: 'La decoración va por los slots de referencia, con IDs de biblioteca. El canal de texto es solo para contenido.' }));
      return '';
    }
    const tId = bruto.transform || 'alf.plano';
    if (tId === 'alf.plano') return v;
    if (permitidos && !permitidos.includes(tId)) {
      this.errores.push(err('E002', `El slot «${slot}» no admite el alfabeto «${tId}». Permitidos: ${permitidos.join(', ')}`));
      return v;
    }
    const alf = buscarAlfabeto(tId);
    if (!alf) {
      this.errores.push(err('E001', `Alfabeto desconocido «${tId}»`,
        { vecinos: this.b.alfabetos.map((a) => ({ id: a.id, rol: 'alfabeto', tier: '-', croquis: '-' })).slice(0, 6) }));
      return v;
    }
    let faltantes = 0;
    const out = [...v].map((c) => {
      const h = alf.mapa[c];
      if (h) return String.fromCodePoint(parseInt(h, 16));
      if (/[A-Za-z0-9]/.test(c)) faltantes++;
      return c;
    }).join('');
    if (faltantes) {
      this.avisos.push({
        codigo: 'W109', severidad: 'aviso',
        mensaje: `El alfabeto ${tId} no cubre ${faltantes} carácter(es) de «${v}»; salen sin transformar, lo que produce una mezcla visual incoherente`,
        detalle: { cobertura: alf.cobertura },
      });
    }
    return out;
  }
}

const comoLista = (v) => (v === undefined || v === null ? [] : (Array.isArray(v) ? v : [v]));

function valorEntero(ctx, ref, slots, def) {
  if (typeof ref === 'number') return ref;
  if (typeof ref === 'string' && ref.startsWith('$')) {
    const v = slots[ref.slice(1)];
    return typeof v === 'number' ? v : def;
  }
  return def;
}

/** Ejecuta los pasos de `ensamblado` de un esqueleto. */
function ejecutar(ctx, pasos, slots, contrato) {
  let out = '';
  const permitidosDe = (n) => contrato?.slots.find((s) => s.nombre === n)?.transform_permitido;

  for (const paso of pasos) {
    if (paso.esp !== undefined) {
      out += ctx.espacios(valorEntero(ctx, paso.esp, slots, 1));
      continue;
    }
    if (paso.texto !== undefined) {
      out += ctx.texto(slots[paso.texto], paso.texto, permitidosDe(paso.texto));
      continue;
    }
    if (paso.intercalar) {
      const [nm, nt] = paso.intercalar;
      const motivos = comoLista(slots[nm]);
      const tiradas = comoLista(slots[nt]);
      motivos.forEach((id, i) => {
        out += ctx.refA(id, nm);
        if (i < motivos.length - 1) out += ctx.espacios(Number(tiradas[i % Math.max(1, tiradas.length)]) || 1);
      });
      continue;
    }
    if (paso.slot !== undefined) {
      let items = comoLista(slots[paso.slot]);
      if (paso.orden === 'inverso') items = items.slice().reverse();
      const veces = paso.repetir !== undefined ? valorEntero(ctx, paso.repetir, slots, 1) : 1;
      for (let r = 0; r < veces; r++) {
        for (const id of items) {
          out += paso.espejo ? ctx.espejoDe(id, paso.slot) : ctx.refA(id, paso.slot);
        }
      }
      continue;
    }
  }
  return out;
}

/** Comprueba el plan contra el contrato de slots del esqueleto (E003 / E002). */
function verificarContrato(ctx, contrato, slots) {
  const conocidos = new Set(contrato.slots.map((s) => s.nombre));
  for (const nombre of Object.keys(slots)) {
    if (!conocidos.has(nombre)) {
      ctx.errores.push(err('E003',
        `El esqueleto ${contrato.id} no tiene ningún slot «${nombre}». Slots válidos: ${[...conocidos].join(', ')}`));
    }
  }
  for (const s of contrato.slots) {
    const v = slots[s.nombre];
    const vacio = v === undefined || v === null || (Array.isArray(v) && !v.length) || v === '';
    if (s.obligatorio && vacio) {
      ctx.errores.push(err('E003', `Falta el slot obligatorio «${s.nombre}» de ${contrato.id}`,
        { detalle: s.nota || null }));
      continue;
    }
    if (vacio) continue;

    if (s.tipo === 'entero') {
      const n = Number(v);
      if (!Number.isInteger(n) || n < s.rango[0] || n > s.rango[1]) {
        ctx.errores.push(err('E003', `«${s.nombre}» debe ser un entero entre ${s.rango[0]} y ${s.rango[1]}; llegó ${JSON.stringify(v)}`));
      }
      continue;
    }
    if (s.tipo === 'lista_enteros') {
      const l = comoLista(v);
      for (const x of l) {
        if (!Number.isInteger(Number(x)) || x < s.rango[0] || x > s.rango[1]) {
          ctx.errores.push(err('E003', `«${s.nombre}» admite enteros entre ${s.rango[0]} y ${s.rango[1]}; llegó ${JSON.stringify(x)}`));
        }
      }
      continue;
    }
    if (s.tipo === 'texto' || s.tipo === 'lista_texto' || s.tipo === 'lista_subplanes') continue;

    const items = comoLista(v);
    if (s.min !== undefined && items.length < s.min) {
      ctx.errores.push(err('E003', `«${s.nombre}» necesita al menos ${s.min} elemento(s); llegaron ${items.length}`));
    }
    if (s.max !== undefined && items.length > s.max) {
      ctx.errores.push(err('E003', `«${s.nombre}» admite como mucho ${s.max} elemento(s); llegaron ${items.length}`));
    }
    for (const id of items) {
      const u = unidad(id);
      if (!u) { ctx.errores.push(err('E001', `ID desconocido «${id}» en «${s.nombre}»`, { vecinos: vecinos(id) })); continue; }
      if (s.roles && !s.roles.includes(u.rol)) {
        ctx.errores.push(err('E002',
          `«${id}» es rol ${u.rol} y el slot «${s.nombre}» admite [${s.roles.join(', ')}]`,
          { pista: `Busca alternativas con: ua buscar --rol ${s.roles[0]} --paleta ${(u.paletas || [])[0] || ''}` }));
      }
    }
  }
}

/** Ensambla una línea a partir de un (sub)plan. */
function ensamblarLinea(ctx, plan) {
  const contrato = buscarEsqueleto(plan.esqueleto);
  if (!contrato) {
    ctx.errores.push(err('E003', `Esqueleto desconocido «${plan.esqueleto}»`,
      { disponibles: ctx.b.esqueletos.filter((e) => !e.solo_ingesta).map((e) => e.id) }));
    return '';
  }
  if (contrato.solo_ingesta) {
    ctx.errores.push(err('E003',
      `«${contrato.id}» existe solo para guardar material de la ingesta que no encajó en ningún esqueleto. No se puede generar con él.`));
    return '';
  }
  if (ctx.perfil) {
    if ((ctx.perfil.esqueletos_prohibidos || []).includes(contrato.id)) {
      ctx.errores.push(err('E003', `El perfil ${ctx.perfil.id} prohíbe el esqueleto ${contrato.id}`,
        { permitidos: ctx.perfil.esqueletos }));
      return '';
    }
    if (ctx.perfil.esqueletos && !ctx.perfil.esqueletos.includes(contrato.id)) {
      ctx.errores.push(err('E003', `El perfil ${ctx.perfil.id} no admite ${contrato.id}. Admite: ${ctx.perfil.esqueletos.join(', ')}`));
      return '';
    }
  }

  const slots = plan.slots || {};
  verificarContrato(ctx, contrato, slots);

  // Esqueletos multilínea: apilar sub-planes o repetir filas.
  const pasoApilar = contrato.ensamblado.find((p) => p.apilar);
  if (pasoApilar) {
    const sub = comoLista(slots[pasoApilar.apilar]);
    const sangria = comoLista(slots[pasoApilar.sangria]);
    return sub.map((p, i) => {
      if (p && p.esqueleto === contrato.id) {
        ctx.errores.push(err('E003', 'Una pila no puede contener otra pila: un solo nivel de anidamiento.'));
        return '';
      }
      return ctx.espacios(Number(sangria[i]) || 0) + ensamblarLinea(ctx, p || {});
    }).join('\n');
  }

  const lineas = [];
  for (const paso of contrato.ensamblado) {
    if (paso.linea) { lineas.push(ejecutar(ctx, paso.linea, slots, contrato)); continue; }
    if (paso.por_fila) {
      for (const fila of comoLista(slots.filas)) {
        const conFila = { ...slots, $fila: fila };
        lineas.push(ejecutar(ctx, paso.por_fila.map((p) => (p.texto === '$fila' ? { texto: '$fila' } : p)), conFila, contrato));
      }
      continue;
    }
    if (!lineas.length) lineas.push('');
    lineas[lineas.length - 1] += ejecutar(ctx, [paso], slots, contrato);
  }
  return lineas.join('\n');
}

/**
 * Punto de entrada. Resuelve, valida por dentro y devuelve el resultado.
 * La validación NO es un paso aparte que se pueda saltar: `ua render` no imprime
 * nada si hay errores.
 */
export function renderizar(plan, opciones = {}) {
  const ctx = new Contexto(plan, opciones);
  const texto = ensamblarLinea(ctx, plan);

  let hallazgos = { errores: [], avisos: [] };
  if (!ctx.errores.length) {
    hallazgos = validar(texto, {
      superficie: opciones.superficie || plan.superficie,
      perfil: opciones.perfil || plan.perfil,
      estricto: false,
      esqueleto: plan.esqueleto,
    });
  }

  // El resolver y el validador comprueban tier a propósito (defensa en profundidad),
  // así que el mismo problema puede reportarse dos veces. Se muestra una.
  const unicos = (l) => {
    const vistos = new Set();
    return l.filter((h) => { const k = `${h.codigo}|${h.mensaje}`; if (vistos.has(k)) return false; vistos.add(k); return true; });
  };

  return {
    texto,
    escapado: escapar(texto),
    utf16: utf16(texto),
    errores: unicos([...ctx.errores, ...hallazgos.errores]),
    avisos: unicos([...ctx.avisos, ...hallazgos.avisos]),
    plan,
    superficie: ctx.superficie?.id || null,
    perfil: ctx.perfil?.id || null,
  };
}

// ────────────────────────────────────────────────────────────────────── emisores

const nombreConstante = (s) => (s || 'DECORACION').toUpperCase()
  .normalize('NFD').replace(/\p{M}/gu, '').replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'DECORACION';

/**
 * Emisores de código. Todos sacan los strings como escapes \uXXXX a propósito: el
 * archivo generado queda en ASCII puro y sobrevive a cualquier editor, a cualquier
 * configuración de git y a cualquier terminal — incluida una consola cp1252, que
 * destruiría los caracteres astrales sin dar ningún error.
 */
export function formatoSalida(r, formato = 'texto') {
  const lineas = r.texto.split('\n');
  const esc = (s) => escapar(s, { conservarAscii: false });
  const nom = nombreConstante(r.plan?.nombre);

  switch (formato) {
    case 'texto':
      return r.texto;

    case 'json':
      return JSON.stringify({
        texto: r.texto, lineas, utf16: r.utf16,
        superficie: r.superficie, perfil: r.perfil,
      }, null, 2);

    // Los comentarios generados van SIN acentos a propósito. El emisor promete un
    // archivo en ASCII puro, y una `ó` en un comentario rompe esa promesa igual que
    // la rompería en un string: sigue siendo un byte que cp1252 puede estropear.
    case 'constantes':
      return [
        '// Generado por UA (unicode-aesthetic). Escapes \\uXXXX a proposito: el archivo',
        '// queda en ASCII puro y sobrevive a cualquier editor, git o terminal.',
        `// utf16=${r.utf16}  superficie=${r.superficie || '-'}  perfil=${r.perfil || '-'}`,
        '',
        ...lineas.map((l, i) => `export const ${nom}${lineas.length > 1 ? `_L${i + 1}` : ''} = "${esc(l)}";`),
        lineas.length > 1 ? `\nexport const ${nom} = [${lineas.map((_, i) => `${nom}_L${i + 1}`).join(', ')}].join("\\n");` : '',
      ].join('\n');

    case 'discordjs':
      return [
        "import { EmbedBuilder } from 'discord.js';",
        '',
        '// Generado por UA (unicode-aesthetic). Los strings van escapados a proposito.',
        `// Presupuesto: ${r.utf16} unidades UTF-16. Recuerda que Discord suma titulo +`,
        '// descripcion + campos + pie de TODOS los embeds del mensaje contra un tope de 6000.',
        `const ${nom} = "${esc(r.texto)}";`,
        '',
        'export const embed = new EmbedBuilder()',
        '  .setColor(0x2b2d31)',
        `  .setTitle(${nom})`,
        '  .setDescription(CONTENIDO);',
        '',
        '// Comprobacion de presupuesto: hazla antes de enviar, no despues de que la API falle.',
        'export function comprobarPresupuesto(embeds) {',
        '  const total = embeds.reduce((n, e) => {',
        '    const d = e.data ?? e;',
        '    return n + [d.title, d.description, d.footer?.text, d.author?.name]',
        '      .filter(Boolean).reduce((a, s) => a + s.length, 0)',
        '      + (d.fields ?? []).reduce((a, f) => a + f.name.length + f.value.length, 0);',
        '  }, 0);',
        '  if (total > 6000) throw new Error(`Embeds a ${total}/6000 unidades UTF-16`);',
        '  return total;',
        '}',
      ].join('\n');

    case 'discordpy':
      return [
        'import discord',
        '',
        '# Generado por UA (unicode-aesthetic). Los strings van escapados a proposito.',
        `# Presupuesto: ${r.utf16} unidades UTF-16.`,
        `${nom} = "${esc(r.texto)}"`,
        '',
        'embed = discord.Embed(title=' + nom + ', description=CONTENIDO, color=0x2b2d31)',
      ].join('\n');

    case 'md':
      return lineas.join('  \n');

    default:
      return r.texto;
  }
}
