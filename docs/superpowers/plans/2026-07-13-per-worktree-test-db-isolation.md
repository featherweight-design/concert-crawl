# Per-Worktree Test DB Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each git worktree its own auto-created integration test database so concurrent test runs never collide, and add a post-merge sweep that drops orphaned test DBs alongside the existing worktree cleanup.

**Architecture:** A single `resolveTestDbUrl()` helper derives the test DB name from the worktree path; both the vitest integration config and `global-setup.ts` call it. `global-setup.ts` auto-creates the DB via a `postgres` maintenance connection before migrating. A `worktree:prune` wrapper runs the existing `clean-worktrees.sh` then a new `prune-test-dbs.ts` that drops `concert_crawl_test__*` databases with no surviving worktree.

**Tech Stack:** TypeScript, Vitest, Drizzle (postgres-js), pnpm workspaces, tsx, bash.

## Global Constraints

- **No `as` casts** — use type guards / narrowing (`packages/db` postgres-js is already typed).
- **No single-character identifiers** — min length 2 (`err`, `idx`, `ctx`).
- **TypeScript strict mode** across all packages.
- **No raw SQL except migrations** — the maintenance-connection SQL here (`CREATE DATABASE`, `DROP DATABASE`, `pg_database` reads) is infra tooling outside the Drizzle query path and is the deliberate exception, mirroring `global-setup.ts` which already runs the migrator directly.
- **Base test DB URL:** `postgresql://postgres:postgres@localhost:5433/concert_crawl_test`. Base DB name `concert_crawl_test`; per-worktree names use the `concert_crawl_test__<sanitized>` prefix.
- **Sanitization rule (must be identical in both helpers):** `name.toLowerCase().replace(/[^a-z0-9_]/g, '_')`.

---

## File Structure

- `apps/api/src/test/setup/test-db.ts` — NEW. `resolveTestDbUrl()`, `resolveTestDbName()`, `sanitizeWorktreeName()`.
- `apps/api/src/test/setup/test-db.test.ts` — NEW. Unit tests (runs under `apps/api/vitest.config.ts`, which excludes `*.integration.test.ts`).
- `apps/api/vitest.integration.ts` — MODIFY. Use `resolveTestDbUrl()` for `env.DATABASE_URL`.
- `apps/api/src/test/setup/global-setup.ts` — MODIFY. Use `resolveTestDbUrl()`; auto-create the DB before migrating.
- `scripts/prune-test-dbs-helpers.ts` — NEW. Pure `selectOrphanedTestDbs()`.
- `scripts/prune-test-dbs.test.ts` — NEW. Unit tests (runs under root `vitest.scripts.config.ts` via `pnpm test:scripts`).
- `scripts/prune-test-dbs.ts` — NEW. Runner: list worktrees, list DBs, drop orphans.
- `scripts/worktree-prune.sh` — NEW. Wrapper: `clean-worktrees.sh "$@"` then `prune-test-dbs.ts "$@"`.
- `package.json` — MODIFY. Add `"worktree:prune"` script.
- `CLAUDE.md` — MODIFY. Post-merge hygiene rule + per-worktree DB naming note.

---

### Task 1: `resolveTestDbUrl()` helper

**Files:**
- Create: `apps/api/src/test/setup/test-db.ts`
- Test: `apps/api/src/test/setup/test-db.test.ts`

**Interfaces:**
- Produces: `sanitizeWorktreeName(name: string): string`, `resolveTestDbName(toplevel: string): string`, `resolveTestDbUrl(): string`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/test/setup/test-db.test.ts
import { describe, it, expect } from 'vitest'
import { resolveTestDbName, sanitizeWorktreeName } from './test-db'

describe('sanitizeWorktreeName', () => {
  it('lowercases and replaces non [a-z0-9_] with underscore', () => {
    expect(sanitizeWorktreeName('feat/Bar-Baz')).toBe('feat_bar_baz')
  })
})

