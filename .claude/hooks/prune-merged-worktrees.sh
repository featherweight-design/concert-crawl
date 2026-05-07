#!/bin/bash
# Remove worktrees whose remote tracking branch has been deleted (PR merged).
# Runs at SessionStart so stale worktrees are cleaned up automatically.

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0

git -C "$REPO_ROOT" fetch --prune --quiet 2>/dev/null || true
git -C "$REPO_ROOT" worktree prune 2>/dev/null || true

pruned=()
current_wt=""

while IFS= read -r line; do
  case "$line" in
    "worktree "*)
      current_wt="${line#worktree }"
      ;;
    "branch "*)
      branch="${line#branch refs/heads/}"
      if [ -n "$current_wt" ] && [ "$current_wt" != "$REPO_ROOT" ]; then
        tracking=$(git -C "$REPO_ROOT" for-each-ref --format='%(upstream:track)' "refs/heads/$branch" 2>/dev/null)
        if [ "$tracking" = "[gone]" ]; then
          git -C "$REPO_ROOT" worktree remove --force "$current_wt" 2>/dev/null && \
            pruned+=("$branch")
        fi
      fi
      ;;
  esac
done < <(git -C "$REPO_ROOT" worktree list --porcelain)

if [ ${#pruned[@]} -gt 0 ]; then
  msg="Pruned ${#pruned[@]} stale worktree(s): ${pruned[*]}"
  printf '{"systemMessage": "%s"}' "$msg"
fi
