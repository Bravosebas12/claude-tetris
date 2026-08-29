# Claude GitHub Actions Setup con Bedrock

Esta guía te ayuda a configurar el GitHub Action para code review automático con Claude via AWS Bedrock.

## Requisitos Previos

1. **AWS Account** con acceso a Bedrock
2. **Bedrock Models Access** - Asegúrate de tener acceso a Claude en tu región
3. **GitHub Repository** - El repositorio debe estar configurado

## Paso 1: Obtener AWS Bearer Token

### Obtener el Bearer Token

1. Ve a [AWS Console](https://console.aws.amazon.com/)
2. Busca tu **Bearer Token** en:
   - **Security Credentials** → Genera un nuevo token si es necesario
   - O en tu **API Keys** de Bedrock
3. Anota el token completo (generalmente comienza con `Bearer_` o similar)

## Paso 2: Configurar Secrets en GitHub

1. Ve a **Settings** → **Secrets and variables** → **Actions**
2. Crea los siguientes secrets:

```
AWS_BEARER_TOKEN        = tu_bearer_token_completo
AWS_REGION             = us-east-1  (o tu región preferida donde esté Bedrock)
```

**Ejemplo:**
```
AWS_BEARER_TOKEN = Bearer_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
AWS_REGION = us-east-1
```

## Paso 3: Dar permisos al workflow

El workflow ya tiene los permisos necesarios:

```yaml
permissions:
  pull-requests: write   # Para comentar en PRs
  contents: read         # Para leer el código
```

No se requieren permisos adicionales ya que la autenticación es via Bearer Token.

## Paso 4: Testar

1. Crea una Pull Request en tu repo
2. El Action debería ejecutarse automáticamente
3. Busca el comentario de Claude en la PR

## Troubleshooting

### Error: "AWS_BEARER_TOKEN not found"
- Verifica que el secret `AWS_BEARER_TOKEN` esté configurado en GitHub
- Asegúrate de que el token no esté expirado

### Error: "401 Unauthorized"
- El Bearer Token es inválido o ha expirado
- Genera un nuevo token en AWS
- Asegúrate de que el token tiene permisos para Bedrock

### Error: "Model not found (404)"
- Verifica que `AWS_REGION` es correcto y Bedrock está disponible allí
- Cambia el modelo en `claude-review.py` si es necesario
- Modelos disponibles en Bedrock:
  - `anthropic.claude-opus-5`
  - `anthropic.claude-opus-4-8`
  - `anthropic.claude-sonnet-5`

### Error: "403 Forbidden"
- El Bearer Token no tiene permisos suficientes
- Verifica que el token tiene acceso a Bedrock `InvokeModel`

## Personalización

### Cambiar el modelo

En `.github/scripts/claude-review.py`:

```python
model="anthropic.claude-opus-5",  # Cambia aquí
```

### Agregar más contexto

Edita el prompt en la función `analyze_with_claude()` para:
- Agregar reglas específicas de tu proyecto
- Incluir más detalles del contexto
- Personalizar el análisis

### Filtrar archivos

En el workflow `.yml`, puedes agregar:

```yaml
on:
  pull_request:
    paths:
      - 'src/**'
      - '**.js'
```

## Costos

- **Bedrock Claude**: Aproximadamente $0.003 por 1K input tokens
- Cada PR review puede usar 2000-5000 tokens
- Costo estimado: $0.01-0.02 por review

## Notas Importantes con Bearer Token

- El Bearer Token debe tener acceso a **Bedrock** específicamente
- Los tokens pueden tener expiración, revísalo periódicamente
- No expongas el token en logs o commits (GitHub protege los secrets)
- Si el token se compromete, genéra uno nuevo inmediatamente

## Soporte

Para más información:
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Claude API Documentation](https://docs.anthropic.com/)
- [GitHub Actions Documentation](https://docs.github.com/actions)
