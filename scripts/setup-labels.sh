#!/usr/bin/env bash
#
# Creates (or updates) the label taxonomy used by the automated issue triage
# workflow. Safe to re-run: uses `gh label create --force`, which upserts.
#
# Usage: ./scripts/setup-labels.sh
#

set -euo pipefail

declare -a LABELS=(
  "type:bug|d73a4a|Incorrect or unexpected behavior"
  "type:feature|a2eeef|New functionality or enhancement"
  "type:docs|0075ca|Documentation changes"
  "type:question|d876e3|A question, not an actionable change"
  "area:game-logic|1d76db|Board state, collisions, rotation, line clearing, scoring"
  "area:rendering|5319e7|Canvas drawing, piece colors, ghost piece"
  "area:ui|fbca04|HTML structure, CSS, HUD, overlay"
  "area:controls|0e8a16|Keyboard input, pause, drop controls"
  "area:build-ci|c5def5|GitHub Actions workflows and automation"
  "priority:P1|b60205|Game is broken or unplayable"
  "priority:P2|d93f0b|Affects experience, workaround exists"
  "priority:P3|fef2c0|Cosmetic or nice-to-have"
  "needs-info|cfd3d7|Missing information needed to diagnose"
)

for entry in "${LABELS[@]}"; do
  IFS='|' read -r name color description <<<"$entry"
  echo "Creating/updating label: $name"
  gh label create "$name" --color "$color" --description "$description" --force
done

echo "Done. Current labels:"
gh label list --limit 60
