---
name: weather-madrid
description: This skill should be used when the user asks about "clima madrid", "tiempo madrid", "temperatura madrid", "weather madrid", or mentions Madrid weather conditions.
---

# weather-madrid

Obtiene información meteorológica actual de Madrid usando wttr.in (servicio gratuito sin API key).

## Instrucciones

Cuando se invoque esta skill:

1. Ejecuta el comando curl para obtener clima actual
2. Muestra resultado en formato conciso
3. Si usuario pide detalles, usa formato extendido con pronóstico 3 días

## Implementación

```bash
# Formato conciso
curl -s "wttr.in/Madrid?format=%l:+%c+%t+%w+%p+%h"

# Formato detallado (3 días)
curl -s "wttr.in/Madrid?lang=es&format=3"
```

## Formato de salida

Conciso muestra:

- Ubicación
- Condición (emoji)
- Temperatura
- Viento
- Presión
- Humedad

Detallado muestra pronóstico 3 días con condiciones hora a hora.

## Notas

- wttr.in no requiere registro ni API key
- Límite: ~1000 requests/día por IP
- Lang=es para respuestas en español
- Alternativa: OpenWeatherMap si necesitas más datos (requiere API key)
