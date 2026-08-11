---
name: weather
description: Consulta clima actual de una ciudad usando wttr.in (sin API key). Usar cuando el usuario pida clima, temperatura, pronóstico de una ubicación.
---

# Weather

Consulta clima via wttr.in (gratis, sin key, texto plano).

## Uso

Ciudad dada por usuario. Si no da ciudad, default: **Madrid** (España).

**PowerShell:**
```powershell
Invoke-RestMethod "https://wttr.in/Madrid?format=3&lang=es"
```

**Bash:**
```bash
curl "https://wttr.in/Madrid?format=3&lang=es"
```

Formato corto (`?format=3`): `Ciudad: ☀️ +25°C`

## Detalle completo

Reporte 3-day, ASCII art:
```
curl "https://wttr.in/Madrid?lang=es"
```

## JSON (parseo)

```
curl "https://wttr.in/Madrid?format=j1&lang=es"
```
Campos clave: `current_condition[0].temp_C`, `.weatherDesc[0].value`, `.humidity`, `.windspeedKmph`.

## Notas

- Default ciudad: **Madrid** (España). Otra ciudad española: reemplazar `Madrid` (ej `Barcelona`, `Valencia`, `Sevilla`).
- Ciudad con espacio: usar `+` (ej `A+Coruña`).
- `?lang=es` siempre incluido, descripciones en español.
