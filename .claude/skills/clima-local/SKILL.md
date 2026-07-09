---
name: clima-local
description: >
  Consulta clima/temperatura actual de una ciudad usando curl contra wttr.in
  (sin API key, dato en vivo, evita caché de WebSearch). Trigger: /clima,
  "revisa el clima", "checa la temperatura", "clima de <ciudad>".
---

# Clima Local

Consulta clima real-time por línea de comandos, sin depender de WebSearch (que cachea resultados y no refleja cambios minuto a minuto).

## Uso

Ciudad por defecto: `Ciudad de Mexico`. Si el usuario da otra ciudad, úsala (reemplaza espacios por `+`).

Ejecuta con Bash:

```bash
curl -s "wttr.in/Ciudad+de+Mexico?format=%l:+%c+%t+(sensacion+%f)+humedad+%h+viento+%w&lang=es"
```

- `%l` ubicación, `%c` icono/condición, `%t` temperatura, `%f` sensación térmica, `%h` humedad, `%w` viento.
- Timeout corto (`curl -s --max-time 10 ...`); si falla (sin red, wttr.in caído), avisa al usuario y cae a WebSearch como respaldo.
- Reporta al usuario en una línea, en español, con los datos crudos que regrese el comando — no inventes ni redondees de más.

## Ejemplo de salida cruda

```
Ciudad de Mexico: ⛅️ +19°C (sensacion +18°C) humedad 72% viento 11km/h
```

Repórtalo tal cual (traducido a frase natural), sin tabla, sin adorno.
