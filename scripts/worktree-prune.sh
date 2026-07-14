#!/usr/bin/env bash
# Removes worktrees with no open PR, then drops their orphaned test DBs.
#   pnpm worktree:prune            # live run
#   pnpm worktree:prune --dry-run  # preview only
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
"$ROOT_DIR/scripts/clean-worktrees.sh" "$@"
pnpm exec tsx "$ROOT_DIR/scripts/prune-test-dbs.ts" "$@"
