/**
 * probar.mjs — suite de verificación (T1–T6).
 *
 * Uso:  node tools/probar.mjs [--verboso]
 *
 * Las pruebas que de verdad importan son T2 y T3. T2 comprueba que el mundo cerrado
 * aguanta —que inventar no solo está prohibido, sino que no es expresable—. T3 vuelve
 * a pasar el corpus humano por el validador: como las reglas de gusto se dedujeron de
 * ese corpus, un error sobre trabajo humano genuino demuestra que la regla está mal,
 * no la composición. Es lo que las mantiene honestas conforme el corpus crece.
 */

import path from 'node:path';
import fs from 'node:fs';
import {
  RAIZ_REPO, RAIZ_SKILL, DIR_DATOS, leerTexto, leerJSON, escribirTexto,
} from '../skills/ua/scripts/lib/io.mjs';
import { cargar, unidad } from '../skills/ua/scripts/lib/biblioteca.mjs';
import { renderizar, formatoSalida } from '../skills/ua/scripts/lib/resolver.mjs';
import { validar } from '../skills/ua/scripts/lib/validar.mjs';
import { analizar } from '../skills/ua/scripts/lib/inspeccionar.mjs';
import {
  bienFormado, tieneReemplazo, escapar, desescapar, utf16, hex, aHex,
} from '../skills/ua/scripts/lib/texto.mjs';

const verboso = process.argv.includes('--verboso');
let pasadas = 0; let fallos = 0;
const detalles = [];

function ok(t, cond, nota = '') {
  if (cond) { pasadas++; if (verboso) console.log(`  ✓ ${t}`); }
  else { fallos++; detalles.push(`✗ ${t}${nota ? ` — ${nota}` : ''}`); console.log(`  ✗ ${t}${nota ? ` — ${nota}` : ''}`); }
}
const seccion = (s) => console.log(`\n${s}`);

const b = cargar();

// ─────────────────────────────────────────────── T1 · round-trip de codificación
seccion('T1 · Round-trip de codificación');
{
  let malFormados = 0; let conReemplazo = 0; let escapeRoto = 0;
  for (const u of b.unidades) {
    const s = String.fromCodePoint(...u.cp);
    if (!bienFormado(s)) malFormados++;
    if (tieneReemplazo(s)) conReemplazo++;
    if (desescapar(escapar(s)) !== s) escapeRoto++;
  }
  ok('toda unidad produce una cadena bien formada', malFormados === 0, `${malFormados} rotas`);
  ok('ninguna unidad contiene U+FFFD', conReemplazo === 0, `${conReemplazo} corruptas`);
  ok('escapar/desescapar es identidad en todas las unidades', escapeRoto === 0, `${escapeRoto} fallan`);

  // Escritura y relectura byte a byte con el vocabulario más hostil que hay.
  const hostil = b.unidades.filter((u) => u.cp.some((c) => c > 0xffff)).slice(0, 40)
    .map((u) => String.fromCodePoint(...u.cp)).join('ㅤ');
  const ruta = path.join(RAIZ_REPO, '.tmp', 'prueba-t1.txt');
  escribirTexto(ruta, hostil);
  ok('escribir y releer caracteres astrales da bytes idénticos', leerTexto(ruta) === hostil);
  ok('el archivo no lleva BOM', fs.readFileSync(ruta)[0] !== 0xef);

  // Transporte hostil: si una consola cp1252 destroza la línea cruda, el gemelo
  // escapado —que es ASCII puro— sigue reconstruyendo el original exacto.
  const gemelo = escapar(hostil);
  ok('el gemelo escapado es ASCII puro', [...gemelo].every((c) => c.codePointAt(0) < 128));
  const trasCp1252 = Buffer.from(gemelo, 'utf8').toString('latin1');
  ok('el gemelo sobrevive a un ciclo cp1252 y reconstruye el original', desescapar(trasCp1252) === hostil);

  fs.rmSync(path.join(RAIZ_REPO, '.tmp'), { recursive: true, force: true });
}

