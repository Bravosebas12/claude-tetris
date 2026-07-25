---
name: weather
description: >
  Reports the current temperature in degrees for a given city. Takes an optional city
  name as a parameter; if none is given, defaults to Heredia, Costa Rica.
  Use when the user invokes /weather [city], or asks "temperature of <city>",
  "what's the weather in <city>", "dame la temperatura de <city>".
---

## Input

The argument passed to this skill is a city name (e.g. "Tokyo", "San José, Costa Rica").

1. If an argument is provided, use it as the target city.
2. If no argument is provided (empty input), default the target city to **Heredia, Costa Rica**.

## Steps

1. Call `WebSearch` with a query like `"<city> current temperature weather"`.
2. Extract the current temperature in degrees (state the unit — °F or °C, whichever the source reports) and brief conditions (e.g. cloudy, clear).
3. Reply with one short line: **`<City>`: `<temp>` (`<conditions>`)**.
4. Include a `Sources:` section with markdown links per WebSearch tool requirements — keep it to 1-2 links, not the full result list.

Keep the response terse — city, temperature, one-word conditions, sources. No forecast tables or extra commentary unless the user asks for more detail.
