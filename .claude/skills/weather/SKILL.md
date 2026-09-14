---
name: weather
description: Consulta el clima actual (temperatura, condición, viento) de cualquier ciudad usando wttr.in, sin necesidad de API key. Por defecto consulta Asunción, Paraguay si no se indica otra ubicación. Úsala cuando el usuario pida el clima, la temperatura o el pronóstico de un lugar. Trigger: /weather [ciudad], "cómo está el clima", "qué temperatura hace en...", "dame el pronóstico de...".
---

# Weather

Obtiene el clima de una ubicación consultando el servicio gratuito [wttr.in](https://wttr.in), que no requiere API key ni configuración previa.

## Cómo usarla

1. Determina la ubicación a consultar:
   - Si el usuario la indicó en el mensaje o como argumento del comando (`/weather <ciudad>`), úsala tal cual (ej. "Madrid", "Buenos Aires", "New York").
   - Si el usuario no indicó ninguna ubicación, usa el valor por defecto del script: **Asunción, Paraguay**. No preguntes por la ciudad en ese caso.
2. Ejecuta el script auxiliar con el tool Bash (omite el primer argumento para usar Asunción por defecto):

   ```bash
   bash .claude/skills/weather/scripts/get-weather.sh "<ciudad>" simple
   # o, para el clima de Asuncion (por defecto), sin indicar ciudad:
   bash .claude/skills/weather/scripts/get-weather.sh "" simple
   ```

   Esto devuelve una línea compacta tipo: `Madrid: 🌤 +22°C`.

3. Si el usuario pide más detalle (pronóstico de varios días, viento, humedad, sensación térmica, etc.), vuelve a ejecutar el script con el formato `detailed`:

   ```bash
   bash .claude/skills/weather/scripts/get-weather.sh "<ciudad>" detailed
   ```

   Esto devuelve un reporte ASCII de 3 días con más información meteorológica.

4. Si necesitas los datos en bruto para procesarlos (por ejemplo, extraer solo la temperatura o construir una respuesta personalizada), usa el formato `json`:

   ```bash
   bash .claude/skills/weather/scripts/get-weather.sh "<ciudad>" json
   ```

   Esto devuelve el JSON completo de wttr.in (`format=j1`) para parsear los campos que necesites.

5. Presenta el resultado al usuario en español, de forma breve y clara. No es necesario mostrar la salida cruda del comando salvo que el usuario la pida explícitamente.

## Notas

- El script no requiere autenticación ni claves. Solo necesita conexión a internet.
- Si `curl` falla (sin conexión, ciudad no reconocida, servicio caído), informa al usuario del error tal como lo reporta el comando; no inventes datos de clima.
- Nombres de ciudad con espacios funcionan igual (el script codifica los espacios automáticamente).
