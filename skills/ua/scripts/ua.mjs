#!/usr/bin/env node
/**
 * ua.mjs — despachador único de la skill UA (unicode-aesthetic).
 *
 * Uso:  node skills/ua/scripts/ua.mjs <comando> [opciones]
 *
 * Toda la E/S pasa por lib/io.mjs en UTF-8. No hay redirección de shell en ningún
 * punto del proyecto: en esta plataforma, `>` de PowerShell 5.1 produce UTF-16LE y
 * `Set-Content` sin `-Encoding` produce cp1252, que destruye los caracteres del plano
 * astral sin lanzar ningún error.
 */

import {
  argumentos, leerEntrada, escribirTexto, emitirConGemelo, ErrorUA,
} from './lib/io.mjs';
import { cargar, buscar, vecinos, esqueleto, unidad } from './lib/biblioteca.mjs';
import { analizar, formatear } from './lib/inspeccionar.mjs';
import { renderizar, formatoSalida } from './lib/resolver.mjs';
import { validar, formatearHallazgos } from './lib/validar.mjs';

const AYUDA = `
UA · ensamblador de decoración Unicode de mundo cerrado

  ua buscar        --rol <r> [--paleta <p>] [--tier <t>] [--q <texto>] [--limite <n>]
                   Lista IDs de biblioteca con sus metadatos. Nunca devuelve glifos
                   crudos: el ensamblado se hace nombrando IDs, no tecleando símbolos.

  ua esqueleto     [--id <esq.x>] [--ejemplos <n>]
                   Contrato de slots de un esqueleto, con ejemplos reales del corpus.

  ua render        --plan <archivo|-> [--superficie <sup.x>] [--perfil <p>]
                   [--formato texto|json|discordjs|discordpy|constantes|md]
                   [--salida <archivo>]
                   Resuelve IDs a glifos, valida por dentro y emite. Si hay cualquier
                   error, no imprime nada.

  ua inspeccionar  --entrada <archivo|-> [--sin-tabla]
                   Descompone una composición: identidad exacta por token más un
                   croquis en ASCII con forma, ritmo y simetría.

  ua validar       --entrada <archivo|-> [--superficie <sup.x>] [--perfil <p>] [--estricto]
                   Sale con código 1 si hay errores. --estricto asciende los avisos.

  ua aprender      --entrada <archivo|-> [--aplicar]
                   Ingesta de una composición pegada. Simulacro salvo con --aplicar.

  ua perfiles      Lista perfiles y superficies disponibles.
  ua probar        Ejecuta la suite de verificación.
`;

async function cmdBuscar(a) {
  const res = buscar(a);
  if (!res.length) {
    console.log('Sin resultados. Prueba a relajar los filtros: `ua buscar --rol par --limite 40`');
    return 0;
  }
  console.log(`${res.length} resultado(s)  ·  filtros: ${JSON.stringify(a)}\n`);
  console.log('  ID                                   CROQ ROL  PESO TIER       FREC PALETAS');
  for (const u of res) {
    console.log(`  ${u.id.padEnd(36)} ${String(u.croquis || '?').padEnd(4)} ${u.rol.padEnd(4)} `
      + `${String(u.peso_visual ?? '-').padEnd(4)} ${u.tier.padEnd(10)} ${String(u.frecuencia || 0).padStart(4)} `
      + `${(u.paletas || []).join(',')}`);
  }
  console.log('\nUsa estos IDs en el plan. No teclees glifos: el resolver es el único camino de ID a símbolo.');
  return 0;
}

async function cmdEsqueleto(a) {
  const b = cargar();
  if (!a.id) {
    console.log('Esqueletos disponibles:\n');
    for (const e of b.esqueletos) {
      console.log(`  ${e.id.padEnd(18)} ${e.nombre.padEnd(14)} ${e.descripcion}`);
    }
    console.log('\nDetalle:  ua esqueleto --id esq.espejo');
    return 0;
  }
  const e = esqueleto(a.id);
  if (!e) {
    console.log(`Esqueleto desconocido: ${a.id}\nDisponibles: ${b.esqueletos.map((x) => x.id).join(', ')}`);
    return 1;
  }
  console.log(`${e.id} · ${e.nombre}\n${e.descripcion}\n`);
  console.log('SLOTS');
  for (const s of e.slots) {
    const detalle = s.tipo === 'entero'
      ? `entero ${s.rango[0]}–${s.rango[1]} (por defecto ${s.por_defecto})`
      : s.tipo === 'texto' ? `texto del usuario; transforms: ${(s.transform_permitido || []).join(', ')}`
        : `roles [${(s.roles || []).join(', ')}]  min=${s.min} max=${s.max}`;
    console.log(`  ${s.nombre.padEnd(14)} ${s.obligatorio ? '(obligatorio)' : '(opcional)  '}  ${detalle}`);
  }
  console.log(`\nENSAMBLADO  ${e.ensamblado}`);
  console.log(`INVARIANTES ${(e.invariantes || []).join(', ')}`);
  const n = Number(a.ejemplos || 2);
  const ejemplos = b.corpus.filter((c) => c.lineas.some((l) => l.esqueleto === e.id)).slice(0, n);
  if (ejemplos.length) {
    console.log('\nEJEMPLOS REALES DEL CORPUS (composiciones que un humano escribió)');
    for (const c of ejemplos) {
      for (const l of c.lineas.filter((x) => x.esqueleto === e.id)) {
        console.log(`  ${c.id}  densidad=${l.densidad}  utf16=${l.utf16}`);
        if (l.tokens) console.log(`    tokens: ${l.tokens.join(' ')}`);
      }
    }
  }
  return 0;
}

