/**
 * CLI entry for the MusicBrainz tiebreaker over the `ambiguous` artist queue.
 *
 * Dry run by default. An apply run rewrites a public artist's identity, and the
 * agreements are cheap to read first — a dry run prints every one of them, so
 * a wrong-looking pair can be caught before it reaches a page.
 *
 * An apply also spends the match budget on rows MusicBrainz found ambiguous
 * too, which moves them to the admin queue's `exhausted` tab. A dry run reports
 * that count as `would-exhaust`.
 *
 *   DATABASE_URL=<target> pnpm --filter @concert-crawl/db db:musicbrainz-disambiguate
 *   DATABASE_URL=<target> pnpm --filter @concert-crawl/db db:musicbrainz-disambiguate --limit=20
 *   DATABASE_URL=<target> pnpm --filter @concert-crawl/db db:musicbrainz-disambiguate --apply
 *
 * Two rate-limited requests are spent per row, each preceded by the full
 * interval, so a row costs roughly twice the request interval before retries.
 * `--limit` exists to make a first pass over a handful of rows cheap; the
 * selection is name-ordered, so a truncated run is a stable prefix.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from '../client.js'
import { disambiguateArtistsWithMusicBrainz } from './musicbrainz-disambiguate.js'

const isEntrypoint = (): boolean => {
  const invoked = process.argv[1]
  if (invoked === undefined) return false
  return path.resolve(invoked) === fileURLToPath(import.meta.url)
}

/**
 * `--limit=<n>` as a positive integer, or undefined for the whole queue.
 *
 * A malformed value exits rather than falling back to the whole queue: someone
 * typing `--limit=twenty` wants a small run, and silently walking the whole
 * queue is the opposite of what they asked for.
 */
function parseLimit(argv: string[]): number | undefined {
  const flag = argv.find((arg) => arg.startsWith('--limit='))
  if (flag === undefined) return undefined

  const raw = flag.slice('--limit='.length)
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) {
    console.error(
      `[musicbrainz] --limit expects a positive integer, got "${raw}"`,
    )
    process.exit(1)
  }
  return value
}

async function main(): Promise<void> {
  const dryRun = !process.argv.includes('--apply')
  const limit = parseLimit(process.argv)

  const result = await disambiguateArtistsWithMusicBrainz(db, { dryRun, limit })

  for (const resolution of result.resolutions) {
    console.log(
      `[musicbrainz]   ${resolution.name} → spotify:${resolution.spotifyArtistId} (mbid ${resolution.musicbrainzId})`,
    )
  }

  for (const [reason, count] of Object.entries(result.skipped)) {
    if (count > 0) console.log(`[musicbrainz]   skipped ${reason}: ${count}`)
  }

  // Nothing is written on a dry run, so the exhaustion an apply would perform
  // is read off the skip count that drives it rather than off `exhausted`.
  const wouldExhaust = result.skipped['several-exact-name-matches']

  console.log(
    dryRun
      ? `[musicbrainz] DRY RUN — considered=${result.considered} resolved=${result.resolved} would-exhaust=${wouldExhaust}. Re-run with --apply.`
      : `[musicbrainz] considered=${result.considered} resolved=${result.resolved} updated=${result.updated} exhausted=${result.exhausted}`,
  )
}

if (isEntrypoint()) {
  main()
    .then(() => process.exit(0))
    .catch((err: unknown) => {
      console.error('[musicbrainz] failed', err)
      process.exit(1)
    })
}
