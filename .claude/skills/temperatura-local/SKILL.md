---
name: temperatura-local
description: Consulta temperatura y clima actual de ubicación local del usuario (por IP), sin API key. Usar cuando usuario pregunte "que temperatura hace", "clima local", "cuanto hace afuera".
---

# Temperatura local

Consulta clima actual vía `wttr.in` (geolocaliza por IP, sin API key).

## Uso

Ejecutar comando bash:

```bash
curl -s "wttr.in?format=3"
```

Salida formato: `Ciudad: emoji +XX°C`

Si usuario pide detalle (humedad, viento, sensación térmica), usar:

```bash
curl -s "wttr.in?format=%l:+%c+%t+(feels+%f)+humidity:%h+wind:%w"
```

Si `curl` falla (sin red o comando no disponible en Windows), fallback con PowerShell:

```powershell
(Invoke-WebRequest -Uri "wttr.in?format=3" -UseBasicParsing).Content
```

Reportar resultado directo al usuario, sin inventar datos si comando falla.
