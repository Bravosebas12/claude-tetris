#!/usr/bin/env bash
# Consulta el clima de una ubicacion usando wttr.in (sin API key).
# Por defecto consulta Asuncion, Paraguay si no se indica ubicacion.
# Uso: get-weather.sh [ubicacion] [simple|detailed|json]
set -euo pipefail

LOCATION="${1:-Asuncion,Paraguay}"
FORMAT="${2:-simple}"

ENCODED_LOCATION=$(printf '%s' "$LOCATION" | sed 's/ /+/g')

case "$FORMAT" in
  simple)
    curl -fsS "https://wttr.in/${ENCODED_LOCATION}?format=3"
    ;;
  detailed)
    curl -fsS "https://wttr.in/${ENCODED_LOCATION}?0"
    ;;
  json)
    curl -fsS "https://wttr.in/${ENCODED_LOCATION}?format=j1"
    ;;
  *)
    echo "Formato desconocido: $FORMAT (usa simple|detailed|json)" >&2
    exit 1
    ;;
esac
