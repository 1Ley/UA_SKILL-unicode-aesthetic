# 10 · Taxonomía: roles, tiers e IDs

> **Alcance.** Cómo está organizada la biblioteca y cómo consultarla. Hermanos:
> [20-esqueletos.md](20-esqueletos.md) para la forma, [30-gusto.md](30-gusto.md) para
> el criterio, [50-superficies.md](50-superficies.md) para los destinos.
>
> **Cuándo abrirlo.** Al buscar vocabulario, al dudar de si un carácter va a
> renderizar, o al no entender por qué el validador rechaza un ID.

## §1 · Esquema de ID

```
rol . familia . variante
 │      │          └─ del nombre Unicode: right-parenthesis, cherry-blossom
 │      └─ del bloque Unicode, abreviado: cjkcomp, oriya, egipcio, matalfa
 └─ uno de los siete roles
```

Los compuestos usan `cmp.<nombre>` y los alfabetos `alf.<estilo>`.

Los IDs son estables: `construir-datos.mjs` conserva el de cualquier registro con
`revisado: true`, aunque cambie el nombre derivado.

## §2 · Los siete roles

| Rol | Qué es | Señal que lo define | En biblioteca |
|---|---|---|---|
| `anc` | ancla | emoji a color o glifo pesado | 78 |
| `fil` | filete | arco, conector curvo | 20 |
| `trz` | trazo | regla, esquina, caja, bloque | 53 |
| `cor` | corchete | va en pareja | 59 |
| `par` | partícula | flotante pequeño; el cajón general | 361 |
| `sig` | sigilo | `General_Category` empieza por `M` | 81 |
| `esp` | espaciador | ancho sin tinta | 3 |

`par` es grande a propósito: es el bucket de todo lo pequeño que no tiene una función
estructural. Para afinar dentro de él, filtra por `peso_visual`.

**`sig` es el rol delicado.** Una marca combinante no ocupa sitio propio: se pega al
grafema anterior. Sin base delante se adhiere a lo que haya, incluido texto que no es
tuyo (E006). Y después de un espaciador se come la separación — de ahí R1.

## §3 · Peso visual

De 0 a 4: cuánta tinta aporta. Es lo que gobierna el ritmo.

| Peso | Qué | Ejemplos |
|---|---|---|
| 0 | espaciador | ` ` `⠀` `ㅤ` |
| 1 | hairline: marcas y modificadores | `ׅ` `࣪` `˚` |
| 2 | ornamento normal | `⊹` `✦` `⌗` |
| 3 | corchete o ancla no-emoji | `꒰` `୨୧` |
| 4 | emoji a color | `🌸` `🍡` |

Una línea con todo peso 2 se lee plana. Alterna: la firma del corpus es un pico (3–4)
rodeado de mucho 1–2.

## §4 · Tiers tipográficos

**Discord no aporta ninguna fuente para estos bloques.** Su stack (`gg sans`, `Noto
Sans`, Helvetica, Arial) no cubre ninguno, así que quien resuelve es el **sistema
operativo**. Consecuencia práctica: Discord de escritorio y Discord móvil se comportan
igual en el mismo SO, y la única variable real es el SO.

| Tier | Significa | En biblioteca |
|---|---|---|
| `universal` | está en Windows 10, Windows 11, Android e iOS | 505 |
| `moderno` | lo cubre una sola fuente, pero está en Win10+ y Android | 99 |
| `riesgo` | tofu en Windows 10 o fuente histórica | 51 |
| `desconocido` | aprendido, sin revisar | — |

Lo que hay detrás de `riesgo`, medido: `Sans Serif Collection` es **exclusiva de
Windows 11** y es la **única** cobertura de balinés, tai viet, lepcha y tagalo. Por eso
`᭡` —que es la mitad del corazón `ᥫ᭡`— sale tofu en Windows 10. Noto además marca el
balinés como cobertura parcial. Los símbolos musicales (`𝅄`) no tienen fuente en
Android.

Los perfiles fijan un `tier_minimo` y E011 lo hace cumplir. Si te lo rechaza, no
insistas: `ua buscar --rol <mismo> --tier <el que pide>` da alternativas del mismo rol.

## §5 · Compuestos

Unidades de varios codepoints que funcionan como una sola cosa. `ᥫ᭡` son **dos**
clusters de **dos scripts sin ninguna relación** (Tai Le U+196B + Balinés U+1B61) que
juntos leen como un corazón. Ninguna propiedad de Unicode expresa eso.

Llevan `atomico: true`: el resolver los emite enteros y no puedes direccionar un
miembro suelto. Es lo que evita medios corazones y marcas huérfanas. Su tier es el
**peor** de sus miembros.

## §6 · Alfabetos

Diez estilos derivados automáticamente del corpus: `sans`, `sans-negrita`,
`sans-negrita-cursiva`, `mono`, `script`, `script-negrita`, `cursiva`,
`negrita-cursiva`, `versalita`, `homoglifo`.

Ninguno cubre las 26 letras. `alf.sans` es el más completo con 19. Si transformas un
texto con letras no cubiertas, salen sin transformar y la mezcla se ve mal — W109 avisa
y da la cobertura real.

Un alfabeto puede tener varias variantes para la misma letra (`Ꭵ` cherokee y `ι` griega
hacen las dos de `i`). Están en `variantes`.

**Antes de transformar, lee [30-gusto.md §9](30-gusto.md).** El texto que significa algo
se queda en `alf.plano`.

## §7 · Consultar

```bash
ua buscar --rol sig --paleta botanico-pastel --tier universal --limite 15
ua buscar --q flower                 # busca en id, nombre y bloque
ua buscar --rol cor --fuente corpus  # solo lo que salió de una composición real
```

Sale ordenado por **frecuencia de uso humano**: lo de arriba es lo que la gente escribe
de verdad. Fiarte de ese orden es la forma más rápida de no sonar a generador.

`fuente` distingue el origen: `corpus` (usado en una composición) o `inventario`
(agrupado a mano, sin componer todavía).

## §8 · Los datos mandan

`data/*.json` es la autoridad. No parafrasees su contenido de memoria: `caracteres.json`
y `compuestos.json` se **regeneran** desde `tools/semilla/`, así que cualquier cosa que
escribas sobre ellos en prosa envejece. Consúltalos con `ua buscar` y `ua inspeccionar`.

Para reconstruir tras tocar la semilla:

```bash
node tools/construir-datos.mjs
```
