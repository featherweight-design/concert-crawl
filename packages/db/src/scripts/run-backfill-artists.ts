/**
 * CLI entry for the `artists` projection backfill (#1115).
 *
 * `backfillArtists` was only ever called from `seed.ts`, which runs against a
 * local database. Staging and prod get migration 0069 — the empty table — and
 * nothing that fills it, so every `/artists/:slug` there resolves to a 404.
 * This is the one-shot that populates a deployed environment; afterwards the
 * crawler write-through keeps it fresh.
 *
 * Safe to re-run: the underlying backfill is idempotent by construction.
 *
 *   DATABASE_URL=<target> pnpm --filter @concert-crawl/db db:backfill-artists
 */

import { db } from '../client.js'
import { backfillArtists } from './backfill-artists.js'

async function main(): Promise<void> {
  const result = await backfillArtists(db)
  console.log(
    `[backfill-artists] discovered=${result.discovered} inserted=${result.inserted}`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('[backfill-artists] failed', err)
    process.exit(1)
  })
