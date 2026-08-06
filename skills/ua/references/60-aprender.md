# 60 · `/ua aprender` — ingesta de composiciones

> **Alcance.** Cómo entra vocabulario nuevo en la biblioteca. Hermanos:
> [10-taxonomia.md](10-taxonomia.md) para roles y tiers.
>
> **Cuándo abrirlo.** El usuario pega una composición y quiere que la skill "aprenda"
> ese estilo, o pregunta cómo añadir símbolos.

## §1 · Por qué esta es la única puerta

La biblioteca contiene lo que un humano usó o agrupó, y nada más. Esa es la propiedad
que impide que degenere en la lista plana que hace que las decoraciones generadas se
noten.

`ua aprender` exige una **composición pegada por una persona**. No hay ningún comando
que añada un símbolo suelto "porque queda bien", y eso es deliberado: un símbolo suelto
no trae contexto de uso, ni paleta, ni evidencia de que funcione junto a algo.

## §2 · Cómo funciona

```bash
ua aprender --entrada pegado.txt              # simulacro: no escribe nada
ua aprender --entrada pegado.txt --aplicar    # aplica
```

El simulacro informa de:

- el **esqueleto detectado** y por qué;
- qué vocabulario ya está en biblioteca y cuál es nuevo;
- para cada carácter nuevo: codepoint, categoría, ancho, **rol propuesto y el motivo**;
- si es **duplicado** de algo que ya existe;
- el croquis y el ritmo de cada línea.

Enseña ese informe al usuario antes de aplicar. El rol propuesto es una heurística, y
puede equivocarse en el caso más importante: los corchetes que no son `Ps`/`Pe`. `꒰꒱`
son categoría `So`, así que ninguna regla mecánica los reconoce como envoltura — y son
la firma visual de todo el estilo kaomoji.

## §3 · Escribe en la fuente, no en los datos

`--aplicar` añade la composición a **`tools/semilla/corpus-crudo.txt`** y reconstruye
la biblioteca. No parchea los `.json`.

Es una decisión de arquitectura, no un rodeo. Si tocara los datos generados, el
siguiente `construir-datos.mjs` borraría lo aprendido; y peor, la biblioteca dejaría de
ser reproducible desde sus fuentes, que es lo que permite auditarla y lo que hace que
`git diff` sobre la semilla se lea como el historial de decisiones de una persona.

Hay respaldo previo, y si la reconstrucción falla se restaura sola.

## §4 · La cuarentena

Todo lo nuevo entra con:

```
paleta: experimental      revisado: false      tier: heredado del bloque
```

**E011 lo rechaza en cualquier perfil que exija tier `universal` o `moderno`**, o sea
en todos los perfiles normales.

Esto no es un fallo, y conviene explicárselo así al usuario: el vocabulario crece sin
que la calidad se degrade sola. Sin la cuarentena, cada ingesta metería caracteres sin
revisar en la rotación general y la biblioteca perdería filo con el uso.

**Promocionar es el único punto del sistema donde el juicio humano es obligatorio.**
Requiere editar `tools/semilla/curacion.json` a mano:

```jsonc
{
  "roles":   { "A4B0": "cor" },                    // corrige el rol si hace falta
  "croquis": { "A4B0": "[" },                      // proxy ASCII para el croquis
  "pares":   { "A4B0": "A4B1" },                   // si va en pareja
  "tiers_por_bloque": { "Yi Radicals": "moderno" } // cobertura tipográfica real
}
```

Y reconstruir con `node tools/construir-datos.mjs`.

## §5 · Duplicados

Si la composición es igual o casi igual a una que ya existe (distancia de token por
debajo del 15 %), la ingesta **sube la frecuencia** de la existente en vez de añadir una
entrada nueva.

Tampoco es un fallo: la frecuencia es lo que ordena `ua buscar`, así que registrar la
repetición es precisamente lo que hace que lo más usado por humanos salga primero. Que
alguien vuelva a escribir el mismo separador es información.

## §6 · Qué hacer cuando el usuario pega algo

1. Guarda lo pegado en un archivo con la herramienta Write. **No lo pases por
   redirección de shell**: en Windows eso lo convierte a UTF-16 o a cp1252 y destruye
   los caracteres astrales sin avisar.
2. `ua aprender --entrada <archivo>` y enseña el informe.
3. Si hay vocabulario nuevo, comenta el rol propuesto de los que importen y pregunta si
   está de acuerdo — sobre todo si algún carácter parece un corchete.
4. Aplica solo si dice que sí.
5. Explica la cuarentena: puede usarlo ya con `--perfil` ninguno o con paleta
   `experimental`, y para meterlo en la rotación normal hay que revisarlo.

Si la composición sale como `esq.libre`, quiere decir que no encaja en ningún esqueleto
conocido. Se guarda igual —no se pierde material humano— pero no se le ofrecerá al
ensamblador. Es preferible admitir "esto no lo sé clasificar" a meter una composición
humana en una plantilla que no le corresponde.
