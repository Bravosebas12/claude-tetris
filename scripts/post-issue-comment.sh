#!/usr/bin/env bash
#
# Posts a single comment (read from stdin) to the issue that triggered the
# workflow. The issue number is read from the event payload, not from an
# argument, so this can't be pointed at an arbitrary issue.
#
# Usage: ./scripts/post-issue-comment.sh <<'EOF'
# ## Diagnostico
# ...
# EOF

set -euo pipefail

ISSUE=$(jq -r '.issue.number // empty' "${GITHUB_EVENT_PATH:?GITHUB_EVENT_PATH not set}")
if ! [[ "$ISSUE" =~ ^[0-9]+$ ]]; then
  echo "Error: no issue number in event payload" >&2
  exit 1
fi

gh issue comment "$ISSUE" --body-file -
