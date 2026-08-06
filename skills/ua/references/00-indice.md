# 00 · Índice de referencias

> **Alcance.** Mapa de este directorio. Ábrelo si no sabes dónde está algo; para el
> flujo normal, la tabla de enrutado de [SKILL.md](../SKILL.md) basta.

Un nivel, sin cadenas: ninguna referencia manda a otra para completar una tarea.

| Archivo | Contiene | Ábrelo cuando |
|---|---|---|
| [10-taxonomia.md](10-taxonomia.md) | los 7 roles, peso visual, tiers tipográficos, esquema de IDs, compuestos, alfabetos, cómo consultar | busques vocabulario, dudes de si algo renderiza, o no entiendas un E011 |
| [20-esqueletos.md](20-esqueletos.md) | los 6 esqueletos con sus slots, cuándo usar cada uno | elijas forma o E003 se queje del contrato |
| [30-gusto.md](30-gusto.md) | R1–R10 con los números medidos del corpus, y un diagnóstico rápido | algo "no queda humano" o el usuario diga que parece hecho por una IA |
| [40-perfil-reglas.md](40-perfil-reglas.md) | Discord formal: la trampa del guion, por qué el texto no se transforma | perfil `discord-reglas` |
| [41-perfil-bienvenida.md](41-perfil-bienvenida.md) | bienvenidas y rol: menciones opacas, cómo no sonar a plantilla | perfil `discord-bienvenida` |
| [42-perfil-bios.md](42-perfil-bios.md) | bios: presupuesto, NFKC de Instagram, estrategia por tope | perfil `bios` |
| [43-perfil-codigo.md](43-perfil-codigo.md) | emisores para cualquier repo, por qué todo sale escapado | perfil `codigo` |
| [50-superficies.md](50-superficies.md) | topes exactos, markdown, recorte, NFKC, **cómo añadir un destino nuevo** | destino nuevo o duda de límites |
| [60-aprender.md](60-aprender.md) | protocolo de ingesta, cuarentena, promoción | el usuario pegue una composición |

## Dónde vive cada cosa

```
skills/ua/
├─ SKILL.md          el flujo y el enrutado
├─ references/       esto
├─ data/             LA AUTORIDAD. No parafrasees su contenido: consúltalo
│  ├─ caracteres.json   generado ← corpus + inventario + UCD
│  ├─ compuestos.json   generado
│  ├─ alfabetos.json    generado
│  ├─ corpus.json       generado (composiciones decompiladas)
│  ├─ paletas.json      generado desde curacion.json
│  ├─ esqueletos.json   CURADO a mano
│  ├─ perfiles.json     CURADO a mano
│  └─ superficies.json  CURADO a mano
└─ scripts/ua.mjs    el despachador

tools/                fuera del paquete de la skill
├─ construir-datos.mjs        regenera data/ desde la semilla
├─ probar.mjs                 la suite de verificación
└─ semilla/
   ├─ corpus-crudo.txt        composiciones humanas ← el vocabulario nace aquí
   ├─ inventario-crudo.txt    símbolos agrupados a mano
   └─ curacion.json           criterio: roles, tiers, croquis, paletas, pares
```

Lo **generado** se rehace con `node tools/construir-datos.mjs`; editarlo a mano es
tirar el trabajo. Lo **curado** es donde vive el criterio humano y donde se edita de
verdad.