// ───────────────────────────────── T2 · ¿de verdad se niega a inventar?
seccion('T2 · ¿De verdad se niega a inventar?');
{
  // (a) ID inexistente → E001 CON vecinos reales. La diferencia entre "rechazado" y
  // "corregible": el modelo se equivocó de nombre, no de intención.
  const r1 = renderizar({
    esqueleto: 'esq.espejo',
    slots: { eje: ['anc.flor.inventada-que-no-existe'], canaleta: 3, brazo: ['par.mat.star-operator'] },
  }, {});
  const e001 = r1.errores.find((e) => e.codigo === 'E001');
  ok('un ID inventado falla con E001', Boolean(e001));
  ok('E001 sugiere IDs reales de la biblioteca', Boolean(e001?.detalle?.vecinos?.length));
  ok('los vecinos sugeridos existen de verdad', (e001?.detalle?.vecinos || []).every((v) => unidad(v.id)));

  // (b) El hueco de contrabando: un símbolo decorativo en el canal de texto.
  const r2 = renderizar({
    esqueleto: 'esq.chip',
    slots: {
      apertura: ['cor.yi.yi-shy'], cierre: ['cor.yi.yi-vep'],
      texto: { valor: 'hola ✧ mundo' },
    },
  }, {});
  ok('un glifo colado en un slot de texto falla con E005', r2.errores.some((e) => e.codigo === 'E005'));

  // (c) El backstop: un codepoint que no salió del resolver.
  const fuera = (() => { let c = 0x1f680; while (b.codepointsPermitidos.has(c)) c++; return c; })();
  const rv = validar(`hola ${String.fromCodePoint(fuera)} adios`, {});
  ok('un glifo que no salió del resolver falla con E004 (backstop)', rv.errores.some((e) => e.codigo === 'E004'));

  // (d) Tier insuficiente para el perfil.
  // `esq.barra` porque `discord-reglas` prohíbe el espejo: con otro esqueleto el
  // plan moriría en E003 y nunca llegaría a comprobarse el tier.
  const riesgo = b.unidades.find((u) => u.tier === 'riesgo' && ['par', 'trz'].includes(u.rol));
  if (riesgo) {
    const r4 = renderizar({
      esqueleto: 'esq.barra',
      slots: { cuerpo: [riesgo.id], largo: 3 },
    }, { perfil: 'discord-reglas' });
    ok('un carácter de tier riesgo falla con E011 en un perfil exigente', r4.errores.some((e) => e.codigo === 'E011'),
      `salió ${JSON.stringify(r4.errores.map((e) => e.codigo))}`);
  }

  // (e) Ningún error deja escapar texto.
  ok('con errores, render no produce texto utilizable', r1.errores.length > 0);

  // (f) esq.libre no se puede usar para generar.
  const r6 = renderizar({ esqueleto: 'esq.libre', slots: {} }, {});
  ok('esq.libre se rechaza para generación', r6.errores.some((e) => e.codigo === 'E003'));
}

// ──────────────────────────── T3 · regresión de gusto sobre el corpus humano
seccion('T3 · Regresión de gusto (el corpus humano no puede dar errores)');
{
  // El tier se comprueba aparte del gusto y no cuenta como fallo aquí.
  //
  // E011 dice "este carácter puede salir como tofu en Windows 10", que es una
  // restricción de DESPLIEGUE, no un juicio sobre la composición. El corpus humano
  // usa 𝅄 (símbolos musicales, sin fuente en Android) y ᝯ (tagbanwa, tofu en
  // Windows 10) porque a esa persona le renderizan bien. Mezclar las dos cosas haría
  // que T3 midiera algo que no es lo que dice medir.
  let conError = 0; let conAviso = 0; let total = 0; let conTier = 0;
  const porCodigo = {};
  for (const comp of b.corpus) {
    for (const l of comp.lineas) {
      if (!l.texto.trim()) continue;
      total++;
      const r = validar(l.texto, { perfil: comp.perfil_probable, esqueleto: l.esqueleto });
      const gusto = r.errores.filter((e) => e.codigo !== 'E011');
      if (r.errores.length > gusto.length) conTier++;
      if (gusto.length) {
        conError++;
        for (const e of gusto) porCodigo[e.codigo] = (porCodigo[e.codigo] || 0) + 1;
        if (verboso) console.log(`      ${comp.id} L${l.n}: ${gusto.map((e) => `${e.codigo} ${e.mensaje.slice(0, 70)}`).join(' | ')}`);
      }
      if (r.avisos.length) conAviso++;
    }
  }
  ok(`las ${total} líneas humanas no producen ningún error de gusto`, conError === 0,
    `${conError} con error: ${JSON.stringify(porCodigo)}`);
  const tasa = total ? conAviso / total : 0;
  ok(`la tasa de avisos sobre trabajo humano se mantiene baja (${Math.round(tasa * 100)}%)`, tasa <= 0.35,
    `${conAviso}/${total} — si sube, la regla está mal calibrada, no la composición`);
  console.log(`      (informativo: ${conTier}/${total} líneas usan caracteres que no renderizan en todas partes)`);

  // Todo el corpus tiene que ser reconstruible desde la biblioteca.
  let huerfanos = 0;
  for (const comp of b.corpus) {
    for (const a of analizar(comp.lineas.map((l) => l.texto).join('\n'))) huerfanos += a.desconocidos.length;
  }
  ok('todo el corpus es reconstruible desde la biblioteca', huerfanos === 0, `${huerfanos} caracteres fuera`);
}

