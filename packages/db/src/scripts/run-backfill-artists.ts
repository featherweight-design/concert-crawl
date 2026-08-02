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

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from '../client.js'
import { backfillArtists } from './backfill-artists.js'

/**
 * True only when this file is the process entrypoint. Without it, any import —
 * a future script reusing `main`, or a test — would run the backfill and then
 * kill the process via `process.exit`.
 */
const isEntrypoint = (): boolean => {
  const invoked = process.argv[1]
  if (invoked === undefined) return false
  return path.resolve(invoked) === fileURLToPath(import.meta.url)
}

async function main(): Promise<void> {
  const result = await backfillArtists(db)
  console.log(
    `[backfill-artists] discovered=${result.discovered} inserted=${result.inserted}`,
  )
}

if (isEntrypoint()) {
  main()
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error('[backfill-artists] failed', err)
      process.exit(1)
    })
}
