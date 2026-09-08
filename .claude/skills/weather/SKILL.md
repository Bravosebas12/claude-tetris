---
name: weather
description: Obtiene el clima actual (y pronóstico corto) para la ubicación del usuario o una ciudad dada, usando wttr.in sin necesidad de API key. Usar cuando pidan "clima", "tiempo", "weather", "temperatura", "va a llover", etc.
---

# Weather

Consulta el clima usando el servicio público `wttr.in` (no requiere API key).

## Uso

Ejecutar el script pasando opcionalmente una ciudad. Sin argumentos, `wttr.in` autodetecta la ubicación por IP.

```bash
bash "$SKILL_DIR/scripts/get_weather.sh" [ciudad]
```

En Windows sin bash disponible, usar PowerShell:

```powershell
powershell -File "$SKILL_DIR/scripts/get_weather.ps1" [ciudad]
```

Ejemplos:
- Clima actual autodetectado: sin argumentos.
- Clima de una ciudad puntual: pasar el nombre, ej. `"Buenos Aires"`.

## Presentación del resultado

El script devuelve una línea compacta tipo:
`Ciudad, Provincia, País: Condición +T°C (feels +F°C), humidity H%, wind ↖Wkm/h`

**Nunca mostrar esa línea cruda al usuario.** Parsear los campos y presentarlos siempre como
tabla markdown, por ejemplo:

| Campo | Valor |
|---|---|
| Ubicación | Ciudad, Provincia, País |
| Condición | Soleado |
| Temperatura | 17°C |
| Sensación térmica | 13°C |
| Humedad | 27% |
| Viento | 6 km/h ↖ |

## Notas

- El formato por defecto es un reporte de texto compacto (`?format=...`), pensado para terminal.
- Si el comando falla (sin conexión, servicio caído), informarlo directamente al usuario en vez de reintentar en loop.
- No hace falta configurar nada: no hay claves ni variables de entorno.
