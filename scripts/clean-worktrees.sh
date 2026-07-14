#!/usr/bin/env bash
# Removes worktrees (and their local branches) that have no open PR.
# Worktrees with an open PR are always kept.
#
# Usage:
#   ./scripts/clean-worktrees.sh            # live run
#   ./scripts/clean-worktrees.sh --dry-run  # preview only

set -euo pipefail

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true && echo "Dry run — no changes will be made."
echo ""

# Derive the primary worktree path from the first entry in the worktree list
# (always the primary, regardless of which worktree this script is run from).
# awk must consume the whole stream (no early `exit`) — exiting early closes
# the pipe and, under `set -o pipefail` with many worktrees, git dies with
# SIGPIPE and fails the script.
PRIMARY_WORKTREE=$(git worktree list --porcelain | awk '/^worktree / && !seen { print substr($0, 10); seen = 1 }')

# Fail fast if gh is unavailable or unauthenticated — an empty result would
# cause every worktree to look PR-less and get deleted
if ! open_branches=$(gh pr list --state open --json headRefName --jq '.[].headRefName' 2>&1); then
  echo "ERROR: Could not fetch open PRs via gh:" >&2
  echo "  $open_branches" >&2
  echo "  Run 'gh auth login' or check your network connection." >&2
  exit 1
fi

removed=0
skipped=0

while IFS='|' read -r wt_path branch; do
  # Always keep the primary worktree
  [[ "$wt_path" == "$PRIMARY_WORKTREE" ]] && continue

  # Skip detached HEADs (no branch)
  if [[ -z "$branch" ]]; then
    echo "SKIP  (detached HEAD): $wt_path"
    ((skipped++)) || true
    continue
  fi

  if grep -qxF "$branch" <<<"$open_branches"; then
    echo "SKIP  (open PR): $branch"
    ((skipped++)) || true
  else
    echo "REMOVE: $wt_path  [$branch]"
    if [[ "$DRY_RUN" == false ]]; then
      git worktree remove "$wt_path"
      git branch -D "$branch" 2>/dev/null || true
    fi
    ((removed++)) || true
  fi
done < <(git worktree list --porcelain | awk '
  /^worktree / { path = substr($0, 10) }
  /^branch /   { branch = substr($0, 19) }
  /^$/         { if (path != "") print path "|" branch; path = ""; branch = "" }
  END          { if (path != "") print path "|" branch }
')

[[ "$DRY_RUN" == false ]] && git worktree prune

echo ""
if [[ "$DRY_RUN" == true ]]; then
  echo "Dry run complete. Would remove: $removed worktree(s), would skip: $skipped."
else
  echo "Done. Removed: $removed worktree(s), skipped: $skipped (open PRs or detached HEAD)."
fi
