# Clima local — Cruce de Arinaga

Consulta el clima actual en la ubicación indicada.

- Si se pasa un argumento (`$ARGUMENTS`), úsalo como ubicación.
- Si no hay argumento, usa la ubicación por defecto: **Cruce de Arinaga, Agüimes, Las Palmas, Gran Canaria, España**.

## Instrucciones

1. Determina la ubicación: `$ARGUMENTS` si existe, si no `Cruce de Arinaga, Agüimes, Las Palmas, Gran Canaria, España`.
2. Usa `WebSearch` para buscar el tiempo actual con la query:
   `tiempo ahora <ubicación> temperatura humedad viento`
3. Muestra los resultados en una tabla con estos campos (si están disponibles):
   - Temperatura (°C)
   - Condición meteorológica
   - Humedad (%)
   - Viento (km/h y dirección)
   - Presión (hPa)
4. Indica la ubicación consultada y la hora de la consulta.
5. Si los datos difieren entre fuentes, muestra el rango o la media.
6. Incluye las fuentes al final como enlaces markdown.
