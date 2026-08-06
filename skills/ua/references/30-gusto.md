# 30 · Reglas de gusto (R1–R10)

> **Alcance.** Qué hace que una composición se lea como escrita por una persona y no
> generada. Todos los números salen de medir las 88 líneas del corpus humano, no de
> estimarlos. Hermanos: [20-esqueletos.md](20-esqueletos.md) para la forma,
> [10-taxonomia.md](10-taxonomia.md) para el vocabulario.
>
> **Cómo usar esto.** Ábrelo cuando algo "no queda bien" y no sepas por qué, o cuando
> el usuario diga que parece hecho por una IA. Cada regla es comprobable con
> `ua inspeccionar`.

Una advertencia que vale por todo el archivo: estas reglas se derivaron del corpus, así
que **si un aviso salta sobre trabajo humano genuino, la regla está mal, no la
composición**. Dilo en vez de forzar el texto para callar al validador.

---

## §1 · R1 — Compensación de espacio

Una marca combinante (`\p{M}`) que va después de un espacio **se come esa separación**:
se adhiere al espacio y el hueco visual desaparece.

En el corpus lo compensas escribiendo un espacio de más. En `cps.0001`:

```
ᝯ ␣ ׅ ␣␣ ხɑ𝗌𝖾𝗌
        └─ dos espacios, no uno
```

Mismo patrón en `cps.0003` (`🌷᪲ ␣ׅ␣␣ 𝗇ɑ𝗆𝖾᪶`). Es la huella más humana de todo el
corpus: nadie escribe dos espacios seguidos por casualidad, sino porque vio que uno se
perdía.

**Al ensamblar:** después de un `sig` que sigue a un espaciador, pon un espaciador
extra. El detalle de por qué pasa está en `esq.chip`, y el generador lo evita
registrando esos clusters como artefactos y no como vocabulario.

## §2 · R2 — Los espejos humanos NO son perfectos

Medido: **solo 6 de 23 líneas de espejo son palíndromos exactos por ID.** Las otras 17
son casi simétricas, con un extremo distinto, un espaciador de más o un remate suelto.

Esto contradice lo que parece obvio, y es importante: la simetría matemática perfecta
es más fácil de generar que de escribir a mano, así que **un espejo impecable en cada
línea es en sí mismo una señal de generación automática**.

**Al ensamblar:** haz el espejo simétrico y rómpelo en un sitio — un extremo, un
espaciador final, un remate solo a un lado. `cps.0022` es el modelo: palíndromo de 9
tokens con un `ㅤ` colgando al final.

Canaleta (espaciadores a cada lado del eje): 3 es lo más común, el rango va de 0 a 4.

## §3 · R3 — Ritmo de espaciador irregular

Tiradas reales de las dispersiones del corpus:

```
2 1 1 2 1
2 2 3 3 4 4
1 2 4 4 5 1 1 4
2 3 3 3 1 3
1 1 3 3 6
2 1 2 2 2
```

Se repiten valores, pero **ninguna es constante de principio a fin**. Un vector como
`3 3 3 3 3` no aparece nunca.

**Es la delación número uno.** Cuando algo "se nota generado" y no sabes por qué, mira
primero `RITMO` en `ua inspeccionar`. W104 salta con la uniformidad.

## §4 · R4 — Densidad por esqueleto

`densidad = grafemas decorativos / grafemas totales`. Medido:

| Esqueleto | mín | **mediana** | máx | n |
|---|---|---|---|---|
| `esq.espejo` | 0.23 | **0.82** | 1.00 | 23 |
| `esq.marco` | 0.38 | **0.53** | 1.00 | 5 |
| `esq.chip` | 0.05 | **0.51** | 1.00 | 45 |
| `esq.dispersion` | 0.16 | **0.30** | 1.00 | 15 |

Apunta a la mediana de tu esqueleto. Los extremos existen, pero son casos concretos.

## §5 · R5 — Un ancla, un emoji

Medido: **solo 2 de 88 líneas llevan más de un emoji.** El máximo observado es 3, y es
excepcional.

La norma humana es **un foco por línea**. Dos emojis juntos compiten y ninguno gana
(W105). Si necesitas dos motivos, sepáralos con contenido, no los pegues.

## §6 · R6 — Coherencia de paleta

En el corpus, 🌸 va con `ᝯ` y `ᩔ`; 🌷 va con `೭` y `ᰪ`. Las dos son botánicas. La línea
de comida (🍢) nunca se mezcla con ellas.

La paleta no es el color: es la **familia semántica**. Un croissant y un jeroglífico
egipcio en la misma línea leen como un cajón de sastre, que es exactamente el aspecto
de una lista plana usada al azar.

**Al ensamblar:** filtra por `--paleta` desde el principio. W102 avisa si mezclas.

## §7 · R7 — Rastro terminal de periodo constante

Dos variantes medidas en `cps.0033`:

```
.   .   .   .   .   .        punto + 3 espacios, ×6
⠈.⠈.⠈.⠈.⠈.⠈.                braille + punto, ×6
```

El periodo es **constante dentro de un rastro** y la cuenta va de 3 a 6. Nunca se
mezclan dos periodos en el mismo rastro. Es la excepción a R3: en un rastro la
regularidad es lo correcto, porque el rastro es un gesto único.

## §8 · R8 — Marcas por base

Máximo observado: **6**, y solo en el blob curado de `cps.0033` (`⃟ੂ۪͙۫ׄ๑࿐`). El resto del
corpus se queda en 1 o 2.

Los blobs existen como unidades **atómicas** curadas, no como algo que se apile sobre
la marcha. Apilar marcas libremente da texto que Chromium recorta al salirse de la caja
de línea —o sea que ni se ve— pero que sí gasta presupuesto de caracteres. E007 corta.

## §9 · R9 — El contenido se queda legible

Decora **alrededor** del contenido, no el contenido.

NFKC pliega `𝗌𝖾𝗌` a `ses`, así que las letras matemáticas no son buscables. Y los
lectores de pantalla las anuncian una a una: `apples 𝐴𝑁𝐷 bananas` se lee "apples
mathematical italic capital a mathematical italic capital n…".

Un nombre corto en `alf.sans` está bien: es un gesto, y quien lo lee ya sabe de quién
habla. El texto de una regla de servidor, no: una norma que no se puede leer no es una
norma. Por eso el perfil `discord-reglas` tiene `texto_transformable: false`.

## §10 · R10 — Trazo y filete no se tocan

Ninguna línea del corpus pega un `─` directamente a un `︶`. Siempre hay un espaciador,
una partícula o un ancla en medio.

Son dos gramáticas distintas —la recta y la curva— y juntarlas sin transición produce
un empalme que se lee como error. Está codificado en `adyacencia.evita`.

---

## §11 · Diagnóstico rápido

Cuando el usuario diga "no me convence", corre `ua inspeccionar` y mira en este orden:

1. **RITMO** — ¿uniforme? Es lo primero, casi siempre es esto (R3).
2. **Densidad** — ¿lejos de la mediana de su esqueleto? Sosa o saturada (R4).
3. **Emojis** — ¿más de uno? Foco repartido (R5).
4. **EJE** — ¿simetría perfecta en todas las líneas? Demasiado limpio (R2).
5. **Paletas en la tabla** — ¿mezcla de familias? Cajón de sastre (R6).
6. **CROQUIS** — ¿todos los pesos iguales? Falta jerarquía: mezcla peso 1 con peso 3.
