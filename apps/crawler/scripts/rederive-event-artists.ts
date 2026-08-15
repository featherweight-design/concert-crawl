import {
  adjudicateEvent,
  rederiveEventArtists,
} from '@concert-crawl/crawler-core'

// One-off runner for the event artist re-derivation pass. Dry by default —
// `--apply` is the only thing that writes. `--limit=N` caps the scan, which is
// how the first prod run is kept to a sample before committing the whole table
// to a Haiku bill.
//
// Lives in apps/crawler (not packages/db) because the ladder and the
// adjudicator are both in @concert-crawl/crawler-core, which already depends on
// @concert-crawl/db — putting the script in db would create a circular
// workspace dependency. Same reason backfill-ticket-links.ts sits here.

/**
 * `Number` rather than `Number.parseInt`, matching
 * `packages/db/src/scripts/run-musicbrainz-disambiguate.ts`: parseInt reads
 * `10abc` as 10 and `1.5` as 1, so a typo would quietly run a different pass
 * than the one asked for. Malformed input fails instead.
 */
const parseLimit = (): number | undefined => {
  const flag = process.argv.find((arg) => arg.startsWith('--limit='))
  if (flag === undefined) return undefined
  const raw = flag.slice('--limit='.length)
  const value = Number(raw)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--limit expects a positive integer, got "${raw}"`)
  }
  return value
}

async function main(): Promise<void> {
  const dryRun = !process.argv.includes('--apply')
  const limit = parseLimit()

  console.warn(
    `[rederive-event-artists] starting — ${dryRun ? 'DRY RUN' : 'APPLY'}${
      limit === undefined ? '' : ` limit=${limit}`
    }`,
  )

  const result = await rederiveEventArtists({
    dryRun,
    adjudicate: adjudicateEvent,
    limit,
  })

  for (const change of result.sample) {
    console.warn(
      `  [${change.strategy}]${change.hides ? ' HIDE' : ''} ${change.title} → ` +
        `headliners=[${change.headliners.join(', ')}] ` +
        `supporting=[${change.supportingArtists.join(', ')}]`,
    )
  }

  console.warn(
    `[rederive-event-artists] done — scanned=${result.scanned} ` +
      `derived=${result.derived} updated=${result.updated} hidden=${result.hidden}`,
  )
  console.warn(
    `[rederive-event-artists] strategies — ` +
      Object.entries(result.strategies)
        .map(([name, count]) => `${name}=${count}`)
        .join(' '),
  )
  if (dryRun) {
    console.warn(
      '[rederive-event-artists] dry run — nothing written. Re-run with --apply.',
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[rederive-event-artists] failed:', err)
    process.exit(1)
  })
