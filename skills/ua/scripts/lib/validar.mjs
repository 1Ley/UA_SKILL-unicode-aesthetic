/**
 * validar.mjs — E001–E015 y W101–W109 sobre la cadena YA RESUELTA.
 *
 * Es defensa en profundidad, no la defensa principal. El mundo cerrado lo garantiza
 * el resolver: el modelo no puede teclear un glifo porque el plan no tiene hueco
 * donde quepa. Este módulo comprueba el resultado por si un glifo llegó por otra vía
 * —E004 es exactamente esa red— y verifica todo lo que depende del destino: topes,
 * markdown, recorte, normalización.
 *
 * Los ERRORES bloquean la salida. Los AVISOS la permiten y la anotan: son las reglas
 * de gusto, y esas se sacaron midiendo composiciones humanas reales. Si un aviso
 * salta sobre trabajo humano genuino, la regla está mal, no la composición.
 */

import { cargar, perfil as buscarPerfil, superficie as buscarSuperficie, ORDEN_TIER } from './biblioteca.mjs';
import { analizar } from './inspeccionar.mjs';
import {
  bienFormado, tieneReemplazo, grafemas, propiedades, hex, utf16, analisisNfkc,
} from './texto.mjs';

const E = (codigo, mensaje, detalle = null, linea = null) => ({ codigo, mensaje, detalle, linea, severidad: 'error' });
const W = (codigo, mensaje, detalle = null, linea = null) => ({ codigo, mensaje, detalle, linea, severidad: 'aviso' });

/** Inicios de línea que Discord y GitHub convierten en estructura. */
const INICIOS_MARKDOWN = [
  { re: /^\s*#{1,3}\s/, que: 'encabezado' },
  { re: /^\s*-#\s/, que: 'subtexto' },
  { re: /^\s*>{1,3}\s/, que: 'cita' },
  { re: /^\s*[-*+]\s/, que: 'viñeta de lista' },
  { re: /^\s*\d+\.\s/, que: 'lista numerada' },
];

/**
 * El markdown de Discord se dispara con delimitadores EMPAREJADOS: un `*` suelto se
 * renderiza tal cual. Contar en vez de marcar cualquier aparición evita una lluvia de
 * falsos positivos que acabaría enseñando a ignorar el validador.
 */
function riesgoMarkdown(linea) {
  const hallazgos = [];
  const cuenta = (c) => [...linea].filter((x) => x === c).length;
  if (cuenta('*') >= 2) hallazgos.push('dos o más `*` pueden emparejarse como cursiva o negrita');
  if (cuenta('_') >= 2) hallazgos.push('dos o más `_` pueden emparejarse como cursiva o subrayado');
  if (cuenta('`') >= 2) hallazgos.push('dos o más `` ` `` pueden emparejarse como código');
  if (linea.includes('~~')) hallazgos.push('`~~` es tachado');
  if (linea.includes('||')) hallazgos.push('`||` es spoiler');
  if (/\[[^\]]*\]\([^)]*\)/.test(linea)) hallazgos.push('`[texto](url)` es un enlace enmascarado');
  for (const { re, que } of INICIOS_MARKDOWN) {
    if (re.test(linea)) hallazgos.push(`el inicio de línea se interpreta como ${que}`);
  }
  return hallazgos;
}

