---
name: ua
description: >
  Compone decoración Unicode estética ensamblando SOLO caracteres de una biblioteca
  curada por humanos. Úsala siempre que el usuario pida decorar, embellecer o dar
  estilo a un texto con símbolos: reglas y normativa de Discord, mensajes de
  bienvenida, servidores de rol, bios de Instagram, TikTok, Discord, X o Telegram,
  separadores, divisores, banners, kaomojis, nombres decorados, embeds de bots, o
  cualquier cosa descrita como estética, cottagecore, kawaii, aesthetic o bonita.
  También cuando pregunte qué carácter es uno raro o cuánto ocupa una decoración.
  Composes aesthetic Unicode decorations by assembling only characters from a
  human-curated library. Use for Discord rules and welcome embeds, roleplay servers,
  Instagram TikTok Discord bios, dividers, banners, kaomoji, decorated names, bot
  embeds, and anything called aesthetic or cottagecore. NO la uses para traducir,
  para arte ASCII sin Unicode, ni para diseñar interfaces web.
license: MIT
allowed-tools: Read, Bash, Glob, Grep
---

# UA · ensamblador de decoración Unicode

Las rutas de abajo son relativas al directorio de esta skill. `$UA` = ruta de este
directorio; los comandos se ejecutan con `node $UA/scripts/ua.mjs …`.

## 1 · Qué es esto, y qué no

Esto **ensambla** decoración a partir de una biblioteca cerrada. No inventa símbolos.

La biblioteca contiene 655 caracteres, 45 compuestos y 10 alfabetos, y cada uno está
ahí por una razón concreta: un humano lo usó en una composición real o lo agrupó a
mano en un inventario. Es lo que separa esta skill de un generador cualquiera. Un
listado plano de símbolos —"separadores", "viñetas", "kaomojis"— produce combinaciones
uniformes y saturadas que se notan a la legua. La creatividad va en **cómo ensamblas**,
no en inventar vocabulario.

Hay un segundo motivo, más incómodo, y conviene tenerlo presente: **no puedes leer
estos caracteres mirándolos**. Está comprobado. `︶` parece un arco decorativo y es
U+FE36, un paréntesis de cierre cuyo NFKC es `)`. `𝅄` parece una estrella y es un
símbolo musical sin fuente en Android. `೭` parece un adorno y es el dígito siete en
kannada. Cualquier decisión que tomes por apariencia será sistemáticamente errónea.

El reparto que sale de ahí: **tú pones criterio y estructura; los scripts ponen
identidad, conteo y seguridad.**

## 2 · Las dos reglas que no se negocian

**No teclees glifos decorativos.** Nunca escribas `୨୧`, `꒰`, `𓂃` ni ningún símbolo
directamente en tu respuesta, en un archivo o en un plan. Se nombran por ID y el
resolver los convierte. No es una formalidad: es que el ID te da tier tipográfico,
pliegue NFKC y coste real en caracteres, y mirando el glifo no tienes nada de eso.

**No cuentes ni identifiques a ojo.** Para saber qué es un carácter o cuánto ocupa
algo, ejecuta `ua inspeccionar`. Una bio de Instagram tiene 150 unidades UTF-16 y un
jeroglífico gasta 2; calcularlo a ojo falla.

## 3 · Enrutado

| El usuario pide… | Perfil | Lee | Arranca con |
|---|---|---|---|
| reglas, normativa, canal de normas, info | `discord-reglas` | [40](references/40-perfil-reglas.md) | `ua buscar --paleta monolinea --tier universal` |
| bienvenida, verificación, roles, presentación | `discord-bienvenida` | [41](references/41-perfil-bienvenida.md) | `ua esqueleto --id esq.marco` |
| bio, Sobre mí, Instagram, TikTok, X, descripción corta | `bios` | [42](references/42-perfil-bios.md) | `ua perfiles` para ver el tope de esa superficie |
| embed, bot, discord.js, constante, README, código | `codigo` | [43](references/43-perfil-codigo.md) | `ua render --formato discordjs` |
| separador, divisor, línea decorativa | cualquiera | [20](references/20-esqueletos.md) | `ua esqueleto --id esq.barra` |
| "que quede más humano", "no me convence" | — | [30](references/30-gusto.md) | `ua inspeccionar` y mira RITMO y densidad |
| "aprende este diseño" + algo pegado | — | [60](references/60-aprender.md) | `ua aprender --entrada <archivo>` |
| "¿qué carácter es este?", "¿cuánto ocupa?" | — | — | `ua inspeccionar` — nunca a ojo |
| un destino que no está en la lista | — | [50](references/50-superficies.md) | añade un registro a `data/superficies.json` |

Si el destino no encaja en ningún perfil, usa `bios` para algo corto y
`discord-bienvenida` para algo largo, y dilo explícitamente.

## 4 · El flujo, en cinco pasos

1. **Fija destino.** Perfil + superficie. `ua perfiles` los lista con sus topes. El
   perfil acota estética; la superficie acota límites y markdown.