describe('resolveTestDbName', () => {
  it('returns base name for the main repo path', () => {
    expect(resolveTestDbName('/Users/huey/Projects/concert-crawl')).toBe(
      'concert_crawl_test',
    )
  })

  it('derives a suffixed name from a worktree path', () => {
    expect(
      resolveTestDbName(
        '/Users/huey/Projects/concert-crawl/.worktrees/fix-foo',
      ),
    ).toBe('concert_crawl_test__fix_foo')
  })

  it('uses only the worktree dir, not deeper path segments', () => {
    expect(
      resolveTestDbName(
        '/Users/huey/Projects/concert-crawl/.worktrees/chore-x/apps/api',
      ),
    ).toBe('concert_crawl_test__chore_x')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @concert-crawl/api test -- test-db`
Expected: FAIL — cannot find module `./test-db`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/test/setup/test-db.ts
import { execSync } from 'node:child_process'

const DEFAULT_TEST_DB_URL =
  'postgresql://postgres:postgres@localhost:5433/concert_crawl_test'
const BASE_DB_NAME = 'concert_crawl_test'
const WORKTREE_MARKER = '/.worktrees/'

// Must stay identical to the sanitize used in scripts/prune-test-dbs-helpers.ts
export const sanitizeWorktreeName = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9_]/g, '_')

export const resolveTestDbName = (toplevel: string): string => {
  const markerIdx = toplevel.indexOf(WORKTREE_MARKER)
  if (markerIdx === -1) return BASE_DB_NAME
  const worktreeDir = toplevel
    .slice(markerIdx + WORKTREE_MARKER.length)
    .split('/')[0]
  return `${BASE_DB_NAME}__${sanitizeWorktreeName(worktreeDir)}`
}

export const resolveTestDbUrl = (): string => {
  const override = process.env['DATABASE_URL_TEST']
  if (override) return override

  let toplevel = ''
  try {
    toplevel = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
    }).trim()
  } catch (err) {
    console.warn('[test-db] git rev-parse failed; using default test DB:', err)
    return DEFAULT_TEST_DB_URL
  }

  const url = new URL(DEFAULT_TEST_DB_URL)
  url.pathname = `/${resolveTestDbName(toplevel)}`
  return url.toString()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @concert-crawl/api test -- test-db`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/test/setup/test-db.ts apps/api/src/test/setup/test-db.test.ts
git commit -m "test(api): #748 resolveTestDbUrl helper for per-worktree DB names"
```

---

### Task 2: Wire helper into integration config + auto-create DB

**Files:**
- Modify: `apps/api/vitest.integration.ts`
- Modify: `apps/api/src/test/setup/global-setup.ts`

**Interfaces:**
- Consumes: `resolveTestDbUrl()` from Task 1.

- [ ] **Step 1: Point the vitest env at the helper**

Replace the `env` block in `apps/api/vitest.integration.ts`:

```ts
import { defineConfig } from 'vitest/config'
import { resolveTestDbUrl } from './src/test/setup/test-db'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup: './src/test/setup/global-setup.ts',
    include: ['**/*.integration.test.ts'],
    fileParallelism: false,
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    env: {
      DATABASE_URL: resolveTestDbUrl(),
    },
  },
})
```

- [ ] **Step 2: Auto-create the DB in global-setup**

Rewrite `setup()` in `apps/api/src/test/setup/global-setup.ts` (imports and `MIGRATIONS_FOLDER` unchanged, plus add the helper import):

```ts
import { resolveTestDbUrl } from './test-db'

export async function setup(): Promise<void> {
  const testDbUrl = resolveTestDbUrl()
  const parsed = new URL(testDbUrl)
  const dbName = parsed.pathname.replace(/^\//, '')

  // Create the target DB if missing, via the postgres maintenance DB.
  const adminUrl = new URL(testDbUrl)
  adminUrl.pathname = '/postgres'
  const admin = postgres(adminUrl.toString(), { max: 1 })
  try {
    const existing = await admin<
      { datname: string }[]
    >`SELECT datname FROM pg_database WHERE datname = ${dbName}`
    if (existing.length === 0) {
      console.log(`[test] Creating test DB "${dbName}"...`)
      // dbName is derived from our own worktree path, not user input.
      await admin.unsafe(`CREATE DATABASE "${dbName}"`)
    }
  } finally {
    await admin.end()
  }

  console.log('[test] Running migrations on test DB...')
  const client = postgres(testDbUrl, { max: 1 })
  const db = drizzle(client)
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
    await client.end()
    console.log('[test] Migrations complete.')
  } catch (error) {
    console.error('[test] Migration failed:', error)
    await client.end()
    throw error
  }
}
```

- [ ] **Step 3: Verify integration suite still passes on a fresh DB**

Run: `pnpm --filter @concert-crawl/api test:integration`
Expected: the log shows `Creating test DB "concert_crawl_test__chore_worktree_db_isolation"` on first run, then the full suite passes (152/152 baseline).

- [ ] **Step 4: Verify idempotency**

Run: `pnpm --filter @concert-crawl/api test:integration`
Expected: second run skips creation (no "Creating" line), suite still passes.

- [ ] **Step 5: Commit**

```bash
git add apps/api/vitest.integration.ts apps/api/src/test/setup/global-setup.ts
git commit -m "test(api): #748 auto-create per-worktree integration DB"
```

---

### Task 3: `selectOrphanedTestDbs` pure helper

**Files:**
- Create: `scripts/prune-test-dbs-helpers.ts`
- Test: `scripts/prune-test-dbs.test.ts`

**Interfaces:**
- Produces: `selectOrphanedTestDbs(allDbNames: string[], survivingWorktreeNames: string[]): string[]`.

- [ ] **Step 1: Write the failing test**

```ts
// scripts/prune-test-dbs.test.ts
import { describe, it, expect } from 'vitest'
import { selectOrphanedTestDbs } from './prune-test-dbs-helpers'

describe('selectOrphanedTestDbs', () => {
  it('drops DBs whose worktree no longer exists', () => {
    const result = selectOrphanedTestDbs(
      ['concert_crawl_test__gone', 'concert_crawl_test__alive'],
      ['alive'],
    )
    expect(result).toEqual(['concert_crawl_test__gone'])
  })

  it('never returns the base test DB', () => {
    expect(selectOrphanedTestDbs(['concert_crawl_test'], [])).toEqual([])
  })

  it('ignores unrelated databases', () => {
    expect(
      selectOrphanedTestDbs(['concert_crawl_db', 'postgres'], []),
    ).toEqual([])
  })

  it('matches worktree names using the same sanitization', () => {
    expect(
      selectOrphanedTestDbs(['concert_crawl_test__feat_foo'], ['feat/Foo']),
    ).toEqual([])
  })

  it('returns empty when every DB has a surviving worktree', () => {
    expect(
      selectOrphanedTestDbs(['concert_crawl_test__a'], ['a']),
    ).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:scripts -- prune-test-dbs`
Expected: FAIL — cannot find module `./prune-test-dbs-helpers`.

- [ ] **Step 3: Write minimal implementation**

```ts
// scripts/prune-test-dbs-helpers.ts
const BASE_TEST_DB = 'concert_crawl_test'
const WORKTREE_DB_PREFIX = 'concert_crawl_test__'

// Must stay identical to sanitizeWorktreeName in
// apps/api/src/test/setup/test-db.ts — a mismatch would orphan or spare the
// wrong DBs.
const sanitize = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9_]/g, '_')

export const selectOrphanedTestDbs = (
  allDbNames: string[],
  survivingWorktreeNames: string[],
): string[] => {
  const survivors = new Set(survivingWorktreeNames.map(sanitize))
  return allDbNames.filter((name) => {
    if (name === BASE_TEST_DB) return false
    if (!name.startsWith(WORKTREE_DB_PREFIX)) return false
    return !survivors.has(name.slice(WORKTREE_DB_PREFIX.length))
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:scripts -- prune-test-dbs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/prune-test-dbs-helpers.ts scripts/prune-test-dbs.test.ts
git commit -m "test(scripts): #748 selectOrphanedTestDbs helper"
```

---

### Task 4: Prune runner + wrapper + package script

**Files:**
- Create: `scripts/prune-test-dbs.ts`
- Create: `scripts/worktree-prune.sh`
- Modify: `package.json` (root)

**Interfaces:**
- Consumes: `selectOrphanedTestDbs()` from Task 3.

- [ ] **Step 1: Write the runner**

```ts
// scripts/prune-test-dbs.ts
import postgres from 'postgres'
import { execSync } from 'node:child_process'
import { selectOrphanedTestDbs } from './prune-test-dbs-helpers'

const WORKTREE_MARKER = '/.worktrees/'
const dryRun = process.argv.includes('--dry-run')

const listWorktreeNames = (): string[] => {
  const out = execSync('git worktree list --porcelain', { encoding: 'utf-8' })
  const names: string[] = []
  for (const line of out.split('\n')) {
    if (!line.startsWith('worktree ')) continue
    const wtPath = line.slice('worktree '.length)
    const markerIdx = wtPath.indexOf(WORKTREE_MARKER)
    if (markerIdx !== -1) {
      names.push(wtPath.slice(markerIdx + WORKTREE_MARKER.length).split('/')[0])
    }
  }
  return names
}

const main = async (): Promise<void> => {
  const adminUrl = new URL(
    process.env['DATABASE_URL_TEST'] ??
      'postgresql://postgres:postgres@localhost:5433/concert_crawl_test',
  )
  adminUrl.pathname = '/postgres'
  const admin = postgres(adminUrl.toString(), { max: 1 })
  try {
    const rows = await admin<{ datname: string }[]>`
      SELECT datname FROM pg_database
      WHERE datname LIKE 'concert_crawl_test__%'
    `
    const orphans = selectOrphanedTestDbs(
      rows.map((row) => row.datname),
      listWorktreeNames(),
    )
    if (orphans.length === 0) {
      console.log('[prune-test-dbs] No orphaned test databases.')
      return
    }
    for (const name of orphans) {
      if (dryRun) {
        console.log(`[prune-test-dbs] Would drop: ${name}`)
        continue
      }
      console.log(`[prune-test-dbs] Dropping: ${name}`)
      // name comes from pg_database filtered to our prefix — not user input.
      await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
    }
  } finally {
    await admin.end()
  }
}

main().catch((err) => {
  console.error('[prune-test-dbs] Failed:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Write the wrapper**

```bash
# scripts/worktree-prune.sh
#!/usr/bin/env bash
# Removes worktrees with no open PR, then drops their orphaned test DBs.
#   pnpm worktree:prune            # live run
#   pnpm worktree:prune --dry-run  # preview only
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
"$ROOT_DIR/scripts/clean-worktrees.sh" "$@"
tsx "$ROOT_DIR/scripts/prune-test-dbs.ts" "$@"
```

- [ ] **Step 3: Make the wrapper executable and add the package script**

```bash
chmod +x scripts/worktree-prune.sh
```

Add to root `package.json` `scripts` (after `db:sync-local`):

```json
    "worktree:prune": "scripts/worktree-prune.sh",
```

- [ ] **Step 4: Dry-run to verify no destructive action**

Run: `pnpm worktree:prune --dry-run`
Expected: `clean-worktrees.sh` prints `Dry run` and the worktrees it would remove; `prune-test-dbs` prints `Would drop:` lines for orphaned DBs (or "No orphaned test databases."). No worktree or DB is actually removed — confirm with `git worktree list` afterward.

- [ ] **Step 5: Commit**

```bash
git add scripts/prune-test-dbs.ts scripts/worktree-prune.sh package.json
git commit -m "feat(scripts): #748 worktree:prune drops orphaned test DBs"
```

---

### Task 5: Docs — CLAUDE.md hygiene rule + naming note

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add the post-merge hygiene rule**

In `CLAUDE.md` under `### Git`, append to the worktree bullet group:

```markdown
- **Prune worktrees + test DBs after every merge** — once a PR merges, run `pnpm worktree:prune` to remove the merged worktree(s) and drop their orphaned `concert_crawl_test__*` databases. This is a required cleanup step; skipping it is why 80+ stale worktrees accumulated. Use `pnpm worktree:prune --dry-run` to preview.
```

- [ ] **Step 2: Add the naming note under Testing**

In `CLAUDE.md` under `### Testing`, add:

```markdown
- **Per-worktree test DBs** — integration tests run against `concert_crawl_test__<worktree>` (derived from the worktree dir; the main repo uses plain `concert_crawl_test`). `global-setup.ts` auto-creates and migrates it. Set `DATABASE_URL_TEST` to override (CI does this per job).
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: #748 document per-worktree test DB + prune hygiene"
```

---

## Final verification (before PR)

- [ ] `pnpm --filter @concert-crawl/api test -- test-db` — PASS
- [ ] `pnpm test:scripts -- prune-test-dbs` — PASS
- [ ] `pnpm --filter @concert-crawl/api test:integration` — PASS on the worktree's own DB
- [ ] `pnpm --filter @concert-crawl/api typecheck` and root `pnpm lint` — clean
- [ ] `pnpm worktree:prune --dry-run` — lists, removes nothing
