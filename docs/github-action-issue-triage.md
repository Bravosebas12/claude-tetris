# GitHub Action: Triage automático de issues con Claude

## Contexto

Este workflow (`claude-issue-triage.yml`) fue creado para automatizar el análisis y clasificación de issues en el repositorio **claude-tetris** (vanilla Tetris en HTML5 Canvas + CSS + JS).

El problema que resuelve: cuando alguien abre o edita un issue, necesitamos hacer un diagnóstico técnico rápido sin implementar la solución todavía. Ese diagnóstico sirve como punto de partida para que los desarrolladores escriban el código que arregle el problema.

### Arquitectura del repo (contexto importante)

El proyecto es vanilla JS con un único archivo de lógica (`game.js`, ~300 líneas) que maneja todo: rotación, colisiones, loop del juego, scoring, rendering. Ver [`CLAUDE.md`](../CLAUDE.md) para la arquitectura completa.

Los puntos débiles documentados que influyen en la clasificación:
- **Rotación** (`rotateCW`, `tryRotate`): wall kicks sin SRS, transpuesta + reverse en una matriz fresca
- **Colisiones** (`collide`, `merge`, estado del `board`): valores de celda son simultáneamente tipo de pieza + índice de color
- **Loop del juego** (`loop()`, `lockPiece`): acumula `dt`, no tiene lock delay, y **hay un bug conocido**: el loop no se frena en game-over y las piezas siguen cayendo detrás del overlay
- **Rendering** (`drawBlock`, `drawNext`): tamaño de canvas duplicado entre `game.js` e `index.html`, preview hardcodeado a 4×4
- **Input**: manejo de teclado
- **Scoring**: cálculo de `score`, `lines`, `level`, `dropInterval`

## Beneficios

| Beneficio | Detalle |
|-----------|---------|
| **Clasificación automática** | Issues se etiquetan al llegar (tipo + área técnica) sin intervención manual |
| **Diagnóstico sin código** | Claude analiza el problema y deja hipótesis de causa raíz en comentario — NO implementa la solución todavía |
| **Actualización en re-ediciones** | Si alguien edita el issue, el comentario de diagnóstico se **actualiza** en lugar de spamear comentarios nuevos |
| **Conocimiento del proyecto** | El prompt tiene acceso a `CLAUDE.md` y puede leer `game.js`, así que entiende la arquitectura y cita líneas específicas |
| **Workflow reutilizable** | Usa la misma infraestructura que los otros workflows Claude (`claude.yml`, `claude-code-review.yml`) — mismo token, mismo action |
| **Sin mantenimiento manual de labels** | Las labels se crean automáticamente la primera vez; las de tipo (`bug`, `enhancement`, etc.) ya existen en GitHub por defecto |

## Casos de uso

✅ **Cuándo aplica este workflow:**

- Abren un issue reportando que "la pieza L rota mal contra la pared" → etiquetado `bug` + `area:rotation`, diagnóstico sobre `tryRotate` y wall kicks
- Reportan que "el juego no para cuando pierde" → etiquetado `bug` + `area:loop`, diagnóstico sobre el bug de game-over documentado en `CLAUDE.md`
- Sugieren "agregar sonido al colocar una pieza" → etiquetado `enhancement` + posiblemente `area:rendering`, diagnóstico sobre qué función modificar
- Preguntan "¿por qué el preview se ve mal?" → etiquetado `question` + `area:rendering`, diagnóstico sobre el hardcoding de `NB = 30`
- Alguien edita el issue con más detalles → el comentario de diagnóstico se actualiza automáticamente

❌ **Cuándo NO:**

- PRs (este es solo para issues; PRs tienen `claude-code-review.yml`)
- Issues sin descripción (el diagnóstico será "información insuficiente")
- Changes a labels externamente (el workflow solo actúa en create/edit de título/cuerpo, no en label changes)

## Labels asignadas por el workflow

