/**
 * CLI entry for the stored-snapshot photo tiebreak.
 *
 * Dry run by default. The write settles a public identity — it decides which
 * Spotify artist a `/artists/:slug` page embeds — so the sample is worth
 * reading first even though a wrong answer is repairable from the admin picker.
 *
 *   DATABASE_URL=<target> pnpm --filter @concert-crawl/db db:resolve-photo-tiebreak
 *   DATABASE_URL=<target> pnpm --filter @concert-crawl/db db:resolve-photo-tiebreak --apply
 *   DATABASE_URL=<target> pnpm --filter @concert-crawl/db db:resolve-photo-tiebreak --limit=50
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from '../client.js'
import { resolvePhotoTiebreak, sampleOf } from './resolve-photo-tiebreak.js'

const isEntrypoint = (): boolean => {
  const invoked = process.argv[1]
  if (invoked === undefined) return false
  return path.resolve(invoked) === fileURLToPath(import.meta.url)
}

/**
 * `--limit=<n>` as a positive integer, or undefined for the whole queue.
 *
 * The `=` form is the one the other db scripts take, so this takes only that
 * form — and rejects a bare `--limit 50` rather than ignoring it. Both halves
 * exist for the same reason: someone passing a limit wants a small run, and
 * silently walking the whole queue against prod is the opposite of that.
 */
const parseLimit = (argv: string[]): number | undefined => {
  if (argv.includes('--limit')) {
    console.error('[photo-tiebreak] --limit takes the form --limit=<n>')
    process.exit(1)
  }

  const flag = argv.find((arg) => arg.startsWith('--limit='))
  if (flag === undefined) return undefined

  const raw = flag.slice('--limit='.length)
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) {
    console.error(
      `[photo-tiebreak] --limit expects a positive integer, got "${raw}"`,
    )
    process.exit(1)
  }
  return value
}

async function main(): Promise<void> {
  const dryRun = !process.argv.includes('--apply')
  const result = await resolvePhotoTiebreak(db, {
    dryRun,
    limit: parseLimit(process.argv),
  })

  for (const row of sampleOf(result.resolutions)) {
    console.log(
      `[photo-tiebreak]   ${row.name} → spotify:${row.spotifyArtistId} (1 of ${row.exactCount} exact hits had artwork)`,
    )
  }
  if (result.resolved > sampleOf(result.resolutions).length) {
    console.log(
      `[photo-tiebreak]   …and ${result.resolved - sampleOf(result.resolutions).length} more`,
    )
  }

  // Sorted so two runs print the same reasons in the same places and diff by eye.
  for (const [reason, count] of Object.entries(result.skipped).sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    console.log(`[photo-tiebreak]   skipped ${reason}: ${count}`)
  }

  console.log(
    dryRun
      ? `[photo-tiebreak] DRY RUN — considered=${result.considered} resolved=${result.resolved}. Re-run with --apply.`
      : `[photo-tiebreak] considered=${result.considered} resolved=${result.resolved} updated=${result.updated}`,
  )
}

if (isEntrypoint()) {
  main()
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error('[photo-tiebreak] failed', err)
      process.exit(1)
    })
}
