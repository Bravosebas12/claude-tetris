---
name: clima
description: Consulta el clima actual y el pronóstico de los próximos días desde la terminal. Úsala cuando el usuario pregunte por el clima, el tiempo, la temperatura, si va a llover o qué tiempo hará, con o sin ciudad. Si no indica ciudad, detecta la ubicación por IP.
allowed-tools: PowerShell, Bash, Read
---

# Clima

Datos de [Open-Meteo](https://open-meteo.com/) — gratuito y **sin API key**. La ubicación,
cuando no se indica ciudad, sale de `ipwho.is` (con `ip-api.com` de respaldo).

## Cómo usarla

Un solo paso: ejecutar el script y mostrar su salida.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .claude\skills\clima\scripts\clima.ps1 [ciudad] [-Dias N] [-Json]
```

- **Sin argumentos** → detecta la ubicación por IP. Es el caso por defecto.
- **Con ciudad** → pásala solo si el usuario la nombró. No hacen falta comillas aunque
  tenga varias palabras: `... clima.ps1 Buenos Aires`.
- `-Dias N` → días de pronóstico (1–16, por defecto 3). Úsalo si el usuario pide
  "la semana" (`-Dias 7`) o "mañana" (`-Dias 2`).
- `-Json` → salida estructurada. Solo si hace falta encadenar o filtrar los datos;
  para responder al usuario, **no** lo uses.

## Reglas

1. **Muestra la salida tal cual**, dentro de un bloque de código. Ya viene formateada y
   alineada en español; no la reformatees, no la conviertas en tabla y no la resumas.
2. Puedes añadir **una** frase de contexto después del bloque si el usuario preguntó algo
   concreto ("¿llevo paraguas?" → mira la columna `lluvia`). Nada más.
3. Si el script sale con **código 1**, el mensaje de error de stderr ya está redactado para
   el usuario: muéstraselo. Si falló la detección por IP, pídele la ciudad.
4. No inventes datos meteorológicos. Si el script falla, dilo — nunca respondas de memoria.

## Ejemplo de salida

```
  Madrid, Comunidad Autónoma de Madrid (España)  ·  vie 11 sep, 11:00

  Ahora     21,1 °C  (sensación 17,5 °C)   Parcialmente nublado
            Humedad 22 %  ·  Viento 8,7 km/h

  vie 11     13,8 /  30,2 °C   Parcialmente nublado       lluvia   0 %
  sáb 12     15,9 /  31,3 °C   Mayormente despejado       lluvia   0 %
  dom 13     17,0 /  32,3 °C   Despejado                  lluvia   0 %
```

Temperaturas en °C, viento en km/h, `lluvia` es la probabilidad máxima del día. La hora del
encabezado es la **local de la ciudad consultada**, no la tuya.

## Notas de mantenimiento

- `scripts/clima.ps1` está guardado en **UTF-8 con BOM**: Windows PowerShell 5.1 lee como
  ANSI los `.ps1` sin BOM y destrozaría los acentos y el símbolo `°`. Si lo editas, conserva
  el BOM.
- Las variables de PowerShell **no** distinguen mayúsculas: no declares dentro del script
  nombres que choquen con los parámetros `$Ciudad`, `$Dias` o `$Json`.
- Los códigos meteorológicos WMO se traducen en la tabla `$WMO`; un código no mapeado sale
  como `Código WMO N` en vez de romper.