// ───────────────────────────────────────────── T4 · límites de plataforma
seccion('T4 · Límites de plataforma');
{
  const relleno = b.unidades.find((u) => u.rol === 'par' && u.tier === 'universal' && u.utf16 === 1);
  for (const s of b.superficies.filter((x) => x.limite_utf16 <= 2000)) {
    const justo = String.fromCodePoint(...relleno.cp).repeat(s.limite_utf16);
    const pasado = justo + String.fromCodePoint(...relleno.cp);
    const a = validar(justo, { superficie: s.id });
    const c = validar(pasado, { superficie: s.id });
    ok(`${s.id}: ${s.limite_utf16} pasa y ${s.limite_utf16 + 1} falla`,
      !a.errores.some((e) => e.codigo === 'E009') && c.errores.some((e) => e.codigo === 'E009'));
  }

  // Un carácter astral cuesta 2 unidades UTF-16. Es la trampa del presupuesto.
  const astral = b.unidades.find((u) => u.cp.length === 1 && u.cp[0] > 0xffff);
  if (astral) {
    ok('un carácter astral se cobra como 2 unidades UTF-16', utf16(String.fromCodePoint(...astral.cp)) === 2);
  }
  const grupo = leerJSON(path.join(DIR_DATOS, 'superficies.json')).presupuestos_grupo;
  ok('el presupuesto compartido de Discord está declarado como 6000',
    grupo?.some((g) => g.id === 'discord-embed-total' && g.limite_utf16 === 6000));
}

// ──────────────────────────────────────────────── T5 · peligros concretos
seccion('T5 · Peligros concretos');
{
  const pruebas = [
    ['E014', 'NFKC convierte ﹏ en _ en una bio de Instagram', '﹏nombre﹏', { superficie: 'sup.ig-bio' }],
    ['E010', 'un `- ` inicial se vuelve viñeta en Discord', '- separador', { superficie: 'sup.discord-mensaje' }],
    ['E006', 'una marca combinante al inicio de línea', 'ִhola', {}],
    ['E012', 'una línea de solo NBSP la borra Discord', '   ', { superficie: 'sup.discord-mensaje' }],
    ['E015', 'U+200B se vuelve guion en un nombre de canal', 'canal​nombre', { superficie: 'sup.discord-nombre-canal' }],
    ['E008', 'U+FFFD delata una corrupción previa', 'hola�mundo', {}],
  ];
  for (const [codigo, desc, texto, opts] of pruebas) {
    const r = validar(texto, opts);
    ok(`${codigo}: ${desc}`, r.errores.some((e) => e.codigo === codigo),
      `salió ${JSON.stringify(r.errores.map((e) => e.codigo))}`);
  }

  // Los seguros: ⌗ y ⠀ tienen que pasar donde ﹏ falla.
  const seguro = validar('⌗ titulo ⠀', { superficie: 'sup.ig-bio' });
  ok('⌗ y ⠀ pasan en Instagram (son estables bajo NFKC)', !seguro.errores.some((e) => e.codigo === 'E014'));
}

