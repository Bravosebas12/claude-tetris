#!/usr/bin/env bash
set -euo pipefail

LOCATION="${1:-}"

FORMAT='%l:+%C+%t+(feels+%f),+humidity+%h,+wind+%w\n'

if [ -z "$LOCATION" ]; then
  curl -fsS "wttr.in/?format=${FORMAT}"
else
  ENCODED_LOCATION=$(printf '%s' "$LOCATION" | sed 's/ /+/g')
  curl -fsS "wttr.in/${ENCODED_LOCATION}?format=${FORMAT}"
fi
