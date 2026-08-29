# 🤖 Flujo Completo: Issue → PR → Review → Merge

## El Flow Paso a Paso

```
┌─────────────────────────────────────────────────────────────┐
│ 1. TÚ CREAS UNA ISSUE EN GITHUB                             │
│    Título: "Agregar funcionalidad X"                        │
│    Descripción: Detalles de qué implementar                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. WORKFLOW DISPARA: issue-to-pr.yml                        │
│    → Se ejecuta generate-from-issue.py                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. CLAUDE GENERA CÓDIGO                                     │
│    → Lee la issue                                           │
│    → Llama a Bedrock                                        │
│    → Genera código completo                                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. CLAUDE CREA RAMA Y COMMIT                                │
│    → rama: claude/issue-123                                 │
│    → commit: "Claude: Resolve issue #123"                   │
│    → push a GitHub                                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. CLAUDE ABRE PR                                           │
│    → rama: claude/issue-123 → main                          │
│    → Comenta en la issue: "✅ PR creado"                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. WORKFLOW DISPARA: auto-review-pr.yml                     │
│    → Se ejecuta auto-review-pr.py                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. CLAUDE REVISA SU PROPIO CÓDIGO                           │
│    → Extrae diff de la PR                                   │
│    → Llama a Bedrock                                        │
│    → Verifica: corrección, calidad, seguridad               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 8A. SI PASA REVIEW:                                         │
│    ✅ Claude APRUEBA la PR automáticamente                  │
│    ✅ Comenta: "Code review passed"                         │
│                                                              │
│ 8B. SI NO PASA REVIEW:                                      │
│    ❌ Claude comenta problemas encontrados                  │
│    ❌ PR requiere revisión manual                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. TÚ REVISAS Y DECIDES                                     │
│    → Ves la PR con:                                         │
│       - Código generado                                     │
│       - Review de Claude                                    │
│       - Aprobación de Claude (si pasó)                      │
│    → Haces merge manualmente                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuración Necesaria

### 1. GitHub Secrets (Settings → Secrets and variables → Actions)

```
AWS_BEARER_TOKEN = tu_bearer_token_aqui
AWS_REGION = us-east-1
```

### 2. Permisos del Workflow (ya configurados)

```yaml
permissions:
  issues: read
  contents: write
  pull-requests: write
```

---

## Archivos Creados

```
.github/
├── workflows/
│   ├── issue-to-pr.yml              # Se dispara al crear issue
│   └── auto-review-pr.yml           # Se dispara al crear PR
└── scripts/
    ├── generate-from-issue.py       # Genera código desde issue
    └── auto-review-pr.py            # Revisa y aprueba PR
```

---

## Cómo Testear

### Paso 1: Crear una Issue

1. Ve a **Issues** en GitHub
2. Haz clic en **New Issue**
3. Título: `Agregar función de pausa`
4. Descripción: 
   ```
   Quiero poder pausar el juego presionando P.
   Cuando está pausado, debe mostrar "PAUSADO" en pantalla.
   ```
5. Crea la issue

### Paso 2: Ver el Action ejecutarse

1. Ve a **Actions**
2. Busca "Issue to PR - Claude Code Generation"
3. Mira los logs en tiempo real

### Paso 3: Ver la PR creada

1. Ve a **Pull Requests**
2. Deberías ver una PR con nombre: `Claude: Agregar función de pausa (Issue #X)`
3. Branch: `claude/issue-X`

### Paso 4: Ver la Review automática

1. En la PR, ve a **Checks** o **Conversation**
2. Verás el comentario de Claude con la review
3. Si pasó, habrá una aprobación automática

### Paso 5: Mergear (Tú decides)

1. Revisa el código
2. Si todo bien, haz clic en **Merge pull request**

---

## Troubleshooting

### Error: "Issue to PR workflow no se ejecuta"

**Solución:**
- Ve a **Actions** → Verifica que no hay restricciones
- En **Settings** → **Actions** → asegúrate de que está permitido

### Error: "401 Unauthorized" en Claude

**Solución:**
- Verifica `AWS_BEARER_TOKEN` en secrets
- Prueba el token localmente con curl

### Error: "PR no se crea"

**Solución:**
- Verifica que `GITHUB_TOKEN` tiene permisos de write
- Mira los logs del action para más detalles

### Error: "Git configuration"

**Solución:**
- Los scripts ya configuran:
  ```
  git config user.email "claude@anthropic.com"
  git config user.name "Claude Bot"
  ```
- Deberías ver commits de "Claude Bot"

---

## Personalización

### Cambiar el modelo de Claude

En `.github/scripts/generate-from-issue.py` y `auto-review-pr.py`:

```python
url = f"https://bedrock-runtime.{aws_region}.amazonaws.com/model/anthropic.claude-sonnet-5/invoke"
# Modelos disponibles:
# - anthropic.claude-opus-5
# - anthropic.claude-opus-4-8
# - anthropic.claude-sonnet-5
```

### Agregar validaciones extras

En `auto-review-pr.py`, puedes agregar:

```python
# Validar que existe cierto archivo
# Validar que la PR no es muy grande
# Ejecutar tests
# Verificar linting
```

### Filtrar qué issues disparan el action

En `.github/workflows/issue-to-pr.yml`:

```yaml
on:
  issues:
    types: [opened, edited]
    # Agregar:
    # Que tenga cierta label
    # Que el título contenga palabras clave
```

---

## Costos

- **Por issue procesada:**
  - Claude genera código: ~2000-5000 tokens = $0.01-0.02
  - Claude revisa código: ~2000-5000 tokens = $0.01-0.02
  - **Total por issue:** ~$0.02-0.04

---

## ¿Qué pasa si...?

| Escenario | Qué Sucede |
|-----------|-----------|
| Issue mal descrita | Claude genera código genérico, PR necesita edición manual |
| Código muy complejo | Claude puede no generar todo perfectamente, PR permite editar |
| Review falla | Claude comenta problemas, PR requiere manual approval |
| Algo va mal | Siempre puedes editar/cerrar/reabrir la PR |

---

## Control Total

Recuerda: **Tú siempre tienes el control final**

- Si no te gusta el código → Cierra la PR
- Si quieres editar → Edita después de mergear
- Si Claude aprobó pero tú no → No hagas merge
- Puedes pausar cualquier momento

