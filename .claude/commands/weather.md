Detecta el clima local del usuario y lo muestra de forma compacta.

Pasos:
1. Corre `curl -s https://ipinfo.io/json` para obtener ciudad y país desde la IP.
2. Extrae los campos `city` y `country` del JSON.
3. Corre `curl -s "https://wttr.in/<CITY>?format=j1"` (espacios → `+` en la URL).
4. Del JSON extrae: `temp_C`, `weatherDesc[0].value`, `humidity`, `windspeedKmph`, `FeelsLikeC` de `current_condition[0]`.
5. Muestra el resumen:

```
📍 Ciudad, País
🌡  XX°C (sensación XX°C)
☁️  Descripción
💧 Humedad: XX%  💨 Viento: XX km/h
```

Si falla la detección por IP, pide la ciudad al usuario y repite desde el paso 3.

Si se pasa `$ARGUMENTS`, úsalo directamente como ciudad en lugar de detectarla.
