# UA · unicode-aesthetic

Skill de Claude Code y Claude Cowork que **compone decoración Unicode estética
ensamblando solo caracteres de una biblioteca curada por humanos**.

```
⊹ ︶✦   ୨୧   ✦︶ ⊹
```

## Por qué existe

Los generadores de decoración Unicode que hay funcionan con **listas planas**:
"separadores", "viñetas", "kaomojis". Una IA con una lista plana improvisa, y lo que
improvisa se nota — uniforme, simétrico de más, sin ritmo.

UA invierte el planteamiento. La biblioteca contiene **655 caracteres, 45 compuestos y
10 alfabetos**, y cada uno está ahí porque un humano lo usó en una composición real o
lo agrupó a mano. El modelo no puede inventar vocabulario porque **no tiene dónde
escribirlo**: su única salida es un plan JSON que nombra IDs, y solo el resolver
traduce un ID a glifo.

La creatividad va en cómo ensamblas, no en inventar símbolos.

### El segundo motivo, menos obvio

Un modelo de lenguaje **no puede leer estos caracteres mirándolos**. Está comprobado en
el desarrollo de esta skill:

| Parece | Es |
|---|---|
| `︶` un arco decorativo | U+FE36, un paréntesis de cierre cuyo NFKC es `)` |
| `𝅄` una estrella | un símbolo musical, sin fuente en Android |
| `೭` un adorno | el dígito siete en kannada |
| `ᥫ᭡` un corazón | dos clusters de dos scripts sin relación (Tai Le + Balinés) |

Por eso el reparto es: **el modelo pone criterio y estructura; los scripts ponen
identidad, conteo y seguridad.** `ua inspeccionar` traduce cualquier composición a un
croquis en ASCII donde forma, densidad, ritmo y simetría sí se leen bien.

## Qué hace

- **Cuatro perfiles**: reglas formales de Discord, bienvenidas y rol, bios con tope
  duro (Instagram, TikTok, X, Telegram, Discord), y código para cualquier repo.
- **21 superficies** con sus límites reales, desde la descripción de embed (4096) hasta
  la bio de TikTok (80). Añadir una es añadir un registro a un JSON.
- **Seis esqueletos**: espejo, chip, barra, dispersión, marco y pila.
- **15 errores y 10 avisos** que atrapan lo que de verdad rompe: markdown activo,
  pliegues NFKC, presupuesto UTF-16, marcas sin base, tofu tipográfico.
- **Emisores para código**: `discord.js`, `discord.py`, JSON, constantes, Markdown.
  Todos escriben escapes `\uXXXX`, así que el archivo generado es ASCII puro.
- **Ingesta**: pega una composición y la skill la descompone, la clasifica y aprende su
  vocabulario — en cuarentena hasta que un humano lo revise.

## Instalación

Lo más rápido es pedírselo a Claude. Copia esto y pégaselo tal cual:

```
Instala la skill UA en mi Claude Code.

Repositorio: https://github.com/1Ley/UA---unicode-aesthetic-SKILL-

Clona el repo en una carpeta temporal, copia la carpeta skills/ua a mi
directorio de skills personales y borra el temporal. Ese directorio es
~/.claude/skills/ en macOS y Linux, y %USERPROFILE%\.claude\skills\ en Windows.

Al terminar, comprueba que quedó bien ejecutando:
node <ruta-del-directorio>/ua/scripts/ua.mjs perfiles

Si sale la lista de perfiles y superficies, está lista. Abre una sesión nueva
para que la cargue.
```

Hace falta Node.js 18 o superior. No hay que instalar nada más: la skill no tiene
dependencias de npm.

### Si prefieres hacerlo a mano

```bash
git clone https://github.com/1Ley/UA---unicode-aesthetic-SKILL-.git /tmp/ua
cp -r /tmp/ua/skills/ua ~/.claude/skills/ua
rm -rf /tmp/ua
node ~/.claude/skills/ua/scripts/ua.mjs perfiles
```

En Windows, con PowerShell:

```powershell
git clone https://github.com/1Ley/UA---unicode-aesthetic-SKILL-.git $env:TEMP\ua-tmp
Copy-Item -Recurse $env:TEMP\ua-tmp\skills\ua $env:USERPROFILE\.claude\skills\ua
Remove-Item -Recurse -Force $env:TEMP\ua-tmp
node $env:USERPROFILE\.claude\skills\ua\scripts\ua.mjs perfiles
```

### Como plugin

```
/plugin marketplace add 1Ley/UA---unicode-aesthetic-SKILL-
/plugin install ua@ua-unicode-aesthetic
```

### Usarla

