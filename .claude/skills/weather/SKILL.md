---
name: weather
description: Consulta el clima actual localmente (por IP) o de una ciudad concreta usando wttr.in, sin API key. Úsala cuando el usuario pida el clima, el tiempo, la temperatura o el pronóstico.
---

# Clima (wttr.in)

Consulta el clima usando `wttr.in`, un servicio gratuito que no requiere API key ni registro.
En Windows usa siempre `curl.exe` (no `curl`, que en PowerShell es un alias de
`Invoke-WebRequest` y no devuelve el formato de texto de wttr.in).

## Cómo decidir la ubicación

- Si el usuario **no menciona ninguna ciudad**, usa por defecto **Medellín, Colombia**
  (`wttr.in/Medellin`).
- Si el usuario **menciona una ciudad**, úsala en la ruta. Reemplaza los espacios por `+`
  (ej. "Nueva York" → `Nueva+York`) y dilo en el idioma/nombre tal como lo escribió el usuario.

## Comandos

Vista completa (clima por defecto, Medellín, en español):
```
curl.exe "wttr.in/Medellin?lang=es"
```

Vista completa de una ciudad:
```
curl.exe "wttr.in/Madrid?lang=es"
```

Resumen en una sola línea (rápido, ideal para respuestas cortas):
```
curl.exe "wttr.in/Medellin?format=3&lang=es"
curl.exe "wttr.in/Madrid?format=3&lang=es"
```

Pronóstico reducido a hoy únicamente (sin las siguientes 2 días), más compacto:
```
curl.exe "wttr.in/Madrid?lang=es&0"
```
(usa `&1` para hoy + mañana, `&2` para los 3 días por defecto)

Unidades: por defecto wttr.in detecta unidades según la región. Para forzarlas:
- `&m` → sistema métrico (°C, km/h)
- `&u` → sistema imperial (°F, mph)

Puedes combinar parámetros con `&`, ej: `curl.exe "wttr.in/Madrid?lang=es&m&format=3"`.

## Después de ejecutar

Resume el resultado en español de forma breve y natural: condición general, temperatura,
sensación térmica y viento. No hace falta pegar la salida ASCII completa a menos que el
usuario pida el detalle o el pronóstico extendido.
