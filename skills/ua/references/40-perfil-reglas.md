# 40 · Perfil `discord-reglas` — normativa y formal

> **Alcance.** Reglas, información, staff, anuncios. Hermanos:
> [41](41-perfil-bienvenida.md) para bienvenidas, [50](50-superficies.md) para topes.
>
> **Cuándo abrirlo.** El usuario pide reglas, normas, un canal de información o algo
> "serio pero bonito".

## §1 · El encargo

Este es **el caso que casi todos los generadores hacen mal**, y por saturación: llenan
una lista de normas de estrellitas hasta que no se puede leer. Aquí la decoración
**estructura y jerarquiza**; no compite con el texto.

Restricciones del perfil (`data/perfiles.json`):

| Campo | Valor | Por qué |
|---|---|---|
| esqueletos | barra, marco, chip, pila | los que dan estructura |
| **prohibido** | **dispersión** | la constelación es incompatible con un canal de normas |
| paletas | monolinea, tinta, botanico-pastel, etereo | sin comida ni caritas |
| densidad | 0.10 – 0.70 | por debajo de lo demás, a propósito |
| emojis | máximo 1 | un acento por bloque, no por línea |
| `texto_transformable` | **false** | §3 |
| tier mínimo | moderno | las normas las lee todo el mundo, en cualquier dispositivo |

## §2 · La trampa del guion inicial

Un separador que empiece por `- ` se convierte en **viñeta de lista** de Discord. Es el
error más frecuente en este perfil, porque las reglas van numeradas y llenas de guiones.

Sustitutos inertes: `–` (en dash) · `—` (em dash) · `─` (box drawing) · `⎯` (horizontal
line extension). Si el guion tiene que ser literal, escápalo: `\-`.

Lo mismo con `# ` (encabezado), `> ` (cita) y `-# ` (subtexto) al inicio de línea. E010
lo detecta.

`⌗` (U+2317) sí es seguro como ornamento: el parser de Discord solo casa el `#` ASCII.

## §3 · Por qué el texto no se transforma

`texto_transformable: false` no es una preferencia estética.

Los lectores de pantalla anuncian las letras matemáticas **una a una**: `𝐀𝐍𝐃` se lee
"mathematical italic capital a, mathematical italic capital n, mathematical italic
capital d". Una regla de servidor escrita así es, literalmente, ilegible para quien usa
uno. **Una norma que no se puede leer no es una norma.**

Además NFKC pliega esas letras a ASCII, así que tampoco son buscables.

La numeración, por lo mismo, en dígitos ASCII: `1.` `2.` `3.`, no `①` ni `𝟏`.

Decora **alrededor**: la barra separadora, la viñeta, el marco. El contenido, en plano.

## §4 · Patrón recomendado

Un embed de normas con marco y barras entre secciones:

```jsonc
// Cabecera
{
  "esqueleto": "esq.barra",
  "perfil": "discord-reglas",
  "superficie": "sup.discord-embed-desc",
  "slots": {
    "cuerpo": ["trz.caja.horizontal"],
    "largo": 6,
    "centro": ["par.tecnico.viewdata-square"],
    "remate": ["par.mat.conjugate-matrix"]
  }
}

// Bloque de normas
{
  "esqueleto": "esq.marco",
  "perfil": "discord-reglas",
  "superficie": "sup.discord-embed-desc",
  "slots": {
    "esquina_sup": ["trz.caja.down-right"],
    "esquina_inf": ["trz.caja.up-right"],
    "vertical":    ["trz.caja.vertical"],
    "regla":       ["trz.caja.horizontal"],
    "vineta":      ["par.geo.small-square"],
    "titulo":      { "valor": "NORMAS", "transform": "alf.plano" },
    "filas": [
      "1. Respeta a todo el mundo.",
      "2. Nada de spam ni autopromocion.",
      "3. Usa cada canal para lo suyo."
    ]
  }
}
```

Busca los IDs concretos con `ua buscar --rol trz --paleta monolinea --tier universal`;
los de arriba son ilustrativos y pueden no existir tal cual.

## §5 · El presupuesto de 6000

El tope de Discord **no es por embed**: es la suma de título + descripción + nombres y
valores de campo + pie + autor de **todos los embeds del mensaje**.

Un canal de normas con 5 embeds decorados lo agota antes de lo que parece, sobre todo
porque los caracteres astrales cuestan 2 unidades cada uno. Comprueba el total antes de
enviar; el emisor `discordjs` trae un `comprobarPresupuesto()` para eso.

## §6 · Repaso antes de entregar

- ¿Ninguna línea empieza por `- `, `# ` o `> `?
- ¿El texto de las normas está en `alf.plano`?
- ¿La numeración es ASCII?
- ¿Un emoji como mucho por bloque?
- ¿Densidad por debajo de 0.70?
- ¿La suma de los embeds cabe en 6000?
- ¿Todo `universal` o `moderno`? Unas normas las lee gente con Windows 10.