export function validar(texto, opciones = {}) {
  const b = cargar();
  const errores = [];
  const avisos = [];
  const sup = buscarSuperficie(opciones.superficie);
  const per = buscarPerfil(opciones.perfil);
  const lineas = texto.split('\n');
  const analisis = analizar(texto);

  // ── E008 · integridad de codificación. U+FFFD es la huella de toda corrupción.
  if (!bienFormado(texto)) {
    errores.push(E('E008', 'La cadena tiene surrogates sueltos; al codificar a UTF-8 se volverían U+FFFD.'));
  }
  if (tieneReemplazo(texto)) {
    errores.push(E('E008', 'La cadena contiene U+FFFD: algo la corrompió antes de llegar aquí (probablemente un paso por cp1252 o UTF-16).'));
  }

  // ── E004 · red de seguridad del mundo cerrado.
  const fuera = new Map();
  for (const cp of [...texto]) {
    const c = cp.codePointAt(0);
    if (!b.codepointsPermitidos.has(c)) fuera.set(hex(c), (fuera.get(hex(c)) || 0) + 1);
  }
  if (fuera.size) {
    errores.push(E('E004',
      `${fuera.size} carácter(es) de la salida no pertenecen a ninguna unidad de la biblioteca: ${[...fuera.keys()].map((h) => 'U+' + h).join(', ')}`,
      { pista: 'Si es un símbolo que quieres usar, entra por `ua aprender` con una composición real. La biblioteca solo contiene lo que un humano ya escribió.' }));
  }

  // ── E009 · presupuesto de la superficie, en unidades UTF-16 (el pesimista).
  if (sup) {
    const n = utf16(texto);
    if (n > sup.limite_utf16) {
      errores.push(E('E009',
        `${n} unidades UTF-16 sobre un tope de ${sup.limite_utf16} en ${sup.id} (sobran ${n - sup.limite_utf16})`,
        { pista: 'Los caracteres del plano astral cuestan 2 unidades cada uno. Baja la canaleta o quita un aderezo antes que recortar a ciegas.' }));
    } else if (n > sup.limite_utf16 * 0.92) {
      avisos.push(W('W110', `${n}/${sup.limite_utf16} unidades: queda muy poco margen en ${sup.id}`));
    }
  }

  // ── E015 · nombres de canal: hay espacios que se vuelven guiones visibles.
  if (sup?.espacios_a_guion) {
    const conflictivos = [...texto].map((c) => hex(c.codePointAt(0)))
      .filter((h) => sup.espacios_a_guion.includes(h) && h !== '0020');
    if (conflictivos.length) {
      errores.push(E('E015',
        `${conflictivos.length} carácter(es) que ${sup.id} convierte en guion: ${[...new Set(conflictivos)].map((h) => 'U+' + h).join(', ')}`,
        { pista: 'Aquí los únicos espaciadores que sobreviven son U+3164 y U+2800: no están en la lista de conversión.' }));
    }
  }

  lineas.forEach((linea, i) => {
    const n = i + 1;
    const a = analisis[i];

    // ── E006 · una marca al inicio de línea se pega al texto que la preceda, que
    // puede ser el del usuario o el de otra persona.
    const primero = [...linea][0];
    if (primero && /\p{M}/u.test(primero)) {
      errores.push(E('E006',
        `La línea ${n} empieza por la marca combinante U+${hex(primero.codePointAt(0))}, que se adherirá a lo que haya delante`,
        { pista: 'Pon delante un carácter base, o usa una partícula con espacio propio en vez de una marca.' }, n));
    }

    // ── E012 · Discord e Instagram borran las líneas que solo llevan espacio en
    // blanco Unicode. Es la razón de existir de ㅤ y ⠀.
    if (sup?.trim_extremos && linea.length && !linea.trim().length) {
      errores.push(E('E012',
        `La línea ${n} solo contiene espacio en blanco Unicode y ${sup.id} la va a borrar`,
        { pista: 'Usa U+2800 (⠀) o U+3164 (ㅤ): no son White_Space, así que sobreviven al recorte.' }, n));
    }

    // ── E007 · marcas apiladas sobre una misma base.
    const maxMarcas = per?.marcas_por_base_max ?? 6;
    if (a.max_marcas_base > maxMarcas) {
      errores.push(E('E007',
        `La línea ${n} apila hasta ${a.max_marcas_base} marcas sobre una misma base; el máximo aquí es ${maxMarcas}`,
        { pista: 'Chromium recorta la tinta que se sale de la caja de línea, así que las marcas de más ni siquiera se ven, pero sí cuentan contra el tope de caracteres.' }, n));
    }

    // ── E010 · markdown activo.
    if (sup && sup.markdown !== 'ninguno') {
      const r = riesgoMarkdown(linea);
      if (r.length) {
        errores.push(E('E010', `La línea ${n} activa markdown en ${sup.id}: ${r.join('; ')}`,
          { pista: 'Para un guion decorativo usa – — ─ o ⎯, que son inertes. Si el guion tiene que ser literal, escápalo: \\-' }, n));
      }
    }

    // ── E013 · reordenamiento bidi.
    //
    // Hacen falta DOS letras RTL adyacentes. Una suelta entre texto LTR se queda
    // donde está por el propio algoritmo bidi, y el corpus lo aprovecha: `ﻌ`
    // (U+FECC, árabe) se usa como boca de gato en los kaomojis y funciona
    // perfectamente. Marcar cualquier carácter RTL era un falso positivo sobre
    // trabajo humano que funciona.
    const cps = [...linea];
    let corrida = 0; let maxCorrida = 0; let primeroRtl = null;
    for (const c of cps) {
      if (propiedades(c).rtl) { corrida++; if (!primeroRtl) primeroRtl = c; maxCorrida = Math.max(maxCorrida, corrida); } else corrida = 0;
    }
    if (maxCorrida >= 2) {
      errores.push(E('E013',
        `La línea ${n} tiene ${maxCorrida} letras RTL seguidas (desde U+${hex(primeroRtl.codePointAt(0))}), y eso sí reordena visualmente`,
        { pista: 'Una letra RTL aislada es inocua; una corrida de dos o más invierte el orden. Los puntos y acentos hebreos y árabes son marcas combinantes y nunca dan este problema.' }, n));
    }

    // ── E014 · NFKC. Es error donde la plataforma normaliza, aviso donde no.
    const nf = analisisNfkc(linea);
    if (nf.culpables.length) {
      const detalle = nf.culpables.map((c) => `U+${c.de.join('+')}→«${c.texto_a}»`).join(', ');
      if (sup?.normaliza_nfkc) {
        errores.push(E('E014',
          `${sup.id} normaliza a NFKC y la línea ${n} tiene decoración que se convierte en sintaxis: ${detalle}`,
          { pista: '⌗ (U+2317) y ⠀ (U+2800) son estables bajo NFKC; ﹏ y ﹫ no.' }, n));
      } else if (sup) {
        // Solo se avisa si hay un destino declarado. Sin destino no hay riesgo que
        // reportar, y el aviso sería ruido sobre cualquier análisis suelto.
        avisos.push(W('W111', `La línea ${n} tiene caracteres que plegarían a ASCII activo si el destino normalizase: ${detalle}`, null, n));
      }
    }

    if (!linea.trim()) return;

    // ── W104 · ritmo uniforme.
    //
    // Solo aplica a la dispersión. En un RASTRO terminal (R7) la regularidad es lo
    // correcto: el corpus escribe `.   .   .   .   .   .` con periodo constante
    // porque el rastro es un gesto único. Avisar en toda línea marcaba como
    // sospechoso trabajo humano deliberado.
    if (a.ritmo.uniforme && opciones.esqueleto === 'esq.dispersion') {
      avisos.push(W('W104',
        `La línea ${n} tiene tiradas de espaciador uniformes (${a.ritmo.tiradas.join(' ')})`,
        { pista: 'En el corpus humano las tiradas van 1 3 4 3 5. La regularidad perfecta es lo que más delata una decoración generada.' }, n));
    }

    // ── W101 · densidad fuera del rango del perfil.
    if (per?.densidad) {
      const [lo, hi] = per.densidad;
      if (a.densidad < lo) {
        avisos.push(W('W101', `Densidad ${a.densidad} por debajo de ${lo} para el perfil ${per.id}: la línea ${n} se queda sosa`, null, n));
      } else if (a.densidad > hi) {
        avisos.push(W('W101', `Densidad ${a.densidad} por encima de ${hi} para el perfil ${per.id}: la línea ${n} satura`, null, n));
      }
    }

    // ── W105 · dos emojis pegados pelean por ser el foco.
    const toks = a.tokens.filter((t) => t.tipo === 'unidad');
    for (let k = 1; k < toks.length; k++) {
      if (toks[k].unidad.emoji && toks[k - 1].unidad.emoji) {
        avisos.push(W('W105', `La línea ${n} tiene dos emojis adyacentes; ninguna línea del corpus humano lo hace`, null, n));
        break;
      }
    }
    if (per?.emojis_max !== undefined && a.emojis > per.emojis_max) {
      avisos.push(W('W105', `La línea ${n} usa ${a.emojis} emojis y ${per.id} recomienda como mucho ${per.emojis_max}`, null, n));
    }
    if (per?.anclas_max !== undefined && a.anclas > per.anclas_max) {
      avisos.push(W('W101', `La línea ${n} usa ${a.anclas} anclas y ${per.id} recomienda como mucho ${per.anclas_max}`, null, n));
    }

    // ── W102 · coherencia de paleta.
    if (per?.paletas) {
      const usadas = new Set();
      for (const t of toks) for (const p of (t.unidad.paletas || [])) usadas.add(p);
      const fuera2 = [...usadas].filter((p) => !per.paletas.includes(p) && p !== 'experimental');
      if (fuera2.length) {
        avisos.push(W('W102', `La línea ${n} mezcla paletas ajenas al perfil ${per.id}: ${fuera2.join(', ')}`, null, n));
      }
      const experimental = toks.filter((t) => (t.unidad.paletas || []).includes('experimental'));
      if (experimental.length && per.tier_minimo !== 'desconocido') {
        errores.push(E('E011',
          `La línea ${n} usa ${experimental.length} unidad(es) en cuarentena (paleta experimental), y ${per.id} exige tier ${per.tier_minimo}`,
          { pista: 'Lo aprendido por `ua aprender` entra sin revisar. Para promocionarlo hay que ponerle revisado: true a mano en data/caracteres.json.' }, n));
      }
    }

    // ── W107 · Default_Ignorable: un renderizador puede omitirlo por completo.
    const ignorables = toks.filter((t) => t.unidad.ignorable && t.unidad.rol === 'esp');
    if (ignorables.length && sup && !sup.espacios_a_guion) {
      avisos.push(W('W107',
        `La línea ${n} usa ${ignorables.length} espaciador(es) Default_Ignorable (${ignorables[0].unidad.id})`,
        { pista: 'U+2800 (⠀) es más seguro: no es ignorable, no es White_Space y su NFKC no cambia.' }, n));
    }

    // ── W108 · una tirada larga se lee en voz alta una vez por repetición.
    let repes = 1;
    const gs = grafemas(linea);
    for (let k = 1; k < gs.length; k++) {
      if (gs[k] === gs[k - 1]) { repes++; if (repes > 8) break; } else repes = 1;
    }
    if (repes > 8) {
      avisos.push(W('W108',
        `La línea ${n} repite el mismo carácter más de 8 veces seguidas`,
        { pista: 'Un lector de pantalla lo anuncia una vez por repetición: 40 guiones son 40 anuncios.' }, n));
    }

    // ── W106 · texto con significado transformado a letras matemáticas.
    const letras = a.tokens.filter((t) => t.tipo === 'letra' && t.alfabeto !== 'alf.plano');
    if (letras.length >= 4 && per && per.texto_transformable === false) {
      avisos.push(W('W106',
        `La línea ${n} transforma ${letras.length} letras y el perfil ${per.id} pide texto legible`,
        { pista: 'Los lectores de pantalla anuncian estas letras una a una («mathematical sans-serif s»). Decora alrededor del contenido, no el contenido.' }, n));
    }

    // ── W103 · un espejo que apenas es simétrico.
    //
    // El umbral es 50 %, no la perfección. Medido: solo 6 de 23 espejos del corpus
    // son palíndromos exactos, así que exigir simetría perfecta marcaría como error
    // el comportamiento humano normal — y de hecho la simetría impecable en todas
    // las líneas es en sí misma señal de generación automática (R2).
    const ratio = a.simetria.total ? a.simetria.pares / a.simetria.total : 1;
    if (opciones.esqueleto === 'esq.espejo' && ratio < 0.5) {
      avisos.push(W('W103',
        `La línea ${n} se declara espejo pero solo casan ${a.simetria.pares}/${a.simetria.total} pares`, null, n));
    }
  });

  // ── E011 · tier por debajo de lo que exige el perfil.
  if (per?.tier_minimo) {
    const max = ORDEN_TIER[per.tier_minimo] ?? 3;
    const malos = new Map();
    for (const a of analisis) {
      for (const t of a.tokens) {
        if (t.tipo === 'unidad' && (ORDEN_TIER[t.unidad.tier] ?? 3) > max) malos.set(t.unidad.id, t.unidad);
      }
    }
    for (const u of malos.values()) {
      errores.push(E('E011',
        `«${u.id}» es tier ${u.tier} y ${per.id} exige ${per.tier_minimo} o mejor`,
        { motivo: u.motivo_tier || `bloque ${u.bloque}`, pista: `Alternativas: ua buscar --rol ${u.rol} --tier ${per.tier_minimo}` }));
    }
  }

  if (opciones.estricto) {
    return { errores: [...errores, ...avisos.map((a) => ({ ...a, severidad: 'error', ascendido: true }))], avisos: [] };
  }
  return { errores, avisos };
}