### Tipo (elige exactamente uno)

Estos son estándar de GitHub y se reutilizan:

| Label | Cuándo |
|-------|--------|
| `bug` | Algo está roto o no funciona como se esperaría |
| `enhancement` | Solicitud de feature, mejora, o optimización |
| `question` | Duda o pedido de clarificación |
| `duplicate` | Issue repetido de uno anterior |
| `invalid` | No es un issue válido o no se puede reproducir |
| `wontfix` | Problema conocido pero deliberadamente no se arreglará |

### Área (elige 0–2 según aplique)

Estas son custom, específicas a la arquitectura de Tetris:

| Label | Color | Para qué |
|-------|-------|----------|
| `area:rotation` | 🟣 `#5319e7` | `rotateCW`, `tryRotate`, wall kicks, transformaciones de matriz |
| `area:collision` | 🔴 `#b60205` | `collide`, `merge`, estado del `board`, detección de colisiones |
| `area:loop` | 🟠 `#d93f0b` | `loop()`, `lockPiece`, game-over, drop timer, acumulación de `dt` |
| `area:rendering` | 🟢 `#0e8a16` | `drawBlock`, `drawNext`, tamaño de canvas, preview 4×4 |
| `area:input` | 🔵 `#1d76db` | Manejo de teclado, controles, event listeners |
| `area:scoring` | 🟡 `#fbca04` | `score`, `lines`, `level`, `dropInterval`, cálculo de velocidad |

## Paso a paso: Manejar el token del action

### 1. Verificar que el token está configurado (CI/CD setup check)

El workflow usa `secrets.CLAUDE_CODE_OAUTH_TOKEN`. Este secret ya debe estar en GitHub.

**En GitHub, verifica:**
1. Ve a Settings → Secrets and variables → Actions (en el repo)
2. Busca `CLAUDE_CODE_OAUTH_TOKEN`
3. Si existe, está configurado correctamente — no necesitas tocar nada
4. Si NO existe, sigue al paso 2

### 2. Si necesitas agregar/regenerar el token

**Requisito previo:** acceso a tu cuenta Claude Code (generalmente tu cuenta de Anthropic/Claude)

