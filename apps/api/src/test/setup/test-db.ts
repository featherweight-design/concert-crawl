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
  // Use the full path after the marker (sanitized), not just the first
  // segment: nested worktree roots like `.worktrees/feat/foo` must not all
  // collapse to `concert_crawl_test__feat` and collide.
  const relativePath = toplevel.slice(markerIdx + WORKTREE_MARKER.length)
  if (relativePath === '') return BASE_DB_NAME
  return `${BASE_DB_NAME}__${sanitizeWorktreeName(relativePath)}`
}

export const resolveTestDbUrl = (): string => {
  const override = process.env['DATABASE_URL_TEST']
  if (override) return override

  let toplevel = ''
  try {
    // Strip the hook-inherited git env vars before running rev-parse: when
    // vitest launches from inside a git hook (e.g. pre-push) `GIT_DIR` and
    // `GIT_WORK_TREE` are set, and `--show-toplevel` under those returns the
    // CWD instead of the real worktree root — which collapses per-worktree
    // DB names into per-subdirectory ones (`__fix_foo_apps_api`) and breaks
    // TRUNCATE against the actually-migrated DB.
    const { GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, ...cleanEnv } = process.env
    void GIT_DIR
    void GIT_WORK_TREE
    void GIT_INDEX_FILE
    toplevel = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      env: cleanEnv,
    }).trim()
  } catch (err) {
    console.warn('[test-db] git rev-parse failed; using default test DB:', err)
    return DEFAULT_TEST_DB_URL
  }

  const url = new URL(DEFAULT_TEST_DB_URL)
  url.pathname = `/${resolveTestDbName(toplevel)}`
  return url.toString()
}
