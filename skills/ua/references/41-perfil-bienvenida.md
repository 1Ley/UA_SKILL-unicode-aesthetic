# 41 · Perfil `discord-bienvenida` — bienvenidas y rol

> **Alcance.** Mensajes de bienvenida, verificación, autoroles, presentación de
> personaje, servidores de rol. Hermanos: [40](40-perfil-reglas.md) para lo formal,
> [30](30-gusto.md) para las proporciones.
>
> **Cuándo abrirlo.** El usuario pide una bienvenida, una presentación, o algo "muy
> decorado".

## §1 · El encargo

Aquí la densidad estética **es el objetivo**, no un exceso. Es el registro opuesto al
de las normas: se admite todo el vocabulario y todos los esqueletos.

| Campo | Valor |
|---|---|
| esqueletos | los seis |
| paletas | todas |
| densidad | 0.12 – 0.95 |
| emojis | hasta 3 (pero lee §3) |
| marcas por base | 3 |
| `texto_transformable` | true |
| tier mínimo | moderno |

El formato natural es `esq.marco` para bloques largos y `esq.pila` para presentaciones
de personaje. `cps.0033` del corpus es el modelo: cabecera con esquina y oden, tres
filas colgadas, pie con blob y rastro.

## §2 · Menciones y emojis personalizados

Discord tiene sintaxis con formato exacto:

```
<@&123456789>     mención de rol
<@123456789>      mención de usuario
<#123456789>      enlace de canal
<:nombre:123>     emoji personalizado
<a:nombre:123>    emoji animado
@everyone  @here
```

Van como **texto opaco**: el validador no los decora ni los escapa, porque cualquier
retoque los rompe y dejan de funcionar. Están declarados en `literales_opacos` del
perfil.

Al presupuestar, ojo: `<@&123456789012345678>` son 22 unidades UTF-16 que en pantalla
se ven como `@Miembro`. Un mensaje con cinco menciones gasta mucho más de lo que
aparenta.

## §3 · Que no parezca generado

Este es el perfil donde más fácil es sonar a plantilla, porque hay libertad para todo.
Las tres cosas que más delatan, con su regla en [30-gusto.md](30-gusto.md):

1. **Ritmo uniforme** (R3). El vector `RITMO` de `ua inspeccionar` no puede ser
   constante. Los humanos escriben `1 2 4 4 5 1 1 4`.
2. **Simetría perfecta en todas las líneas** (R2). Solo 6 de 23 espejos del corpus son
   exactos. Rompe uno de los extremos.
3. **Más de un emoji por línea** (R5). El perfil admite 3 porque el corpus llega a 3,
   pero **solo 2 de 88 líneas pasan de 1**. La norma humana es un foco por línea.

Y una cuarta, menos evidente: **todos los pesos iguales**. Una línea de puro peso 2 se
lee plana. Alterna hairlines (peso 1) con un pico (peso 3–4).

## §4 · Superficies pequeñas

Este perfil también cubre el apodo (32) y el estado personalizado (128), que son
diminutos.

En el apodo, las marcas combinantes cuentan contra el tope aunque no ocupen sitio en
pantalla: un nombre con diacríticos apilados agota las 32 unidades mucho antes de lo
que parece. Y el apodo no admite `@ # : `` ` `` literales — por eso la gente usa `﹫`
(U+FE6B), que es inerte para el parser.

Para el estado personalizado usa `esq.chip` corto o un `esq.espejo` de brazo 1.

## §5 · Patrón: bienvenida con marco

```jsonc
{
  "esqueleto": "esq.marco",
  "perfil": "discord-bienvenida",
  "superficie": "sup.discord-embed-desc",
  "slots": {
    "esquina_sup": ["trz.caja.arc-down-right"],
    "esquina_inf": ["trz.caja.arc-up-right"],
    "vertical":    ["trz.caja.vertical-dotted"],
    "regla":       ["trz.caja.horizontal"],
    "vineta":      ["anc.emoji.cherry-blossom"],
    "titulo":      { "valor": "bienvenida", "transform": "alf.sans" },
    "filas": [
      "Pasa por <#111> y coge tus roles.",
      "Las normas estan en <#222>.",
      "Cualquier duda, avisa a <@&333>."
    ]
  }
}
```

El título va transformado (es un gesto), las filas en plano (llevan información). Es
la distinción de [30-gusto.md §9](30-gusto.md).

## §6 · Repaso antes de entregar

- ¿El `RITMO` es irregular en todas las líneas?
- ¿Algún espejo está deliberadamente roto por un lado?
- ¿Un emoji por línea, salvo que haya un motivo?
- ¿Las menciones están intactas y contadas en el presupuesto?
- ¿Los pesos alternan, o va todo plano?
- ¿La paleta es coherente en todo el bloque? (W102)
