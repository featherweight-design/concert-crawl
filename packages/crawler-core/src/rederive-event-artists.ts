/**
 * Runs the derivation ladder over events already in the database.
 *
 * The ladder decides who is on a bill from what the extractor OBSERVED, and
 * every path now reports that. But a row crawled before the ladder existed
 * carries a NULL `canonical_headliners`, which the artist projection reads as
 * "never derived" and falls back to `canonical_artist` on — the fallback that
 * put 222 event titles into the artists table. Waiting for each row's next
 * crawl would leave that fallback load-bearing for as long as the slowest
 * venue's cycle, and a past-dated row is never crawled again at all.
 *
 * So this walks the whole table once and writes the ladder's answer. After it
 * has run everywhere, a NULL headliner set means only "the adjudicator was
 * down", and the projection's fallback arm can be retired.
 *
 * **`artist`, `canonical_artist` and `canonical_title` are never written.**
 * `canonical_artist` is the live dedup key behind the partial UNIQUE index the
 * crawler's ON CONFLICT targets; moving it would split every affected show into
 * a duplicate row on its next crawl. `artist` is the event's display string and
 * the input `canonical_artist` is derived from. The pass reads them and leaves
 * them byte-identical, and the integration test asserts exactly that.
 *
 * Lives in crawler-core rather than `packages/db/src/scripts` alongside the
 * other one-offs because the ladder and the adjudicator are both here, and
 * crawler-core already depends on db — the reverse import would be a circular
 * workspace dependency. `apps/crawler/scripts/backfill-ticket-links.ts` was
 * moved out of db for the same reason.
 *
 * A row that re-derives to what it already stores is not written at all, so a
 * re-run costs nothing and does not stale-date the table through `updated_at`.
 *
 * Deliberately a one-off, not a cron. Once the backlog is derived, the crawl
 * keeps every row current.
 */

import { asc, eq, gt } from 'drizzle-orm'
import { db, events, venues } from '@concert-crawl/db'
import {
  CRAWLER_USER_AGENT,
  canonicalizeSupporting,
} from '@concert-crawl/types'
import {
  deriveArtists,
  wouldAdjudicate,
  type Adjudicator,
} from './lib/derive-artists.js'
import { isAiUseAllowed } from './lib/robots.js'

/** How each row's answer was reached. Counted so a run reports where it went. */
export type RederiveStrategy =
  /** The stored `artist` is a name the ladder trusted. No LLM call. */
  | 'observed'
  /** The stored `artist` echoed the title, so the adjudicator ruled. */
  | 'adjudicated'
  /** Already settled by an earlier run of this pass. No LLM call. */
  | 'settled'
  /** The adjudicator was unreachable. The row is left exactly as it was. */
  | 'adjudicator-unavailable'
  /**
   * The row needed the adjudicator, but robots.txt for its venue's site or its
   * source page refuses AI use. Left exactly as it was, as the crawl does.
   */
  | 'ai-use-refused'

export interface RederiveChange {
  eventId: string
  title: string
  strategy: RederiveStrategy
  headliners: string[]
  supportingArtists: string[]
  /** True when the verdict was "not a concert" and the row gets hidden. */
  hides: boolean
}

export interface RederiveEventArtistsResult {
  /** Rows read. */
  scanned: number
  /** Rows the pass reached a verdict for. */
  derived: number
  /**
   * Rows the pass writes — artist columns, the hide flag, or both. A row hidden
   * with the bill it already stored still counts, because it is still a write.
   *
   * Counted on a dry run too, which is the whole point of a dry run: "how much
   * of the table does this pass rewrite" is the number the decision to apply
   * turns on, and a sample capped at 25 cannot answer it.
   */
  updated: number
  /** Rows this run newly hid because the verdict was "not a concert". */
  hidden: number
  strategies: Record<RederiveStrategy, number>
  /** Up to 25 changes, for eyeballing before an apply run. */
  sample: RederiveChange[]
}

export interface RederiveEventArtistsOptions {
  dryRun: boolean
  /** Injected so the integration test can rule without reaching Anthropic. */
  adjudicate: Adjudicator
  /** Cap on rows read. Left undefined, the whole table is walked. */
  limit?: number | undefined
  /**
   * Paced between adjudications only — the free paths cost nothing to run
   * flat out. Anthropic's limit is far above this; the interval exists so a
   * pass over the whole table cannot crowd out the live crawl's own calls.
   */
  adjudicationIntervalMs?: number
  sleepImpl?: (ms: number) => Promise<void>
  /** Injected so the test can refuse AI use without fetching robots.txt. */
  aiUseAllowed?: (url: string) => Promise<boolean>
}

const BATCH_SIZE = 500
const SAMPLE_SIZE = 25
const DEFAULT_ADJUDICATION_INTERVAL_MS = 250

const sameBill = (stored: string[] | null, next: string[]): boolean =>
  stored !== null &&
  stored.length === next.length &&
  stored.every((name, i) => name === next[i])

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