async function cmdInspeccionar(a) {
  const texto = await leerEntrada(a.entrada || a._[0]);
  const an = analizar(texto.replace(/\n$/, ''));
  console.log(formatear(an, { tabla: !a['sin-tabla'] }));
  return 0;
}

async function cmdValidar(a) {
  const texto = await leerEntrada(a.entrada || a._[0]);
  const r = validar(texto.replace(/\n$/, ''), {
    superficie: a.superficie, perfil: a.perfil, estricto: Boolean(a.estricto),
  });
  console.log(formatearHallazgos(r));
  return r.errores.length ? 1 : 0;
}

async function cmdRender(a) {
  const crudo = await leerEntrada(a.plan || a._[0]);
  let plan;
  try { plan = JSON.parse(crudo); } catch (e) {
    throw new ErrorUA('E003', `El plan no es JSON válido: ${e.message}`);
  }
  const r = renderizar(plan, { superficie: a.superficie, perfil: a.perfil });

  if (r.errores.length) {
    console.error('NO SE EMITE NADA — el plan tiene errores:\n');
    console.error(formatearHallazgos(r));
    return 1;
  }
  const salida = formatoSalida(r, a.formato || 'texto');
  if (a.salida) {
    escribirTexto(a.salida, salida.endsWith('\n') ? salida : salida + '\n');
    console.log(`Escrito en ${a.salida} (UTF-8, sin BOM, releído y comparado byte a byte).`);
  } else {
    console.log(a.formato && a.formato !== 'texto' ? salida : emitirConGemelo(r.texto));
  }
  if (r.avisos.length) console.error('\n' + formatearHallazgos({ errores: [], avisos: r.avisos }));
  return 0;
}

async function cmdPerfiles() {
  const b = cargar();
  console.log('PERFILES\n');
  for (const p of b.perfiles) {
    console.log(`  ${p.id.padEnd(22)} densidad ${p.densidad?.join('–') || '—'}  tier mínimo: ${p.tier_minimo}`);
    console.log(`  ${' '.repeat(22)} esqueletos: ${(p.esqueletos || []).join(', ')}`);
    console.log(`  ${' '.repeat(22)} superficies: ${(p.superficies || []).join(', ')}\n`);
  }
  console.log('SUPERFICIES\n');
  console.log('  ID                              LÍMITE  UNID   TRIM  NFKC  MARKDOWN');
  for (const s of b.superficies) {
    console.log(`  ${s.id.padEnd(31)} ${String(s.limite_utf16).padStart(5)}  utf16  `
      + `${(s.trim_extremos ? 'sí' : 'no').padEnd(5)} ${(s.normaliza_nfkc ? 'SÍ' : 'no').padEnd(5)} ${s.markdown}`);
  }
  console.log('\nAñadir una superficie nueva es añadir un registro a data/superficies.json.');
  console.log('No hay que tocar ningún .mjs: los destinos son datos, no código.');
  return 0;
}

async function cmdAprender(a) {
  const { analizarIngesta, informe, aplicar } = await import('./lib/aprender.mjs');
  const texto = await leerEntrada(a.entrada || a._[0]);
  const an = analizarIngesta(texto, { perfil: a.perfil, paleta: a.paleta });
  console.log(informe(an));
  if (!a.aplicar) return 0;
  console.log('\nAplicando…');
  const r = await aplicar(an);
  console.log(r.salida);
  console.log(`Listo. El corpus semilla creció y la biblioteca se reconstruyó.\nRespaldo previo: ${r.respaldo}`);
  return 0;
}

async function cmdProbar() {
  const { spawnSync } = await import('node:child_process');
  const path = await import('node:path');
  const { RAIZ_REPO } = await import('./lib/io.mjs');
  const r = spawnSync(process.execPath, [path.join(RAIZ_REPO, 'tools', 'probar.mjs'), ...process.argv.slice(3)], {
    stdio: 'inherit', cwd: RAIZ_REPO,
  });
  return r.status || 0;
}

const COMANDOS = {
  buscar: cmdBuscar,
  aprender: cmdAprender,
  probar: cmdProbar,
  esqueleto: cmdEsqueleto,
  esqueletos: cmdEsqueleto,
  inspeccionar: cmdInspeccionar,
  validar: cmdValidar,
  render: cmdRender,
  perfiles: cmdPerfiles,
};

async function main() {
  const cmd = process.argv[2];
  if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'ayuda') { console.log(AYUDA); return 0; }
  const fn = COMANDOS[cmd];
  if (!fn) {
    console.error(`Comando desconocido: ${cmd}`);
    console.error(AYUDA);
    return 1;
  }
  return fn(argumentos());
}

main()
  .then((c) => process.exit(c || 0))
  .catch((e) => {
    process.stderr.write(`\nERROR ${e.codigo || ''}: ${e.message}\n`);
    if (e.detalle?.vecinos) {
      process.stderr.write('\n¿Querías alguno de estos? (IDs reales de la biblioteca)\n');
      for (const v of e.detalle.vecinos) {
        process.stderr.write(`  ${v.id.padEnd(36)} rol=${v.rol} tier=${v.tier} croquis="${v.croquis}"\n`);
      }
    }
    process.exit(1);
  });
