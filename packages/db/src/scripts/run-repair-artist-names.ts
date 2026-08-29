/**
 * CLI entry for the `artists.name` repair.
 *
 * Dry run by default. The write is not destructive — `canonical_name`, `slug`
 * and every match column are untouched, so a wrong rename is repairable by
 * hand — but it still rewrites what a human reads on a public page, and the
 * sample is cheap to read first.
 *
 *   DATABASE_URL=<target> pnpm --filter @concert-crawl/db db:repair-artist-names
 *   DATABASE_URL=<target> pnpm --filter @concert-crawl/db db:repair-artist-names --apply
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from '../client.js'
import { repairArtistNames } from './repair-artist-names.js'

const isEntrypoint = (): boolean => {
  const invoked = process.argv[1]
  if (invoked === undefined) return false
  return path.resolve(invoked) === fileURLToPath(import.meta.url)
}

async function main(): Promise<void> {
  const dryRun = !process.argv.includes('--apply')
  const result = await repairArtistNames(db, { dryRun })

  for (const row of result.sample) {
    console.log(
      `[repair-artist-names]   ${row.slug} (${row.kind}) — ${row.from} → ${row.to}`,
    )
  }
  if (result.candidates > result.sample.length) {
    console.log(
      `[repair-artist-names]   …and ${result.candidates - result.sample.length} more`,
    )
  }

  // Sorted so two runs print the same kinds in the same places and diff by eye.
  console.log(
    `[repair-artist-names] candidates by kind — ` +
      Object.entries(result.byKind)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([kind, count]) => `${kind}=${count}`)
        .join(' '),
  )

  console.log(
    dryRun
      ? `[repair-artist-names] DRY RUN — ${result.candidates} rows would be renamed. Re-run with --apply.`
      : `[repair-artist-names] candidates=${result.candidates} repaired=${result.repaired}`,
  )
}

if (isEntrypoint()) {
  main()
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error('[repair-artist-names] failed', err)
      process.exit(1)
    })
}
