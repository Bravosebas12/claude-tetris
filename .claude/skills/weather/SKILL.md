# Weather Skill

Use this skill when the user asks about the weather, temperature, forecast, or climate conditions — locally or for a specific city.

## How to use

1. If the user provides a city or location, use it directly.
2. If no location is given, use the default location: **Lagunilla, Heredia, Costa Rica**.
3. Fetch weather from `wttr.in` (no API key required).

## Steps

### Step 1 — Resolve location

If no location was provided, use the default: `Lagunilla,Heredia,CR`. Skip the IP geolocation step entirely.

### Step 2 — Fetch weather

Fetch `https://wttr.in/{CITY}?format=j1` using WebFetch. This returns structured JSON with:

- `current_condition[0]`:
  - `temp_C` / `temp_F` — current temperature
  - `FeelsLikeC` / `FeelsLikeF` — feels like
  - `humidity` — humidity %
  - `windspeedKmph` — wind speed
  - `weatherDesc[0].value` — description (e.g. "Partly cloudy")
  - `uvIndex` — UV index
- `weather[0]` — today's forecast:
  - `maxtempC` / `mintempC` — high/low
  - `hourly` — hourly breakdown
- `nearest_area[0]`:
  - `areaName[0].value`, `country[0].value` — confirmed location name

### Step 3 — Present results

Display a clean, concise weather summary. Include:
- Location name
- Current conditions (temp, feels like, description)
- Humidity and wind
- Today's high/low
- A 3-day forecast summary if the user asked for it

Keep the output readable — use plain text or a simple table, not raw JSON.

## Example triggers

- "What's the weather like?"
- "How's the weather in Tokyo?"
- "Will it rain today?"
- "Give me a 3-day forecast for Madrid"
- "Current temperature here"
