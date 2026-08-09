#!/usr/bin/env bash
#
# Applies labels and posts/updates the diagnosis comment on the issue that
# triggered the current workflow run. This is the ONLY entrypoint the
# triage-issue slash command is allowed to use for writes to GitHub — it
# exists so that untrusted issue content (which Claude reads and analyzes,
# but never executes) cannot be turned into an arbitrary `gh` command.
#
# Usage:
#   ./scripts/triage-issue.sh --add-label type:bug --add-label area:rendering \
#     --add-label priority:P3 --diagnosis-file /tmp/diagnosis.md
#
# The issue number is read from $GITHUB_EVENT_PATH, never from an argument,
# so it is always bound to the event that triggered the workflow run.
#

set -euo pipefail

MARKER="<!-- claude-triage -->"
ALLOWED_PREFIXES=("type:" "area:" "priority:" "needs-info")

ISSUE=$(jq -r '.issue.number // empty' "${GITHUB_EVENT_PATH:?GITHUB_EVENT_PATH not set}")
if ! [[ "$ISSUE" =~ ^[0-9]+$ ]]; then
  echo "Error: no issue number in event payload" >&2
  exit 1
fi

ADD_LABELS=()
REMOVE_LABELS=()
DIAGNOSIS_FILE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --add-label)
      ADD_LABELS+=("$2")
      shift 2
      ;;
    --remove-label)
      REMOVE_LABELS+=("$2")
      shift 2
      ;;
    --diagnosis-file)
      DIAGNOSIS_FILE="$2"
      shift 2
      ;;
    *)
      echo "Error: unknown argument '$1' (only --add-label, --remove-label, --diagnosis-file are accepted)" >&2
      exit 1
      ;;
  esac
done

is_allowed_label() {
  local label="$1"
  for prefix in "${ALLOWED_PREFIXES[@]}"; do
    if [[ "$label" == "$prefix"* ]]; then
      return 0
    fi
  done
  return 1
}

# Fetch valid labels from the repo
VALID_LABELS=$(gh label list --limit 500 --json name --jq '.[].name')

FILTERED_ADD=()
for label in "${ADD_LABELS[@]}"; do
  if echo "$VALID_LABELS" | grep -qxF "$label"; then
    FILTERED_ADD+=("$label")
  else
    echo "Skipping unknown label: $label" >&2
  fi
done

FILTERED_REMOVE=()
for label in "${REMOVE_LABELS[@]}"; do
  if ! is_allowed_label "$label"; then
    echo "Skipping remove of out-of-taxonomy label: $label" >&2
    continue
  fi
  if echo "$VALID_LABELS" | grep -qxF "$label"; then
    FILTERED_REMOVE+=("$label")
  else
    echo "Skipping unknown label: $label" >&2
  fi
done

if [[ ${#FILTERED_ADD[@]} -gt 0 || ${#FILTERED_REMOVE[@]} -gt 0 ]]; then
  GH_ARGS=("issue" "edit" "$ISSUE")
  for label in "${FILTERED_ADD[@]}"; do
    GH_ARGS+=("--add-label" "$label")
  done
  for label in "${FILTERED_REMOVE[@]}"; do
    GH_ARGS+=("--remove-label" "$label")
  done
  gh "${GH_ARGS[@]}"

  if [[ ${#FILTERED_ADD[@]} -gt 0 ]]; then
    echo "Added: ${FILTERED_ADD[*]}"
  fi
  if [[ ${#FILTERED_REMOVE[@]} -gt 0 ]]; then
    echo "Removed: ${FILTERED_REMOVE[*]}"
  fi
fi

if [[ -n "$DIAGNOSIS_FILE" ]]; then
  if [[ ! -f "$DIAGNOSIS_FILE" ]]; then
    echo "Error: diagnosis file not found: $DIAGNOSIS_FILE" >&2
    exit 1
  fi

  BODY_FILE=$(mktemp)
  trap 'rm -f "$BODY_FILE"' EXIT
  {
    echo "$MARKER"
    echo "## 🔍 Diagnóstico automático"
    echo
    cat "$DIAGNOSIS_FILE"
  } >"$BODY_FILE"

  # Look for an existing triage comment to update instead of piling up new ones.
  EXISTING_COMMENT_ID=$(gh api "repos/${GITHUB_REPOSITORY}/issues/${ISSUE}/comments" --paginate \
    --jq "[.[] | select(.body | contains(\"${MARKER}\"))][0].id // empty")

  if [[ -n "$EXISTING_COMMENT_ID" ]]; then
    gh api "repos/${GITHUB_REPOSITORY}/issues/comments/${EXISTING_COMMENT_ID}" \
      -X PATCH -F body=@"$BODY_FILE" >/dev/null
    echo "Updated diagnosis comment $EXISTING_COMMENT_ID"
  else
    gh api "repos/${GITHUB_REPOSITORY}/issues/${ISSUE}/comments" \
      -X POST -F body=@"$BODY_FILE" >/dev/null
    echo "Posted new diagnosis comment"
  fi
fi
