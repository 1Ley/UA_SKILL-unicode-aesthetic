# 43 · Perfil `codigo` — constantes y embeds en cualquier repo

> **Alcance.** Emitir decoración lista para pegar en un proyecto, sea cual sea el
> lenguaje o la librería. Hermanos: [50](50-superficies.md) para topes y codificación.
>
> **Cuándo abrirlo.** El usuario quiere el resultado dentro de su código: un bot, un
> README, un banner de CLI, una constante.

## §1 · El encargo

Este perfil **no está atado a ninguna librería ni a ningún repo**. El emisor se elige
con `--formato` y la estética se hereda del perfil visual que indiques.

```bash
ua render --plan plan.json --formato discordjs   --salida src/decoracion.js
ua render --plan plan.json --formato constantes  --salida src/deco.mjs
ua render --plan plan.json --formato json        --salida deco.json
ua render --plan plan.json --formato discordpy   --salida deco.py
ua render --plan plan.json --formato md
```

| Emisor | Sale |
|---|---|
| `discordjs` | cadena `EmbedBuilder` + `comprobarPresupuesto()` |
| `discordpy` | `discord.Embed(...)` |
| `json` | payload plano con texto, líneas y métricas |
| `constantes` | módulo que solo exporta los strings |
| `md` | markdown con saltos de línea duros |
| `texto` | crudo, para copiar y pegar |

## §2 · Por qué todo sale escapado

Los emisores sacan los strings decorativos como escapes `\uXXXX`, siempre. No es
manía: es que el archivo generado queda en **ASCII puro**, y así sobrevive a

- cualquier editor, tenga la codificación que tenga;
- cualquier `core.autocrlf`, sin que git lo trate como binario;
- cualquier terminal, incluida una consola cp1252 —que **sustituiría los caracteres
  astrales por `?` sin dar ningún error**;
- cualquier pipeline de CI que no fije `LANG`.

Es una clase entera de fallos silenciosos eliminada a coste cero. El archivo se ve
menos bonito abierto en el editor, y a cambio nunca se corrompe.

Si prefieres los caracteres crudos, `--formato texto` los da; pero entonces asegúrate
de que el repo tenga `.gitattributes` con `-text` en esos archivos.

## §3 · Decoración separada del contenido

Los emisores sacan la decoración como **constantes con nombre**, no interpoladas en el
texto:

```js
const SEPARADOR_BIENVENIDA = "⊹ ︶✦   ୨୧…";

new EmbedBuilder()
  .setTitle(SEPARADOR_BIENVENIDA)
  .setDescription(CONTENIDO);
```

Así se puede cambiar el texto sin volver a tocar los símbolos, y cambiar los símbolos
sin buscarlos entre el contenido. Usa `"nombre"` en el plan para nombrar la constante.

## §4 · El presupuesto de 6000 de Discord

El emisor `discordjs` incluye este helper, y merece la pena usarlo:

```js
export function comprobarPresupuesto(embeds) {
  const total = embeds.reduce((n, e) => {
    const d = e.data ?? e;
    return n + [d.title, d.description, d.footer?.text, d.author?.name]
      .filter(Boolean).reduce((a, s) => a + s.length, 0)
      + (d.fields ?? []).reduce((a, f) => a + f.name.length + f.value.length, 0);
  }, 0);
  if (total > 6000) throw new Error(`Embeds a ${total}/6000 unidades UTF-16`);
  return total;
}
```

El tope **no es por embed**: es la suma de todos los del mensaje. Y `.length` en JS
cuenta unidades UTF-16, que es justo el presupuesto pesimista correcto: un carácter
astral cuenta 2, igual que aquí.

Fallar en tu código con un mensaje claro es mejor que recibir un 400 de la API sin
explicación.

## §5 · Otros destinos

**README / Markdown** (`sup.readme`): GitHub comparte con Discord los caracteres
activos, así que valen las mismas reglas de escape. Cuidado con `- ` al inicio de línea
y con `#`.

**Banner de CLI**: usa `sup.generica-plana` y **quédate en tier `universal`**. Las
fuentes de terminal cubren mucho menos que un navegador, y en una consola de Windows lo
que no está cubierto sale como caja.

**UI de un juego / cualquier otro sitio**: añade una superficie a
`data/superficies.json` con el tope real medido. No hay que tocar ningún `.mjs` —
[50-superficies.md §4](50-superficies.md) explica cómo.

## §6 · Repaso antes de entregar

- ¿Escribiste con `--salida`, no con redirección de shell?
- ¿El archivo generado es ASCII puro?
- ¿La decoración está en constantes con nombre, separada del contenido?
- Si es Discord: ¿está el chequeo de 6000 en el código?
- Si es una terminal: ¿todo `universal`?
- ¿Le dijiste al usuario que puede regenerarlo cambiando el plan, en vez de editar los
  escapes a mano? Editarlos a mano es exactamente lo que la skill existe para evitar.
