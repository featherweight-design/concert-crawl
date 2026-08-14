/**
 * CLI entry for the `artists` projection reaper.
 *
 * Dry run by default — it prints what it would remove and exits. Deleting
 * needs an explicit `--apply`: the row count is unbounded and the keep-set is
 * derived from `events`, so a half-migrated or mid-crawl database could make
 * a legitimate artist look unreferenced. Reading the sample first is cheap.
 *
 *   DATABASE_URL=<target> pnpm --filter @concert-crawl/db db:prune-artists
 *   DATABASE_URL=<target> pnpm --filter @concert-crawl/db db:prune-artists --apply
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from '../client.js'
import { pruneArtists } from './prune-artists.js'

const isEntrypoint = (): boolean => {
  const invoked = process.argv[1]
  if (invoked === undefined) return false
  return path.resolve(invoked) === fileURLToPath(import.meta.url)
}

async function main(): Promise<void> {
  const dryRun = !process.argv.includes('--apply')
  const result = await pruneArtists(db, { dryRun })

  for (const row of result.sample) {
    console.log(
      `[prune-artists]   ${row.slug} (${row.matchStatus}) — ${row.name}`,
    )
  }
  if (result.candidates > result.sample.length) {
    console.log(
      `[prune-artists]   …and ${result.candidates - result.sample.length} more`,
    )
  }

  console.log(
    dryRun
      ? `[prune-artists] DRY RUN — ${result.candidates} rows would be removed. Re-run with --apply.`
      : `[prune-artists] candidates=${result.candidates} deleted=${result.deleted}`,
  )
}

if (isEntrypoint()) {
  main()
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error('[prune-artists] failed', err)
      process.exit(1)
    })
}
