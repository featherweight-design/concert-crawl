#!/usr/bin/env bash
# Print open-issue counts against the backlog ceilings (CLAUDE.md § Issue Tracking).
# Run this before filing any issue. Exits 1 when a ceiling is breached, so an agent
# that files blindly gets a non-zero status rather than silent growth.
set -euo pipefail

# Fail loudly on the hard dependencies rather than a bare "command not found" from
# the first call deep in the script, matching scripts/request-copilot-review.sh.
for dep in gh jq; do
  if ! command -v "$dep" >/dev/null 2>&1; then
    echo "ERROR: '$dep' is required but was not found in PATH." >&2
    exit 1
  fi
done

# Derive the repo from the checkout rather than hardcoding it, again matching
# request-copilot-review.sh — keeps this correct across forks, renames, transfers.
if ! REPO=$(gh repo view --json nameWithOwner --jq .nameWithOwner); then
  echo "ERROR: Could not determine the repo via gh (see gh output above)." >&2
  exit 1
fi

# P2 caps at 40 and P3 at 20. Both map to `priority: normal`, so the label alone cannot
# split them — the per-band split lives in the newest ledger under docs/superpowers/backlog/.
NORMAL_CEILING=60

# jq's group_by sorts by the key before grouping, so input order does not affect the counts.
counts=$(gh issue list --repo "$REPO" --state open --limit 1000 \
  --json labels --jq '[.[] | (.labels | map(.name) | map(select(startswith("priority: "))) | first) // "priority: unlabelled"] | group_by(.) | map({key: .[0], value: length}) | from_entries')

get() { echo "$counts" | jq -r --arg k "priority: $1" '.[$k] // 0'; }

blocker=$(get blocker)
high=$(get high)
normal=$(get normal)
unlabelled=$(echo "$counts" | jq -r '.["priority: unlabelled"] // 0')
total=$((blocker + high + normal + unlabelled))

printf '\nBacklog status — %s\n\n' "$REPO"
printf '  %-22s %s\n' 'P0  blocker' "$blocker"
printf '  %-22s %s\n' 'P1  high' "$high"
printf '  %-22s %s / %s\n' 'P2+P3  normal' "$normal" "$NORMAL_CEILING"
[ "$unlabelled" -gt 0 ] && printf '  %-22s %s  <- missing a priority: label\n' 'unlabelled' "$unlabelled"
printf '  %-22s %s\n\n' 'total open' "$total"

ledger=$(ls -1 docs/superpowers/backlog/audit-*.md 2>/dev/null | sort | tail -1 || true)
[ -n "$ledger" ] && printf 'P2/P3 split + per-issue verdicts: %s\n' "$ledger"
printf 'Launch-gating items:              docs/superpowers/launch-bar.md\n\n'

status=0

if [ "$normal" -gt "$NORMAL_CEILING" ]; then
  printf 'CEILING BREACHED by %s. The backlog is zero-sum: a new issue must name the\n' "$((normal - NORMAL_CEILING))"
  printf 'one it displaces, and needs Hugh sign-off either way (CLAUDE.md standing intake rule).\n\n'
  status=1
fi

# An unlabelled issue is invisible to the ceiling check above, so it grows the
# backlog silently — the exact failure this script exists to catch.
if [ "$unlabelled" -gt 0 ]; then
  printf '%s issue(s) carry no `priority:` label and are excluded from the ceiling\n' "$unlabelled"
  printf 'count above. Label them before trusting these numbers.\n\n'
  status=1
fi

exit "$status"