2. **Elige esqueleto.** `ua esqueleto` sin argumentos lista los seis; con `--id` te da
   el contrato de slots y ejemplos reales del corpus.
3. **Busca vocabulario.** `ua buscar --rol <r> --paleta <p> --tier <t>`. Sale ordenado
   por frecuencia de uso humano real, así que lo de arriba es lo que la gente escribe
   de verdad. Coge IDs de ahí.
4. **Escribe el plan** (§5) y ejecútalo con `ua render`. Si hay errores no imprime
   nada y te dice cuáles; los mensajes de E001 traen IDs reales parecidos.
5. **Entrega.** El texto crudo más el gemelo escapado. Para archivos, `--salida`.

Para varias líneas coherentes, usa `esq.pila` con un sub-plan por línea, o `esq.marco`
si es una caja.

## 5 · Anatomía de un plan

```jsonc
{
  "nombre": "separador bienvenida",      // opcional; da nombre a la constante en modo código
  "esqueleto": "esq.espejo",             // uno de los seis
  "perfil": "discord-bienvenida",
  "superficie": "sup.discord-embed-desc",
  "espaciador": "esp.braille.braille-blank",  // opcional; por defecto el espacio normal
  "slots": {
    "eje":      ["cmp.par-oriya"],       // slots `ref`: SOLO IDs de biblioteca
    "canaleta": 3,                       // slots numéricos
    "brazo":    ["par.dingbat.pointed-star", "fil.cjkcomp.right-parenthesis"],
    "extremo":  ["par.mat.conjugate-matrix"]
  }
}
```

Los slots de texto son distintos, y son el único sitio donde escribes caracteres:

```jsonc
"texto": { "valor": "melodía", "transform": "alf.sans" }
```

`valor` admite ASCII imprimible más acentos del español, y nada más (E005). Si metes
ahí un símbolo decorativo, falla: la decoración va por los slots de referencia. No es
burocracia — es lo que impide que el mundo cerrado sea puro teatro.

`transform` tiene que ser un alfabeto declarado. `alf.plano` deja el texto tal cual, y
**es lo correcto para cualquier texto que signifique algo**: los lectores de pantalla
deletrean las letras matemáticas una a una ("mathematical sans-serif s").

Ejecuta el plan pasándolo por archivo o por stdin:

```bash
node $UA/scripts/ua.mjs render --plan plan.json
```

## 6 · Los siete roles

Es el eje por el que está organizada la biblioteca. Los slots se declaran por rol, así
que saber esto es lo que te deja buscar rápido.

| Rol | Qué es | Cuándo |
|---|---|---|
| `anc` | ancla: emoji o glifo pesado | el foco. Una por línea, dos como mucho |
| `fil` | filete: arco o conector fino | unir, curvar, cerrar suave |
| `trz` | trazo: regla, esquina, caja | estructura: barras y marcos |
| `cor` | corchete: siempre en pareja | envolver texto o hacer de eje |
| `par` | partícula: flotante pequeño | el relleno de todo; el bucket más grande |
| `sig` | sigilo: marca combinante | textura fina. **Necesita base delante** |
| `esp` | espaciador: ancho sin tinta | ritmo y sangría |

Detalle de tiers, IDs y adyacencias: [references/10-taxonomia.md](references/10-taxonomia.md).

## 7 · Los seis esqueletos

`espejo` línea palindrómica, separador · `chip` etiqueta con hueco de texto ·
`barra` regla con motivo centrado · `dispersion` constelación con mucho aire ·
`marco` caja con contenido colgado · `pila` bloque multilínea.

Contratos y ejemplos: [references/20-esqueletos.md](references/20-esqueletos.md).

(`esq.libre` existe solo para guardar material de ingesta sin clasificar. No generes
con él; el resolver lo rechaza.)

## 8 · Cómo leer `ua inspeccionar`

Es tu única vista fiable de una composición. Dos capas:

La **tabla** da identidad exacta por token: ID, codepoint, categoría, rol, peso, tier
y pliegue NFKC. Aquí es donde descubres que ese arco tan mono se convierte en `)`.

El **CROQUIS** da un carácter ASCII por grafema. Léelo para forma y ritmo:

```
  CROQUIS  *_)_*_.___()___.__*_)_*__
  EJE      ────────────┼────────────   9/9 pares
  RITMO    espaciadores: 1 1 1 3 3 2 1 1 2   ✓ irregular
```

- **CROQUIS**: la silueta. Ves densidad y equilibrio sin ver un solo glifo exótico.
- **EJE**: simetría comprobada por secuencia de IDs, no por impresión visual.
- **RITMO**: longitudes de las tiradas de espaciador. `⚠ UNIFORME` es la señal que más
  delata una decoración generada — corrígela variando las tiradas.
- **NFKC** y **FUERA**: avisos de pliegue peligroso y de caracteres que no están en la
  biblioteca.

