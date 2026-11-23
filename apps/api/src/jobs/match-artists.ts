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
//   2. PHOTO     — matched rows whose photoUrl is older than
//                  PHOTO_REFETCH_DAYS (or unstamped), oldest first, on a budget
//                  of its own (photoBudgetFor) that identity work never eats
//                  into, so a photo cannot reach the readers' 30-day ceiling
//                  while the identity queue is busy. Looked up by stored Spotify id
//                  (never re-searched by name). Spotify's terms allow only
//                  temporary caching, so when Spotify no longer returns the
//                  artist, or returns it with no image, the photo and its
//                  clock are cleared and counted in `photosCleared`; the row
//                  keeps its identity and the public readers fall back to the
//                  next image. Readers also refuse any photo older than 30
//                  days (lib/artist-photo.ts), so a down job cannot extend it.
//   3. RETRY     — 'no_match' rows last checked more than NO_MATCH_RETRY_DAYS
//                  ago, and 'ambiguous' rows past AMBIGUOUS_RECHECK_DAYS, in
//                  both cases only while not yet exhausted. Without this they
//                  are terminal, and a local band that simply wasn't on Spotify
//                  the night we first looked would never be looked at again
//                  however much they released after.
//
// Retrying is bounded. Every fruitless verdict increments matchAttempts, and at
// MATCH_ATTEMPT_LIMIT the row stops being selected — otherwise a growing set of
// unanswerable rows would eventually claim the whole daily batch and starve the
// rows nobody has looked at yet. A match resets the counter to zero, as does an
// admin resolving the row by hand.
//
// 'ambiguous' means Spotify returned several exact-name candidates. Re-asking
// cannot break that tie on its own, which is why this used to be terminal — but
// the tie is a property of the catalogue, not of the question: an act that has
// since gained a disambiguating release resolves cleanly on the next look. The
// attempt budget is what keeps that from becoming a standing tax. Since
// 2026-11-10 the best-effort rule (`pickBestEffortCandidate`) resolves most
// ties by taking Spotify's top result, marked `autoMatchedAt`; the admin picker
// is the answer for what it declines, and the correction for what it picks.
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

