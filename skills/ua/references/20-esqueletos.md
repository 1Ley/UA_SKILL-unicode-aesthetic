# 20 · Los seis esqueletos

> **Alcance.** La gramática de cada esqueleto y cómo rellenar sus slots. Hermanos:
> [10-taxonomia.md](10-taxonomia.md) para el vocabulario, [30-gusto.md](30-gusto.md)
> para las proporciones.
>
> **Cuándo abrirlo.** Al elegir forma, o cuando E003 se queje del contrato.
>
> La autoridad es `data/esqueletos.json`. Aquí va cómo usarlos; los contratos exactos
> los da `ua esqueleto --id <x>`, que además saca ejemplos reales del corpus.

Cómo se reparte el corpus humano: chip 45 líneas · espejo 23 · dispersión 15 · marco 5.

---

## §1 · `esq.espejo` — separador palindrómico

Línea sin texto, simétrica alrededor de un eje. Es el separador por defecto.

```
brazo(invertido)  canaleta  EJE  canaleta  brazo
```

| Slot | Roles | Cantidad |
|---|---|---|
| `eje` | cor, anc, par | 1–2 · obligatorio |
| `canaleta` | entero 0–4 | por defecto 3 |
| `brazo` | fil, par, sig, trz | 1–5 · obligatorio, de dentro afuera |
| `extremo` | par, anc, cor | 0–1 |

El `brazo` se escribe **de dentro hacia fuera** y el resolver lo refleja. Los
corchetes se reflejan en su pareja; los arcos y las partículas se reflejan en sí
mismos, que es como se usan de verdad en esta estética.

**Lee [30-gusto.md §2](30-gusto.md):** solo 6 de 23 espejos del corpus son exactos. Un
palíndromo impecable en cada línea delata generación. Rompe uno de los extremos.

Densidad esperada: mediana 0.82.

## §2 · `esq.chip` — etiqueta con texto

El formato más frecuente del corpus. Un hueco de texto con apertura, cierre y aderezos
asimétricos.

```
apertura  aderezo_izq  TEXTO  aderezo_der  cierre
```

| Slot | Roles | Cantidad |
|---|---|---|
| `apertura` / `cierre` | cor, par, anc | 1 cada uno · obligatorios |
| `aderezo_izq` / `aderezo_der` | par, sig, anc, fil | 0–3 |
| `texto` | texto del usuario | obligatorio |

**La asimetría es el punto.** Los aderezos de un lado y del otro no deben ser iguales:
`೭ ׁ 🌷᪲ ׅ  𝗇ɑ𝗆𝖾᪶ ׂ ᰪ` tiene apertura kannada, ancla + sigilo a la izquierda, y un
único sigilo más cierre lepcha a la derecha. Un chip simétrico se lee como plantilla.

Densidad esperada: mediana 0.51.

## §3 · `esq.barra` — regla decorativa

Trazo repetido con un motivo al centro. Sin texto.

| Slot | Roles | Cantidad |
|---|---|---|
| `cuerpo` | trz, fil, par | 1–3 · obligatorio |
| `largo` | entero 3–8 | por defecto 5 |
| `centro` | anc, par, cor | 0–2 |
| `remate` | par, anc | 0–1 |

`largo` está topado en 8 por accesibilidad, no por estética: un lector de pantalla
anuncia cada repetición, así que 40 guiones son 40 anuncios. W108 avisa por encima.

## §4 · `esq.dispersion` — constelación

Pocos motivos separados por tiradas irregulares de espaciador. Mucho aire.

| Slot | Tipo | Cantidad |
|---|---|---|
| `motivos` | par, anc, sig, cor | 2–6 · obligatorio |
| `tiradas` | lista de enteros 1–6 | 1–7 |

**Las tiradas tienen que ser irregulares.** Es la regla más importante de todo el
sistema: la uniformidad es lo que más delata una decoración generada. Vectores reales
del corpus: `2 1 1 2 1` · `1 2 4 4 5 1 1 4` · `1 1 3 3 6`. W104 salta con las
constantes.

Prohibido en `discord-reglas`: la dispersión es incompatible con un canal de normas.

Densidad esperada: mediana 0.30.

## §5 · `esq.marco` — caja con contenido colgado

El formato amino. Cabecera con esquina, filas colgadas de una vertical, y pie.

```
╭──── ✿ Título
┊ ⿻ primera fila
┊ ⿻ segunda fila
╰──────
```

| Slot | Tipo | Cantidad |
|---|---|---|
| `esquina_sup` / `esquina_inf` / `vertical` | trz | 1 cada uno · obligatorios |
| `regla` | trz, fil | 1–2 · obligatorio |
| `vineta` | anc, par, cor | 0–2 |
| `titulo` | texto | opcional |
| `filas` | lista de texto | 1–12 · obligatorio |

**Las filas llevan el contenido con significado, así que van en `alf.plano`.** No las
transformes: es el sitio donde vive la información.

Prohibido en `bios`: no hay presupuesto para una caja multilínea en 150 unidades.

## §6 · `esq.pila` — bloque multilínea

Varias líneas de otros esqueletos, unidas por una paleta común y una sangría
escalonada.

| Slot | Tipo | Cantidad |
|---|---|---|
| `lineas` | lista de sub-planes | 2–8 · obligatorio |
| `sangria` | lista de enteros 0–12 | 0–8 |

Cada entrada de `lineas` es un plan completo de otro esqueleto (chip, dispersión,
espejo o barra). **Un solo nivel**: una pila no puede contener otra pila, y el resolver
lo rechaza.

La sangría escalonada es lo que da el efecto de las bios largas del corpus: `0, 11, 15,
12, 14` en `cps.0042`. Escalonada, no creciente.

## §7 · Elegir

| Si el usuario quiere… | Esqueleto |
|---|---|
| separar dos secciones | `espejo` o `barra` |
| un nombre o una etiqueta bonita | `chip` |
| algo con mucho aire, tipo constelación | `dispersion` |
| unas normas o una bienvenida con apartados | `marco` |
| una bio de varias líneas | `pila` |

En la duda entre `espejo` y `barra`: el espejo tiene eje y se lee como adorno; la barra
es una regla y se lee como separación estructural.
