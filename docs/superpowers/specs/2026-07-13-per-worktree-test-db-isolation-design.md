# Per-Worktree Test DB Isolation — Design

**Issue:** #748 (consolidated; #620 closed as duplicate)
**Date:** 2026-07-13
**Type:** chore / test infrastructure

> **Update (2026-07-18):** `pnpm worktree:prune` now requires explicit branch args — `pnpm worktree:prune <branch>...` — or `--all` for a full sweep (human use only). Usage examples below reflect the original no-args behavior; see `scripts/clean-worktrees.sh` for current usage.

---

## Problem

`apps/api/vitest.integration.ts` and `apps/api/src/test/setup/global-setup.ts` both hardcode the integration test database as `concert_crawl_test` on `localhost:5433` (overridable via `DATABASE_URL_TEST`). Every worktree and the main repo run integration tests against the **same** database.

Because the config sets `fileParallelism: false` + `singleFork: true`, there is no in-process parallelism — the collision is strictly **cross-process**:

- Two concurrent `vitest` runs from different worktrees. `clearTables` issues `TRUNCATE ... CASCADE` in a `beforeEach`; each run wipes the other's rows mid-test, surfacing as spurious FK violations (53 tests failed this way in PR #619).
- A worktree on a branch with an un-migrated schema sees another branch's migration (e.g. migration 0041 from the admin-contest-review branch broke concurrent agents in #697), forcing `git commit --no-verify` workarounds.

A second, related hygiene problem: worktrees accumulate. As of 2026-07-13 there are 80+ stale worktree directories under `.worktrees/`, with their orphaned test databases never cleaned up.

## Goal

1. Two concurrent worktrees can run `pnpm --filter @concert-crawl/api test:integration` independently without colliding.
2. A worktree that hasn't migrated yet doesn't fail because of another worktree's schema changes.
3. CI is unaffected (one DB per job is already isolated via `DATABASE_URL_TEST`).
4. Stale worktrees **and** their test databases are pruned after every associated PR merge, preventing the accumulation seen today.

## Approach