import { pathToFileURL } from 'node:url';
import * as Sentry from '@sentry/hono/node';
import { and, count, eq, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';
import { artists, auditLog, db } from '@concert-crawl/db';
import {
  AUTO_MATCH_ACTOR,
  AUTO_MATCH_AUDIT_ACTION,
} from '@concert-crawl/db/scripts/auto-match-ambiguous';
import { pickBestEffortCandidate } from '@concert-crawl/types';
import { isNotExhaustedExpr } from '../lib/artist-exhaustion.js';
import { matchArtist } from '../lib/artist-match.js';
import { apiLogger } from '../lib/logger.js';
import { describeDbError } from '../lib/pg-errors.js';
import { sweepExpiredRateLimitBuckets } from '../lib/rate-limit.js';
import {
  createSpotifyAppClient,
  type SpotifyAppClient,
} from '../lib/spotify-app-client.js';
import {
  SpotifyAuthError,
  SpotifyRateLimitError,
  SpotifyTimeoutError,
} from '../lib/spotify.js';

/** Rows touched per run. Spotify's app-token search quota is the constraint. */
export const MATCH_BATCH_SIZE = 100;

/**
 * Cached Spotify photo URLs older than this are re-fetched.
 *
 * The public readers stop serving a photo at 30 days (lib/artist-photo.ts), so
 * this leaves a 10-day margin for a missed night, a rate-limited run or a
 * deploy. It is also what sets the steady-state spend: a photo costs one call
 * per cycle, so 20 days is about 5% of the catalogue a day where 7 would be
 * about 14%.
 */
export const PHOTO_REFETCH_DAYS = 20;

/**
 * The photo pass is sized to walk the whole catalogue in this many days, which
 * is faster than PHOTO_REFETCH_DAYS needs (a photo only becomes due at day 20).
 * The difference is headroom: a backlog drains instead of standing still.
 */
export const PHOTO_BUDGET_CYCLE_DAYS = 15;

/** The photo pass always has at least this many calls a run. */
export const PHOTO_BUDGET_FLOOR = 50;

/**
 * The most by-id photo calls one run makes. They are serial, so 400 calls is a
 * few minutes against the cron function's 800-second limit, and Spotify's
 * rolling-window limit has to be cleared by one run's pace, not its count: a
 * 429 aborts the run and the rest waits for the next one, oldest first.
 */
export const PHOTO_BUDGET_CAP = 400;

/**
 * A run's photo budget: enough that no photo reaches the readers' 30-day
 * ceiling in steady state. Derived from the count of refreshable photos so it
 * grows with the catalogue, within the floor and cap above. The cap bounds
 * that promise: at 400 a day the 20-day refetch holds up to 8,000 photos, and
 * past that the cap needs raising (after checking the run still finishes
 * inside the cron function's limit).
 */
export const photoBudgetFor = (refreshablePhotos: number): number =>
  Math.min(
    PHOTO_BUDGET_CAP,
    Math.max(
      PHOTO_BUDGET_FLOOR,
      Math.ceil(refreshablePhotos / PHOTO_BUDGET_CYCLE_DAYS),
    ),
  );

/**
 * How long a 'no_match' verdict stands before the job asks Spotify again.
 * Long, because the only thing that changes the answer is Spotify's catalogue
 * gaining the artist — which is slow — and every retry spends the search quota
 * that MATCH_BATCH_SIZE exists to ration.
 */
export const NO_MATCH_RETRY_DAYS = 30;

/**
 * How long an 'ambiguous' verdict stands before the job asks Spotify again.
 *
 * Shorter than NO_MATCH_RETRY_DAYS because the thing that breaks the tie is
 * smaller than the thing that resolves a no_match: one of the same-named acts
 * gaining a disambiguating release is enough, where a no_match needs the artist
 * to appear in the catalogue at all.
 *
 * Not 7: a weekly cadence here would add a recurring population to the
 * identity batch and squeeze the unmatched rows that MATCH_BATCH_SIZE exists
 * to serve. (Photo refreshes have their own budget and no longer share it.)
 */
export const AMBIGUOUS_RECHECK_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface MatchArtistsSummary {
  skipped: 'unconfigured' | null;
  considered: number;
  matched: number;
  ambiguous: number;
  /** Ambiguous verdicts the best-effort rule resolved; counted apart from `matched`. */
  autoMatched: number;
  noMatch: number;
  photosRefreshed: number;
  /**
   * Photos dropped because Spotify no longer returns the stored artist id, or
   * returns it with no image (Spotify's terms allow only temporary caching).
   * The row keeps its identity and falls back to the next image in the order.
   */
  photosCleared: number;
  /**
   * Rows a human changed while Spotify was searching, so the job's write was
   * refused by its `updatedAt` guard and the human's answer stands.
   */
  superseded: number;
  failures: number;
  abortedReason: 'rate_limit' | 'auth' | 'timeout' | null;
  spotifyCalls: number;
}

export interface RunMatchArtistsOptions {
  /** Identity rows per run (unmatched, no_match and ambiguous retries). */
  batchSize?: number;
  /** Photo refreshes per run. Default: sized from the catalogue, see photoBudgetFor. */
  photoBudget?: number;
  /** Injected in tests; production mints its own app-token client. */
  client?: SpotifyAppClient | null;
  now?: () => Date;
}

// Postgres keeps microseconds and a JS Date only milliseconds, so the token
// read back from a select is compared at the precision it survived in.
const unchangedSince = (updatedAt: Date) =>
  sql`date_trunc('milliseconds', ${artists.updatedAt}) = ${updatedAt.toISOString()}::timestamptz`;

export const runMatchArtists = async (
  options: RunMatchArtistsOptions = {},
): Promise<MatchArtistsSummary> => {
  const now = options.now ?? (() => new Date());
  const batchSize = options.batchSize ?? MATCH_BATCH_SIZE;

  const summary: MatchArtistsSummary = {
    skipped: null,
    considered: 0,
    matched: 0,
    ambiguous: 0,
    autoMatched: 0,
    noMatch: 0,
    photosRefreshed: 0,
    photosCleared: 0,
    superseded: 0,
    failures: 0,
    abortedReason: null,
    spotifyCalls: 0,
  };
  // Every row considered lands in exactly one bucket, so `considered` is
  // their sum. A refused guarded write is one of them, not a silent skip.
  const supersede = (artistId: string): void => {
    summary.superseded += 1;
    apiLogger.debug(
      { artistId },
      'match-artists: a human change mid-search superseded the job',
    );
  };

  const client =
    options.client !== undefined
      ? options.client
      : await createSpotifyAppClient();

  if (client === null) {
    summary.skipped = 'unconfigured';
    apiLogger.info(
      'match-artists: SPOTIFY_CLIENT_ID/SECRET unset — skipping (dormant)',
    );
    return summary;
  }

  // One instant for both cutoffs. They describe a single batch's selection
  // window, so reading the clock twice could straddle a tick and leave the two
  // halves of the same query disagreeing about when "now" was. The per-row
  // now() calls below are deliberately separate: those stamp when each row was
  // actually checked, which is not the same question.
  const selectedAt = now().getTime();
  const staleBefore = new Date(selectedAt - PHOTO_REFETCH_DAYS * DAY_MS);
  const retryBefore = new Date(selectedAt - NO_MATCH_RETRY_DAYS * DAY_MS);
  const ambiguousBefore = new Date(
    selectedAt - AMBIGUOUS_RECHECK_DAYS * DAY_MS,
  );

  const rowFields = {
    id: artists.id,
    name: artists.name,
    canonicalName: artists.canonicalName,
    matchStatus: artists.matchStatus,
    spotifyArtistId: artists.spotifyArtistId,
    hidden: artists.hidden,
    autoMatchedAt: artists.autoMatchedAt,
    // The concurrency token for the best-effort writes: every admin write
    // moves it, so a write guarded on it never lands on a row a human
    // touched while Spotify was searching.
    updatedAt: artists.updatedAt,
  };

  // Matched rows that carry a photo and an id are the photo pass's catalogue.
  const refreshablePhoto = and(
    eq(artists.matchStatus, 'matched'),
    isNotNull(artists.photoUrl),
    isNotNull(artists.spotifyArtistId),
  );

  // Identity work: the Spotify search quota is what batchSize rations.
  const identityRows = await db
    .select(rowFields)
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
        // Same shape as the no_match retry, on a shorter clock. The tie itself
        // does not change, but the catalogue underneath it does.
        and(
          eq(artists.matchStatus, 'ambiguous'),
          lt(artists.matchCheckedAt, ambiguousBefore),
          isNotExhaustedExpr(),
        ),
      ),
    )
    // Oldest first: never-checked rows lead, then the least recently checked.
    // This is what keeps retries cheap — 'unmatched' rows have a NULL
    // matchCheckedAt, so they always sort ahead and a backlog of retries can
    // only ever spend budget the first-pass work didn't want.
    .orderBy(sql`${artists.matchCheckedAt} asc nulls first`, artists.createdAt)
    .limit(batchSize);

  // Photo work, on its own budget and ordered by the photo's own age. Sharing
  // the identity batch (ordered by matchCheckedAt) let a backlog of unmatched
  // rows starve the refresh until photos aged past the readers' ceiling and
  // vanished. The photo refresh is deliberately outside the attempt budget: it
  // maintains an identity that is already established.
  const photoBudget =
    options.photoBudget ??
    photoBudgetFor(
      (
        await db
          .select({ total: count() })
          .from(artists)
          .where(refreshablePhoto)
      )[0]?.total ?? 0,
    );
  const photoRows = await db
    .select(rowFields)
    .from(artists)
    .where(
      and(
        refreshablePhoto,
        // A photo with no fetch stamp has no age to trust, so it is refreshed
        // too (every writer stamps it; this repairs a stray row).
        or(
          isNull(artists.photoFetchedAt),
          lt(artists.photoFetchedAt, staleBefore),
        ),
      ),
    )
    // Oldest photo first, unstamped ones ahead of all: the rows the readers
    // already hide come back before the ones still showing.
    .orderBy(sql`${artists.photoFetchedAt} asc nulls first`, artists.createdAt)
    .limit(photoBudget);

  // Photos first: they are the user-visible regression, and a rate-limit abort
  // mid-run leaves the identity queue (which has nothing to lose by waiting)
  // for tomorrow rather than the other way round.
  const rows = [...photoRows, ...identityRows];

  // The photo pass: look the stored Spotify id up directly rather than
  // re-searching by name, so a photo can never outlive its source. One call per
  // row, the same spend as the name search it replaces. Guarded on `updatedAt`
  // so a human change mid-refresh is never overwritten. Identity is never
  // touched: only the photo and its clock move.
  const refreshPhoto = async (row: {
    id: string;
    spotifyArtistId: string;
    updatedAt: Date;
  }): Promise<void> => {
    const lookup = await client.fetchArtistPhoto(row.spotifyArtistId);
    const checkedAt = now();
    const imageUrl = lookup.found ? lookup.imageUrl : null;
    const written = await db
      .update(artists)
      .set({
        photoUrl: imageUrl,
        photoFetchedAt: imageUrl === null ? null : checkedAt,
        matchCheckedAt: checkedAt,
        updatedAt: checkedAt,
      })
      .where(and(eq(artists.id, row.id), unchangedSince(row.updatedAt)))
      .returning({ id: artists.id });
    if (written.length === 0) {
      supersede(row.id);
    } else if (imageUrl === null) {
      summary.photosCleared += 1;
    } else {
      summary.photosRefreshed += 1;
    }
  };

  for (const row of rows) {
    summary.considered += 1;
    try {
      // The selection only returns matched rows that carry an id.
      if (row.matchStatus === 'matched' && row.spotifyArtistId !== null) {
        await refreshPhoto({ ...row, spotifyArtistId: row.spotifyArtistId });
        continue;
      }

      const result = await matchArtist(
        row.canonicalName,
        { search: client.searchArtists },
        row.name,
      );

      // One instant per row. Every timestamp below records the same pass, and
      // a "cached at" that reads later than its own "checked at" is confusing
      // for no reason.
      const checkedAt = now();

      if (result.status === 'matched') {
        const written = await db
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
            // An exact answer supersedes a best-effort one.
            autoMatchedAt: null,
            spotifyCandidates: result.candidates,
            spotifyCandidatesFetchedAt: checkedAt,
            updatedAt: checkedAt,
          })
          // A human answer given while Spotify was searching wins here too.
          // Unguarded, a not-an-artist ruling made mid-search was overwritten
          // to matched with its hide left on, and an admin's own pick was
          // replaced by the job's.
          .where(and(eq(artists.id, row.id), unchangedSince(row.updatedAt)))
          .returning({ id: artists.id });
        if (written.length === 0) {
          supersede(row.id);
          continue;
        }
        summary.matched += 1;
        continue;
      }

      // Ambiguous is not the end of the road: the best-effort rule takes
      // Spotify's top result when it is plainly the act, marked so admin can
      // find and correct it (plan 2026-11-10-ambiguous-artist-auto-match).
      if (result.status === 'ambiguous' && !row.hidden) {
        const verdict = pickBestEffortCandidate(result.candidates, row);
        if ('picked' in verdict) {
          const picked = await db.transaction(async (tx) => {
            const written = await tx
              .update(artists)
              .set({
                matchStatus: 'matched',
                spotifyArtistId: verdict.picked.id,
                matchConfidence: null,
                photoUrl: verdict.picked.imageUrl,
                photoFetchedAt: checkedAt,
                matchCheckedAt: checkedAt,
                matchAttempts: 0,
                autoMatchedAt: checkedAt,
                spotifyCandidates: result.candidates,
                spotifyCandidatesFetchedAt: checkedAt,
                updatedAt: checkedAt,
              })
              // A human answer given while Spotify was searching wins,
              // whatever it changed: status, identity or visibility.
              .where(
                and(
                  eq(artists.id, row.id),
                  unchangedSince(row.updatedAt),
                  eq(artists.hidden, false),
                ),
              )
              .returning({ id: artists.id });
            if (written.length > 0) {
              await tx.insert(auditLog).values({
                actorId: AUTO_MATCH_ACTOR,
                action: AUTO_MATCH_AUDIT_ACTION,
                targetId: row.id,
                metadata: {
                  spotifyArtistId: verdict.picked.id,
                  rule: 'top-exact-with-photo',
                },
              });
            }
            return written.length;
          });
          if (picked > 0) {
            summary.autoMatched += 1;
          } else {
            supersede(row.id);
          }
          continue;
        }
      }

      const written = await db
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
        // A human answer given while Spotify was searching wins, as on the
        // auto-match write above. Unguarded, a not-an-artist ruling made
        // mid-search was overwritten to ambiguous or no_match while its hide
        // stayed, leaving a hidden row back in the queue as if undecided.
        .where(and(eq(artists.id, row.id), unchangedSince(row.updatedAt)))
        .returning({ id: artists.id });
      if (written.length === 0) {
        supersede(row.id);
        continue;
      }
      if (result.status === 'ambiguous') {
        summary.ambiguous += 1;
      } else {
        summary.noMatch += 1;
      }
    } catch (err) {
      // A rate limit or a rejected app token is a whole-batch condition. Rows
      // already resolved earlier in this batch keep their verdicts — those
      // writes are committed and correct. What we stop is processing the
      // remainder, and we decline to write a verdict for the current row, so
      // the untouched rows retry on the next run rather than being poisoned.
      if (err instanceof SpotifyRateLimitError) {
        summary.abortedReason = 'rate_limit';
        summary.considered -= 1;
        // `err` carries the Retry-After Spotify asked for. It is the only
        // signal for how long the cooldown runs, and dropping it leaves an
        // operator guessing whether to retry in minutes or tomorrow.
        apiLogger.warn(
          { err, artistId: row.id },
          'match-artists: rate limited — aborting batch',
        );
        break;
      }
      if (err instanceof SpotifyTimeoutError) {
        // A stalled Spotify would otherwise cost the full timeout on every
        // remaining row, turning one hang into a batch-long one.
        summary.abortedReason = 'timeout';
        summary.considered -= 1;
        apiLogger.error(
          { err, artistId: row.id },
          'match-artists: Spotify timed out — aborting batch',
        );
        Sentry.captureException(err, { tags: { job: 'match-artists' } });
        break;
      }
      if (err instanceof SpotifyAuthError) {
        summary.abortedReason = 'auth';
        summary.considered -= 1;
        apiLogger.error(
          { err, artistId: row.id },
          'match-artists: app token rejected — aborting batch',
        );
        Sentry.captureException(err, { tags: { job: 'match-artists' } });
        break;
      }
      summary.failures += 1;
      apiLogger.error(
        { err, artistId: row.id },
        'match-artists: match failed for artist',
      );
      Sentry.captureException(err, {
        tags: { job: 'match-artists' },
        extra: { artistId: row.id },
      });
    }
  }

  summary.spotifyCalls = client.getCallCount();
  apiLogger.info({ summary }, 'match-artists: run complete');
  return summary;
};

