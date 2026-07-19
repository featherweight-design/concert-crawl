import postgres from 'postgres'
import { execSync } from 'node:child_process'
import {
  selectOrphanedTestDbs,
  filterOrphansToScope,
} from './prune-test-dbs-helpers.js'

const WORKTREE_MARKER = '/.worktrees/'

interface ParsedArgs {
  dryRun: boolean
  all: boolean
  branches: string[]
}

const parseArgs = (argv: readonly string[]): ParsedArgs => {
  let dryRun = false
  let all = false
  const branches: string[] = []
  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true
    else if (arg === '--all') all = true
    else if (arg.startsWith('--')) {
      console.error(`[prune-test-dbs] ERROR: unknown flag: ${arg}`)
      process.exit(1)
    } else branches.push(arg)
  }
  return { dryRun, all, branches }
}

const listWorktreeNames = (): string[] => {
  const out = execSync('git worktree list --porcelain', { encoding: 'utf-8' })
  const names: string[] = []
  for (const line of out.split('\n')) {
    if (!line.startsWith('worktree ')) continue
    const wtPath = line.slice('worktree '.length)
    const markerIdx = wtPath.indexOf(WORKTREE_MARKER)
    if (markerIdx !== -1) {
      // Full path after the marker (selectOrphanedTestDbs sanitizes it) so a
      // nested worktree root like `.worktrees/feat/foo` matches its DB name
      // and isn't mistaken for an orphan of `.worktrees/feat`.
      names.push(wtPath.slice(markerIdx + WORKTREE_MARKER.length))
    }
  }
  return names
}

// Per-worktree DBs (concert_crawl_test__*) are only ever created on the local
// default instance — resolveTestDbUrl() applies the per-worktree naming only
// when DATABASE_URL_TEST is unset. Deliberately ignore DATABASE_URL_TEST here:
// it may point at a shared/remote Postgres (CI, staging), and honouring it
// would let `worktree:prune` (or the SessionStart hook) DROP databases on the
// wrong server. The prune always targets the local instance where the DBs live.
const LOCAL_ADMIN_URL =
  'postgresql://postgres:postgres@localhost:5433/concert_crawl_test'

const main = async (): Promise<void> => {
  const { dryRun, all, branches } = parseArgs(process.argv.slice(2))

  if (all && branches.length > 0) {
    console.error(
      '[prune-test-dbs] ERROR: --all cannot be combined with branch names.',
    )
    process.exit(1)
  }
  if (!all && branches.length === 0) {
    console.error(
      '[prune-test-dbs] ERROR: no branches given. Pass the branch(es) you worked on this session, or --all for a full sweep.',
    )
    process.exit(1)
  }

  const adminUrl = new URL(LOCAL_ADMIN_URL)
  adminUrl.pathname = '/postgres'
  const admin = postgres(adminUrl.toString(), { max: 1 })
  try {
    const rows = await admin<{ datname: string }[]>`
      SELECT datname FROM pg_database
      WHERE datname LIKE 'concert\\_crawl\\_test\\_\\_%' ESCAPE '\\'
    `
    const orphans = selectOrphanedTestDbs(
      rows.map((row) => row.datname),
      listWorktreeNames(),
    )
    const inScope = all ? orphans : filterOrphansToScope(orphans, branches)
    const skippedCount = orphans.length - inScope.length

    if (skippedCount > 0) {
      console.log(
        `[prune-test-dbs] Skipping ${skippedCount} orphaned DB(s) not in scope — may belong to concurrent sessions. Use --all for a full sweep.`,
      )
    }
    if (inScope.length === 0) {
      console.log('[prune-test-dbs] No in-scope orphaned test databases.')
      return
    }
    for (const name of inScope) {
      if (dryRun) {
        console.log(`[prune-test-dbs] Would drop: ${name}`)
        continue
      }
      console.log(`[prune-test-dbs] Dropping: ${name}`)
      // name comes from pg_database filtered to our prefix, but double any
      // embedded quote so a quoted identifier can't break out of the literal.
      const ident = name.replace(/"/g, '""')
      await admin.unsafe(`DROP DATABASE IF EXISTS "${ident}" WITH (FORCE)`)
    }
  } finally {
    await admin.end()
  }
}

main().catch((err) => {
  console.error('[prune-test-dbs] Failed:', err)
  process.exit(1)
})
