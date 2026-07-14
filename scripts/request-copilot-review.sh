#!/usr/bin/env bash
# Requests a GitHub Copilot review on a pull request — reliably.
#
# Why this exists: the requested_reviewers API accepts the display name
# "Copilot" and returns HTTP 200 but SILENTLY drops it — no reviewer is
# attached and no review is ever generated. The only string that works is the
# bot's full login, "copilot-pull-request-reviewer[bot]". This script hardcodes
# that login and fails loudly if the attach did not actually take, so a 200 is
# never mistaken for success.
#
# Copilot does NOT auto-review. Run this after opening a PR AND after every
# fix push (a push does not trigger a re-review).
#
# Usage:
#   ./scripts/request-copilot-review.sh <pr-number>
#   ./scripts/request-copilot-review.sh 937

set -euo pipefail

REPO="HartiganHM/concert-crawl"
COPILOT_LOGIN="copilot-pull-request-reviewer[bot]"

PR_NUMBER="${1:-}"
if [[ -z "$PR_NUMBER" ]]; then
  echo "Usage: $0 <pr-number>" >&2
  exit 2
fi
if ! [[ "$PR_NUMBER" =~ ^[0-9]+$ ]]; then
  echo "Error: PR number must be numeric, got '$PR_NUMBER'." >&2
  exit 2
fi

# Body MUST be JSON via --input - (form-encoded -f → 422).
RESPONSE=$(gh api -X POST -H "Accept: application/vnd.github+json" \
  "/repos/${REPO}/pulls/${PR_NUMBER}/requested_reviewers" --input - <<JSON
{"reviewers": ["${COPILOT_LOGIN}"]}
JSON
)

# A 200 is not success — verify the reviewer actually attached.
ATTACHED=$(printf '%s' "$RESPONSE" | python3 -c \
  "import json,sys; d=json.load(sys.stdin); print(','.join(r['login'] for r in d.get('requested_reviewers', [])))")

if [[ -z "$ATTACHED" ]]; then
  echo "FAILED: Copilot was not attached to PR #${PR_NUMBER} (silent 200)." >&2
  echo "Re-run, or add Copilot via the UI reviewers gear if it keeps failing." >&2
  exit 1
fi

echo "Requested Copilot review on PR #${PR_NUMBER} (attached: ${ATTACHED})."
echo "Poll for completion: gh api /repos/${REPO}/pulls/${PR_NUMBER}/reviews"