// CLI entry guard — same shape as spotify-weekly.ts. Runs only when executed
// directly, so tests can import runMatchArtists without auto-running.
const invokedUrl = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined;
if (invokedUrl && import.meta.url === invokedUrl) {
  const main = async (): Promise<number> => {
    // The cron runs this file directly, never through index.ts, so Sentry is
    // only initialised if the entrypoint does it. Loaded here rather than as a
    // static import so tests importing runMatchArtists never initialise it.
    await import('../instrument.js');
    let exitCode = 0;
    try {
      await runMatchArtists();
      apiLogger.info('match-artists: done');
    } catch (err) {
      apiLogger.error({ err }, 'match-artists: catastrophic failure');
      exitCode = 1;
    }

    // Rides on this cron because it is the API's only daily job that runs in
    // every environment (#528): sampled pruning on API hits stops when traffic
    // does, so this is what bounds how long an expired bucket can linger.
    // Housekeeping never fails the run; the next night tries again.
    try {
      const swept = await sweepExpiredRateLimitBuckets();
      apiLogger.info(
        { swept },
        'match-artists: swept expired rate-limit buckets',
      );
    } catch (err) {
      const error = describeDbError(err);
      apiLogger.warn(
        { error },
        'match-artists: rate-limit bucket sweep failed',
      );
      Sentry.captureMessage('rate-limit bucket sweep failed', {
        level: 'warning',
        tags: {
          job: 'match-artists',
          errorClass: error.errorClass,
          errorCode: error.code ?? 'none',
        },
      });
    }
    // process.exit drops anything still queued in the Sentry transport.
    await Sentry.flush(2000);
    return exitCode;
  };
  void main().then((code) => process.exit(code));
}
