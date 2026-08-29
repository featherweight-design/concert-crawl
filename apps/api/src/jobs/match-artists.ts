// apps/api/src/jobs/match-artists.ts
//
// Spotify identity-match job for the artists projection table (#1115, plan
// PR-C Task 9).
//
// Three kinds of work, one pass:
//
//   1. IDENTITY  — rows with matchStatus 'unmatched', oldest first, capped at
//                  MATCH_BATCH_SIZE. Each gets a confidence-gated match
//                  (lib/artist-match.ts) and its verdict written back.
//   2. PHOTO     — already-matched rows whose photoUrl is older than
//                  PHOTO_REFETCH_DAYS. Spotify image URLs can expire; the
//                  UI's onError swap is the safety net, this job is the
//                  repair. A refresh never downgrades an established
//                  identity: if the re-search no longer resolves, the row
//                  keeps its spotifyArtistId and matchStatus and only
//                  matchCheckedAt moves.
//   3. RETRY     — 'no_match' rows last checked more than NO_MATCH_RETRY_DAYS
//                  ago, and not yet exhausted. Without this they are terminal,
//                  and a local band that simply wasn't on Spotify the night we
//                  first looked would never be looked at again however much
//                  they released after.
//
// Retrying is bounded. Every fruitless verdict increments matchAttempts, and at
// MATCH_ATTEMPT_LIMIT the row stops being selected — otherwise a growing set of
// unanswerable rows would eventually claim the whole daily batch and starve the
// rows nobody has looked at yet. A match resets the counter to zero, as does an
// admin resolving the row by hand.
//
// 'ambiguous' is deliberately NOT retried. It means Spotify returned several
// exact-name candidates, so asking again just reproduces the same tie — only
// the admin candidate picker can break it.
//
// Every verdict also snapshots the search's candidate list onto
// artists.spotifyCandidates, so the picker can open on a search this job
// already paid for instead of re-running it against the same quota
// MATCH_BATCH_SIZE exists to ration. The snapshot costs no extra Spotify call:
// it is the result already in hand. Genres are NOT hydrated here — that is a
// second call per row, and the picker fills them in lazily on first open.
//
// DORMANT UNTIL PROVISIONED: createSpotifyAppClient() returns null when
// SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET are unset, and this job then
// returns `skipped: 'unconfigured'` without touching a row. That is the
// designed PR-C-skipped state, not a failure.

import { pathToFileURL } from 'node:url'
import * as Sentry from '@sentry/hono/node'
import { and, eq, isNotNull, lt, or, sql } from 'drizzle-orm'
import { artists, db } from '@concert-crawl/db'
import { isNotExhaustedExpr } from '../lib/artist-exhaustion.js'
import { matchArtist } from '../lib/artist-match.js'
import { apiLogger } from '../lib/logger.js'
import {
  createSpotifyAppClient,
  type SpotifyAppClient,
} from '../lib/spotify-app-client.js'
import {
  SpotifyAuthError,
  SpotifyRateLimitError,
  SpotifyTimeoutError,
} from '../lib/spotify.js'

/** Rows touched per run. Spotify's app-token search quota is the constraint. */
export const MATCH_BATCH_SIZE = 100

/** Cached Spotify photo URLs older than this are re-fetched. */
export const PHOTO_REFETCH_DAYS = 7

/**
 * How long a 'no_match' verdict stands before the job asks Spotify again.
 * Long, because the only thing that changes the answer is Spotify's catalogue
 * gaining the artist — which is slow — and every retry spends the search quota
 * that MATCH_BATCH_SIZE exists to ration.
 */
export const NO_MATCH_RETRY_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

export interface MatchArtistsSummary {
  skipped: 'unconfigured' | null
  considered: number
  matched: number
  ambiguous: number
  noMatch: number
  photosRefreshed: number
  failures: number
  abortedReason: 'rate_limit' | 'auth' | 'timeout' | null
  spotifyCalls: number
}

export interface RunMatchArtistsOptions {
  batchSize?: number
  /** Injected in tests; production mints its own app-token client. */
  client?: SpotifyAppClient | null
  now?: () => Date
}