export async function rederiveEventArtists(
  options: RederiveEventArtistsOptions,
): Promise<RederiveEventArtistsResult> {
  const intervalMs =
    options.adjudicationIntervalMs ?? DEFAULT_ADJUDICATION_INTERVAL_MS
  const sleep = options.sleepImpl ?? defaultSleep
  const aiUseAllowed =
    options.aiUseAllowed ??
    ((url: string) => isAiUseAllowed(url, CRAWLER_USER_AGENT))
  // The same rule the crawl applies before adjudicating: the venue's own site
  // and the page the row came from must both allow AI use. Verdicts are
  // cached per origin inside robots.ts, so this costs one lookup per host.
  const mayAdjudicate = async (
    websiteUrl: string | null,
    sourceUrl: string | null,
  ): Promise<boolean> =>
    (websiteUrl === null || (await aiUseAllowed(websiteUrl))) &&
    (sourceUrl === null || (await aiUseAllowed(sourceUrl)))

  const strategies: Record<RederiveStrategy, number> = {
    observed: 0,
    adjudicated: 0,
    settled: 0,
    'adjudicator-unavailable': 0,
    'ai-use-refused': 0,
  }
  const sample: RederiveChange[] = []
  let scanned = 0
  let derived = 0
  let updated = 0
  let hidden = 0

  // Keyset-paginated on id so memory stays bounded and a run interrupted
  // partway resumes predictably rather than re-walking a random slice.
  let cursor: string | null = null
  for (;;) {
    const remaining =
      options.limit === undefined ? BATCH_SIZE : options.limit - scanned
    if (remaining <= 0) break

    const batch = await db
      .select({
        id: events.id,
        title: events.title,
        artist: events.artist,
        description: events.description,
        headliners: events.headliners,
        supportingArtists: events.supportingArtists,
        canonicalHeadliners: events.canonicalHeadliners,
        canonicalSupporting: events.canonicalSupporting,
        hiddenFromConsumer: events.hiddenFromConsumer,
        sourceUrl: events.sourceUrl,
        websiteUrl: venues.websiteUrl,
      })
      .from(events)
      .leftJoin(venues, eq(events.venueId, venues.id))
      .where(cursor === null ? undefined : gt(events.id, cursor))
      .orderBy(asc(events.id))
      .limit(Math.min(BATCH_SIZE, remaining))

    if (batch.length === 0) break
    cursor = batch[batch.length - 1]!.id

    for (const row of batch) {
      scanned += 1

      // `artist` is the DISPLAY string. When it merely repeats the title it
      // carries no observation, which is the shape every title-as-artist bug
      // takes — so it is reported as nothing seen and the ladder escalates.
      // Anything else is a name some extractor actually put in a performer
      // field, and step 1 trusts it exactly as a live crawl would.
      const observedPerformers =
        row.artist.trim().toLowerCase() === row.title.trim().toLowerCase()
          ? []
          : [row.artist]
      const input = {
        title: row.title,
        ...(row.description === null ? {} : { description: row.description }),
        observedPerformers,
        observedSupportingArtists: row.supportingArtists ?? [],
      }

      // A row an earlier run already hid with an empty bill is one this run
      // would spend a call to re-confirm. Gated on `wouldAdjudicate` so the
      // skip only covers rows whose answer came from the LLM in the first
      // place — a row with a real observed performer is always re-derived,
      // because step 1 is free and its answer could have changed. Same
      // reasoning as the crawl's verdict-reuse gate, which shares the helper.
      if (
        row.hiddenFromConsumer &&
        row.canonicalHeadliners?.length === 0 &&
        wouldAdjudicate(input)
      ) {
        strategies.settled += 1
        continue
      }

      const willAdjudicate = wouldAdjudicate(input)
      if (
        willAdjudicate &&
        !(await mayAdjudicate(row.websiteUrl ?? null, row.sourceUrl))
      ) {
        strategies['ai-use-refused'] += 1
        continue
      }
      if (willAdjudicate && intervalMs > 0) await sleep(intervalMs)

      const result = await deriveArtists(input, options.adjudicate)

      // NULL is the ladder reaching no verdict, which only an adjudicator
      // outage produces. Writing it would read as "nobody is billed" and erase
      // a correct stored bill, so the row is left alone for the next run.
      if (result.headliners === null || result.supportingArtists === null) {
        strategies['adjudicator-unavailable'] += 1
        continue
      }

      derived += 1
      const strategy: RederiveStrategy = result.adjudicated
        ? 'adjudicated'
        : 'observed'
      strategies[strategy] += 1

      // A verdict of "not a concert" hides the row, matching what the crawler's
      // INSERT path does with the same signal. Only ever set to `true`: an
      // admin's manual hide is never cleared, and neither is a hide this pass
      // made on a previous run.
      const hides = result.isConcert === false && !row.hiddenFromConsumer
      if (hides) hidden += 1

      const canonicalHeadliners = canonicalizeSupporting(result.headliners)
      const canonicalSupporting = canonicalizeSupporting(
        result.supportingArtists,
      )

      // A row the ladder re-derived to exactly what it already stores needs no
      // write. Without this the pass touches `updated_at` on every row it
      // scans, which is both needless write load and a lie to any surface that
      // reads `updated_at` as "this show changed recently". Checked before the
      // sample so a dry run's sample shows only rows that would actually move.
      const unchanged =
        !hides &&
        sameBill(row.headliners, result.headliners) &&
        sameBill(row.canonicalHeadliners, canonicalHeadliners) &&
        sameBill(row.supportingArtists, result.supportingArtists) &&
        sameBill(row.canonicalSupporting, canonicalSupporting)
      if (unchanged) continue

      if (sample.length < SAMPLE_SIZE) {
        sample.push({
          eventId: row.id,
          title: row.title,
          strategy,
          headliners: result.headliners,
          supportingArtists: result.supportingArtists,
          hides,
        })
      }

      updated += 1
      if (options.dryRun) continue

      // All four artist columns move together. The display arrays are written
      // as well as the canonical ones because the projection reads
      // `headliners[1]` to recover the raw spelling a single-act bill's
      // canonical form stripped — canonical-only would project 'kokoroko'.
      await db
        .update(events)
        .set({
          headliners: result.headliners,
          canonicalHeadliners,
          supportingArtists: result.supportingArtists,
          canonicalSupporting,
          ...(hides ? { hiddenFromConsumer: true } : {}),
          updatedAt: new Date(),
        })
        .where(eq(events.id, row.id))
    }
  }

  return { scanned, derived, updated, hidden, strategies, sample }
}
