# 50 · Superficies: topes, markdown, recorte y normalización

> **Alcance.** Los destinos donde acaba el texto y qué le hace cada uno. Hermanos:
> [40](40-perfil-reglas.md)–[43](43-perfil-codigo.md) para los perfiles.
>
> **Cuándo abrirlo.** Al trabajar contra un destino nuevo, al no entender un error de
> límite o markdown, o para añadir una superficie que no existe.
>
> La autoridad es `data/superficies.json`. `ua perfiles` las lista con sus topes.

## §1 · Cómo se cuenta

**Siempre en unidades UTF-16**, que es el presupuesto pesimista. Discord cuenta de
forma inconsistente entre sus propias superficies: el contenido de mensaje parece
contar codepoints, pero el estado personalizado cuenta unidades UTF-16. Ante la
contradicción, se presupuesta por la más cara.

Consecuencia concreta: **un carácter del plano astral cuesta 2**. Un jeroglífico `𓂃`,
un bamum `𖤐` o una letra matemática `𝗇` gastan el doble de lo que aparentan. Una bio de
Instagram de 150 unidades se llena con 75 jeroglíficos.

Nunca cortes por longitud a ciegas: partir un par surrogate produce U+FFFD y corrompe
el texto en silencio. `ua render` ya corta por cluster de grafema.

## §2 · Discord

| Superficie | Tope |
|---|---|
| descripción de embed | 4096 |
| título / nombre de campo / autor | 256 |
| valor de campo | 1024 |
| pie | 2048 |
| **suma de TODOS los embeds del mensaje** | **6000** |
| contenido de mensaje | 2000 (los bots, siempre 2000) |
| Sobre mí | 190 |
| apodo | 32 |
| estado personalizado | 128 |
| nombre de canal | 100 |
| tema de canal | 1024 |

El tope de 6000 es el que más sorprende: **no es por embed, es la suma de título +
descripción + nombres y valores de campo + pie + autor de todos los embeds del
mensaje**. El emisor `discordjs` incluye un `comprobarPresupuesto()` para verificarlo
antes de enviar, en vez de descubrirlo cuando la API rechaza.

### Markdown

Se dispara con delimitadores **emparejados**: un `*` suelto se renderiza tal cual. El
validador cuenta apariciones en vez de marcar cualquiera, para no llenarte de falsos
positivos.

Al inicio de línea y **seguidos de espacio**: `# ## ###` encabezado, `-# ` subtexto,
`> ` cita, `- ` `* ` viñeta. Sin el espacio no se disparan, pero no te fíes.

**El guion inicial es la trampa habitual.** Un separador que empiece por `- ` se
convierte en viñeta. Sustitutos inertes: `–` `—` `─` `⎯`.

Buena noticia: `⌗` (U+2317) y `﹫` (U+FE6B) **son seguros**. El parser solo casa el `#`
y el `@` ASCII, así que los homoglifos no disparan nada — y por eso son precisamente el
recurso que usa la gente.

### Recorte

Discord recorta el espacio en blanco de los extremos y borra las líneas que solo
llevan blancos. El recorte mira la propiedad Unicode **White_Space**, no "parece
vacío". De ahí que:

| Carácter | White_Space | ¿Sobrevive? |
|---|---|---|
| `⠀` U+2800 braille | no | **sí — el más seguro** |
| `ㅤ` U+3164 hangul | no | sí, pero es Default_Ignorable (W107) |
| ` ` U+00A0 NBSP | **sí** | no |
| ` ` U+2003 em space | **sí** | no |

### Nombres de canal

Discord convierte a guion una lista documentada de espacios que **incluye U+200B y
U+FEFF**. Los únicos espaciadores que sobreviven ahí son U+3164 y U+2800, que no están
en esa lista. E015 lo comprueba.

## §3 · Instagram y otras redes

| Superficie | Tope |
|---|---|
| bio de Instagram | 150 |
| pie de publicación | 2200 |
| bio de TikTok | 80 |
| bio de X | 160 |
| bio de Telegram | 70 |
| Twitch | 300 |

**Instagram normaliza a NFKC**, y eso convierte decoración en sintaxis:

```
﹏ → _      ﹫ → @      ︶ → )      ︵ → (      ˚ → espacio + U+030A
```

En esa superficie **E014 es error, no aviso**. `⌗` y `⠀` son estables bajo NFKC y son
la alternativa.

Dos cosas más de Instagram: los saltos de línea en la bio solo sobreviven editando
desde instagram.com en navegador (la app móvil los quita), y el nombre de usuario es
ASCII puro (`a-z0-9._`) — la decoración solo cabe en el campo de nombre y en la bio.

**Las palabras por las que quieras que te encuentren, en ASCII plano.** NFKC pliega
`𝕗𝕒𝕟𝕔𝕪` a `fancy`, y no hay forma de comprobar desde fuera si el buscador de la
plataforma normaliza. En ASCII funciona en los dos casos.

## §4 · Añadir una superficie

Esto es lo que hace la skill universal en vez de específica de una plataforma. Añade un
registro a `data/superficies.json`; **no hay que tocar ningún `.mjs`**.

```jsonc
{
  "id": "sup.mi-destino",
  "nombre": "Mi app · campo de perfil",
  "limite_utf16": 200,
  "trim_extremos": true,        // ¿recorta blancos en los extremos?
  "permite_saltos": true,       // true | false | "solo-web"
  "markdown": "ninguno",        // "discord" | "ninguno" | "limitado"
  "normaliza_nfkc": false,      // true → E014 pasa a error
  "nota": "De dónde salió este límite."
}
```

Campos opcionales: `espacios_a_guion` (lista de hex que el destino convierte),
`prohibe_literales`, `minusculiza`, `forzar_escape`, `presupuesto_grupo`.

**Mide el límite, no lo supongas.** Si no lo sabes, empieza por `sup.generica-plana`,
prueba en el destino real y anota en `nota` de dónde salió el número. Un tope
inventado es peor que ninguno: da falsa confianza.

## §5 · Codificación

Escribe siempre con `ua render --salida <archivo>`, nunca con redirección de shell. En
Windows, `>` de PowerShell 5.1 produce UTF-16LE y `Set-Content` sin `-Encoding`
produce cp1252, que **sustituye los caracteres astrales por `?` sin dar ningún error**.
Git además ve los bytes NUL del UTF-16 y marca el archivo como binario.

`--salida` escribe UTF-8 sin BOM y relee para comparar byte a byte.

Para pegar en código, usa el perfil `codigo`: emite escapes `\uXXXX` y el archivo queda
en ASCII puro. Ver [43-perfil-codigo.md](43-perfil-codigo.md).
