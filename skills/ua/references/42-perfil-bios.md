# 42 · Perfil `bios` — Instagram, Discord, TikTok, X, Telegram

> **Alcance.** Biografías cortas con tope duro. Hermanos: [50](50-superficies.md) para
> los límites exactos, [30](30-gusto.md) para las proporciones.
>
> **Cuándo abrirlo.** El usuario pide una bio, un "Sobre mí", una descripción corta o
> un nombre decorado.

## §1 · El encargo

Lo que manda aquí es **el presupuesto**. Los topes:

| Superficie | Unidades UTF-16 |
|---|---|
| bio de Instagram | 150 |
| Sobre mí de Discord | 190 |
| bio de X | 160 |
| bio de TikTok | **80** |
| bio de Telegram | 70 |
| Twitch | 300 |

**Un carácter astral cuesta 2.** `𓂃` `𖤐` `𝗇` gastan el doble de lo que aparentan, así
que en 150 unidades caben 75 jeroglíficos y nada más. Calcúlalo con `ua inspeccionar`,
nunca a ojo: es donde más falla la estimación visual.

`esq.marco` está prohibido: no hay presupuesto para una caja multilínea.

## §2 · Instagram normaliza a NFKC

Es la particularidad más importante de este perfil. Instagram aplica NFKC, y eso
**convierte decoración en sintaxis**:

```
﹏ → _        ﹫ → @        ︶ → )        ︵ → (        ˚ → espacio + U+030A
```

En `sup.ig-bio`, **E014 es error, no aviso**. Alternativas estables bajo NFKC: `⌗`
(U+2317) y `⠀` (U+2800), que no cambian.

Otros dos detalles de Instagram:

- **Los saltos de línea solo sobreviven editando desde instagram.com en navegador.** La
  app móvil los quita. Si el usuario va a editar desde el móvil, entrega una sola línea.
- **El nombre de usuario es ASCII puro** (`a-z0-9._`). La decoración solo cabe en el
  campo de nombre y en la bio; no hay forma de decorar un @.

## §3 · Lo que quieras que sea buscable, en ASCII

NFKC pliega `𝕗𝕒𝕟𝕔𝕪` a `fancy`. Si el buscador de la plataforma normaliza, tu bio en
letras matemáticas es encontrable; si no, es invisible. **No hay forma de comprobarlo
desde fuera**, y una de las dos ramas es mala.

En ASCII plano funciona en los dos casos. Así que: el nombre, la ciudad, el pronombre,
lo que sea que alguien pueda buscar, en plano. Decora alrededor.

Vale la pena decírselo al usuario en vez de decidirlo en silencio.

## §4 · Estrategia por presupuesto

**80 unidades (TikTok):** un solo `esq.chip` corto, o un `esq.espejo` con brazo 1 y
canaleta 2. Nada más cabe.

**150 (Instagram):** un `esq.chip` con nombre, o un `esq.pila` de dos líneas cortas.
Mide antes de comprometerte a dos líneas.

**190 (Discord Sobre mí):** aquí sí caben tres líneas. Admite markdown de Discord, así
que ojo con los caracteres activos — a diferencia de Instagram.

**300 (Twitch):** cómodo. Una pila de tres o cuatro líneas.

## §5 · Patrón: chip de bio

```jsonc
{
  "esqueleto": "esq.chip",
  "perfil": "bios",
  "superficie": "sup.ig-bio",
  "slots": {
    "apertura":    ["cor.oriya.oriya-1"],
    "aderezo_izq": ["anc.emoji.tulip", "sig.hebreo.lower-dot"],
    "texto":       { "valor": "nombre", "transform": "alf.sans" },
    "aderezo_der": ["sig.arabe.dot-above"],
    "cierre":      ["cor.oriya.oriya-2"]
  }
}
```

**Los aderezos de los dos lados no deben ser iguales.** Es lo que distingue un chip
humano de una plantilla: en el corpus, `cps.0003` lleva dos elementos a la izquierda y
uno a la derecha. Un chip simétrico se lee como generado.

## §6 · Repaso antes de entregar

- ¿Cabe en el tope? Compruébalo con `ua inspeccionar`, no a ojo.
- Si es Instagram: ¿ningún carácter pliega a ASCII activo bajo NFKC?
- Si es Instagram y va a editar desde el móvil: ¿una sola línea?
- ¿Las palabras buscables están en ASCII plano?
- ¿Los aderezos son asimétricos?
- ¿Densidad cerca de 0.51, la mediana de los chips del corpus?
- ¿Entregaste también el gemelo escapado, para que pueda copiarlo sin que se rompa?