Abre una sesión nueva y pide lo que quieras sin más: "hazme un separador para el canal
de normas", "decórame la bio de Instagram". La skill se activa sola por su descripción.
También responde a `/ua` si prefieres invocarla explícitamente.

### Sobre Cowork

El formato de skill es el mismo en Claude Code y en Cowork: `SKILL.md` con el mismo
frontmatter y la misma estructura de carpetas. La skill no usa navegador, ni pantalla,
ni subagentes, que es lo que suele diferenciar un entorno del otro; solo necesita poder
ejecutar Node.

Dicho esto, **solo la he verificado de extremo a extremo en Claude Code**. En Cowork la
vía razonable es el plugin, porque el directorio donde guarda las skills lo gestiona su
propia sincronización y copiar cosas ahí a mano es frágil. Si la pruebas ahí, cuéntame
qué tal.

### Instalada suelta vs. repo completo

Copiando solo `skills/ua` tienes todo lo de uso diario: componer, buscar, inspeccionar
y validar. `data/` viaja con la skill.

Lo que necesita el repo entero es reconstruir la biblioteca (`construir-datos`),
aplicar una ingesta (`aprender --aplicar`) y la suite de pruebas (`probar`), porque
viven en `tools/`. Si los invocas con la skill instalada suelta, te lo dice y te da el
comando para clonar; no falla de mala manera.

## Uso

```bash
# Ver perfiles y superficies con sus topes
node skills/ua/scripts/ua.mjs perfiles

# Buscar vocabulario (devuelve IDs, nunca glifos crudos)
node skills/ua/scripts/ua.mjs buscar --rol par --paleta etereo --tier universal

# Contrato de un esqueleto
node skills/ua/scripts/ua.mjs esqueleto --id esq.espejo

# Componer
node skills/ua/scripts/ua.mjs render --plan plan.json --formato discordjs

# Analizar algo existente
node skills/ua/scripts/ua.mjs inspeccionar --entrada composicion.txt

# Enseñarle un diseño nuevo
node skills/ua/scripts/ua.mjs aprender --entrada pegado.txt
```

Un plan:

```json
{
  "esqueleto": "esq.espejo",
  "perfil": "discord-bienvenida",
  "superficie": "sup.discord-embed-desc",
  "slots": {
    "eje": ["cmp.par-oriya"],
    "canaleta": 3,
    "brazo": ["par.dingbat.pointed-star", "fil.cjkcomp.right-parenthesis"],
    "extremo": ["par.mat.conjugate-matrix"]
  }
}
```

## Cómo crece la biblioteca

```
tools/semilla/corpus-crudo.txt      composiciones humanas ← el vocabulario nace aquí
tools/semilla/inventario-crudo.txt  símbolos agrupados a mano
tools/semilla/curacion.json         criterio: roles, tiers, croquis, paletas, pares
              ↓  node tools/construir-datos.mjs
skills/ua/data/*.json               generado. No se edita a mano.
```

`ua aprender --aplicar` añade la composición a la semilla y reconstruye. Nunca parchea
los datos generados: si lo hiciera, la biblioteca dejaría de ser reproducible desde sus
fuentes, que es lo que permite auditarla.

Lo aprendido entra en cuarentena (`revisado: false`, paleta `experimental`) y los
perfiles normales lo rechazan. Promocionarlo exige editar `curacion.json` a mano — el
único punto del sistema donde el juicio humano es obligatorio.

## Verificación

```bash
node tools/probar.mjs
```

108 comprobaciones en seis bloques. Las dos que más importan:

**T2 · ¿de verdad se niega a inventar?** Comprueba que un ID inventado falla con
sugerencias reales, que un glifo colado por el canal de texto falla, que un carácter
que no salió del resolver falla, y que ningún error deja escapar texto.

**T3 · regresión de gusto.** Vuelve a pasar las 88 líneas del corpus humano por el
validador. Como las reglas se dedujeron de ese corpus, **un error sobre trabajo humano
genuino demuestra que la regla está mal, no la composición.** Durante el desarrollo
esta prueba detectó cuatro reglas mal calibradas — entre ellas una que marcaba como
sospechosos los rastros de puntos, donde la regularidad es precisamente lo correcto.

## Requisitos

Node.js 18 o superior (`Intl.Segmenter` y `\p{...}` en regex). **Cero dependencias de
npm.** La única red que se usa es la descarga del UCD al construir los datos, y queda
cacheada.

## Licencia

MIT, salvo los nombres de carácter y etiquetas de bloque de `data/caracteres.json`, que
derivan del Unicode Character Database y se redistribuyen bajo la Unicode License V3
(SPDX `Unicode-3.0`). Ver [NOTICE-UNICODE.txt](NOTICE-UNICODE.txt).
