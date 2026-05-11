#!/usr/bin/env bash
# Removes worktrees (and their local branches) that have no open PR.
# Worktrees with an open PR are always kept.
#
# Usage:
#   ./scripts/clean-worktrees.sh            # live run
#   ./scripts/clean-worktrees.sh --dry-run  # preview only

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
DRY_RUN=false

[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true && echo "Dry run — no changes will be made."
echo ""

# Collect branches that have an open PR so we never remove active work
open_branches=$(gh pr list --state open --json headRefName --jq '.[].headRefName' 2>/dev/null || echo "")

removed=0
skipped=0

while IFS='|' read -r wt_path branch; do
  # Always keep the main worktree
  [[ "$wt_path" == "$REPO_ROOT" ]] && continue

  # Skip detached HEADs (no branch)
  if [[ -z "$branch" ]]; then
    echo "SKIP  (detached HEAD): $wt_path"
    ((skipped++)) || true
    continue
  fi

  if echo "$open_branches" | grep -qxF "$branch"; then
    echo "SKIP  (open PR): $branch"
    ((skipped++)) || true
  else
    echo "REMOVE: $wt_path  [$branch]"
    if [[ "$DRY_RUN" == false ]]; then
      git worktree remove --force "$wt_path"
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

git worktree prune

echo ""
if [[ "$DRY_RUN" == true ]]; then
  echo "Dry run complete. Would remove: $removed worktree(s), would skip: $skipped."
else
  echo "Done. Removed: $removed worktree(s), skipped: $skipped (open PRs or detached HEAD)."
fi