export function formatearHallazgos(r) {
  const out = [];
  const errores = r.errores || [];
  const avisos = r.avisos || [];

  if (!errores.length && !avisos.length) {
    out.push('VALIDACIÓN: 0 errores, 0 avisos.');
    return out.join('\n');
  }
  if (errores.length) {
    out.push(`ERRORES (${errores.length}) — bloquean la salida`);
    for (const e of errores) {
      out.push(`  [${e.codigo}]${e.ascendido ? ' (aviso ascendido por --estricto)' : ''} ${e.mensaje}`);
      if (e.detalle?.pista) out.push(`           → ${e.detalle.pista}`);
      if (e.detalle?.motivo) out.push(`           motivo: ${e.detalle.motivo}`);
      if (e.detalle?.vecinos?.length) {
        out.push('           IDs reales parecidos:');
        for (const v of e.detalle.vecinos) out.push(`             ${v.id.padEnd(36)} rol=${v.rol} tier=${v.tier}`);
      }
      if (e.detalle?.disponibles) out.push(`           disponibles: ${e.detalle.disponibles.join(', ')}`);
      if (e.detalle?.permitidos) out.push(`           permitidos: ${e.detalle.permitidos.join(', ')}`);
    }
  }
  if (avisos.length) {
    if (errores.length) out.push('');
    out.push(`AVISOS (${avisos.length}) — permiten la salida, pero mira si tienen razón`);
    for (const a of avisos) {
      out.push(`  [${a.codigo}] ${a.mensaje}`);
      if (a.detalle?.pista) out.push(`           → ${a.detalle.pista}`);
    }
  }
  return out.join('\n');
}