export const runMatchArtists = async (
  options: RunMatchArtistsOptions = {},
): Promise<MatchArtistsSummary> => {
  const now = options.now ?? (() => new Date())
  const batchSize = options.batchSize ?? MATCH_BATCH_SIZE

  const summary: MatchArtistsSummary = {
    skipped: null,
    considered: 0,
    matched: 0,
    ambiguous: 0,
    noMatch: 0,
    photosRefreshed: 0,
    failures: 0,
    abortedReason: null,
    spotifyCalls: 0,
  }

  const client =
    options.client !== undefined
      ? options.client
      : await createSpotifyAppClient()

  if (client === null) {
    summary.skipped = 'unconfigured'
    apiLogger.info(
      'match-artists: SPOTIFY_CLIENT_ID/SECRET unset — skipping (dormant)',
    )
    return summary
  }

  // One instant for both cutoffs. They describe a single batch's selection
  // window, so reading the clock twice could straddle a tick and leave the two
  // halves of the same query disagreeing about when "now" was. The per-row
  // now() calls below are deliberately separate: those stamp when each row was
  // actually checked, which is not the same question.
  const selectedAt = now().getTime()
  const staleBefore = new Date(selectedAt - PHOTO_REFETCH_DAYS * DAY_MS)
  const retryBefore = new Date(selectedAt - NO_MATCH_RETRY_DAYS * DAY_MS)

  const rows = await db
    .select({
      id: artists.id,
      canonicalName: artists.canonicalName,
      matchStatus: artists.matchStatus,
    })
    .from(artists)
    .where(
      or(
        eq(artists.matchStatus, 'unmatched'),
        // Both writers of matchStatus set matchCheckedAt in the same update,
        // so a 'no_match' row always carries one and this comparison never
        // silently drops a row to NULL.
        and(
          eq(artists.matchStatus, 'no_match'),
          lt(artists.matchCheckedAt, retryBefore),
          isNotExhaustedExpr(),
        ),
        // The photo refresh is deliberately outside the attempt budget: it
        // maintains an identity that is already established, and a row whose
        // image keeps failing to re-resolve still needs its next attempt.
        and(
          eq(artists.matchStatus, 'matched'),
          isNotNull(artists.photoUrl),
          lt(artists.photoFetchedAt, staleBefore),
        ),
      ),
    )
    // Oldest first: never-checked rows lead, then the least recently checked.
    // This is what keeps retries cheap — 'unmatched' rows have a NULL
    // matchCheckedAt, so they always sort ahead and a backlog of retries can
    // only ever spend budget the first-pass work didn't want.
    .orderBy(sql`${artists.matchCheckedAt} asc nulls first`, artists.createdAt)
    .limit(batchSize)

  for (const row of rows) {
    summary.considered += 1
    const isRefresh = row.matchStatus === 'matched'
    try {
      const result = await matchArtist(row.canonicalName, {
        search: client.searchArtists,
      })

      // One instant per row. Every timestamp below records the same pass, and
      // a "cached at" that reads later than its own "checked at" is confusing
      // for no reason.
      const checkedAt = now()

      if (isRefresh && result.status !== 'matched') {
        // Don't downgrade an established identity on a flaky re-search. The
        // snapshot is still written: it means "what the last search returned",
        // and holding a matched row's old list back would be the one exception
        // the picker has no way to know about.
        await db
          .update(artists)
          .set({
            matchCheckedAt: checkedAt,
            spotifyCandidates: result.candidates,
            spotifyCandidatesFetchedAt: checkedAt,
            updatedAt: checkedAt,
          })
          .where(eq(artists.id, row.id))
        continue
      }

      if (result.status === 'matched') {
        await db
          .update(artists)
          .set({
            matchStatus: 'matched',
            spotifyArtistId: result.spotifyArtistId,
            matchConfidence:
              result.confidence === null ? null : result.confidence.toFixed(3),
            photoUrl: result.photoUrl,
            photoFetchedAt: result.photoUrl === null ? null : checkedAt,
            matchCheckedAt: checkedAt,
            matchAttempts: 0,
            spotifyCandidates: result.candidates,
            spotifyCandidatesFetchedAt: checkedAt,
            updatedAt: checkedAt,
          })
          .where(eq(artists.id, row.id))
        if (isRefresh) {
          summary.photosRefreshed += 1
        } else {
          summary.matched += 1
        }
        continue
      }

      await db
        .update(artists)
        .set({
          matchStatus: result.status,
          matchConfidence: null,
          matchCheckedAt: checkedAt,
          matchAttempts: sql`${artists.matchAttempts} + 1`,
          spotifyCandidates: result.candidates,
          spotifyCandidatesFetchedAt: checkedAt,
          updatedAt: checkedAt,
        })
        .where(eq(artists.id, row.id))
      if (result.status === 'ambiguous') {
        summary.ambiguous += 1
      } else {
        summary.noMatch += 1
      }
    } catch (err) {
      // A rate limit or a rejected app token is a whole-batch condition. Rows
      // already resolved earlier in this batch keep their verdicts — those
      // writes are committed and correct. What we stop is processing the
      // remainder, and we decline to write a verdict for the current row, so
      // the untouched rows retry on the next run rather than being poisoned.
      if (err instanceof SpotifyRateLimitError) {
        summary.abortedReason = 'rate_limit'
        summary.considered -= 1
        // `err` carries the Retry-After Spotify asked for. It is the only
        // signal for how long the cooldown runs, and dropping it leaves an
        // operator guessing whether to retry in minutes or tomorrow.
        apiLogger.warn(
          { err, artistId: row.id },
          'match-artists: rate limited — aborting batch',
        )
        break
      }
      if (err instanceof SpotifyTimeoutError) {
        // A stalled Spotify would otherwise cost the full timeout on every
        // remaining row, turning one hang into a batch-long one.
        summary.abortedReason = 'timeout'
        summary.considered -= 1
        apiLogger.error(
          { err, artistId: row.id },
          'match-artists: Spotify timed out — aborting batch',
        )
        Sentry.captureException(err, { tags: { job: 'match-artists' } })
        break
      }
      if (err instanceof SpotifyAuthError) {
        summary.abortedReason = 'auth'
        summary.considered -= 1
        apiLogger.error(
          { err, artistId: row.id },
          'match-artists: app token rejected — aborting batch',
        )
        Sentry.captureException(err, { tags: { job: 'match-artists' } })
        break
      }
      summary.failures += 1
      apiLogger.error(
        { err, artistId: row.id },
        'match-artists: match failed for artist',
      )
      Sentry.captureException(err, {
        tags: { job: 'match-artists' },
        extra: { artistId: row.id },
      })
    }
  }

  summary.spotifyCalls = client.getCallCount()
  apiLogger.info({ summary }, 'match-artists: run complete')
  return summary
}

// CLI entry guard — same shape as spotify-weekly.ts. Runs only when executed
// directly, so tests can import runMatchArtists without auto-running.
const invokedUrl = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined
if (invokedUrl && import.meta.url === invokedUrl) {
  runMatchArtists()
    .then(() => {
      apiLogger.info('match-artists: done')
      process.exit(0)
    })
    .catch((err) => {
      apiLogger.error({ err }, 'match-artists: catastrophic failure')
      process.exit(1)
    })
}