**Pasos:**
1. Ve a [claude.ai/code](https://claude.ai/code) o abre Claude Code en tu IDE
2. Ve a Settings o preferencias del harness de Claude Code
3. Busca "GitHub OAuth" o "GitHub Integration" — debería haber un botón para "Generate token" o "Connect to GitHub"
4. Sigue el flujo de autenticación (GitHub te pedirá autorizar)
5. GitHub te dará un token (usualmente algo como `ghp_...` o similar para OAuth)
6. En GitHub repo Settings → Secrets and variables → Actions → New secret
7. Name: `CLAUDE_CODE_OAUTH_TOKEN`
8. Value: pega el token que generaste
9. Click "Add secret"

### 3. Verificar que el workflow tiene permiso para usar el token

El workflow declara esto en el header:

```yaml
permissions:
  contents: read
  issues: write
  id-token: write
```

- `contents: read` → Claude puede leer archivos (necesario para leer `CLAUDE.md`, `game.js`)
- `issues: write` → Claude puede crear/editar comentarios y asignar labels
- `id-token: write` → permite el handshake de autenticación con GitHub

Estas permisos ya están configurados en `.github/workflows/claude-issue-triage.yml`, así que no hay que tocar nada aquí.

### 4. Probar que funciona

**Opción A: Abrir un issue real**
1. En GitHub, ve a Issues → New issue
2. Título: `Test: rotation issue with L piece`
3. Cuerpo: `The L piece rotates incorrectly against the wall`
4. Click "Create issue"
5. Ve a Actions (tab en el repo) y busca el workflow "Claude Issue Triage"
6. Espera ~1–2 minutos a que corra
7. Vuelve al issue — debería tener labels (`bug` + `area:rotation`) y un comentario de diagnóstico

**Opción B: Ver logs del workflow**
1. Ve a Actions → "Claude Issue Triage" → el run más reciente
2. Click en el job "triage"
3. Expande el paso "Run Claude Issue Triage"
4. Si hay errores de autenticación, verás algo como "Invalid token" o "Unauthorized"

### 5. Troubleshooting

| Problema | Causa probable | Solución |
|----------|-----------------|----------|
| Workflow no se dispara | El trigger `on: issues: [opened, edited]` no coincide | Verifica que el archivo está en `.github/workflows/` con sintaxis YAML correcta |
| Error "Unauthorized" o "Invalid token" | `CLAUDE_CODE_OAUTH_TOKEN` no está configurado o está expirado | Regenera el token (ver paso 2) y actualiza el secret en GitHub |
| Labels no se asignan | Claude no tuvo permisos para editar | Verifica que el secret de `GITHUB_TOKEN` (automático, no el OAuth) también existe |
| Claude publica comentario pero no etiqueta | Error en el prompt o limitación de permisos | Revisa los logs del workflow para ver qué error reportó Claude |
| Comentario no se actualiza en re-edición | Bug en la lógica de `--edit-last` | Verifica que Claude esté dentro del mismo issue (el `${{ github.event.issue.number }}` es correcto) |

### 6. Troubleshooting avanzado: examinar qué hace Claude

El prompt del workflow está documentado en `.github/workflows/claude-issue-triage.yml`. Si quieres ver exactamente qué instrucciones recibe Claude:

```bash
cat .github/workflows/claude-issue-triage.yml | grep -A 30 "prompt:"
```

Para iterar o ajustar el prompt:
1. Edita `.github/workflows/claude-issue-triage.yml` en tu editor
2. Modifica la sección `prompt: |` (cuidado con la indentación YAML)
3. Commitea y pushea
4. Abre un nuevo issue para probar

### 7. Mantener el token vigente

Los tokens OAuth a veces expiran o se invalidan. Si después de un tiempo el workflow comienza a fallar con autenticación:

1. Regenera el token en Claude Code (Settings → GitHub Integration)
2. Actualiza el secret en GitHub (Settings → Secrets → Edit `CLAUDE_CODE_OAUTH_TOKEN`)
3. Prueba abriendo un nuevo issue

## Ejemplo: issue real clasificado

**Título:** `Tetromino rota mal contra la pared izquierda`

**Cuerpo:**
```
Cuando presiono rotación (arriba) con la pieza L colocada contra la pared izquierda,
la pieza intenta rotar pero se congela. En la rotación debería hacer wall kick.
```

**Workflow corre y asigna:**
- Label tipo: `bug`
- Label área: `area:rotation`

**Comentario de diagnóstico (publicado por Claude):**
```
**Diagnóstico: Rotation wall kick fallando contra pared izquierda**

La pieza L está intentando rotar (`rotateCW` en game.js) contra la pared izquierda,
pero el wall kick (`tryRotate` intenta offsets [0, -1, 1, -2, 2]) no está funcionando.

Función probable: `tryRotate()` línea ~XXX de game.js

Hipótesis de causa raíz:
El offset negativo (-1, -2) para wall kick izquierdo se aplica pero probablemente
choca con `collide()` de manera diferente que el derecho, o hay un bug en cómo se
calcula la nueva posición de la matriz rotada.

Información que falta:
¿En qué nivel/posición exacta del tablero pasa? ¿Siempre contra la pared izquierda
o también derecha? ¿Con todas las piezas o solo la L?
```

Así, el próximo developer que trabaje en la fix sabe exactamente dónde buscar y qué investigar.

---

**Creado:** 2026-09-16  
**Último update:** 2026-09-16  
**Relacionado:** [`CLAUDE.md`](../CLAUDE.md) (arquitectura del proyecto), [`.github/workflows/claude-issue-triage.yml`](../.github/workflows/claude-issue-triage.yml)