## 9 · Errores frecuentes y cómo salir

| Código | Qué pasó | Qué hacer |
|---|---|---|
| E001 | ID que no existe | El error lista IDs reales parecidos. Cógelos de ahí, no improvises otro nombre |
| E002 | rol incorrecto para ese slot | `ua buscar --rol <el que pide el slot>` |
| E003 | slot que falta, sobra o se sale de rango | `ua esqueleto --id <x>` y relee el contrato |
| E004 | glifo que no salió del resolver | Un símbolo entró por otra vía. Vuelve a montarlo con IDs |
| E005 | símbolo colado en un slot de texto | La decoración va en slots `ref`, no en el texto |
| E006 | línea que empieza por marca combinante | Pon una base delante o usa una partícula |
| E007 | demasiadas marcas sobre una base | Quita marcas; de todas formas Chromium recorta lo que se sale |
| E009 | pasa del tope de la superficie | Baja la canaleta o quita un aderezo. Recuerda: los astrales cuestan 2 |
| E010 | markdown activo | Cambia `-` por `–` `—` `─` `⎯`, que son inertes |
| E011 | tier insuficiente para el perfil | `ua buscar --tier <el que pide el perfil>` |
| E012 | línea que la plataforma va a borrar | Rellénala con `⠀` U+2800, que no es White_Space |
| E014 | NFKC convierte decoración en sintaxis | En Instagram evita `﹏` y `﹫`; usa `⌗` y `⠀`, que son estables |
| E015 | espaciador que se vuelve guion | En nombres de canal solo sobreviven U+3164 y U+2800 |

Los **avisos** (W1xx) no bloquean, pero suelen tener razón: salieron de medir
composiciones humanas reales. Si un aviso salta sobre trabajo humano genuino, la regla
está mal, no la composición — dilo en vez de forzar el texto.

## 10 · Referencias

Cárgalas solo cuando las necesites. Un nivel, sin cadenas.

| Archivo | Qué contiene | Cuándo abrirlo |
|---|---|---|
| [10-taxonomia.md](references/10-taxonomia.md) | roles, tiers, esquema de IDs, cómo leer los datos | al buscar vocabulario o dudar de un tier |
| [20-esqueletos.md](references/20-esqueletos.md) | los seis contratos, con ejemplos del corpus | al elegir o montar un esqueleto |
| [30-gusto.md](references/30-gusto.md) | R1–R10 con los números medidos del corpus | cuando algo "no queda humano" |
| [40-perfil-reglas.md](references/40-perfil-reglas.md) | Discord formal y normativa | perfil `discord-reglas` |
| [41-perfil-bienvenida.md](references/41-perfil-bienvenida.md) | bienvenidas y rol | perfil `discord-bienvenida` |
| [42-perfil-bios.md](references/42-perfil-bios.md) | bios con tope duro | perfil `bios` |
| [43-perfil-codigo.md](references/43-perfil-codigo.md) | emisores para cualquier repo | perfil `codigo` |
| [50-superficies.md](references/50-superficies.md) | topes, markdown, recorte, NFKC, y cómo añadir un destino | destino nuevo o duda de límites |
| [60-aprender.md](references/60-aprender.md) | protocolo de ingesta | el usuario pega una composición |

`data/*.json` es la autoridad. No parafrasees su contenido en prosa ni te fíes de
memoria: consúltalo con los comandos.

## 11 · Cómo entregar

Enseña el texto crudo para que se vea, y el **gemelo escapado** al lado. El gemelo es
ASCII puro, así que sobrevive a cualquier terminal o portapapeles; el crudo puede
llegar roto si el transporte no es UTF-8.

Para escribir a un archivo usa `--salida`, nunca redirección de shell. En Windows,
`>` de PowerShell 5.1 produce UTF-16LE y `Set-Content` sin `-Encoding` produce cp1252,
que **destruye los caracteres astrales sin dar ningún error**. `--salida` escribe
UTF-8 sin BOM y relee para comparar.

Si el usuario va a pegar el resultado en código, usa el perfil `codigo`: emite los
strings como escapes `\uXXXX`, y así el archivo queda en ASCII puro y sobrevive a
cualquier editor y a cualquier configuración de git.

## 12 · Cuando el usuario pega una composición

`ua aprender --entrada <archivo>` la descompone, la clasifica y dice qué vocabulario
es nuevo. Es un simulacro: no escribe nada sin `--aplicar`.

Lo aprendido entra **en cuarentena** (paleta `experimental`, `revisado: false`) y los
perfiles normales lo rechazan por E011. Es deliberado: el vocabulario crece sin que la
calidad se degrade sola. Promocionarlo exige que un humano edite
`tools/semilla/curacion.json`, y ese es el único punto del sistema donde el juicio
humano es estructuralmente obligatorio. Explícaselo así al usuario en vez de presentar
la cuarentena como un fallo.

Detalle: [references/60-aprender.md](references/60-aprender.md).