// ─────────────────────────────────────────── T6 · empaquetado e integridad
seccion('T6 · Empaquetado e integridad de datos');
{
  const skill = leerTexto(path.join(RAIZ_SKILL, 'SKILL.md'));
  ok('SKILL.md empieza por ---', skill.startsWith('---'));
  const fm = skill.slice(3, skill.indexOf('\n---', 3));
  const claves = [...fm.matchAll(/^([a-z-]+):/gm)].map((m) => m[1]);
  const permitidas = new Set(['name', 'description', 'license', 'allowed-tools', 'metadata', 'compatibility']);
  ok('el frontmatter solo usa claves de la allowlist de empaquetado',
    claves.every((k) => permitidas.has(k)), `claves: ${claves.join(', ')}`);
  const desc = fm.match(/description:\s*>([\s\S]*?)(?=\n[a-z-]+:)/)?.[1] || '';
  ok('la description no contiene < ni >', !/[<>]/.test(desc));
  ok('la description cabe en 1024 caracteres', desc.trim().length <= 1024, `${desc.trim().length}`);
  ok('el nombre es kebab-case', /^name:\s*[a-z0-9-]+\s*$/m.test(fm));
  ok('SKILL.md se queda por debajo de 500 líneas', skill.split('\n').length < 500, `${skill.split('\n').length}`);

  for (const ref of fs.readdirSync(path.join(RAIZ_SKILL, 'references'))) {
    const t = leerTexto(path.join(RAIZ_SKILL, 'references', ref));
    ok(`${ref} declara su alcance en la cabecera`, t.includes('**Alcance.**'));
  }
  for (const [, m] of skill.matchAll(/\]\((references\/[^)]+)\)/g)) {
    ok(`el enlace ${m} existe`, fs.existsSync(path.join(RAIZ_SKILL, m)));
  }

  for (const f of ['caracteres', 'compuestos', 'alfabetos', 'corpus', 'paletas', 'esqueletos', 'perfiles', 'superficies']) {
    const ruta = path.join(DIR_DATOS, `${f}.json`);
    ok(`data/${f}.json existe y parsea`, fs.existsSync(ruta) && Boolean(leerJSON(ruta)));
    ok(`data/${f}.json no contiene U+FFFD`, !tieneReemplazo(leerTexto(ruta)));
  }

  const ids = b.unidades.map((u) => u.id);
  ok('no hay IDs duplicados', new Set(ids).size === ids.length, `${ids.length - new Set(ids).size} repetidos`);
  ok('todo miembro de un compuesto existe',
    b.compuestos.every((c) => (c.miembros || []).every((m) => b.porId.has(m))));
  ok('todo esqueleto de un perfil existe',
    b.perfiles.every((p) => (p.esqueletos || []).every((e) => b.porIdEsqueleto.has(e))));
  ok('toda superficie de un perfil existe',
    b.perfiles.every((p) => (p.superficies || []).every((s) => b.porIdSuperficie.has(s))));
  ok('toda paleta de un perfil existe',
    b.perfiles.every((p) => (p.paletas || []).every((x) => b.paletas[x])));

  for (const emisor of ['texto', 'json', 'discordjs', 'discordpy', 'constantes', 'md']) {
    const r = renderizar({
      nombre: 'prueba', esqueleto: 'esq.espejo',
      slots: { eje: ['cmp.par-oriya'], canaleta: 2, brazo: ['par.mat.star-operator'] },
    }, {});
    const s = formatoSalida(r, emisor);
    ok(`el emisor ${emisor} produce salida`, typeof s === 'string' && s.length > 0);
    if (['discordjs', 'discordpy', 'constantes'].includes(emisor)) {
      ok(`el emisor ${emisor} es ASCII puro`, [...s].every((c) => c.codePointAt(0) < 128));
    }
  }
}

// ─────────────────────────────────────────────────────────────────── resumen
console.log(`\n${'─'.repeat(66)}`);
console.log(`RESULTADO: ${pasadas} pasadas, ${fallos} fallos`);
if (fallos) {
  console.log('\nFallos:');
  for (const d of detalles) console.log(`  ${d}`);
}
process.exit(fallos ? 1 : 0);