Derive a per-worktree test DB name, auto-create + migrate it in `global-setup.ts`, and provide a single sweep script that cleans up merged worktrees and their orphaned databases. Advisory-lock and per-worktree-Docker alternatives were rejected: the advisory lock serializes runs but does not isolate schema (fails goal #2), and a per-worktree Docker DB is heavier setup for no additional benefit over per-DB naming.

### 1. Shared name-resolution helper

New module `apps/api/src/test/setup/test-db.ts` exporting `resolveTestDbUrl(): string`:

- If `DATABASE_URL_TEST` is set, return it verbatim. This preserves CI (one isolated DB per job) and any explicit manual override.
- Otherwise run `git rev-parse --show-toplevel`:
  - If the returned path contains `/.worktrees/`, the DB name is `concert_crawl_test__<sanitized>` where `<sanitized>` is the worktree directory basename lowercased with all non-`[a-z0-9_]` characters replaced by `_`.
  - Otherwise (the main repo), the DB name is the current default `concert_crawl_test`. This keeps the primary directory's behavior unchanged so nothing breaks for the user's own testing.
- The base connection (`host`, `port`, `user`, `password`) is taken from the existing default URL (`postgresql://postgres:postgres@localhost:5433`); only the database name varies.

Both `vitest.integration.ts` (its `env.DATABASE_URL`) and `global-setup.ts` call this single helper, so the two resolution sites cannot drift.

Because Vitest resolves `env` in the config statically, `vitest.integration.ts` computes the URL by importing and calling `resolveTestDbUrl()` at config-eval time.

### 2. Auto-create + migrate in `global-setup.ts`

`setup()` currently connects to the target DB and runs migrations, which fails if the database does not exist yet. New behavior:

1. Parse the target DB name from `resolveTestDbUrl()`.
2. Connect to the `postgres` maintenance database on the same host/port.
3. `CREATE DATABASE "<name>"` if it does not already exist (executed outside a transaction, as `CREATE DATABASE` requires). Guard with a `SELECT 1 FROM pg_database WHERE datname = $1` check to stay idempotent.
4. Close the maintenance connection, then connect to the target DB and run migrations exactly as today.

Second and later runs on an existing DB skip creation and just migrate — idempotent.

### 3. Sweep — `pnpm worktree:prune`

Worktree removal already exists: `scripts/clean-worktrees.sh` removes every non-primary worktree whose branch has **no open PR** (it keeps worktrees with an open PR and skips detached HEADs). This is a stronger signal than "merged into `origin/main`" — it correctly retains in-flight branches whose PR is still open — so we reuse it rather than reimplement worktree removal.

The only missing half is dropping the orphaned test databases those removed worktrees leave behind. Two new pieces:

1. **`scripts/prune-test-dbs.ts`** (+ `prune-test-dbs-helpers.ts` + `prune-test-dbs.test.ts`, mirroring the existing `*-helpers.ts` / `*.test.ts` / runner split under `scripts/`). It:
   - Reads the surviving worktree directory names from `git worktree list --porcelain`.
   - Connects to the `postgres` maintenance DB and lists all `concert_crawl_test__*` databases.
   - Computes the orphan set with a pure helper `selectOrphanedTestDbs(allDbNames, survivingWorktreeNames)` and `DROP DATABASE` each orphan.
   - Supports `--dry-run` (print only) and forwards it from the wrapper.
2. **`scripts/worktree-prune.sh`** — a thin wrapper that runs `clean-worktrees.sh "$@"` then `tsx scripts/prune-test-dbs.ts "$@"`, so a single `--dry-run` flag flows to both. Exposed as root `package.json` script `worktree:prune`.

Order matters: worktrees are removed first, then the DB prune sees the reduced worktree set and drops the newly-orphaned DBs.

Safety rules:

- `clean-worktrees.sh` already protects open-PR worktrees and the primary worktree, and fails fast if `gh` can't list PRs (so an auth failure never nukes everything).
- `prune-test-dbs.ts` never drops the base `concert_crawl_test` database (it only matches the `concert_crawl_test__*` prefix) and never drops a DB whose worktree still exists.
- `--dry-run` prints every worktree and database that would be removed without touching anything.

`selectOrphanedTestDbs` is a pure function, unit-tested without a live DB or git tree. Running `pnpm worktree:prune` once clears the current 80+ worktree backlog and their DBs, and it is the recurring post-merge hygiene tool.

### 4. Docs

- **CLAUDE.md** — extend the worktree conventions with a hard rule: after every PR merges, remove its worktree and run `pnpm worktree:prune`. This is the mechanism that prevents re-accumulation.
- **CLAUDE.md / runbook note** — document the per-worktree DB naming convention (`concert_crawl_test__<worktree>`) and the `DATABASE_URL_TEST` override for CI/manual use.

## Testing

- **Unit — `resolveTestDbUrl()`:** worktree path (`/.worktrees/foo` → `concert_crawl_test__foo`), main repo path → `concert_crawl_test`, `DATABASE_URL_TEST` set → returned verbatim, sanitization of `feat/bar-baz` → `feat_bar_baz`.
- **Unit — `selectOrphanedTestDbs`:** returns only `concert_crawl_test__*` names absent from the surviving-worktree list; never returns the base `concert_crawl_test`; returns empty when every DB has a matching worktree.
- **Manual validation:** create two worktrees, run `test:integration` in each simultaneously, confirm no cross-truncation and independent schemas; run `pnpm worktree:prune --dry-run` then for real and confirm open-PR worktrees survive while orphaned worktrees + their DBs are removed.

## Automatic pruning

`pnpm worktree:prune` is the explicit post-merge step, but to keep stale worktrees and DBs from accumulating between merges, a `SessionStart` hook (`.claude/settings.json` → `.claude/hooks/prune-merged-worktrees.sh`) runs the same cleanup automatically at the start of each session: it removes worktrees whose tracking branch is gone and drops their orphaned `concert_crawl_test__*` DBs (reusing `scripts/prune-test-dbs.ts`). The hook never blocks startup and skips the DB step when the local test DB is unreachable.

## Out of scope

- Changing CI's DB provisioning (already isolated per job).
- Migrating to a schema-per-test or container-per-worktree model.
- Cron-based pruning on remote/CI — cleanup runs locally via the explicit command and the SessionStart hook.
